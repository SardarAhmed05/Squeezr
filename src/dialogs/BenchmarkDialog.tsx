import { useState } from "react";
import { Modal } from "./Modal";

export function BenchmarkDialog(props: { onClose: () => void }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function run() {
    setRunning(true);
    setResult(null);
    const r = await window.wrc.benchmark({});
    setRunning(false);
    setResult(r);
  }

  return (
    <Modal
      title="Speed test"
      width={640}
      onClose={props.onClose}
      footer={
        <>
          <button className="btn" onClick={run} disabled={running}>
            {running ? "Running…" : "Start"}
          </button>
          <button className="btn primary" onClick={props.onClose}>
            Close
          </button>
        </>
      }
    >
      <div className="form">
        <div className="muted">
          Measures the bundled engine's LZMA2 throughput for compressing and decompressing. Higher is better.
        </div>
        {running && <div className="busy-line">Measuring… this can take up to a minute.</div>}
        {result && (
          <>
            <div className={"result-banner " + (result.ok ? "ok" : "bad")}>
              {result.ok ? "Test complete" : "Test failed"}
            </div>
            {result.summary && <div className="group-title">{result.summary}</div>}
            {(result.cpuLine || result.ramLine) && (
              <div className="muted">
                {result.cpuLine}
                <br />
                {result.ramLine}
              </div>
            )}
            <pre className="modal-pre log-pre">{result.rows?.join("\n") || result.output}</pre>
          </>
        )}
      </div>
    </Modal>
  );
}
