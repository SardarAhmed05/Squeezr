declare global {
  const __APP_VERSION__: string;
  const __APP_NAME__: string;

  interface Window {
    wrc: {
      engineInfo(): Promise<{ path: string | null }>;
      openArchiveDialog(): Promise<string | null>;
      openFilesDialog(): Promise<string[] | null>;
      saveArchiveDialog(name?: string): Promise<string | null>;
      selectDirectoryDialog(title?: string): Promise<string | null>;
      list(archive: string, password?: string): Promise<any>;
      extract(archive: string, outDir: string, options?: any): Promise<any>;
      add(archive: string, files: string[], options?: any): Promise<any>;
      test(archive: string, password?: string): Promise<any>;
      report(archive: string, password?: string): Promise<any>;
      benchmark(opts?: any): Promise<any>;
      settingsGet(): Promise<any>;
      settingsSet(partial: any): Promise<any>;
      favoritesAdd(entry: { name: string; path: string }): Promise<any[]>;
      favoritesRemove(path: string): Promise<any[]>;
      drives(): Promise<string[]>;
      listDir(dir: string): Promise<any>;
      openPath(p: string): Promise<string>;
      onOpenFile(cb: (p: string) => void): () => void;
      onCompressFiles(cb: (files: string[]) => void): () => void;
      contextMenuGet(): Promise<boolean>;
      contextMenuSet(on: boolean): Promise<boolean>;
    };
  }
}

export {};
