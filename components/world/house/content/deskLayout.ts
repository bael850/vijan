import { H, INNER } from "../houseLayout";
import type { Key } from "../tour";

export const DESK_TOP = H.floor2Y + 0.78;
const ZB = INNER.zBack;
export const DESK_Z = ZB + 0.5;
export const FRONT_Z = ZB + 0.66;
export const BACK_Z = ZB + 0.31;

export type DeskStation = "overview" | "cv" | "tulisan" | "foto" | "kontak";

export const STATION_ORDER: DeskStation[] = [
  "overview",
  "cv",
  "tulisan",
  "foto",
  "kontak",
];

export type DeskState = {
  station: DeskStation;
  active: boolean;
  w: number;
};

export const newDeskState = (): DeskState => ({
  station: "overview",
  active: false,
  w: 0,
});

export const SPOT = {
  cv: { x: -8.02, z: FRONT_Z + 0.02 },
  album: { x: -5.7, z: FRONT_Z - 0.02 },
  cards: { x: -5.12, z: ZB + 0.72 },
};

type Zone = { x: number; halfW: number; halfH: number; label: string };

export const ZONES: Record<DeskStation, Zone> = {
  overview: { x: -6.5, halfW: 1.95, halfH: 0.75, label: "" },
  cv: { x: -8.0, halfW: 0.6, halfH: 0.42, label: "CV" },
  tulisan: { x: -6.65, halfW: 1.0, halfH: 0.55, label: "Tulisan" },
  foto: { x: -5.7, halfW: 0.52, halfH: 0.4, label: "Foto" },
  kontak: { x: -5.12, halfW: 0.55, halfH: 0.4, label: "Kontak" },
};

const DIR = { y: 0.66, z: 0.75 };
const MIN_DIST = 0.62;
const WIDE_ASPECT = 1.15;

export const effectiveStation = (id: DeskStation, aspect: number) =>
  id === "overview" && aspect < WIDE_ASPECT ? "tulisan" : id;

export function deskView(
  id: DeskStation,
  aspect: number,
  vfovDeg: number,
): Key {
  const z = ZONES[effectiveStation(id, aspect)];
  const t = Math.tan((vfovDeg * Math.PI) / 360);
  const dist = Math.max(MIN_DIST, z.halfW / (t * aspect), z.halfH / t);
  const fy = DESK_TOP + 0.04;
  const fz = DESK_Z;
  return {
    x: z.x,
    y: fy + DIR.y * dist,
    z: fz + DIR.z * dist,
    lx: z.x,
    ly: fy,
    lz: fz,
  };
}

export const DESK_END_KEY = deskView("overview", 16 / 9, 60);

// bagian akhir tur yang ditahan di meja (0..1 dari panjang tur)
export const DESK_HOLD = 0.14;
export const DESK_RAMP: [number, number] = [0.93, 0.955];
export const DESK_OPEN_AT = 0.945;
export const DESK_MOVE = 1.15;
