export interface MenuItem {
  id?: number;
  label?: string;
  children?: MenuItem[];
  sep?: boolean;
}

// Squeezr's own menu model. Command IDs are internal; wording and grouping are
// original to this project.
export const MAIN_MENU: MenuItem[] = [
  {
    label: "&File",
    children: [
      { id: 201, label: "Open…\tCtrl+O" },
      { id: 202, label: "Duplicate as…" },
      { sep: true },
      { id: 203, label: "Switch drive…\tCtrl+D" },
      { id: 205, label: "Default passphrase…\tCtrl+P" },
      { sep: true },
      { id: 330, label: "Copy selection\tCtrl+C" },
      { id: 331, label: "Paste\tCtrl+V" },
      { id: 332, label: "Copy selected paths" },
      { sep: true },
      { id: 206, label: "Select every item\tCtrl+A" },
      { id: 207, label: "Grow selection\tNumpad +" },
      { id: 208, label: "Shrink selection\tNumpad -" },
      { id: 209, label: "Invert selection\tNumpad *" },
      { sep: true },
      { id: 210, label: "Quit" },
    ],
  },
  {
    label: "&Commands",
    children: [
      { id: 220, label: "Compress…\tAlt+A" },
      { id: 230, label: "Unpack to folder…\tAlt+E" },
      { id: 231, label: "Verify integrity\tAlt+T" },
      { sep: true },
      { id: 227, label: "Preview\tAlt+V" },
      { id: 228, label: "Remove\tDel" },
      { id: 223, label: "Rename\tF2" },
      { id: 224, label: "Print\tCtrl+I" },
      { sep: true },
      { id: 229, label: "Unpack here (no prompt)\tAlt+W" },
      { id: 232, label: "Archive notes…\tAlt+M" },
      { id: 233, label: "Add recovery data\tAlt+P" },
      { id: 234, label: "Lock changes\tAlt+L" },
    ],
  },
  {
    label: "&Tools",
    children: [
      { id: 240, label: "Guided mode" },
      { sep: true },
      { id: 245, label: "Scan with antivirus\tAlt+D" },
      { id: 244, label: "Change format…\tAlt+Q" },
      { id: 221, label: "Repair…\tAlt+R" },
      { id: 235, label: "Make self-extracting…\tAlt+X" },
      { sep: true },
      { id: 243, label: "Search…\tF3" },
      { id: 241, label: "Archive properties\tAlt+I" },
      { id: 242, label: "Export report…\tAlt+G" },
      { id: 246, label: "Speed test\tAlt+B" },
    ],
  },
  {
    label: "Bookmar&ks",
    children: [
      { id: 250, label: "Bookmark this location…\tCtrl+F" },
      { id: 251, label: "Manage bookmarks…" },
    ],
  },
  {
    label: "Prefere&nces",
    children: [
      { id: 260, label: "Preferences…\tCtrl+S" },
      {
        label: "Import / export",
        children: [
          { id: 262, label: "Load settings…" },
          { id: 261, label: "Export settings…" },
          { id: 263, label: "Write settings file" },
        ],
      },
      { id: 278, label: "Reset recent items…" },
      {
        label: "File list",
        children: [
          { id: 264, label: "Flat folder list\tCtrl+H" },
          { id: 265, label: "List mode" },
          { id: 266, label: "Detail mode" },
        ],
      },
      {
        label: "Folder tree",
        children: [
          { id: 267, label: "Show folders on this drive\tCtrl+T" },
          { id: 268, label: "Show folders inside archives\tCtrl+T" },
        ],
      },
      {
        label: "Appearance",
        children: [
          { id: 269, label: "Manage themes…" },
          { id: 270, label: "Browse themes…" },
          { id: 271, label: "Standard theme" },
        ],
      },
      { id: 272, label: "Filename encoding\tCtrl+E" },
      { sep: true },
      { id: 276, label: "Open activity log…\tCtrl+L" },
      { id: 277, label: "Reset log" },
    ],
  },
  {
    label: "&Help",
    children: [
      { id: 280, label: "Help" },
      { id: 281, label: "Project homepage" },
      { id: 284, label: "About Squeezr…" },
    ],
  },
];

export interface ToolbarButton {
  id: number;
  label: string;
  icon: string;
}

// Toolbar buttons with our own SVG icon names (see src/icons.tsx).
export const TOOLBAR: ToolbarButton[] = [
  { id: 220, label: "Compress", icon: "add" },
  { id: 230, label: "Extract", icon: "extract" },
  { id: 231, label: "Verify", icon: "test" },
  { id: 227, label: "Preview", icon: "view" },
  { id: 228, label: "Remove", icon: "delete" },
  { id: 243, label: "Search", icon: "find" },
  { id: 240, label: "Guided", icon: "wizard" },
  { id: 241, label: "Properties", icon: "info" },
  { id: 221, label: "Repair", icon: "repair" },
  { id: 244, label: "Convert", icon: "convert" },
  { id: 246, label: "Speed test", icon: "benchmark" },
  { id: 235, label: "SFX", icon: "sfx" },
  { id: 242, label: "Report", icon: "report" },
  { id: 232, label: "Notes", icon: "comment" },
  { id: 233, label: "Recovery", icon: "protect" },
  { id: 234, label: "Lock", icon: "lock" },
  { id: 245, label: "Scan", icon: "scan" },
  { id: 250, label: "Bookmarks", icon: "favorites" },
  { id: 260, label: "Preferences", icon: "settings" },
  { id: 280, label: "Help", icon: "help" },
];
