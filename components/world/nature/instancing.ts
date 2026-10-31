import * as THREE from "three";
import type { Spot } from "./scatter";

// Isi InstancedMesh dari daftar titik. `place` mengatur posisi/skala/warna tiap benda.
export function fillInstances(
  mesh: THREE.InstancedMesh,
  spots: Spot[],
  place: (s: Spot, o: THREE.Object3D, c: THREE.Color) => void,
) {
  const o = new THREE.Object3D();
  const c = new THREE.Color();
  spots.forEach((s, i) => {
    o.position.set(0, 0, 0);
    o.rotation.set(0, 0, 0);
    o.scale.set(1, 1, 1);
    c.set("#ffffff");
    place(s, o, c);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    mesh.setColorAt(i, c);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}
