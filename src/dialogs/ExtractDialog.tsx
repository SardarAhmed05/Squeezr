import { useState } from "react";
import { Modal, Tabs, Field } from "./Modal";

export interface ExtractOptions {
  dest: string;
  updateMode: "replace" | "update" | "freshen";
  overwrite: "ask" | "overwrite" | "skip" | "rename";
  password: string;
  keepBroken: boolean;
  paths: "relative" | "full" | "none";
  displayInExplorer: boolean;
  deleteArchive: "never" | "ask" | "always";
}

export function ExtractDialog(props: {
  archivePath: string;
  count: number;
  defaultDest: string;
  onCancel: () => void;
  onSubmit: (o: ExtractOptions) => void;
}) {
  const [dest, setDest] = useState(props.defaultDest);
  const [updateMode, setUpdateMode] = useState<ExtractOptions["updateMode"]>("replace");
  const [overwrite, setOverwrite] = useState<ExtractOptions["overwrite"]>("ask");
  const [password, setPassword] = useState("");
  const [keepBroken, setKeepBroken] = useState(true);
  const [paths, setPaths] = useState<ExtractOptions["paths"]>("full");
  const [displayInExplorer, setDisplayInExplorer] = useState(false);
  const [deleteArchive, setDeleteArchive] = useState<ExtractOptions["deleteArchive"]>("never");
  const [tab, setTab] = useState(0);

  async function browse() {
    const p = await window.wrc.selectDirectoryDialog("Choose target folder");
    if (p) setDest(p);
  }

  return (
    <Modal
      title={`Extract — ${props.count} item(s)`}
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
              props.onSubmit({ dest, updateMode, overwrite, password, keepBroken, paths, displayInExplorer, deleteArchive })
            }
          >
            Start
          </button>
        </>
      }
    >
      <Tabs tabs={["General", "Advanced", "Options"]} active={tab} onChange={setTab} />

      {tab === 0 && (
        <div className="form">
          <Field label="Target folder (created if it doesn't exist)">
            <div className="row-inline">
              <input className="grow" value={dest} onChange={(e) => setDest(e.target.value)} />
              <button className="btn" onClick={browse}>
                Choose…
              </button>
            </div>
          </Field>

          <div className="group">
            <div className="group-title">Update policy</div>
            {(
              [
                ["replace", "Replace existing files"],
                ["update", "Update changed files"],
                ["freshen", "Refresh existing only"],
              ] as const
            ).map(([v, l]) => (
              <label key={v} className="radio">
                <input type="radio" checked={updateMode === v} onChange={() => setUpdateMode(v)} />
                {l}
              </label>
            ))}
          </div>

          <div className="group">
            <div className="group-title">Overwrite policy</div>
            {(
              [
                ["ask", "Confirm each overwrite"],
                ["overwrite", "Overwrite silently"],
                ["skip", "Keep existing files"],
                ["rename", "Auto-rename"],
              ] as const
            ).map(([v, l]) => (
              <label key={v} className="radio">
                <input type="radio" checked={overwrite === v} onChange={() => setOverwrite(v)} />
                {l}
              </label>
            ))}
          </div>

          <div className="group">
            <div className="group-title">More</div>
            <label className="check">
              <input type="checkbox" checked={keepBroken} onChange={(e) => setKeepBroken(e.target.checked)} />
              Keep partial files
            </label>
            <label className="check">
              <input type="checkbox" checked={displayInExplorer} onChange={(e) => setDisplayInExplorer(e.target.checked)} />
              Open the folder when done
            </label>
          </div>
        </div>
      )}

      {tab === 1 && (
        <div className="form">
          <div className="group">
            <div className="group-title">Path handling</div>
            {(
              [
                ["relative", "Keep relative paths"],
                ["full", "Keep full paths"],
                ["none", "Flatten paths"],
              ] as const
            ).map(([v, l]) => (
              <label key={v} className="radio">
                <input type="radio" checked={paths === v} onChange={() => setPaths(v)} />
                {l}
              </label>
            ))}
          </div>
          <div className="group">
            <div className="group-title">After extraction</div>
            {(
              [
                ["never", "Keep the archive"],
                ["ask", "Ask before removing"],
                ["always", "Remove the archive"],
              ] as const
            ).map(([v, l]) => (
              <label key={v} className="radio">
                <input type="radio" checked={deleteArchive === v} onChange={() => setDeleteArchive(v)} />
                {l}
              </label>
            ))}
          </div>
        </div>
      )}

      {tab === 2 && (
        <div className="form">
          <Field label="Passphrase (if the archive is encrypted)">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="None" />
          </Field>
          <div className="muted">
            Source: <code>{props.archivePath}</code>
          </div>
        </div>
      )}
    </Modal>
  );
}
