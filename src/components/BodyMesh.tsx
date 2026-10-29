"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { skinColor } from "@/body/params";
import { compose } from "@/tattoo/compose";
import { editorStore, useEditor } from "@/state/store";
import { useImages } from "@/state/images";

const TEXTURE_SIZE = 1024;
const RADIUS = 0.35;
const LENGTH = 1.2;
// World circumference over world height of the capsule: keeps tattoos
// undistorted on this placeholder body.
const UV_ASPECT = (2 * Math.PI * RADIUS) / (LENGTH + 2 * RADIUS);

// three.js textures are mutable GPU-backed objects; the React Compiler lint
// rule flags in-hook mutation, so the flag is set from a plain function.
function markDirty(texture: THREE.Texture) {
  texture.needsUpdate = true;
}

interface Props {
  onDragChange(dragging: boolean): void;
}

export function BodyMesh({ onDragChange }: Props) {
  const layers = useEditor((s) => s.layers);
  const mode = useEditor((s) => s.mode);
  const skinTone = useEditor((s) => s.body.skinTone);
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

  useEffect(() => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    compose(ctx, layers, images, {
      size: TEXTURE_SIZE,
      skinColor: skinColor(skinTone),
      mode,
      uvAspect: UV_ASPECT,
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
        scale: 0.2,
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
    editorStore
      .getState()
      .updateLayer(dragId.current, { u: e.uv.x, v: e.uv.y });
  };

  return (
    <mesh
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <capsuleGeometry args={[RADIUS, LENGTH, 16, 64]} />
      <meshStandardMaterial map={texture} roughness={0.7} />
    </mesh>
  );
}
