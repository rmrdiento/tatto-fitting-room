// Builds public/models/body.glb from MakeHuman CC0 data in tools/mh-source.
// Usage: node tools/build-body.mjs
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Document, NodeIO } from "@gltf-transform/core";
import { sparse } from "@gltf-transform/functions";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "tools", "mh-source");
const out = join(root, "public", "models", "body.glb");
const SCALE = 0.1; // MakeHuman units are decimetres

// --- parse base.obj: body group only -------------------------------------
const lines = readFileSync(join(src, "base.obj"), "utf8").split("\n");
const pos = [];
const uv = [];
const faces = [];
let group = "";
for (const line of lines) {
  const p = line.trim().split(/\s+/);
  if (p[0] === "v") pos.push([+p[1], +p[2], +p[3]]);
  else if (p[0] === "vt") uv.push([+p[1], +p[2]]);
  else if (p[0] === "g") group = p[1];
  else if (p[0] === "f" && group === "body") {
    faces.push(p.slice(1).map((t) => t.split("/").map((n) => +n - 1)));
  }
}

// --- unique (position, uv) vertices, triangulated ------------------------
const keyToIndex = new Map();
const origVertex = []; // new index -> original position index
const vertexUv = [];
const indices = [];
const vertexOf = ([vi, ti]) => {
  const key = `${vi}/${ti}`;
  let idx = keyToIndex.get(key);
  if (idx === undefined) {
    idx = origVertex.length;
    keyToIndex.set(key, idx);
    origVertex.push(vi);
    vertexUv.push(uv[ti]);
  }
  return idx;
};
for (const f of faces) {
  const v = f.map(vertexOf);
  for (let i = 1; i < v.length - 1; i++) indices.push(v[0], v[i], v[i + 1]);
}
const N = origVertex.length;

// --- base positions, recentred (feet on y=0, centred on x/z) -------------
const bbox = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
for (const vi of new Set(origVertex)) {
  for (let a = 0; a < 3; a++) {
    bbox.min[a] = Math.min(bbox.min[a], pos[vi][a]);
    bbox.max[a] = Math.max(bbox.max[a], pos[vi][a]);
  }
}
const offset = [
  -(bbox.min[0] + bbox.max[0]) / 2,
  -bbox.min[1],
  -(bbox.min[2] + bbox.max[2]) / 2,
];
const basePositions = new Float32Array(N * 3);
for (let i = 0; i < N; i++) {
  for (let a = 0; a < 3; a++) {
    basePositions[i * 3 + a] = (pos[origVertex[i]][a] + offset[a]) * SCALE;
  }
}

// Smooth normals keyed on original position so UV seams do not light differently.
function computeNormals(positions) {
  const acc = new Map();
  for (let t = 0; t < indices.length; t += 3) {
    const [a, b, c] = [indices[t], indices[t + 1], indices[t + 2]];
    const P = (i) => [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]];
    const [pa, pb, pc] = [P(a), P(b), P(c)];
    const e1 = pb.map((x, i) => x - pa[i]);
    const e2 = pc.map((x, i) => x - pa[i]);
    const n = [
      e1[1] * e2[2] - e1[2] * e2[1],
      e1[2] * e2[0] - e1[0] * e2[2],
      e1[0] * e2[1] - e1[1] * e2[0],
    ];
    for (const i of [a, b, c]) {
      const k = origVertex[i];
      const s = acc.get(k) ?? [0, 0, 0];
      acc.set(k, [s[0] + n[0], s[1] + n[1], s[2] + n[2]]);
    }
  }
  const normals = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const s = acc.get(origVertex[i]);
    const len = Math.hypot(...s) || 1;
    normals.set([s[0] / len, s[1] / len, s[2] / len], i * 3);
  }
  return normals;
}
const baseNormals = computeNormals(basePositions);

// --- morph targets --------------------------------------------------------
function readTarget(name) {
  const delta = new Map();
  for (const line of readFileSync(join(src, name), "utf8").split("\n")) {
    if (!/^\d/.test(line)) continue;
    const [i, x, y, z] = line.trim().split(/\s+/).map(Number);
    delta.set(i, [x, y, z]);
  }
  return delta;
}

const morphs = []; // { name, positions, normals }
function addMorph(name, file) {
  const delta = readTarget(file);
  const positions = new Float32Array(N * 3);
  const moved = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const d = delta.get(origVertex[i]);
    for (let a = 0; a < 3; a++) {
      const v = d ? d[a] * SCALE : 0;
      positions[i * 3 + a] = v;
      moved[i * 3 + a] = basePositions[i * 3 + a] + v;
    }
  }
  const movedNormals = computeNormals(moved);
  const normals = movedNormals.map((n, i) => n - baseNormals[i]);
  morphs.push({ name, positions, normals });
}

for (const g of ["female", "male"]) {
  addMorph(`sex-${g}`, `caucasian-${g}-young.target`);
  // 3x3 grid of muscle x weight; the avg/avg cell is the base mesh itself.
  for (const mu of ["min", "avg", "max"]) {
    for (const we of ["min", "avg", "max"]) {
      if (mu === "avg" && we === "avg") continue;
      const muscle = mu === "avg" ? "averagemuscle" : `${mu}muscle`;
      const weight = we === "avg" ? "averageweight" : `${we}weight`;
      addMorph(`u-${g}-${mu}-${we}`, `universal-${g}-young-${muscle}-${weight}.target`);
    }
  }
  for (const h of ["min", "max"]) {
    addMorph(`h-${g}-${h}`, `${g}-young-averagemuscle-averageweight-${h}height.target`);
  }
}

// --- assemble glTF --------------------------------------------------------
const doc = new Document();
const buffer = doc.createBuffer();
const accessor = (type, array) =>
  doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);

const prim = doc
  .createPrimitive()
  .setAttribute("POSITION", accessor("VEC3", basePositions))
  .setAttribute("NORMAL", accessor("VEC3", baseNormals))
  .setAttribute("TEXCOORD_0", accessor("VEC2", new Float32Array(vertexUv.flat())))
  .setIndices(accessor("SCALAR", new Uint32Array(indices)))
  .setMaterial(doc.createMaterial("skin").setBaseColorFactor([1, 1, 1, 1]).setRoughnessFactor(0.7).setMetallicFactor(0));

for (const m of morphs) {
  prim.addTarget(
    doc
      .createPrimitiveTarget(m.name)
      .setAttribute("POSITION", accessor("VEC3", m.positions))
      .setAttribute("NORMAL", accessor("VEC3", m.normals)),
  );
}

const mesh = doc.createMesh("body").addPrimitive(prim).setWeights(new Array(morphs.length).fill(0));
mesh.setExtras({ targetNames: morphs.map((m) => m.name) });
const node = doc.createNode("body").setMesh(mesh);
doc.createScene("scene").addChild(node);

await doc.transform(sparse({ ratio: 0.2 }));

mkdirSync(dirname(out), { recursive: true });
await new NodeIO().write(out, doc);

const height = (bbox.max[1] - bbox.min[1]) * SCALE;
console.log(
  `vertices ${N}, triangles ${indices.length / 3}, morphs ${morphs.length}, height ${height.toFixed(2)} m`,
);
console.log(`wrote ${out} (${(readFileSync(out).length / 1e6).toFixed(2)} MB)`);
