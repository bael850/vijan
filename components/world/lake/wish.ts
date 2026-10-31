// Jembatan antara kotak tulis (HTML) dan danau (3D). Tulisan hanya hidup di sesi ini, tidak disimpan.
export type Wish = { seq: number; text: string };
export const newWish = (): Wish => ({ seq: 0, text: "" });

// Titik di danau yang sedang ditatap kamera setelah tulisan dilepas, dan sampai kapan (detik jam 3D).
export type Focus = { x: number; z: number; until: number };
export const newFocus = (): Focus => ({ x: 0, z: 0, until: 0 });
