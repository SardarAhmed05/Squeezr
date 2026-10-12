import { Modal } from "./Modal";

export function WizardDialog(props: {
  onAdd: () => void;
  onExtract: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      title="Guided setup"
      width={560}
      onClose={props.onClose}
      footer={
        <button className="btn" onClick={props.onClose}>
          Cancel
        </button>
      }
    >
      <div className="form">
        <div className="muted">Pick a task to get started.</div>
        <button className="wizard-choice" onClick={props.onAdd}>
          <b>Create an archive</b>
          <span>Pack files or folders into a 7z/ZIP archive at the highest compression.</span>
        </button>
        <button className="wizard-choice" onClick={props.onExtract}>
          <b>Extract an archive</b>
          <span>Unpack a RAR, ZIP or 7z archive into a folder you choose.</span>
        </button>
      </div>
    </Modal>
  );
}
