export type SoundState = {
  indoor: number;
  lake: number;
  lakePan: number;
  forest: number;
  house: number;
  housePan: number;
};

export const DEFAULT_STATE: SoundState = {
  indoor: 0,
  lake: 0,
  lakePan: 0,
  forest: 0.3,
  house: 0,
  housePan: 0,
};

export type Layer = {
  update: (s: SoundState, t: number) => void;
  tick?: (t: number) => void;
};

export type LayerFactory = (ac: AudioContext, out: AudioNode) => Layer;
