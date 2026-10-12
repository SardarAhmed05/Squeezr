"use strict";

const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const engine = require("./engine.cjs");

const DEFAULT_SETTINGS = {
  format: "7z",
  method: "LZMA2",
  level: 5,
  dictionary: "16M",
  solid: true,
  encryptNames: false,
  extractOverwrite: "ask",
  extractUpdate: "replace",
  theme: "light",
  favorites: [],
};

function settingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(settingsPath(), "utf8")) };
  } catch (_) {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), "utf8");
    return true;
  } catch (_) {
    return false;
  }
}

let mainWindow = null;

const ARCHIVE_ARG = /\.(rar|zip|7z|tar|gz|tgz|bz2|xz|iso|cab|arj|lzh|z)$/i;
function findArchiveArg(argv) {
  return (argv || []).slice(1).find((a) => typeof a === "string" && !a.startsWith("-") && ARCHIVE_ARG.test(a));
}
let pendingOpen = findArchiveArg(process.argv);

app.setName("Squeezr");
if (process.platform === "win32") app.setAppUserModelId("com.squeezr.app");

function appIconPath() {
  const candidates = [
    path.join(process.resourcesPath || "", "icon.ico"),
    path.join(__dirname, "..", "build", "icon.ico"),
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch (_) {}
  }
  return undefined;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 820,
    minHeight: 520,
    backgroundColor: "#ffffff",
    title: "Squeezr",
    autoHideMenuBar: true,
    icon: appIconPath(),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "renderer", "index.html"));
  }

  mainWindow.webContents.on("did-finish-load", () => {
    if (pendingOpen) {
      mainWindow.webContents.send("app:open-file", pendingOpen);
      pendingOpen = null;
    }
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", (_e, argv) => {
    const p = findArchiveArg(argv);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      if (p) mainWindow.webContents.send("app:open-file", p);
    } else if (p) {
      pendingOpen = p;
    }
  });

  app.whenReady().then(() => {
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/* ------------------------- IPC: dialogs ------------------------- */
ipcMain.handle("dialog:openArchive", async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    title: "Open archive",
    properties: ["openFile"],
    filters: [
      { name: "Archives", extensions: ["rar", "zip", "7z", "tar", "gz", "bz2", "xz", "iso", "cab", "arj", "lzh", "z"] },
      { name: "All files", extensions: ["*"] },
    ],
  });
  return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle("dialog:openFiles", async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    title: "Select files to add",
    properties: ["openFile", "multiSelections"],
  });
  return r.canceled ? null : r.filePaths;
});

ipcMain.handle("dialog:saveArchive", async (_e, defaultName) => {
  const r = await dialog.showSaveDialog(mainWindow, {
    title: "Create archive",
    defaultPath: defaultName || "new.7z",
    filters: [
      { name: "7z (best ratio)", extensions: ["7z"] },
      { name: "ZIP", extensions: ["zip"] },
      { name: "TAR", extensions: ["tar"] },
      { name: "All files", extensions: ["*"] },
    ],
  });
  return r.canceled ? null : r.filePath;
});

ipcMain.handle("dialog:selectDirectory", async (_e, title) => {
  const r = await dialog.showOpenDialog(mainWindow, {
    title: title || "Select folder",
    properties: ["openDirectory"],
  });
  return r.canceled ? null : r.filePaths[0];
});

/* ------------------------- IPC: engine ------------------------- */
ipcMain.handle("engine:info", async () => ({ path: engine.findEngine() }));

ipcMain.handle("archive:list", async (_e, { archive, password }) => {
  const info = fs.statSync(archive);
  const r = await engine.list(archive, password);
  if (r.ok) r.archive.physicalSize = r.archive.physicalSize || info.size;
  return r;
});

ipcMain.handle("archive:extract", async (_e, { archive, outDir, options }) => {
  return engine.extract(archive, outDir, options || {});
});

ipcMain.handle("archive:add", async (_e, { archive, files, options }) => {
  return engine.add(archive, files, options || {});
});

ipcMain.handle("archive:test", async (_e, { archive, password }) => {
  return engine.test(archive, password);
});

ipcMain.handle("archive:report", async (_e, { archive, password }) => {
  return engine.testReport(archive, password);
});

ipcMain.handle("engine:benchmark", async (_e, opts) => {
  return engine.benchmark(opts || {});
});

/* ------------------------- IPC: settings & favorites ------------------------- */
ipcMain.handle("settings:get", async () => loadSettings());

ipcMain.handle("settings:set", async (_e, partial) => {
  const next = { ...loadSettings(), ...partial };
  saveSettings(next);
  return next;
});

ipcMain.handle("favorites:add", async (_e, entry) => {
  const s = loadSettings();
  const list = s.favorites.filter((f) => f.path !== entry.path);
  list.push(entry);
  s.favorites = list;
  saveSettings(s);
  return s.favorites;
});

ipcMain.handle("favorites:remove", async (_e, p) => {
  const s = loadSettings();
  s.favorites = s.favorites.filter((f) => f.path !== p);
  saveSettings(s);
  return s.favorites;
});

/* ------------------------- IPC: filesystem ------------------------- */
ipcMain.handle("fs:drives", async () => {
  const drives = [];
  for (let i = 65; i <= 90; i++) {
    const letter = String.fromCharCode(i) + ":\\";
    try {
      fs.accessSync(letter);
      drives.push(letter);
    } catch (_) {}
  }
  return drives;
});

ipcMain.handle("fs:listDir", async (_e, dir) => {
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    return {
      ok: true,
      dir,
      entries: items
        .map((it) => {
          const full = path.join(dir, it.name);
          let size = null;
          let modified = null;
          let created = null;
          try {
            const st = fs.statSync(full);
            size = st.size;
            modified = st.mtime.toISOString();
            created = st.birthtime.toISOString();
          } catch (_) {}
          return {
            path: full,
            name: it.name,
            isDir: it.isDirectory(),
            size,
            modified,
            created,
            type: it.isDirectory() ? "Folder" : (path.extname(it.name).slice(1).toUpperCase() || "") + " File",
          };
        })
        .sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1)),
    };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle("shell:openPath", async (_e, p) => shell.openPath(p));
