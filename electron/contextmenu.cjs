"use strict";

/**
 * Windows Explorer context-menu integration for Squeezr.
 *
 * Uses classic static verbs written under HKCU (per-user, no admin). The menu
 * text and icons are Squeezr's own. Two scopes are registered:
 *   - all files ("*"):  a "Compress with Squeezr..." verb
 *   - archive types:    a "Squeezr" cascading submenu (open / extract / test)
 *
 * On Windows 11 these appear under "Show more options" (the legacy menu), which
 * is the same place classic WinRAR entries live.
 */

const { execFileSync } = require("node:child_process");

const REG = process.env.SystemRoot ? `${process.env.SystemRoot}\\System32\\reg.exe` : "reg.exe";

const ARCHIVE_EXTS = ["zip", "rar", "7z", "tar", "gz", "tgz", "bz2", "xz", "iso", "cab"];

function reg(args) {
  try {
    const out = execFileSync(REG, args, { windowsHide: true, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: (e.stdout || "").toString() };
  }
}

function add(key, name, value) {
  const args = ["add", key, "/f"];
  if (name === "") args.push("/ve");
  else args.push("/v", name);
  args.push("/t", "REG_SZ", "/d", value);
  return reg(args).ok;
}

function del(key) {
  reg(["delete", key, "/f"]);
}

function query(key, name) {
  const args = ["query", key];
  if (name) args.push("/v", name);
  return reg(args);
}

function q(s) {
  return `"${s}"`;
}

/** Build the `"exe" "appDir"? verb "%1"` command line for a given verb. */
function commandLine(info, verb) {
  const parts = [q(info.exe)];
  if (info.appDir) parts.push(q(info.appDir));
  parts.push(verb, '"%1"');
  return parts.join(" ");
}

const COMPRESS_KEY = "HKCU\\Software\\Classes\\*\\shell\\SqueezrCompress";

function submenuKey(ext) {
  return `HKCU\\Software\\Classes\\SystemFileAssociations\\.${ext}\\shell\\Squeezr`;
}

/** Register all context-menu entries. `info` = { exe, appDir, iconPath }. */
function enable(info) {
  // 1) "Compress with Squeezr..." on every file.
  add(COMPRESS_KEY, "MUIVerb", "Compress with Squeezr\u2026");
  add(COMPRESS_KEY, "Icon", info.iconPath || info.exe);
  add(COMPRESS_KEY, "", commandLine(info, "--compress"));

  // 2) "Squeezr" cascading submenu on archive file types.
  for (const ext of ARCHIVE_EXTS) {
    const root = submenuKey(ext);
    add(root, "MUIVerb", "Squeezr");
    add(root, "Icon", info.iconPath || info.exe);
    add(root, "SubCommands", ""); // empty value => cascade built from nested shell keys
    const verbs = [
      ["01open", "Open with Squeezr", "--open"],
      ["02extracthere", "Extract Here", "--extract-here"],
      ["03extractto", "Extract to a new folder", "--extract-to"],
      ["04test", "Test archive", "--test"],
    ];
    for (const [key, label, flag] of verbs) {
      add(`${root}\\shell\\${key}`, "MUIVerb", label);
      add(`${root}\\shell\\${key}`, "", commandLine(info, flag));
    }
  }
  return true;
}

/** Remove every registered entry. */
function disable() {
  del(COMPRESS_KEY);
  for (const ext of ARCHIVE_EXTS) del(submenuKey(ext));
  return true;
}

/** True when the integration keys are present. */
function isEnabled() {
  return query(COMPRESS_KEY).ok;
}

module.exports = { enable, disable, isEnabled, ARCHIVE_EXTS };
