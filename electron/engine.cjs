"use strict";

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

/**
 * Locate the 7-Zip engine. Preference order:
 *  1. Explicit path via the WRC_7Z_PATH environment variable
 *  2. Bundled engine in resources/engine/
 *  3. A 7-Zip installation on the system
 */
function findEngine() {
  const candidates = [
    process.env.WRC_7Z_PATH,
    path.join(process.resourcesPath || "", "engine", "7z.exe"),
    "C:\\Program Files\\7-Zip\\7z.exe",
    "C:\\Program Files (x86)\\7-Zip\\7z.exe",
    path.join(__dirname, "..", "resources", "engine", "7z.exe"),
  ].filter(Boolean);
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch (_) {}
  }
  return null;
}

function run7z(args, opts = {}) {
  return new Promise((resolve) => {
    const engine = findEngine();
    if (!engine) {
      resolve({ ok: false, code: -1, stdout: "", stderr: "7-Zip engine not found" });
      return;
    }
    const child = spawn(engine, args, {
      cwd: opts.cwd || undefined,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let killed = false;
    const timer =
      opts.timeoutMs > 0
        ? setTimeout(() => {
            killed = true;
            try {
              child.kill();
            } catch (_) {}
          }, opts.timeoutMs)
        : null;
    child.stdout.on("data", (d) => {
      stdout += d.toString();
      if (opts.onData) opts.onData(d.toString());
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
      if (opts.onData) opts.onData(d.toString());
    });
    child.on("error", (err) => {
      if (timer) clearTimeout(timer);
      resolve({ ok: false, code: -1, stdout, stderr: String(err) });
    });
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({ ok: code === 0 && !killed, code, stdout, stderr: killed ? stderr + "\n[timed out]" : stderr });
    });
  });
}

/** Parse `7z l -slt` output into structured entries. */
function parseSlt(text) {
  const lines = text.split(/\r?\n/);
  const header = {};
  const blocks = [];
  let cur = null;
  let inEntries = false;
  for (const line of lines) {
    if (/^-{10,}/.test(line)) {
      inEntries = true;
      cur = null;
      continue;
    }
    if (line.trim() === "") {
      if (inEntries && cur && cur.Path !== undefined) blocks.push(cur);
      if (inEntries) cur = null;
      continue;
    }
    const idx = line.indexOf(" = ");
    if (idx === -1) continue;
    const k = line.slice(0, idx);
    const v = line.slice(idx + 3);
    if (!inEntries) {
      header[k] = v;
    } else {
      if (!cur) cur = {};
      cur[k] = v;
    }
  }
  if (inEntries && cur && cur.Path !== undefined) blocks.push(cur);
  return { header, entries: blocks };
}

function normalizeEntry(b) {
  const size = b.Size !== undefined ? Number(b.Size) : null;
  const packed = b["Packed Size"] !== undefined ? Number(b["Packed Size"]) : null;
  const isDir = (b.Attributes || "").includes("D") || b.Folder === "+";
  const name = b.Path || "";
  const ext = path.extname(name).toLowerCase();
  return {
    path: name,
    name: path.basename(name),
    size,
    packed,
    isDir,
    modified: b.Modified || null,
    created: b.Created || null,
    accessed: b.Accessed || null,
    crc: b.CRC || null,
    attributes: b.Attributes || null,
    method: b.Method || null,
    encrypted: b.Encrypted === "+",
    comment: b.Comment || null,
    type: isDir ? "Folder" : (ext ? ext.slice(1).toUpperCase() + " File" : "File"),
  };
}

function pwArg(password) {
  return password ? ["-p" + password] : [];
}

/** Resolve a possibly-multivolume archive to a concrete existing file. */
function resolveArchive(p) {
  try {
    if (fs.existsSync(p)) return p;
    if (fs.existsSync(p + ".001")) return p + ".001";
  } catch (_) {}
  return p;
}

async function list(archive, password) {
  archive = resolveArchive(archive);
  const args = ["l", "-slt", ...pwArg(password), archive];
  const r = await run7z(args, { timeoutMs: 120000 });
  if (!r.ok && !r.stdout.includes("----------")) {
    return { ok: false, error: r.stderr || "Failed to list archive", raw: r.stdout };
  }
  const { header, entries } = parseSlt(r.stdout);
  const norm = entries.map(normalizeEntry);
  const fileCount = norm.filter((e) => !e.isDir).length;
  const folderCount = norm.filter((e) => e.isDir).length;
  return {
    ok: true,
    archive: {
      path: archive,
      type: header.Type || null,
      method: header.Method || null,
      physicalSize: Number(header["Physical Size"] || header.PhysicalSize || 0) || null,
      totalSize: Number(header.Size || 0) || norm.reduce((a, e) => a + (e.size || 0), 0),
      packed: Number(header["Packed Size"] || 0) || norm.reduce((a, e) => a + (e.packed || 0), 0),
      files: fileCount,
      folders: folderCount,
      encrypted: header.Encrypted === "+",
      solid: header.Solid === "+",
    },
    entries: norm,
    raw: r.stdout,
  };
}

async function extract(archive, outDir, options = {}) {
  archive = resolveArchive(archive);
  fs.mkdirSync(outDir, { recursive: true });
  const args = ["x", archive, "-o" + outDir, "-y", ...pwArg(options.password)];
  if (options.overwrite === "skip") args.push("-aos");
  if (options.overwrite === "rename") args.push("-aou");
  if (options.files && options.files.length) args.push(...options.files);
  const r = await run7z(args, { onData: options.onData });
  return { ok: r.ok, code: r.code, output: r.stdout + r.stderr };
}

async function add(archive, files, options = {}) {
  // Guard against a leftover empty file (e.g. from an aborted create) being
  // treated as a corrupt archive by 7-Zip.
  try {
    if (fs.existsSync(archive) && fs.statSync(archive).size === 0) fs.unlinkSync(archive);
  } catch (_) {}

  const ext = path.extname(archive).toLowerCase().replace(".", "");
  const format = options.format || (ext === "zip" ? "zip" : ext === "tar" ? "tar" : ext === "gz" ? "gz" : "7z");
  const level = options.level ?? 5;
  const method = options.method || (format === "zip" ? "Deflate" : "LZMA2");

  const args = ["a", archive, ...files, "-y", "-mmt=on"];

  if (format) args.push("-t" + format);
  if (format !== "tar" && format !== "gz") {
    args.push("-m0=" + method, "-mx=" + level);
    if (options.dictionary && /LZMA/i.test(method)) args.push("-md=" + options.dictionary);
  }
  if (format === "7z" && options.solid !== undefined) args.push("-ms=" + (options.solid ? "on" : "off"));
  if (options.split) args.push("-v" + options.split);
  if (options.sfx && format === "7z") args.push("-sfx");
  if (options.password) {
    args.push("-p" + options.password);
    if (options.encryptNames && format === "7z") args.push("-mhe=on");
  }
  if (options.deleteAfter) args.push("-sdel");
  if (options.updateMode === "update") args.push("-u");
  if (options.updateMode === "freshen") args.push("-f");
  if (Array.isArray(options.exclude)) for (const x of options.exclude) if (x) args.push("-x!" + x);

  const r = await run7z(args, { cwd: options.cwd, onData: options.onData });
  return { ok: r.ok, code: r.code, output: r.stdout + r.stderr };
}

async function test(archive, password) {
  archive = resolveArchive(archive);
  const r = await run7z(["t", ...pwArg(password), archive]);
  return { ok: r.ok, output: r.stdout + r.stderr };
}

/** Run `7z t` and return a structured report. */
async function testReport(archive, password) {
  archive = resolveArchive(archive);
  const r = await run7z(["t", ...pwArg(password), archive], { timeoutMs: 0 });
  const text = r.stdout;
  const num = (label) => {
    const m = new RegExp(label + ":\\s*([0-9 ,]+)", "i").exec(text);
    return m ? Number(m[1].replace(/[ ,]/g, "")) : null;
  };
  const resultLine = text.match(/Everything is Ok|ERRORS?:|Sub items Errors/i);
  return {
    ok: r.ok,
    files: num("Files"),
    size: num("Size"),
    compressed: num("Compressed"),
    result: r.ok ? "Everything is Ok" : resultLine ? resultLine[0] : "Failed",
    output: text + r.stderr,
  };
}

/** Real compression benchmark using 7-Zip's built-in `b` command. */
async function benchmark(opts = {}) {
  const args = ["b"];
  if (opts.dictionary) args.push("-md=" + opts.dictionary);
  if (opts.threads) args.push("-mmt=" + opts.threads);
  const r = await run7z(args, { timeoutMs: 0 });
  const text = r.stdout;
  const lines = text.split(/\r?\n/);
  const tableRows = lines.filter((l) => /^\s*\d+:/.test(l) || /^\s*Avr:/.test(l) || /^\s*Tot:/.test(l));
  const cpuLine = lines.find((l) => /MHz/.test(l) && /(Intel|AMD|\(->\))/.test(l)) || "";
  const ramLine = lines.find((l) => /RAM size:/.test(l)) || "";
  const avr = lines.find((l) => /^\s*Avr:/.test(l));
  let compressKiB = null;
  let decompressKiB = null;
  if (avr) {
    const [left, right] = avr.replace(/^\s*Avr:/, "").split("|");
    const l = left.trim().split(/\s+/).map(Number);
    const rr = right ? right.trim().split(/\s+/).map(Number) : [];
    compressKiB = l[0];
    decompressKiB = rr[0];
  }
  const toMB = (k) => (k ? (k / 1024).toFixed(1) : null);
  const summary =
    compressKiB != null
      ? `Compressing ${toMB(compressKiB)} MB/s · Decompressing ${toMB(decompressKiB)} MB/s (12 threads, LZMA2)`
      : "";
  return { ok: r.ok, summary, cpuLine, ramLine, compressKiB, decompressKiB, rows: tableRows, output: text + r.stderr };
}

/** Compute compression ratio for an archive info object. */
function ratio(archive) {
  if (!archive || !archive.totalSize) return null;
  const p = archive.packed || archive.physicalSize || 0;
  if (!p) return null;
  return Math.round((1 - p / archive.totalSize) * 1000) / 10;
}

module.exports = { findEngine, run7z, list, extract, add, test, testReport, benchmark, ratio };
