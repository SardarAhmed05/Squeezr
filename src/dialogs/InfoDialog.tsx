import { Modal } from "./Modal";

function fmtBytes(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${units[i]}`;
}

export function InfoDialog(props: {
  info: any | null;
  archivePath: string | null;
  entries: number;
  onClose: () => void;
}) {
  const i = props.info || {};
  const packed = i.packed || i.physicalSize || 0;
  const ratio = i.totalSize && packed ? 1 - packed / i.totalSize : null;
  const pct = ratio === null ? 0 : Math.max(0, Math.min(1, ratio)) * 100;

  return (
    <Modal
      title="Archive properties"
      width={560}
      onClose={props.onClose}
      footer={
        <button className="btn primary" onClick={props.onClose}>
          Close
        </button>
      }
    >
      <div className="form">
        <table className="info-table">
          <tbody>
            <tr>
              <td>Source</td>
              <td>
                <code>{props.archivePath || "—"}</code>
              </td>
            </tr>
            <tr>
              <td>Format</td>
              <td>{i.type || "—"}</td>
            </tr>
            <tr>
              <td>Algorithm</td>
              <td>{i.method || "—"}</td>
            </tr>
            <tr>
              <td>Contents</td>
              <td>
                {i.files ?? "—"} files, {i.folders ?? "—"} folders ({props.entries} listed)
              </td>
            </tr>
            <tr>
              <td>Original size</td>
              <td>{fmtBytes(i.totalSize)}</td>
            </tr>
            <tr>
              <td>Compressed size</td>
              <td>{fmtBytes(packed)}</td>
            </tr>
            <tr>
              <td>File size</td>
              <td>{fmtBytes(i.physicalSize)}</td>
            </tr>
            <tr>
              <td>Encrypted</td>
              <td>{i.encrypted ? "Yes" : "No"}</td>
            </tr>
            <tr>
              <td>Solid</td>
              <td>{i.solid ? "Yes" : "No"}</td>
            </tr>
          </tbody>
        </table>
        <div className="group">
          <div className="group-title">Space saved</div>
          <div className="ratio-bar">
            <div className="ratio-fill" style={{ width: `${pct.toFixed(1)}%` }} />
          </div>
          <div className="muted">{ratio === null ? "—" : `${(ratio * 100).toFixed(1)}% smaller than the original`}</div>
        </div>
      </div>
    </Modal>
  );
}
