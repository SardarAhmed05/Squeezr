import { useState } from "react";
import { Modal, Field } from "./Modal";

export function PasswordDialog(props: {
  title?: string;
  archive?: string;
  onSubmit: (password: string, remember: boolean) => void;
  onCancel: () => void;
}) {
  const [pw, setPw] = useState("");
  const [again, setAgain] = useState("");
  const [show, setShow] = useState(false);
  const [verify, setVerify] = useState(true);

  const mismatch = verify && again.length > 0 && pw !== again;

  return (
    <Modal
      title={props.title || "Passphrase"}
      onClose={props.onCancel}
      width={460}
      footer={
        <>
          <button className="btn" onClick={props.onCancel}>
            Cancel
          </button>
          <button
            className="btn primary"
            disabled={mismatch || pw.length === 0}
            onClick={() => props.onSubmit(pw, !verify)}
          >
            OK
          </button>
        </>
      }
    >
      <div className="form">
        {props.archive && (
          <div className="muted">
            Archive: <code>{props.archive}</code>
          </div>
        )}
        <Field label="Passphrase">
          <input type={show ? "text" : "password"} value={pw} autoFocus onChange={(e) => setPw(e.target.value)} />
        </Field>
        <Field label="Confirm passphrase">
          <input
            type={show ? "text" : "password"}
            value={again}
            disabled={!verify}
            onChange={(e) => setAgain(e.target.value)}
          />
        </Field>
        <label className="check">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
          Reveal passphrase
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={!verify}
            onChange={(e) => setVerify(!e.target.checked)}
          />
          Apply to every archive (skip confirmation)
        </label>
        {mismatch && <div className="error">Passphrases don't match.</div>}
      </div>
    </Modal>
  );
}
