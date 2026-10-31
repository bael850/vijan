export { sound } from "./engine";
export { SOUND, LAYER_NAMES } from "./config";
export type { SoundState } from "./types";

import { sound } from "./engine";

export const meow = (kind: "idle" | "pet", near: number) =>
  sound.meow(kind, near);
