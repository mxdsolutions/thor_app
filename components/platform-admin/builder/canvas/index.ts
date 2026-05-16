/**
 * Barrel for the canvas/ subdirectory. BuilderShell imports `BuilderCanvas`
 * + `CanvasProvider` from here so internal file moves don't ripple outwards.
 */
export { BuilderCanvas } from "./BuilderCanvas";
export { CanvasProvider, type BuilderActions } from "./context";
