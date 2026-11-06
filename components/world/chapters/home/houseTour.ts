import type * as THREE from "three";
import { HOME, WALK } from "../../config/home";
import { FL, GROUND, local } from "./homeGeometry";
import type { Walk } from "./houseWalk";

// Kamera jalan bebas: posisi dan arah pandang dari keadaan Walk (kerangka lokal rumah) ke dunia.
export function walkCamera(w: Walk, pos: THREE.Vector3, look: THREE.Vector3) {
  const y = FL + w.dy + WALK.eye;
  const c = Math.cos(w.pitch);
  pos.copy(local(w.x, y, w.z));
  look.copy(
    local(
      w.x + Math.sin(w.yaw) * c * 10,
      y + Math.sin(w.pitch) * 10,
      w.z + Math.cos(w.yaw) * c * 10,
    ),
  );
}

// Berdiri di teras menghadap pintu, sebelum masuk.
export const PORCH = {
  pos: local(0, GROUND + WALK.eye + 0.1, HOME.d / 2 + HOME.terrace + 5),
  look: local(0, FL + 1.3, HOME.d / 2),
};
