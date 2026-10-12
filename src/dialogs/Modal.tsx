import { ReactNode } from "react";

export function Modal(props: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  width?: number;
}) {
  return (
    <div className="modal-backdrop" onClick={props.onClose}>
      <div className="modal" style={{ width: props.width || 620 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{props.title}</div>
        <div className="modal-body">{props.children}</div>
        <div className="modal-actions">{props.footer}</div>
      </div>
    </div>
  );
}

export function Tabs(props: { tabs: string[]; active: number; onChange: (i: number) => void }) {
  return (
    <div className="tabs">
      {props.tabs.map((t, i) => (
        <div key={t} className={"tab" + (i === props.active ? " active" : "")} onClick={() => props.onChange(i)}>
          {t}
        </div>
      ))}
    </div>
  );
}

export function Field(props: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{props.label}</span>
      {props.children}
    </label>
  );
}
