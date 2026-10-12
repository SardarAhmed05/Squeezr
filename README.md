# Squeezr

A fast, modern, **white-themed** archiver with a high-ratio, multithreaded
compression engine.

> Squeezr is an **independent project**. It is **not affiliated with, endorsed
> by, or sponsored by win.rar GmbH**. "WinRAR" and "RAR" are trademarks of
> win.rar GmbH. Squeezr contains **no WinRAR code, icons, or other assets** — it
> only interoperates with RAR archives using the open-source 7-Zip engine.
> See [`NOTICE.md`](NOTICE.md).

## Highlights

- **Modern white UI** — menu bar, toolbar, address bar, folder tree, details
  list and status bar in a clean light theme, with original icons.
- **Fast, strong engine** — bundled **7-Zip 26.x** (LZMA2 / PPMd / BZip2 /
  Deflate), fully multithreaded.
- **Formats** — create and open **7z, ZIP, TAR**; open and extract **RAR,
  RAR5**, GZip, BZip2, XZ, ISO, CAB and more.
- **Features** — Add, Extract, Test, Show info, Report, Benchmark, Favorites,
  Wizard, Settings, password prompts, **self-extracting (SFX)** archives,
  split volumes, solid archives, encryption (including encrypted file names).
- **Open-with** — double-click / "Open with" an archive to open it in Squeezr
  (single-instance: opens in the running window).

## Install (Windows)

1. Run **`Squeezr-<version>-setup.exe`**.
2. Choose the install folder (per-user, no admin required), then Finish.
   It creates Start-menu and desktop shortcuts, registers archive file
   associations, and can launch the app when done.
3. Uninstall any time from *Settings → Apps* or the Start-menu entry.

Prefer no install? Run **`Squeezr-<version>-portable.exe`** — a single file
that runs directly.

## Use

- **Open archive** (Ctrl+O) or double-click an archive.
- **Add** (toolbar) — pick format, method, level, dictionary, solid, split
  volumes, password, SFX.
- **Extract To** — choose destination and overwrite/update policy.
- **Test** / **Show information** / **Benchmark** from the Commands/Tools menu.

## Build from source

```powershell
npm install
npm run dev          # live development
npm run build        # build the renderer
npm run dist         # build installer + portable executable into release/
node scripts/verify.cjs    # cross-format verification harness
python scripts/make_icon.py  # regenerate the app icon
```

Requires Node.js 20+ and Python 3 with Pillow (icon script only).

## Signing

Set `CSC_LINK` (path to a `.pfx`) and `CSC_KEY_PASSWORD` to sign the build with
a real code-signing certificate before running `npm run dist`. Without a
certificate the build is unsigned.

## Third-party

Bundles 7-Zip (`resources/engine`) under the GNU LGPL — see
`resources/engine/License.txt`. All app icons, the logo, and UI icon set are
original works created for this project.

## License

MIT — see [`LICENSE`](LICENSE).
