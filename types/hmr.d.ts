interface ESModule<D extends Record<string, any>> {
  hot: {
    dispose: (callback: (data: D) => void) => void;
    accept: (callback: () => void) => void;
    data: D
  };
}

declare const module: ESModule;
