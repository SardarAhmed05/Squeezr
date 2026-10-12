"use strict";

/*
 * Cross-format verification harness for the Squeezr engine.
 * Creates archives in every supported format, then lists, tests, extracts
 * and verifies extracted bytes against the source via SHA-256.
 */

const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const crypto = require("node:crypto");
const engine = require("../electron/engine.cjs");

const ROOT = path.join(os.tmpdir(), "wrc_verify");
const SRC = path.join(ROOT, "src");
const OUT = path.join(ROOT, "out");
const results = [];

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function hashDir(dir) {
  const map = {};
  const walk = (d, base) => {
    for (const it of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, it.name);
      const rel = path.join(base, it.name).replace(/\\/g, "/");
      if (it.isDirectory()) walk(full, rel);
      else map[rel] = sha256(fs.readFileSync(full));
    }
  };
  walk(dir, "");
  return map;
}

function sameSet(a, b) {
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  if (ka.length !== kb.length) return false;
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] !== kb[i] || a[ka[i]] !== b[kb[i]]) return false;
  }
  return true;
}

function setup() {
  fs.rmSync(ROOT, { recursive: true, force: true });
  fs.mkdirSync(path.join(SRC, "sub"), { recursive: true });
  fs.mkdirSync(path.join(SRC, "empty"), { recursive: true });
  fs.writeFileSync(path.join(SRC, "a.txt"), "Hello Squeezr\n".repeat(50));
  fs.writeFileSync(path.join(SRC, "sub", "b.txt"), "second file\n".repeat(200));
  fs.writeFileSync(path.join(SRC, "sub", "c.bin"), crypto.randomBytes(200000));
  fs.mkdirSync(OUT, { recursive: true });
}

async function caseRun(name, filename, addOpts, { password, extractPassword, expectExtractFail } = {}) {
  const arc = path.join(OUT, filename);
  const record = { name, filename, pass: false, note: "" };
  try {
    // Create
    const add = await engine.add(arc, [path.join(SRC, "*")], { password, ...addOpts });
    if (!add.ok) {
      record.note = "create failed: " + add.output.split("\n").slice(-3).join(" ").trim();
      results.push(record);
      return;
    }
    // List
    const list = await engine.list(arc, password);
    record.type = list.archive?.type;
    record.ratio = list.ok ? engine.ratio(list.archive) : null;
    record.files = list.archive?.files;
    // Test
    const test = await engine.test(arc, password);
    // Extract
    const dest = path.join(OUT, name.replace(/[^a-z0-9]/gi, "_"));
    const ex = await engine.extract(arc, dest, { password: extractPassword ?? password });
    if (expectExtractFail) {
      record.pass = !ex.ok;
      record.note = ex.ok ? "expected failure but succeeded" : "correctly failed";
      results.push(record);
      return;
    }
    const extracted = hashDir(dest);
    const source = hashDir(SRC);
    const match = sameSet(extracted, source);
    record.pass = list.ok && test.ok && ex.ok && match;
    record.note = `create=${add.ok} list=${list.ok} test=${test.ok} extract=${ex.ok} bytesMatch=${match}`;
  } catch (e) {
    record.note = "error: " + String(e);
  }
  results.push(record);
}

async function main() {
  setup();
  console.log("Sample source files:");
  for (const [k, v] of Object.entries(hashDir(SRC))) console.log(`  ${k}  ${v.slice(0, 12)}…`);

  await caseRun("7z LZMA2 lvl9 solid", "lzma2.7z", { format: "7z", method: "LZMA2", level: 9, solid: true });
  await caseRun("7z LZMA2 lvl1", "lzma2fast.7z", { format: "7z", method: "LZMA2", level: 1, solid: true });
  await caseRun("7z PPMd lvl9", "ppmd.7z", { format: "7z", method: "PPMd", level: 9 });
  await caseRun("7z BZip2 lvl9", "bzip2.7z", { format: "7z", method: "BZip2", level: 9 });
  await caseRun("ZIP Deflate lvl9", "deflate.zip", { format: "zip", method: "Deflate", level: 9 });
  await caseRun("TAR (store)", "plain.tar", { format: "tar" });
  await caseRun("7z encrypted", "enc.7z", { format: "7z", method: "LZMA2", level: 7 }, { password: "hunter2" });
  await caseRun("7z split 100k", "split.7z", { format: "7z", method: "LZMA2", level: 5, split: "100k" });
  await caseRun("7z SFX", "sfx.exe", { format: "7z", method: "LZMA2", level: 5, sfx: true });

  // Negative: data-only encryption protects contents but not names.
  const encArc = path.join(OUT, "enc.7z");
  const noPwTest = await engine.test(encArc);
  results.push({
    name: "encrypted data requires password (test w/o pw fails)",
    filename: "enc.7z",
    pass: !noPwTest.ok,
    note: `test w/o pw ok=${noPwTest.ok} (expected false)`,
  });
  const wrong = await engine.test(encArc, "wrongpass");
  results.push({ name: "encrypted rejects wrong password", filename: "enc.7z", pass: !wrong.ok, note: `test wrong pw ok=${wrong.ok}` });

  // Header encryption: listing must require the password.
  const encHdr = path.join(OUT, "encnames.7z");
  await engine.add(encHdr, [path.join(SRC, "*")], {
    format: "7z",
    method: "LZMA2",
    level: 5,
    password: "hunter2",
    encryptNames: true,
  });
  const hdrNoPw = await engine.list(encHdr);
  const hdrPw = await engine.list(encHdr, "hunter2");
  results.push({
    name: "encrypted headers hide names (list w/o pw fails)",
    filename: "encnames.7z",
    pass: !hdrNoPw.ok && hdrPw.ok,
    note: `list w/o pw ok=${hdrNoPw.ok} (expected false), with pw ok=${hdrPw.ok}`,
  });

  // RAR interoperability: create a .rar with an external RAR CLI (if available),
  // then read/list/test/extract it with the Squeezr engine.
  // Provide the CLI path via the WRC_TEST_RAR environment variable.
  const rarPath = path.join(OUT, "external.rar");
  const rarExe = process.env.WRC_TEST_RAR && fs.existsSync(process.env.WRC_TEST_RAR) ? process.env.WRC_TEST_RAR : null;
  if (rarExe) {
    const { spawnSync } = require("node:child_process");
    spawnSync(rarExe, ["a", "-r", "-ep1", rarPath, path.join(SRC, "*")], { windowsHide: true });
    const rl = await engine.list(rarPath);
    const rt = await engine.test(rarPath);
    const rdest = path.join(OUT, "rar_extract");
    const rx = await engine.extract(rarPath, rdest, {});
    const rmatch = rx.ok && sameSet(hashDir(rdest), hashDir(SRC));
    results.push({
      name: "RAR (external tool) read/list/test/extract",
      filename: "external.rar",
      type: rl.archive?.type,
      ratio: rl.ok ? engine.ratio(rl.archive) : null,
      pass: rl.ok && rt.ok && rx.ok && rmatch,
      note: `list=${rl.ok} test=${rt.ok} extract=${rx.ok} bytesMatch=${rmatch}`,
    });
  } else {
    results.push({ name: "RAR interoperability", skip: true, note: "skipped — set WRC_TEST_RAR to a RAR CLI path to enable" });
  }

  // Report
  console.log("\n================ VERIFICATION MATRIX ================");
  let pass = 0;
  let skip = 0;
  for (const r of results) {
    if (r.skip) {
      skip++;
      console.log(`SKIP  ${r.name.padEnd(42)}`);
      console.log(`      ${r.note}`);
      continue;
    }
    const status = r.pass ? "PASS" : "FAIL";
    if (r.pass) pass++;
    const extra = [r.type ? `type=${r.type}` : "", r.ratio != null ? `ratio=${r.ratio}%` : ""].filter(Boolean).join(" ");
    console.log(`${status}  ${r.name.padEnd(42)} ${extra}`);
    console.log(`      ${r.note}`);
  }
  const total = results.length - skip;
  console.log(`\n${pass}/${total} checks passed${skip ? ` (${skip} skipped)` : ""}`);
  process.exit(pass === total ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
