import * as THREE from "three";
import { uvFrame, type UvFrame } from "./uvFrame";

/** Used when the hit triangle has a degenerate UV mapping. */
export const FALLBACK_FRAME: UvFrame = { right: [0.5, 0], up: [0, 0.5] };

/**
 * UV frame at a raycast hit. Vertex positions include active morph targets,
 * so the frame matches the body as the user currently sees it.
 */
export function frameAtFace(mesh: THREE.Mesh, face: THREE.Face): UvFrame {
  const uv = mesh.geometry.getAttribute("uv");
  const ids = [face.a, face.b, face.c] as const;
  const pos = ids.map((i) => {
    const v = new THREE.Vector3();
    mesh.getVertexPosition(i, v);
    return [v.x, v.y, v.z] as const;
  });
  const tex = ids.map((i) => [uv.getX(i), uv.getY(i)] as const);
  return (
    uvFrame(
      [pos[0]!, pos[1]!, pos[2]!],
      [tex[0]!, tex[1]!, tex[2]!],
    ) ?? FALLBACK_FRAME
  );
}
