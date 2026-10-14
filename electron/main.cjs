"use strict";

const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const engine = require("./engine.cjs");
const contextmenu = require("./contextmenu.cjs");

const DEFAULT_SETTINGS = {
  format: "7z",
  method: "LZMA2",
  level: 5,
  dictionary: "16M",
  solid: true,
  encryptNames: false,
  extractOverwrite: "ask",
  extractUpdate: "replace",
  theme: "light",
  shellMenu: true,
  favorites: [],
};

function settingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(settingsPath(), "utf8")) };
  } catch (_) {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), "utf8");
    return true;
  } catch (_) {
    return false;
  }
}

let mainWindow = null;

const ARCHIVE_ARG = /\.(rar|zip|7z|tar|gz|tgz|bz2|xz|iso|cab|arj|lzh|z)$/i;
function findArchiveArg(argv) {
  return (argv || []).slice(1).find((a) => typeof a === "string" && !a.startsWith("-") && ARCHIVE_ARG.test(a));
}
let pendingOpen = findArchiveArg(process.argv);
let pendingCompress = null;

/* ------------------------- CLI verbs (Explorer context menu) ------------------------- */
const CLI_VERBS = new Set([
  "--open",
  "--extract-here",
  "--extract-to",
  "--test",
  "--compress",
  "--register-shell",
  "--unregister-shell",
]);

function parseCli(argv) {
  const args = (argv || []).slice(1);
  const i = args.findIndex((a) => CLI_VERBS.has(a));
  if (i === -1) {
    const p = findArchiveArg(argv);
    return p ? { verb: "--open", file: p, files: [p] } : null;
  }
  const verb = args[i];
  const files = args.slice(i + 1).filter((a) => a && !a.startsWith("--"));
  return { verb, file: files[0], files };
}

function shellInfo() {
  const packaged = app.isPackaged;
  return {
    exe: process.execPath,
    appDir: packaged ? "" : app.getAppPath(),
    iconPath: packaged
      ? path.join(process.resourcesPath, "icon.ico")
      : path.join(__dirname, "..", "build", "icon.ico"),
  };
}

function syncShellMenu() {
  try {
    const want = loadSettings().shellMenu !== false;
    const cur = contextmenu.isEnabled();
    if (want && !cur) contextmenu.enable(shellInfo());
    else if (!want && cur) contextmenu.disable();
  } catch (_) {}
}

function focusWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

async function runCli(cli, silent) {
  if (!cli) return null;
  if (cli.verb === "--register-shell") {
    contextmenu.enable(shellInfo());
    return { verb: cli.verb, ok: contextmenu.isEnabled() };
  }
  if (cli.verb === "--unregister-shell") {
    contextmenu.disable();
    return { verb: cli.verb, ok: !contextmenu.isEnabled() };
  }
  if (cli.verb === "--open") {
    if (mainWindow) {
      focusWindow();
      mainWindow.webContents.send("app:open-file", cli.file);
    } else {
      pendingOpen = cli.file;
    }
    return { verb: cli.verb, ok: true, file: cli.file };
  }
  if (cli.verb === "--compress") {
    if (mainWindow) {
      focusWindow();
      mainWindow.webContents.send("app:compress-files", cli.files);
    } else {
      pendingCompress = cli.files;
    }
    return { verb: cli.verb, ok: true, files: cli.files };
  }
  if (cli.verb === "--extract-here" || cli.verb === "--extract-to" || cli.verb === "--test") {
    if (!cli.file) return { verb: cli.verb, ok: false, error: "no file" };
    let dest = null;
    let res;
    if (cli.verb === "--extract-here") {
      dest = path.dirname(cli.file);
      res = await engine.extract(cli.file, dest, { overwrite: "overwrite" });
    } else if (cli.verb === "--extract-to") {
      dest = path.join(path.dirname(cli.file), path.basename(cli.file).replace(/\.[^.]+$/, ""));
      res = await engine.extract(cli.file, dest, { overwrite: "overwrite" });
    } else {
      res = await engine.testReport(cli.file);
    }
    const result = { verb: cli.verb, file: cli.file, dest, ok: !!res.ok, output: (res.output || "").slice(0, 400) };
    if (!silent && mainWindow) {
      focusWindow();
      const isTest = cli.verb === "--test";
      const buttons = isTest ? ["OK"] : ["OK", "Open folder"];
      dialog
        .showMessageBox(mainWindow, {
          type: res.ok ? "info" : "error",
          title: isTest ? "Verify integrity" : "Extract",
          message: res.ok
            ? isTest
              ? "Archive verified successfully."
              : `Extracted to:\n${dest}`
            : "Operation failed. See details below.",
          detail: res.ok ? undefined : (res.output || "").slice(-600),
          buttons,
          defaultId: 0,
          cancelId: 0,
        })
        .then((r) => {
          if (!isTest && r.response === 1 && dest) shell.openPath(dest);
        });
    }
    return result;
  }
  return null;
}

app.setName("Squeezr");
if (process.platform === "win32") app.setAppUserModelId("com.squeezr.app");

function appIconPath() {
  const candidates = [
    path.join(process.resourcesPath || "", "icon.ico"),
    path.join(__dirname, "..", "build", "icon.ico"),
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch (_) {}
  }
  return undefined;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 820,
    minHeight: 520,
    backgroundColor: "#ffffff",
    title: "Squeezr",
    autoHideMenuBar: true,
    icon: appIconPath(),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "renderer", "index.html"));
  }

  mainWindow.webContents.on("did-finish-load", () => {
    if (pendingOpen) {
      mainWindow.webContents.send("app:open-file", pendingOpen);
      pendingOpen = null;
    }
    if (pendingCompress) {
      mainWindow.webContents.send("app:compress-files", pendingCompress);
      pendingCompress = null;
    }
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", (_e, argv) => {
    const cli = parseCli(argv);
    if (cli) {
      runCli(cli, false);
    } else if (mainWindow) {
      focusWindow();
    }
  });

  app.whenReady().then(async () => {
    const cli = parseCli(process.argv);
    const silent = process.env.WRC_CLI_SILENT === "1";

    // Headless verification / scripted invocation: no window, print result, exit.
    if (cli && silent) {
      const r = await runCli(cli, true);
      try {
        process.stdout.write(JSON.stringify(r) + "\n");
      } catch (_) {}
      app.exit(r && r.ok ? 0 : 1);
      return;
    }

    createWindow();
    syncShellMenu();

    if (cli) {
      if (cli.verb === "--register-shell" || cli.verb === "--unregister-shell") {
        runCli(cli, false);
      } else if (cli.verb === "--open") {
        pendingOpen = cli.file;
      } else if (cli.verb === "--compress") {
        pendingCompress = cli.files;
      } else {
        mainWindow.webContents.once("did-finish-load", () => runCli(cli, false));
      }
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

// Add NSIS cleanup/unregister hook for context menu on uninstall.
function addUninstallCleanup(nsisConfig) {
  try {
    const include = `
!macro customInstall\n  ExecWait \x22\x22\\Squeezr.exe\x22 --register-shell\x22\n!macroend\n!macro customUnInstall
  DeleteRegKey HKCU "Software\\Classes\\*\\shell\\SqueezrCompress"
  DeleteRegKey HKCU "Software\\Classes\\SystemFileAssociations\\.zip\\shell\\Squeezr"
  DeleteRegKey HKCU "Software\\Classes\\SystemFileAssociations\\.rar\\shell\\Squeezr"
  DeleteRegKey HKCU "Software\\Classes\\SystemFileAssociations\\.7z\\shell\\Squeezr"
  DeleteRegKey HKCU "Software\\Classes\\SystemFileAssociations\\.tar\\shell\\Squeezr"
  DeleteRegKey HKCU "Software\\Classes\\SystemFileAssociations\\.gz\\shell\\Squeezr"
  DeleteRegKey HKCU "Software\\Classes\\SystemFileAssociations\\.tgz\\shell\\Squeezr"
  DeleteRegKey HKCU "Software\\Classes\\SystemFileAssociations\\.bz2\\shell\\Squeezr"
  DeleteRegKey HKCU "Software\\Classes\\SystemFileAssociations\\.xz\\shell\\Squeezr"
  DeleteRegKey HKCU "Software\\Classes\\SystemFileAssociations\\.iso\\shell\\Squeezr"
  DeleteRegKey HKCU "Software\\Classes\\SystemFileAssociations\\.cab\\shell\\Squeezr"
!macroend
`;
    if (!nsisConfig.include) nsisConfig.include = "";
    if (nsisConfig.include.indexOf("customUnInstall") === -1) {
      nsisConfig.include += include;
    }
  } catch (_) {}
}

const pkg = require("../package.json");
if (pkg && pkg.build && pkg.build.nsis) {
  addUninstallCleanup(pkg.build.nsis);
}

/* ------------------------- IPC: dialogs ------------------------- */
ipcMain.handle("dialog:openArchive", async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    title: "Open archive",
    properties: ["openFile"],
    filters: [
      { name: "Archives", extensions: ["rar", "zip", "7z", "tar", "gz", "bz2", "xz", "iso", "cab", "arj", "lzh", "z"] },
      { name: "All files", extensions: ["*"] },
    ],
  });
  return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle("dialog:openFiles", async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    title: "Select files to add",
    properties: ["openFile", "multiSelections"],
  });
  return r.canceled ? null : r.filePaths;
});

ipcMain.handle("dialog:saveArchive", async (_e, defaultName) => {
  const r = await dialog.showSaveDialog(mainWindow, {
    title: "Create archive",
    defaultPath: defaultName || "new.7z",
    filters: [
      { name: "7z (best ratio)", extensions: ["7z"] },
      { name: "ZIP", extensions: ["zip"] },
      { name: "TAR", extensions: ["tar"] },
      { name: "All files", extensions: ["*"] },
    ],
  });
  return r.canceled ? null : r.filePath;
});

ipcMain.handle("dialog:selectDirectory", async (_e, title) => {
  const r = await dialog.showOpenDialog(mainWindow, {
    title: title || "Select folder",
    properties: ["openDirectory"],
  });
  return r.canceled ? null : r.filePaths[0];
});

/* ------------------------- IPC: engine ------------------------- */
ipcMain.handle("engine:info", async () => ({ path: engine.findEngine() }));

ipcMain.handle("archive:list", async (_e, { archive, password }) => {
  const info = fs.statSync(archive);
  const r = await engine.list(archive, password);
  if (r.ok) r.archive.physicalSize = r.archive.physicalSize || info.size;
  return r;
});

ipcMain.handle("archive:extract", async (_e, { archive, outDir, options }) => {
  return engine.extract(archive, outDir, options || {});
});

ipcMain.handle("archive:add", async (_e, { archive, files, options }) => {
  return engine.add(archive, files, options || {});
});

ipcMain.handle("archive:test", async (_e, { archive, password }) => {
  return engine.test(archive, password);
});

ipcMain.handle("archive:report", async (_e, { archive, password }) => {
  return engine.testReport(archive, password);
});

ipcMain.handle("engine:benchmark", async (_e, opts) => {
  return engine.benchmark(opts || {});
});

/* ------------------------- IPC: settings & favorites ------------------------- */
ipcMain.handle("settings:get", async () => loadSettings());

ipcMain.handle("settings:set", async (_e, partial) => {
  const next = { ...loadSettings(), ...partial };
  saveSettings(next);
  return next;
});

/* ------------------------- IPC: Explorer context menu ------------------------- */
ipcMain.handle("contextmenu:get", async () => contextmenu.isEnabled());
ipcMain.handle("contextmenu:set", async (_e, on) => {
  if (on) contextmenu.enable(shellInfo());
  else contextmenu.disable();
  return contextmenu.isEnabled();
});

ipcMain.handle("favorites:add", async (_e, entry) => {
  const s = loadSettings();
  const list = s.favorites.filter((f) => f.path !== entry.path);
  list.push(entry);
  s.favorites = list;
  saveSettings(s);
  return s.favorites;
});

ipcMain.handle("favorites:remove", async (_e, p) => {
  const s = loadSettings();
  s.favorites = s.favorites.filter((f) => f.path !== p);
  saveSettings(s);
  return s.favorites;
});

/* ------------------------- IPC: filesystem ------------------------- */
ipcMain.handle("fs:drives", async () => {
  const drives = [];
  for (let i = 65; i <= 90; i++) {
    const letter = String.fromCharCode(i) + ":\\";
    try {
      fs.accessSync(letter);
      drives.push(letter);
    } catch (_) {}
  }
  return drives;
});

ipcMain.handle("fs:listDir", async (_e, dir) => {
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    return {
      ok: true,
      dir,
      entries: items
        .map((it) => {
          const full = path.join(dir, it.name);
          let size = null;
          let modified = null;
          let created = null;
          try {
            const st = fs.statSync(full);
            size = st.size;
            modified = st.mtime.toISOString();
            created = st.birthtime.toISOString();
          } catch (_) {}
          return {
            path: full,
            name: it.name,
            isDir: it.isDirectory(),
            size,
            modified,
            created,
            type: it.isDirectory() ? "Folder" : (path.extname(it.name).slice(1).toUpperCase() || "") + " File",
          };
        })
        .sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1)),
    };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle("shell:openPath", async (_e, p) => shell.openPath(p));
