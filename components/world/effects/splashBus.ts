// Antrean percikan air. Siapa pun boleh memanggil splash(x, z, power): ikan melompat, nanti juga naga.
// power: 1 = ikan kecil, 3+ = benda besar (sayap naga).
export type SplashEvent = { x: number; z: number; power: number };

const queue: SplashEvent[] = [];

export function splash(x: number, z: number, power = 1) {
  if (queue.length < 24) queue.push({ x, z, power });
}

export function takeSplashes(): SplashEvent[] {
  return queue.length ? queue.splice(0) : [];
}
