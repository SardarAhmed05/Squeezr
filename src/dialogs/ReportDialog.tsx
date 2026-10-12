import { useState } from "react";
import { Modal } from "./Modal";

export function ReportDialog(props: {
  archivePath: string;
  busy: boolean;
  report: any | null;
  onClose: () => void;
  onRerun: () => void;
}) {
  const [showRaw, setShowRaw] = useState(false);
  const r = props.report;
  return (
    <Modal
      title="Integrity check"
      width={640}
      onClose={props.onClose}
      footer={
        <>
          <button className="btn" onClick={props.onRerun} disabled={props.busy}>
            {props.busy ? "Running…" : "Run again"}
          </button>
          <button className="btn primary" onClick={props.onClose}>
            Close
          </button>
        </>
      }
    >
      <div className="form">
        <div className="muted">
          Archive: <code>{props.archivePath}</code>
        </div>
        {props.busy && <div className="busy-line">Checking the archive…</div>}
        {r && (
          <>
            <div className={"result-banner " + (r.ok ? "ok" : "bad")}>{r.result}</div>
            <table className="info-table">
              <tbody>
                <tr>
                  <td>Files checked</td>
                  <td>{r.files ?? "—"}</td>
                </tr>
                <tr>
                  <td>Original size</td>
                  <td>{r.size ?? "—"}</td>
                </tr>
                <tr>
                  <td>Compressed size</td>
                  <td>{r.compressed ?? "—"}</td>
                </tr>
              </tbody>
            </table>
            <label className="check">
              <input type="checkbox" checked={showRaw} onChange={(e) => setShowRaw(e.target.checked)} />
              Show engine output
            </label>
            {showRaw && <pre className="modal-pre log-pre">{r.output}</pre>}
          </>
        )}
      </div>
    </Modal>
  );
}
