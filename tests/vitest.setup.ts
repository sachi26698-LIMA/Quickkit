type VitestGlobalWithJSDOM = typeof globalThis & {
  jsdom?: {
    window?: Window;
  };
};

const jsdomWindow = (globalThis as VitestGlobalWithJSDOM).jsdom?.window;

if (jsdomWindow) {
  // Node 26 adds native storage globals that Vitest does not replace with the
  // jsdom window's properties when it aliases window to the test global.
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: jsdomWindow.localStorage,
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: jsdomWindow.sessionStorage,
  });
}
