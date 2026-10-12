# NOTICE

## Independence and trademarks

Squeezr is an independent, open-source project. It is **not affiliated with,
endorsed by, sponsored by, or associated with** win.rar GmbH or the authors of
WinRAR.

"WinRAR" and "RAR" are trademarks or registered trademarks of **win.rar GmbH**.
They are referenced, if at all, only to describe file-format interoperability
(nominative/descriptive use) and never as part of Squeezr's own branding.

Squeezr's own name, logo, icons, UI wording, and source code are original works
created for this project.

## No WinRAR assets are redistributed

Squeezr does **not** include, bundle, or redistribute any WinRAR software,
binaries (such as `WinRAR.exe`, `Rar.exe`, `UnRAR.exe`), icons, images, help
files, or other copyrighted content.

RAR archives can be **read/extracted** because the bundled 7-Zip engine
(open-source, see below) contains its own independently developed RAR decoder.
Squeezr does **not** create RAR archives; RAR compression is proprietary.

## Third-party component: 7-Zip (`resources/engine/`)

Squeezr bundles unmodified binaries of **7-Zip** in `resources/engine/`:

- `7z.exe`, `7z.dll`, `7z.sfx`, `7zCon.sfx`
- 7-Zip Copyright (C) 1999-2026 **Igor Pavlov**.
- 7-Zip is used as an unmodified, separately-invoked executable; Squeezr merely
  launches it with command-line arguments.

The complete upstream license text is shipped verbatim at
`resources/engine/License.txt` and is reproduced below.

### 7-Zip license for use and distribution

```
7-Zip
~~~~~
License for use and distribution
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

7-Zip Copyright (C) 1999-2026 Igor Pavlov.

The licenses for files are:

  - 7z.dll:
       - The "GNU LGPL" as main license for most of the code
       - The "GNU LGPL" with "unRAR license restriction" for some code
       - The "BSD 3-clause License" for some code
       - The "BSD 2-clause License" for some code
  - All other files: the "GNU LGPL".

Redistributions in binary form must reproduce related license information from this file.

Note:
  You can use 7-Zip on any computer, including a computer in a commercial
  organization. You don't need to register or pay for 7-Zip.
```

### GNU LGPL notice

```
This library is free software; you can redistribute it and/or
modify it under the terms of the GNU Lesser General Public
License as published by the Free Software Foundation; either
version 2.1 of the License, or (at your option) any later version.

This library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
Lesser General Public License for more details.

You can receive a copy of the GNU Lesser General Public License from
http://www.gnu.org/
```

A copy of the GNU LGPL v2.1 is available at
<https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html>. As required by the
LGPL, the 7-Zip component is provided as an unmodified, separately-invoked
executable whose source is publicly available at <https://www.7-zip.org/>.

### BSD 3-clause and BSD 2-clause code in 7z.dll

7-Zip's `7z.dll` also contains code under the BSD 3-clause License (LZFSE
decompression derived from Apple Inc.; ZSTD decompression derived from Facebook
Inc.) and the BSD 2-clause License (XXH64 by Yann Collet). Their full texts are
included in `resources/engine/License.txt`.

### unRAR license restriction (included in 7-Zip)

```
unRAR license restriction
-------------------------

The decompression engine for RAR archives was developed using source
code of unRAR program.
All copyrights to original unRAR code are owned by Alexander Roshal.

The license for original unRAR code has the following restriction:

  The unRAR sources cannot be used to re-create the RAR compression algorithm,
  which is proprietary. Distribution of modified unRAR sources in separate form
  or as a part of other software is permitted, provided that it is clearly
  stated in the documentation and source comments that the code may
  not be used to develop a RAR (WinRAR) compatible archiver.
```

**Compliance statement:** Squeezr does **not** create, write, or re-compress RAR
archives and does not implement the RAR compression algorithm. It uses the
7-Zip engine only to **extract/read** existing RAR data. Squeezr therefore does
not use the unRAR code to develop a RAR-compatible archiver, in accordance with
the restriction above.

## Other dependencies

Electron, React, and the other npm dependencies are used under their respective
licenses (MIT / BSD / Apache-2.0). See each package's `LICENSE` under
`node_modules/`.

## Interoperability statement

Reverse-engineering observations of a third-party application were used solely
to understand interoperable file-format behavior and general UI conventions.
No third-party code, assets, or protected expression are included in this
project's distributed artifacts.

## No warranty

This software is provided "as is", without warranty of any kind. See `LICENSE`.
