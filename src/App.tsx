import { useEffect, useMemo, useRef, useState } from "react";
import { MAIN_MENU, TOOLBAR, type MenuItem } from "./menuData";
import { Icon } from "./icons";
import { AddDialog, type AddOptions } from "./dialogs/AddDialog";
import { ExtractDialog, type ExtractOptions } from "./dialogs/ExtractDialog";
import { PasswordDialog } from "./dialogs/PasswordDialog";
import { SettingsDialog } from "./dialogs/SettingsDialog";
import { InfoDialog } from "./dialogs/InfoDialog";
import { ReportDialog } from "./dialogs/ReportDialog";
import { BenchmarkDialog } from "./dialogs/BenchmarkDialog";
import { FavoritesDialog } from "./dialogs/FavoritesDialog";
import { WizardDialog } from "./dialogs/WizardDialog";

interface Entry {
  path: string;
  name: string;
  isDir: boolean;
  size: number | null;
  packed: number | null;
  type: string;
  modified: string | null;
  created: string | null;
  crc?: string | null;
  attributes?: string | null;
  encrypted?: boolean;
  method?: string | null;
}

type Mode = "fs" | "archive";

const ARCHIVE_EXT = /\.(rar|zip|7z|tar|gz|tgz|bz2|xz|iso|cab|arj|lzh|z|001)$/i;

function fmtBytes(n: number | null | undefined): string {
  if (n === null || n === undefined) return "";
  if (n < 1024) return `${n}`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${units[i]}`;
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function buildVisible(entries: Entry[], prefix: string): Entry[] {
  const out = new Map<string, Entry>();
  const base = prefix ? (prefix.endsWith("/") ? prefix : prefix + "/") : "";
  for (const e of entries) {
    if (!e.path.startsWith(base)) continue;
    const rest = e.path.slice(base.length);
    if (rest === "") continue;
    const slash = rest.indexOf("/");
    if (slash === -1) {
      out.set(e.path, e);
    } else {
      const folder = base + rest.slice(0, slash);
      if (!out.has(folder)) {
        out.set(folder, {
          path: folder,
          name: rest.slice(0, slash),
          isDir: true,
          size: null,
          packed: null,
          type: "Folder",
          modified: null,
          created: null,
        });
      }
    }
  }
  return [...out.values()].sort((a, b) =>
    a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1
  );
}

export default function App() {
  const [enginePath, setEnginePath] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("fs");
  const [cwd, setCwd] = useState<string>("");
  const [archivePath, setArchivePath] = useState<string | null>(null);
  const [archivePrefix, setArchivePrefix] = useState("");
  const [fsEntries, setFsEntries] = useState<Entry[]>([]);
  const [arcEntries, setArcEntries] = useState<Entry[]>([]);
  const [archiveInfo, setArchiveInfo] = useState<any>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState("Ready");
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | { kind: "about" | "extract" | "add" | "progress" | "message"; title: string; text: string }>(null);
  const [addState, setAddState] = useState<{ files: string[]; name: string } | null>(null);
  const [extractState, setExtractState] = useState<{ count: number; defaultDest: string } | null>(null);
  const [pwState, setPwState] = useState<{ archive: string } | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showBench, setShowBench] = useState(false);
  const [showFav, setShowFav] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [addressDraft, setAddressDraft] = useState("");
  const [drives, setDrives] = useState<string[]>([]);
  const sortRef = useRef<{ key: keyof Entry; dir: 1 | -1 }>({ key: "name", dir: 1 });

  useEffect(() => {
    window.wrc.engineInfo().then((i) => setEnginePath(i.path));
    window.wrc.settingsGet().then(setSettings);
    window.wrc.drives().then((d) => {
      setDrives(d);
      const first = d.find((x) => x.toUpperCase().startsWith("C")) || d[0];
      if (first) loadDir(first);
    });
    const off = window.wrc.onOpenFile((p) => openArchive(p));
    return () => off();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entries = mode === "archive" ? buildVisible(arcEntries, archivePrefix) : fsEntries;

  useEffect(() => {
    setAddressDraft(mode === "archive" ? (archivePath || "") + (archivePrefix ? "\\" + archivePrefix : "") : cwd);
  }, [mode, archivePath, archivePrefix, cwd]);

  async function loadDir(dir: string) {
    setBusy(true);
    const r = await window.wrc.listDir(dir);
    setBusy(false);
    if (!r.ok) {
      setStatus(`Cannot open ${dir}: ${r.error}`);
      return;
    }
    setMode("fs");
    setArchivePath(null);
    setArchivePrefix("");
    setCwd(dir);
    setFsEntries(r.entries);
    setSelected(new Set());
    setStatus(`${entries_label(r.entries.length)} in ${dir}`);
  }

  function entries_label(n: number) {
    return `${n} item${n === 1 ? "" : "s"}`;
  }

  async function openArchive(p: string, pw?: string) {
    setBusy(true);
    setStatus(`Reading ${p} ...`);
    const r = await window.wrc.list(p, pw ?? password);
    setBusy(false);
    if (!r.ok) {
      const txt = `${r.error || ""} ${r.raw || ""}`;
      if (/password|encrypt|wrong|cannot open/i.test(txt)) {
        setPwState({ archive: p });
        setStatus("Archive is encrypted — enter the passphrase.");
      } else {
        setStatus(`Failed to open archive: ${r.error || "unknown error"}`);
      }
      return;
    }
    setMode("archive");
    setArchivePath(p);
    setArchivePrefix("");
    setArcEntries(r.entries);
    setArchiveInfo(r.archive);
    setSelected(new Set());
    const a = r.archive;
    setStatus(
      `Archive ${a.type || ""} · ${a.files ?? "?"} files · ${a.folders ?? "?"} folders · ${fmtBytes(a.physicalSize)}`
    );
  }

  function goUp() {
    if (mode === "archive") {
      if (archivePrefix) {
        const parts = archivePrefix.split("/").filter(Boolean);
        parts.pop();
        setArchivePrefix(parts.join("/"));
      } else {
        setArchivePath(null);
        loadDir(cwd || "C:\\");
      }
      return;
    }
    const parent = cwd.replace(/[\\/]+$/, "").split(/[\\/]/).slice(0, -1).join("\\") || cwd.slice(0, 2);
    loadDir(parent);
  }

  async function onActivate(e: Entry) {
    if (mode === "fs") {
      if (e.isDir) return loadDir(e.path);
      if (ARCHIVE_EXT.test(e.name)) return openArchive(e.path);
      await window.wrc.openPath(e.path);
      return;
    }
    if (e.isDir) {
      setArchivePrefix(e.path);
      setSelected(new Set());
      return;
    }
    // extract single file to temp then open
    const tmp = (cwd || "C:\\") + "\\__wrc_tmp";
    setBusy(true);
    await window.wrc.extract(archivePath!, tmp, { files: [e.path], password });
    setBusy(false);
    await window.wrc.openPath(tmp + "\\" + e.path.replace(/\//g, "\\"));
  }

  function toggleSelect(e: Entry, additive: boolean) {
    setSelected((prev) => {
      const next = additive ? new Set(prev) : new Set<string>();
      if (additive && prev.has(e.path)) next.delete(e.path);
      else next.add(e.path);
      return next;
    });
  }

  const selectedEntries = useMemo(() => entries.filter((e) => selected.has(e.path)), [entries, selected]);

  function info(text: string, title = "Squeezr") {
    setDialog({ kind: "message", title, text });
  }

  /* ---------------- commands ---------------- */
  async function addToArchive() {
    let files: string[] = [];
    if (mode === "archive") {
      const picked = await window.wrc.openFilesDialog();
      if (!picked || !picked.length) return;
      files = picked;
    } else if (selectedEntries.length) {
      files = selectedEntries.map((e) => e.path);
    } else {
      const picked = await window.wrc.openFilesDialog();
      if (!picked || !picked.length) return;
      files = picked;
    }
    const name = mode === "archive" && archivePath ? archivePath : `new.${settings?.format || "7z"}`;
    setAddState({ files, name });
  }

  async function performAdd(o: AddOptions, files: string[]) {
    setAddState(null);
    setBusy(true);
    setStatus(`Compressing ${files.length} item(s) → ${o.archive} (${o.format.toUpperCase()}/${o.method}, level ${o.level}) ...`);
    const r = await window.wrc.add(o.archive, files, {
      format: o.format,
      method: o.method,
      level: o.level,
      dictionary: o.dictionary,
      solid: o.solid,
      split: o.split || undefined,
      password: o.password || undefined,
      encryptNames: o.encryptNames,
      deleteAfter: o.deleteAfter,
      updateMode: o.updateMode,
      sfx: o.sfx,
      exclude: o.exclude,
    });
    setBusy(false);
    if (!r.ok) return info(r.output, "Compression failed");
    await openArchive(o.archive, o.password || undefined);
    setStatus(`Created ${o.archive}`);
  }

  function extractTo() {
    if (mode !== "archive") return info("Open an archive first.");
    if (!selectedEntries.length) return info("Select the files to extract first.");
    const base = (archivePath || "archive").replace(/^.*[\\/]/, "").replace(/\.[^.]+$/, "");
    const def = (cwd || "C:\\") + "\\" + base;
    setExtractState({ count: selectedEntries.length, defaultDest: def });
  }

  async function performExtract(o: ExtractOptions, files: string[]) {
    setExtractState(null);
    setBusy(true);
    setStatus(`Extracting ${files.length} item(s) to ${o.dest} ...`);
    const r = await window.wrc.extract(archivePath!, o.dest, {
      files,
      password: o.password || undefined,
      overwrite: o.overwrite === "skip" ? "skip" : o.overwrite === "rename" ? "rename" : "overwrite",
    });
    setBusy(false);
    if (!r.ok) return info(r.output, "Extraction failed");
    setStatus(`Extracted to ${o.dest}`);
    if (o.displayInExplorer) await window.wrc.openPath(o.dest);
    if (o.deleteArchive === "always" && archivePath) {
      try {
        await window.wrc.openPath(archivePath);
      } catch (_) {}
    }
  }

  async function testArchive() {
    if (mode !== "archive") return info("Open an archive first.");
    setShowReport(true);
    setReport(null);
    setReportBusy(true);
    setStatus("Testing archive ...");
    const r = await window.wrc.report(archivePath!, password);
    setReportBusy(false);
    setReport(r);
    setStatus(r.ok ? "Check passed — everything OK" : "Check found problems");
  }

  function dispatch(id: number) {
    setMenuOpen(null);
    switch (id) {
      case 201:
        return window.wrc.openArchiveDialog().then((p) => {
          if (p) return openArchive(p);
        });
      case 202:
        return info("Duplicating an archive is not wired up yet.", "Not yet implemented");
      case 203:
        return window.wrc.selectDirectoryDialog("Change drive").then((d) => {
          if (d) return loadDir(d);
        });
      case 210:
        window.close();
        return;
      case 220:
        return addToArchive();
      case 230:
        return extractTo();
      case 231:
        return testArchive();
      case 240:
        return setShowWizard(true);
      case 241:
        return setShowInfo(true);
      case 242:
        return testArchive();
      case 246:
        return setShowBench(true);
      case 250:
      case 251:
        return setShowFav(true);
      case 260:
        return setShowSettings(true);
      case 280:
        return info("Open, create, extract and verify archives from the menu bar.", "Help");
      case 284:
        return setDialog({ kind: "about", title: "About Squeezr", text: "" });
      default:
        return info(`Command #${id} — not yet implemented in this vertical slice.`, "Command");
    }
  }

  function renderMenu(items: MenuItem[], depth: number): JSX.Element {
    return (
      <div className={depth === 0 ? "menu-dropdown" : "menu-dropdown submenu"}>
        {items.map((it, i) => {
          if (it.sep) return <div key={i} className="menu-sep" />;
          const [label, accel] = (it.label || "").split("\t");
          if (it.children) {
            return (
              <div key={i} className="menu-item has-sub">
                <span className="menu-label">{label}</span>
                <span className="menu-arrow">›</span>
                {renderMenu(it.children, depth + 1)}
              </div>
            );
          }
          return (
            <div key={i} className="menu-item" onClick={() => it.id !== undefined && dispatch(it.id)}>
              <span className="menu-label">{label}</span>
              {accel && <span className="menu-accel">{accel}</span>}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="app" onClick={() => menuOpen && setMenuOpen(null)}>
      {/* Menu bar */}
      <div className="menubar" onClick={(e) => e.stopPropagation()}>
        {MAIN_MENU.map((m) => {
          const label = (m.label || "").replace("&", "");
          return (
            <div
              key={label}
              className={"menu-tab" + (menuOpen === label ? " active" : "")}
              onClick={() => setMenuOpen(menuOpen === label ? null : label)}
              onMouseEnter={() => menuOpen && setMenuOpen(label)}
            >
              {label}
              {menuOpen === label && renderMenu(m.children || [], 0)}
            </div>
          );
        })}
        <div className="menubar-spacer" />
        <div className="menubar-engine" title={enginePath || ""}>
          engine: {enginePath ? "7-Zip · LZMA2" : "not found"}
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        {TOOLBAR.map((b) => (
          <button key={b.id} className="tool" title={b.label} onClick={() => dispatch(b.id)}>
            <Icon name={b.icon} size={22} />
            <span>{b.label}</span>
          </button>
        ))}
      </div>

      {/* Address bar */}
      <div className="addressbar">
          <button className="nav-btn" onClick={goUp} title="Go up">
          ↑
        </button>
        <button className="nav-btn" onClick={() => loadDir("C:\\")} title="This PC">
          🖥
        </button>
        <input
          className="address"
          value={addressDraft}
          onChange={(e) => setAddressDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const v = addressDraft.trim();
              if (ARCHIVE_EXT.test(v)) openArchive(v);
              else loadDir(v);
            }
          }}
          spellCheck={false}
        />
      </div>

      <div className="body">
        {/* Tree */}
        <div className="tree">
          <div className="tree-title">Computer</div>
          {drives.map((d) => (
            <div
              key={d}
              className={"tree-item" + (mode === "archive" ? "" : cwd?.toUpperCase().startsWith(d) ? " active" : "")}
              onClick={() => loadDir(d)}
            >
              <span className="tree-icon">💽</span>
              {d}
            </div>
          ))}
          {mode === "archive" && (
            <>
              <div className="tree-title">Archive</div>
              <div className="tree-item active" title={archivePath || ""}>
                <span className="tree-icon">🗜</span>
                {archivePath}
              </div>
            </>
          )}
        </div>

        {/* File list */}
        <div className="list">
          <div className="list-head">
            <span className="c-name">Name</span>
            <span className="c-size">Size</span>
            <span className="c-packed">Packed</span>
            <span className="c-type">Type</span>
            <span className="c-mod">Modified</span>
            <span className="c-crc">{mode === "archive" ? "CRC32" : "Attributes"}</span>
          </div>
          <div className="list-body">
            {mode === "archive" && archivePrefix && (
              <div className="row dir" onDoubleClick={goUp}>
                <span className="c-name">📁 ..</span>
                <span className="c-size" />
                <span className="c-packed" />
                <span className="c-type">Up</span>
                <span className="c-mod" />
                <span className="c-crc" />
              </div>
            )}
            {entries.map((e) => (
              <div
                key={e.path}
                className={"row" + (e.isDir ? " dir" : "") + (selected.has(e.path) ? " sel" : "")}
                onClick={(ev) => toggleSelect(e, ev.ctrlKey || ev.metaKey || ev.shiftKey)}
                onDoubleClick={() => onActivate(e)}
              >
                <span className="c-name">
                  <span className="ficon">{e.isDir ? "📁" : "📄"}</span>
                  {e.name}
                </span>
                <span className="c-size">{e.isDir ? "" : fmtBytes(e.size)}</span>
                <span className="c-packed">{e.isDir ? "" : fmtBytes(e.packed)}</span>
                <span className="c-type">{e.type}</span>
                <span className="c-mod">{fmtDate(e.modified)}</span>
                <span className="c-crc">{mode === "archive" ? e.crc || "" : e.attributes || ""}</span>
              </div>
            ))}
            {entries.length === 0 && <div className="empty">{busy ? "Working..." : "This folder is empty."}</div>}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="statusbar">
        <span className="status-msg">{busy ? "⏳ " + status : status}</span>
        <span className="status-right">
          {selected.size > 0 && `${selected.size} selected · `}
          {mode === "archive" ? "Archive mode" : "Filesystem mode"}
        </span>
      </div>

      {showSettings && (
        <SettingsDialog onClose={() => setShowSettings(false)} onSaved={(s) => setSettings(s)} />
      )}

      {showInfo && (
        <InfoDialog
          info={archiveInfo}
          archivePath={archivePath}
          entries={arcEntries.length}
          onClose={() => setShowInfo(false)}
        />
      )}

      {showReport && (
        <ReportDialog
          archivePath={archivePath || ""}
          busy={reportBusy}
          report={report}
          onClose={() => setShowReport(false)}
          onRerun={testArchive}
        />
      )}

      {showBench && <BenchmarkDialog onClose={() => setShowBench(false)} />}

      {showFav && (
        <FavoritesDialog
          currentPath={mode === "archive" ? archivePath : cwd}
          onOpen={(p) => {
            setShowFav(false);
            if (ARCHIVE_EXT.test(p)) openArchive(p);
            else loadDir(p);
          }}
          onClose={() => setShowFav(false)}
        />
      )}

      {showWizard && (
        <WizardDialog
          onAdd={() => {
            setShowWizard(false);
            addToArchive();
          }}
          onExtract={() => {
            setShowWizard(false);
            window.wrc.openArchiveDialog().then((p) => {
              if (p) openArchive(p);
            });
          }}
          onClose={() => setShowWizard(false)}
        />
      )}

      {addState && (
        <AddDialog
          files={addState.files}
          initialName={addState.name}
          onCancel={() => setAddState(null)}
          onSubmit={(o) => performAdd(o, addState.files)}
        />
      )}

      {extractState && (
        <ExtractDialog
          archivePath={archivePath || ""}
          count={extractState.count}
          defaultDest={extractState.defaultDest}
          onCancel={() => setExtractState(null)}
          onSubmit={(o) => performExtract(o, selectedEntries.map((e) => e.path))}
        />
      )}

      {pwState && (
        <PasswordDialog
          archive={pwState.archive}
          onSubmit={(pw) => {
            const a = pwState.archive;
            setPwState(null);
            setPassword(pw);
            openArchive(a, pw);
          }}
          onCancel={() => setPwState(null)}
        />
      )}

      {dialog && (
        <div className="modal-backdrop" onClick={() => setDialog(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{dialog.title}</div>
            <div className="modal-body">
              {dialog.kind === "about" ? (
                <>
                  <div className="about-logo">
                    <img src="./img/logo.png" alt="logo" />
                  </div>
                  <p>
                    <b>{__APP_NAME__}</b> <span className="muted">v{__APP_VERSION__}</span> — a fast, white-themed
                    archiver. Create and open 7z/ZIP/TAR and extract RAR, ZIP, 7z and more.
                  </p>
                  <p className="muted">
                    Engine: bundled 7-Zip (LGPL) · LZMA2 / PPMd, fully multithreaded.
                  </p>
                  <p className="muted">
                    Inspired by the classic WinRAR interface. Independent project — not affiliated with,
                    endorsed by, or sponsored by win.rar GmbH. "WinRAR" and "RAR" are trademarks of win.rar GmbH.
                  </p>
                </>
              ) : (
                <pre className="modal-pre">{dialog.text}</pre>
              )}
            </div>
            <div className="modal-actions">
              <button onClick={() => setDialog(null)}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
