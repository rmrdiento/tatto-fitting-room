"use client";

import { useEditor, editorStore } from "@/state/store";
import { useImages } from "@/state/images";
import { library } from "@/tattoo/library";

const btn =
  "rounded border border-white/20 px-2 py-1 text-sm hover:bg-white/10 disabled:opacity-40";

export function LayerPanel() {
  const layers = useEditor((s) => s.layers);
  const selectedId = useEditor((s) => s.selectedId);
  const mode = useEditor((s) => s.mode);
  const body = useEditor((s) => s.body);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const armed = useImages((s) => s.armed);
  const arm = useImages((s) => s.arm);
  const load = useImages((s) => s.load);

  const store = editorStore.getState();
  const selected = layers.find((l) => l.id === selectedId);

  const upload = async (file: File | undefined) => {
    if (!file || file.type !== "image/png") return;
    const id = `up-${crypto.randomUUID()}`;
    await load(id, URL.createObjectURL(file));
    arm(id);
  };

  return (
    <aside className="flex w-80 flex-col gap-4 overflow-y-auto border-l border-white/10 p-4 text-sm">
      <h1 className="text-lg font-semibold">Tattoo Fitting Room</h1>

      <section className="flex gap-2">
        <button className={btn} disabled={!canUndo} onClick={() => store.undo()}>
          Undo
        </button>
        <button className={btn} disabled={!canRedo} onClick={() => store.redo()}>
          Redo
        </button>
        <button
          className={btn}
          onClick={() => store.setMode(mode === "after" ? "before" : "after")}
        >
          View: {mode === "after" ? "after" : "before (old only)"}
        </button>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Body</h2>
        <div className="flex gap-2">
          {(["female", "male"] as const).map((sex) => (
            <button
              key={sex}
              className={`${btn} ${body.sex === sex ? "bg-white/20" : ""}`}
              onClick={() => store.setBody({ sex })}
            >
              {sex === "female" ? "Female" : "Male"}
            </button>
          ))}
        </div>
        {(
          [
            ["height", "Height"],
            ["weight", "Weight"],
            ["muscle", "Muscle"],
            ["skinTone", "Skin tone"],
          ] as const
        ).map(([key, label]) => (
          <Slider
            key={key}
            label={label}
            min={0}
            max={1}
            value={body[key]}
            onChange={(v) => store.setBody({ [key]: v })}
            record={false}
          />
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Add tattoo</h2>
        <div className="flex flex-wrap gap-2">
          {library.map((item) => (
            <button
              key={item.id}
              className={`${btn} ${armed === item.id ? "bg-white/20" : ""}`}
              onClick={() => arm(armed === item.id ? null : item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
        <label className="text-xs opacity-70">
          Or upload PNG
          <input
            type="file"
            accept="image/png"
            className="block"
            onChange={(e) => void upload(e.target.files?.[0])}
          />
        </label>
        {armed && <p className="text-xs">Click on the body to place it.</p>}
        <p className="text-xs opacity-60">Shift+drag moves the selected tattoo.</p>
      </section>

      <section className="flex flex-col gap-1">
        <h2 className="font-medium">Layers ({layers.length})</h2>
        {layers.map((l) => (
          <div
            key={l.id}
            onClick={() => store.select(l.id)}
            className={`flex cursor-pointer items-center justify-between rounded px-2 py-1 ${
              l.id === selectedId ? "bg-white/15" : "hover:bg-white/5"
            }`}
          >
            <span>
              {l.imageId.replace("lib-", "")}
              {l.old ? " (old)" : ""}
            </span>
            <span className="flex gap-1">
              <button
                aria-label="toggle visibility"
                onClick={(e) => {
                  e.stopPropagation();
                  store.checkpoint();
                  store.updateLayer(l.id, { visible: !l.visible });
                }}
              >
                {l.visible ? "👁" : "—"}
              </button>
              <button
                aria-label="delete layer"
                onClick={(e) => {
                  e.stopPropagation();
                  store.removeLayer(l.id);
                }}
              >
                ✕
              </button>
            </span>
          </div>
        ))}
      </section>

      {selected && (
        <section className="flex flex-col gap-2">
          <h2 className="font-medium">Selected</h2>
          <Slider
            label="Size"
            min={0.05}
            max={0.6}
            value={selected.scale}
            onChange={(scale) => store.updateLayer(selected.id, { scale })}
          />
          <Slider
            label="Rotation"
            min={-Math.PI}
            max={Math.PI}
            value={selected.rotation}
            onChange={(rotation) => store.updateLayer(selected.id, { rotation })}
          />
          <Slider
            label="Opacity"
            min={0.1}
            max={1}
            value={selected.opacity}
            onChange={(opacity) => store.updateLayer(selected.id, { opacity })}
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.mirrored}
              onChange={(e) => {
                store.checkpoint();
                store.updateLayer(selected.id, { mirrored: e.target.checked });
              }}
            />
            Mirror
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.old}
              onChange={(e) => {
                store.checkpoint();
                store.updateLayer(selected.id, { old: e.target.checked });
              }}
            />
            Mark as old
          </label>
        </section>
      )}
    </aside>
  );
}

function Slider(props: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange(v: number): void;
  record?: boolean;
}) {
  return (
    <label>
      {props.label}
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={0.01}
        value={props.value}
        onPointerDown={() => {
          if (props.record !== false) editorStore.getState().checkpoint();
        }}
        onChange={(e) => props.onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  );
}
