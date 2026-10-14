import { useEffect, useState } from "react";
import { Modal, Tabs } from "./Modal";

export function SettingsDialog(props: { onClose: () => void; onSaved?: (s: any) => void }) {
  const [tab, setTab] = useState(0);
  const [s, setS] = useState<any>(null);
  const [shellMenu, setShellMenu] = useState<boolean | null>(null);

  useEffect(() => {
    window.wrc.settingsGet().then(setS);
    window.wrc.contextMenuGet().then(setShellMenu);
  }, []);

  if (!s) return null;
  const set = (k: string, v: any) => setS({ ...s, [k]: v });

  async function save() {
    if (shellMenu !== null) {
      await window.wrc.contextMenuSet(shellMenu);
      s.shellMenu = shellMenu;
    }
    const next = await window.wrc.settingsSet(s);
    props.onSaved?.(next);
    props.onClose();
  }

  return (
    <Modal
      title="Preferences"
      width={680}
      onClose={props.onClose}
      footer={
        <>
          <button className="btn" onClick={props.onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={save}>
            Save
          </button>
        </>
      }
    >
      <Tabs tabs={["Engine", "Paths", "Interface", "Shell", "Viewer"]} active={tab} onChange={setTab} />
      {tab === 0 && (
        <div className="form">
          <div className="group">
            <div className="group-title">Default format</div>
            <div className="row-inline">
              {(["7z", "zip", "tar"] as const).map((f) => (
                <label key={f} className="radio">
                  <input type="radio" checked={s.format === f} onChange={() => set("format", f)} />
                  {f.toUpperCase()}
                </label>
              ))}
            </div>
          </div>
          <div className="group">
            <div className="group-title">Default method</div>
            <div className="row-inline">
              <span className="field-label">Algorithm</span>
              <select value={s.method} onChange={(e) => set("method", e.target.value)}>
                {["LZMA2", "LZMA", "PPMd", "BZip2", "Deflate", "Copy"].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
              <span className="field-label">Level</span>
              <input
                type="range"
                min={0}
                max={9}
                value={s.level}
                onChange={(e) => set("level", Number(e.target.value))}
              />
              <b>{s.level}</b>
            </div>
            <label className="check">
              <input type="checkbox" checked={s.solid} onChange={(e) => set("solid", e.target.checked)} />
              Use solid blocks by default
            </label>
            <label className="check">
              <input type="checkbox" checked={s.encryptNames} onChange={(e) => set("encryptNames", e.target.checked)} />
              Hide file names by default
            </label>
          </div>
        </div>
      )}
      {tab === 1 && (
        <div className="form">
          <div className="group">
            <div className="group-title">When extracting</div>
            <div className="row-inline">
              <span className="field-label">If a file exists</span>
              <select value={s.extractOverwrite} onChange={(e) => set("extractOverwrite", e.target.value)}>
                {["ask", "overwrite", "skip", "rename"].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="row-inline">
              <span className="field-label">Match by</span>
              <select value={s.extractUpdate} onChange={(e) => set("extractUpdate", e.target.value)}>
                {["replace", "update", "freshen"].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
      {tab === 2 && (
        <div className="form">
          <div className="group">
            <div className="group-title">Appearance</div>
            <div className="row-inline">
              <span className="field-label">Theme</span>
              <select value={s.theme} onChange={(e) => set("theme", e.target.value)}>
                <option value="light">Light (white)</option>
                <option value="dark">Dark (planned)</option>
              </select>
            </div>
            <div className="muted">Clean light chrome with an original icon set.</div>
          </div>
        </div>
      )}
      {tab === 3 && (
        <div className="form">
          <div className="group">
            <div className="group-title">Explorer integration</div>
            <label className="check">
              <input
                type="checkbox"
                checked={!!shellMenu}
                disabled={shellMenu === null}
                onChange={(e) => setShellMenu(e.target.checked)}
              />
              Show Squeezr in the file right-click menu
            </label>
            <div className="muted">
              Adds a <b>Squeezr</b> submenu (Open / Extract Here / Extract to a new folder / Test) on archive files,
              and <b>Compress with Squeezr…</b> on all files. Per-user; no admin needed. On Windows 11 these appear
              under <b>Show more options</b>.
            </div>
          </div>
        </div>
      )}
      {tab === 4 && (
        <div className="form">
          <div className="group">
            <div className="group-title">Viewer</div>
            <div className="muted">In-app preview settings are planned next.</div>
          </div>
        </div>
      )}
    </Modal>
  );
}
