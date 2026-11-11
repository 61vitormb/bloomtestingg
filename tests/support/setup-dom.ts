import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom não implementa matchMedia; o Bloom o usa para tema e redução de movimento.
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// APIs de layout ausentes no jsdom, usadas por Radix e pela folha de registro
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => undefined;
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => undefined;
}
