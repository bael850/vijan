// Semua angka bentuk dunia ada di sini. Ubah di sini, jangan di file lain.
// Sumbu: jalan menurun ke arah -z. Rumah di ujung jalan, danau di sisi timur (+x).

export const WORLD = { width: 520, length: 600, centerZ: -80 };

export const WATER_Y = 0; // permukaan danau

// Danau berbentuk elips: pusat (x,z), setengah lebar rx dan setengah panjang rz.
export const LAKE = { x: 70, z: -112, rx: 55, rz: 78 };

// Rumah: pusat, tinggi lantai pekarangan, dan jari-jari pekarangan rata.
export const HOUSE = { x: -4, z: -132, padY: 1.0, padRadius: 14 };

// Titik awal perjalanan (puncak bukit) dan pintu rumah.
export const START = { x: 4, z: 80 };
export const DOOR = { x: -4, z: -124 };
