/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Shared material cache.
 *
 * Models used to allocate a fresh StandardMaterial per mesh, which defeats
 * batching. Everything procedural now pulls materials from here by name.
 */

export type RGBTuple = [number, number, number];

export interface MaterialOptions {
  specular?: number;
  specularPower?: number;
  emissive?: RGBTuple;
  alpha?: number;
  twoSided?: boolean;
}

/** Returns the scene material called `name`, creating it on first use. */
export function sharedMaterial(
  scene: any,
  name: string,
  color: RGBTuple,
  options: MaterialOptions = {}
): any {
  const existing = scene.getMaterialByName(name);
  if (existing) return existing;

  const B = (window as any).BABYLON;
  const mat = new B.StandardMaterial(name, scene);
  mat.diffuseColor = new B.Color3(color[0], color[1], color[2]);
  const spec = options.specular ?? 0.04;
  mat.specularColor = new B.Color3(spec, spec, spec);
  mat.specularPower = options.specularPower ?? 24;
  if (options.emissive) {
    mat.emissiveColor = new B.Color3(options.emissive[0], options.emissive[1], options.emissive[2]);
  }
  if (options.alpha !== undefined) mat.alpha = options.alpha;
  if (options.twoSided) {
    mat.backFaceCulling = false;
    mat.twoSidedLighting = true;
  }
  // Emissive materials are animated (night glow), so only freeze static ones.
  if (!options.emissive) mat.freeze?.();
  return mat;
}

/** Deterministic 0..1 hash from world position, so models vary but stay stable. */
export function hashPosition(x: number, z: number, salt = 0): number {
  const s = Math.sin(x * 127.1 + z * 311.7 + salt * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

export interface GableRoofOptions {
  width: number;
  depth: number;
  height: number;
  overhang: number;
}

/** Flat-shaded gable roof (two slopes) with ridge along local X. */
export function createGableRoof(scene: any, name: string, opts: GableRoofOptions): any {
  const B = (window as any).BABYLON;
  const hw = opts.width / 2 + opts.overhang;
  const hd = opts.depth / 2 + opts.overhang;
  const h = opts.height;
  const len = Math.hypot(hd, h);
  const nf = { x: 0, y: hd / len, z: h / len };
  const nb = { x: 0, y: hd / len, z: -h / len };

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  const quad = (pts: number[][], n: { x: number; y: number; z: number }) => {
    const base = positions.length / 3;
    for (const p of pts) {
      positions.push(p[0], p[1], p[2]);
      normals.push(n.x, n.y, n.z);
    }
    indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
  };

  // Front and back slopes.
  quad([[-hw, 0, hd], [hw, 0, hd], [hw, h, 0], [-hw, h, 0]], nf);
  quad([[hw, 0, -hd], [-hw, 0, -hd], [-hw, h, 0], [hw, h, 0]], nb);

  // Thin underside so the eaves don't look hollow from below.
  const under = { x: 0, y: -1, z: 0 };
  quad([[-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd]], under);

  const roof = new B.Mesh(name, scene);
  const vd = new B.VertexData();
  vd.positions = positions;
  vd.normals = normals;
  // Merging with MeshBuilder meshes requires the same attribute set, so UVs are included.
  vd.uvs = new Array((positions.length / 3) * 2).fill(0);
  vd.indices = indices;
  vd.applyToMesh(roof);
  return roof;
}

/** Triangular gable wall infill (faces ±X) in the wall colour. */
export function createGableEnds(scene: any, name: string, width: number, depth: number, height: number): any {
  const B = (window as any).BABYLON;
  const hw = width / 2;
  const hd = depth / 2;
  const positions = [
    -hw, 0, -hd, -hw, 0, hd, -hw, height, 0,
    hw, 0, hd, hw, 0, -hd, hw, height, 0,
  ];
  const normals = [-1, 0, 0, -1, 0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0];
  const indices = [0, 2, 1, 3, 5, 4];
  const mesh = new B.Mesh(name, scene);
  const vd = new B.VertexData();
  vd.positions = positions;
  vd.normals = normals;
  // Merging with MeshBuilder meshes requires the same attribute set, so UVs are included.
  vd.uvs = new Array((positions.length / 3) * 2).fill(0);
  vd.indices = indices;
  vd.applyToMesh(mesh);
  return mesh;
}

/**
 * Merges a model's parts into a single multi-material mesh (one submesh per
 * material) parented to `root`. The parts must be built with `root` still at
 * the origin so their baked world transforms are root-local; set the final
 * root position after calling this. Cuts a ~20-mesh house to a few draw calls.
 */
export function mergeIntoRoot(root: any, parts: any[], disposeNodes: any[] = []): any {
  const B = (window as any).BABYLON;
  const merged = B.Mesh.MergeMeshes(parts, true, true, undefined, false, true);
  for (const node of disposeNodes) node.dispose();
  if (merged) merged.parent = root;
  return merged;
}
