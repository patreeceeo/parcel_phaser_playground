interface ESModule {
  hot: {
    accept: (callback: () => void) => void;
  };
}

declare const module: ESModule;
