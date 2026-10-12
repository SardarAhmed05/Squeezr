"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("wrc", {
  engineInfo: () => ipcRenderer.invoke("engine:info"),

  openArchiveDialog: () => ipcRenderer.invoke("dialog:openArchive"),
  openFilesDialog: () => ipcRenderer.invoke("dialog:openFiles"),
  saveArchiveDialog: (name) => ipcRenderer.invoke("dialog:saveArchive", name),
  selectDirectoryDialog: (title) => ipcRenderer.invoke("dialog:selectDirectory", title),

  list: (archive, password) => ipcRenderer.invoke("archive:list", { archive, password }),
  extract: (archive, outDir, options) => ipcRenderer.invoke("archive:extract", { archive, outDir, options }),
  add: (archive, files, options) => ipcRenderer.invoke("archive:add", { archive, files, options }),
  test: (archive, password) => ipcRenderer.invoke("archive:test", { archive, password }),
  report: (archive, password) => ipcRenderer.invoke("archive:report", { archive, password }),
  benchmark: (opts) => ipcRenderer.invoke("engine:benchmark", opts),

  settingsGet: () => ipcRenderer.invoke("settings:get"),
  settingsSet: (partial) => ipcRenderer.invoke("settings:set", partial),
  favoritesAdd: (entry) => ipcRenderer.invoke("favorites:add", entry),
  favoritesRemove: (p) => ipcRenderer.invoke("favorites:remove", p),

  drives: () => ipcRenderer.invoke("fs:drives"),
  listDir: (dir) => ipcRenderer.invoke("fs:listDir", dir),
  openPath: (p) => ipcRenderer.invoke("shell:openPath", p),

  onOpenFile: (cb) => {
    const listener = (_e, p) => cb(p);
    ipcRenderer.on("app:open-file", listener);
    return () => ipcRenderer.removeListener("app:open-file", listener);
  },
});
