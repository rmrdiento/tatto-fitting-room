"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { BodyMesh } from "./BodyMesh";
import { LayerPanel } from "./LayerPanel";
import { library } from "@/tattoo/library";
import { useImages } from "@/state/images";

export function Editor() {
  const [dragging, setDragging] = useState(false);
  const load = useImages((s) => s.load);

  useEffect(() => {
    for (const item of library) void load(item.id, item.url);
  }, [load]);

  return (
    <div className="flex h-screen w-full">
      <div className="relative flex-1">
        <Canvas camera={{ position: [0, 0.2, 3.2], fov: 40 }}>
          <color attach="background" args={["#1c1c1f"]} />
          <ambientLight intensity={0.9} />
          <directionalLight position={[2, 3, 4]} intensity={1.6} />
          <BodyMesh onDragChange={setDragging} />
          <OrbitControls makeDefault enabled={!dragging} enablePan={false} />
        </Canvas>
      </div>
      <LayerPanel />
    </div>
  );
}
