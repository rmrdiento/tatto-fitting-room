"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { morphInfluences, skinColor } from "@/body/params";
import { compose } from "@/tattoo/compose";
import { FALLBACK_FRAME, frameAtFace } from "@/tattoo/placement";
import { editorStore, useEditor } from "@/state/store";
import { useImages } from "@/state/images";

const TEXTURE_SIZE = 1024;
const MODEL_URL = "/models/body.glb";

// three.js textures are mutable GPU-backed objects; the React Compiler lint
// rule flags in-hook mutation, so the flag is set from a plain function.
function markDirty(texture: THREE.Texture) {
  texture.needsUpdate = true;
}

function applyInfluences(mesh: THREE.Mesh, values: number[]) {
  values.forEach((v, i) => {
    if (mesh.morphTargetInfluences) mesh.morphTargetInfluences[i] = v;
  });
}

function setMaterial(mesh: THREE.Mesh, material: THREE.Material) {
  mesh.material = material;
}

function useBodyMesh(map: THREE.Texture) {
  const { nodes } = useGLTF(MODEL_URL);
  const mesh = nodes.body as THREE.Mesh;
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ map, roughness: 0.7 }),
    [map],
  );
  useEffect(() => {
    setMaterial(mesh, material);
  }, [mesh, material]);
  const targetNames = useMemo(
    () =>
      Object.entries(mesh.morphTargetDictionary ?? {})
        .sort((a, b) => a[1] - b[1])
        .map(([name]) => name),
    [mesh],
  );
  return { mesh, targetNames };
}

interface Props {
  onDragChange(dragging: boolean): void;
}

export function BodyMesh({ onDragChange }: Props) {
  const layers = useEditor((s) => s.layers);
  const mode = useEditor((s) => s.mode);
  const body = useEditor((s) => s.body);
  const skinTone = body.skinTone;
  const images = useImages((s) => s.images);
  const dragId = useRef<string | null>(null);

  const canvas = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = TEXTURE_SIZE;
    return c;
  }, []);
  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [canvas]);

  const { mesh, targetNames } = useBodyMesh(texture);

  useEffect(() => {
    applyInfluences(mesh, morphInfluences(body, targetNames));
  }, [mesh, targetNames, body]);

  useEffect(() => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    compose(ctx, layers, images, {
      size: TEXTURE_SIZE,
      skinColor: skinColor(skinTone),
      mode,
    });
    markDirty(texture);
  }, [canvas, texture, layers, images, mode, skinTone]);

  const endDrag = (e: ThreeEvent<PointerEvent>) => {
    if (!dragId.current) return;
    dragId.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    onDragChange(false);
  };

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!e.uv) return;
    const state = editorStore.getState();
    const armed = useImages.getState().armed;

    if (armed) {
      e.stopPropagation();
      const id = crypto.randomUUID();
      state.addLayer({
        id,
        imageId: armed,
        u: e.uv.x,
        v: e.uv.y,
        widthCm: 8,
        frame: e.face ? frameAtFace(mesh, e.face) : FALLBACK_FRAME,
        rotation: 0,
        opacity: 1,
        mirrored: false,
        old: false,
        visible: true,
      });
      useImages.getState().arm(null);
      dragId.current = id;
    } else if (e.shiftKey && state.selectedId) {
      e.stopPropagation();
      state.checkpoint();
      dragId.current = state.selectedId;
    } else {
      return;
    }
    (e.target as Element).setPointerCapture?.(e.pointerId);
    onDragChange(true);
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragId.current || !e.uv) return;
    editorStore.getState().updateLayer(dragId.current, {
      u: e.uv.x,
      v: e.uv.y,
      ...(e.face && { frame: frameAtFace(mesh, e.face) }),
    });
  };

  return (
    <primitive
      object={mesh}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    />
  );
}
