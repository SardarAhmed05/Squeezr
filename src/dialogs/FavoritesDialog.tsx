import { useEffect, useState } from "react";
import { Modal } from "./Modal";

export function FavoritesDialog(props: {
  currentPath: string | null;
  onOpen: (path: string) => void;
  onClose: () => void;
}) {
  const [favs, setFavs] = useState<any[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    window.wrc.settingsGet().then((s) => setFavs(s.favorites || []));
  }, []);

  async function add() {
    if (!props.currentPath) return;
    const list = await window.wrc.favoritesAdd({
      name: name || props.currentPath,
      path: props.currentPath,
    });
    setFavs(list);
    setName("");
  }

  async function remove(p: string) {
    const list = await window.wrc.favoritesRemove(p);
    setFavs(list);
  }

  return (
    <Modal
      title="Bookmarks"
      width={600}
      onClose={props.onClose}
      footer={
        <button className="btn primary" onClick={props.onClose}>
          Close
        </button>
      }
    >
      <div className="form">
        <div className="row-inline">
          <input className="grow" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn" onClick={add} disabled={!props.currentPath}>
            Bookmark this folder
          </button>
        </div>
        <div className="muted">Current: {props.currentPath || "—"}</div>
        <div className="fav-list">
          {favs.length === 0 && <div className="empty">No bookmarks yet.</div>}
          {favs.map((f) => (
            <div key={f.path} className="fav-row">
              <span className="fav-name" title={f.path} onDoubleClick={() => props.onOpen(f.path)}>
                ⭐ {f.name}
              </span>
              <span className="fav-path">{f.path}</span>
              <button className="btn" onClick={() => props.onOpen(f.path)}>
                Open
              </button>
              <button className="btn" onClick={() => remove(f.path)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
