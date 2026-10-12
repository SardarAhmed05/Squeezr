import { useState } from "react";
import { Modal, Tabs, Field } from "./Modal";

export interface AddOptions {
  archive: string;
  format: "7z" | "zip" | "tar";
  method: string;
  level: number;
  dictionary: string;
  solid: boolean;
  split: string;
  password: string;
  encryptNames: boolean;
  deleteAfter: boolean;
  updateMode: "replace" | "update" | "freshen";
  sfx: boolean;
  exclude: string[];
}

const METHODS: Record<string, string[]> = {
  "7z": ["LZMA2", "LZMA", "PPMd", "BZip2", "Deflate", "Copy"],
  zip: ["Deflate", "BZip2", "LZMA", "PPMd", "Copy"],
  tar: ["Copy"],
};

const DICTS = ["64K", "128K", "256K", "512K", "1M", "2M", "4M", "8M", "16M", "32M", "64M", "128M", "256M"];
const VOLUMES = ["None", "1M", "5M", "10M", "50M", "100M", "700M", "4480M"];
const LEVELS = ["Store", "Fastest", "Very fast", "Fast", "Fast", "Normal", "Good", "Good", "Best", "Best"];

function formatFromName(name: string): "7z" | "zip" | "tar" {
  const m = /\.(zip|tar|7z)$/i.exec(name);
  if (m) return m[1].toLowerCase() as any;
  return "7z";
}

export function AddDialog(props: {
  files: string[];
  initialName: string;
  onCancel: () => void;
  onSubmit: (o: AddOptions) => void;
}) {
  const [archive, setArchive] = useState(props.initialName || "new.7z");
  const [format, setFormat] = useState<"7z" | "zip" | "tar">(formatFromName(props.initialName || "new.7z"));
  const [method, setMethod] = useState("LZMA2");
  const [level, setLevel] = useState(5);
  const [dictionary, setDictionary] = useState("16M");
  const [solid, setSolid] = useState(true);
  const [split, setSplit] = useState("None");
  const [password, setPassword] = useState("");
  const [encryptNames, setEncryptNames] = useState(false);
  const [deleteAfter, setDeleteAfter] = useState(false);
  const [sfx, setSfx] = useState(false);
  const [updateMode, setUpdateMode] = useState<"replace" | "update" | "freshen">("replace");
  const [exclude, setExclude] = useState("");
  const [tab, setTab] = useState(0);

  const methods = METHODS[format];
  const showDict = format !== "tar" && /LZMA/i.test(method);

  function changeFormat(f: "7z" | "zip" | "tar") {
    setFormat(f);
    setMethod(METHODS[f][0]);
    setArchive((a) => a.replace(/\.(7z|zip|tar)$/i, "." + f));
  }

  async function browse() {
    const p = await window.wrc.saveArchiveDialog(archive);
    if (p) {
      setArchive(p);
      setFormat(formatFromName(p));
    }
  }

  const store = split === "None" ? "" : split.toLowerCase();

  return (
    <Modal
      title="Create archive"
      onClose={props.onCancel}
      width={680}
      footer={
        <>
          <button className="btn" onClick={props.onCancel}>
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={() =>
              props.onSubmit({
                archive,
                format,
                method,
                level,
                dictionary: dictionary.toLowerCase(),
                solid,
                split: store,
                password,
                encryptNames,
                deleteAfter,
                updateMode,
                sfx,
                exclude: exclude
                  .split(/[\r\n;]+/)
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          >
            Start
          </button>
        </>
      }
    >
      <Tabs tabs={["General", "Files", "Options", "Advanced"]} active={tab} onChange={setTab} />

      {tab === 0 && (
        <div className="form">
          <Field label="Output archive">
            <div className="row-inline">
              <input value={archive} onChange={(e) => setArchive(e.target.value)} className="grow" />
              <button className="btn" onClick={browse}>
                Choose…
              </button>
            </div>
          </Field>

          <div className="group">
            <div className="group-title">Format</div>
            <div className="row-inline">
              {(["7z", "zip", "tar"] as const).map((f) => (
                <label key={f} className="radio">
                  <input type="radio" checked={format === f} onChange={() => changeFormat(f)} />
                  {f === "7z" ? "7z (smallest)" : f === "zip" ? "ZIP" : "TAR"}
                </label>
              ))}
            </div>
          </div>

          <Field label="Method">
            <select value={method} onChange={(e) => setMethod(e.target.value)} disabled={format === "tar"}>
              {methods.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>

          <Field label={`Level: ${level} — ${LEVELS[level]}`}>
            <input type="range" min={0} max={9} value={level} onChange={(e) => setLevel(Number(e.target.value))} />
          </Field>

          <Field label="Dictionary">
            <select value={dictionary} onChange={(e) => setDictionary(e.target.value)} disabled={!showDict}>
              {DICTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>

          <Field label="Split into volumes">
            <select value={split} onChange={(e) => setSplit(e.target.value)}>
              {VOLUMES.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>

          <Field label="Update policy">
            <select value={updateMode} onChange={(e) => setUpdateMode(e.target.value as any)}>
              <option value="replace">Replace existing</option>
              <option value="update">Update newer only</option>
              <option value="freshen">Refresh existing only</option>
            </select>
          </Field>

          <div className="group">
            <div className="group-title">Options</div>
            <label className="check">
              <input type="checkbox" checked={solid} disabled={format !== "7z"} onChange={(e) => setSolid(e.target.checked)} />
              Solid block (smaller output, slower random access)
            </label>
            <label className="check">
              <input type="checkbox" checked={deleteAfter} onChange={(e) => setDeleteAfter(e.target.checked)} />
              Remove source files when done
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={sfx}
                disabled={format !== "7z"}
                onChange={(e) => setSfx(e.target.checked)}
              />
              Self-extracting executable (SFX)
            </label>
            <label className="check">
              <input type="checkbox" checked={encryptNames} disabled={!password || format !== "7z"} onChange={(e) => setEncryptNames(e.target.checked)} />
              Hide file names (needs a passphrase)
            </label>
          </div>

          <div className="group">
            <div className="group-title">Passphrase</div>
            <div className="row-inline">
              <input
                type="password"
                placeholder="None"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="grow"
              />
            </div>
          </div>
        </div>
      )}

      {tab === 1 && (
        <div className="form">
          <Field label={`Input files (${props.files.length})`}>
            <textarea className="mono" rows={5} readOnly value={props.files.join("\n")} />
          </Field>
          <Field label="Exclude masks (one per line)">
            <textarea className="mono" rows={3} value={exclude} onChange={(e) => setExclude(e.target.value)} placeholder="*.tmp&#10;*/cache/*" />
          </Field>
          <div className="muted">
            Paths are stored relative to the archive root. Use include/exclude masks to filter what goes in.
          </div>
        </div>
      )}

      {tab === 2 && (
        <div className="form">
          <div className="group">
            <div className="group-title">After compressing</div>
            <label className="radio">
              <input type="checkbox" checked={deleteAfter} onChange={(e) => setDeleteAfter(e.target.checked)} />
              Remove source files
            </label>
            <div className="muted">Recycle Bin / secure wipe are not wired up in this build; removal is permanent.</div>
          </div>
          <div className="group">
            <div className="group-title">Engine features</div>
            <label className="check">
              <input type="checkbox" disabled /> BLAKE2 content checksum
            </label>
            <label className="check">
              <input type="checkbox" disabled /> Store duplicate files as references
            </label>
          </div>
        </div>
      )}

      {tab === 3 && (
        <div className="form">
          <div className="group">
            <div className="group-title">NTFS metadata</div>
            <label className="check">
              <input type="checkbox" disabled /> Preserve access-control lists
            </label>
            <label className="check">
              <input type="checkbox" disabled /> Preserve alternate data streams
            </label>
          </div>
          <div className="group">
            <div className="group-title">Summary</div>
            <div className="muted">
              Output <b>{format.toUpperCase()}</b> · {method} · level <b>{level}</b>
              {showDict ? ` · dict ${dictionary}` : ""}
              {solid && format === "7z" ? " · solid" : ""}
              {store ? ` · split ${split}` : ""}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
