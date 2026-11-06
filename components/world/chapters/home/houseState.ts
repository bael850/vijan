import { newInput, newWalk, type Walk, type WalkInput } from "./houseWalk";

export type HouseMode = "out" | "porch" | "in";
// auto = lampu mengikuti siklus siang-malam, on = dipaksa nyala, off = dipaksa mati
export type LampMode = "auto" | "on" | "off";
export type HouseState = {
  mode: HouseMode;
  snap: boolean;
  scope: boolean; // sedang mengintip lewat teleskop balkon
  walk: Walk; // posisi dan arah pandang pengunjung di dalam rumah
  move: WalkInput; // masukan jalan (tombol, roda mouse, joystick)
  lamps: LampMode; // pilihan pengunjung untuk lampu dalam rumah
  lamp: number; // tingkat nyala lampu sekarang, 0..1 (sudah dihaluskan, dibaca lampu dan piringan plafon)
};
export const newHouse = (): HouseState => ({
  mode: "out",
  snap: false,
  scope: false,
  walk: newWalk(),
  move: newInput(),
  lamps: "auto",
  lamp: 0,
});
