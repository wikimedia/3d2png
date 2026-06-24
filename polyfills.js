import { Canvas } from 'canvas';

// node-canvas has no DOM event API, but three's WebGLRenderer registers
// listeners on the canvas. Stub them as we don't need them.
Canvas.prototype.addEventListener = () => {};
Canvas.prototype.removeEventListener = () => {};
