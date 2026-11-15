/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * VillageKit
 *
 * Small toolkit for the village's hand-built timber structures (palisade,
 * pier, gardens, lamps). Parts are authored in local frames, then merged per
 * material so hundreds of logs and planks cost only a handful of draw calls.
 */

import { sharedMaterial, windowGlassMaterial, createGableRoof, hashPosition } from '../../render/models/Materials.ts';

export interface V3 {
  x: number;
  y: number;
  z: number;
}

/** Shared palette for village structures. Lantern glass reuses the house window glow. */
export function villagePalette(scene: any) {
  const m = (name: string, c: [number, number, number], twoSided = false) =>
    sharedMaterial(scene, `village_${name}`, c, { twoSided });
  return {
    logs: [m('log_a', [0.42, 0.3, 0.2]), m('log_b', [0.35, 0.24, 0.15]), m('log_c', [0.5, 0.38, 0.25])],
    planks: [m('plank_a', [0.58, 0.46, 0.33]), m('plank_b', [0.5, 0.39, 0.28]), m('plank_c', [0.64, 0.54, 0.4])],
    timber: m('timber', [0.27, 0.19, 0.12]),
    pile: m('pile', [0.23, 0.19, 0.16]),
    iron: m('iron', [0.15, 0.15, 0.16]),
    rope: m('rope', [0.74, 0.63, 0.42]),
    stone: sharedMaterial(scene, 'house_stone', [0.5, 0.49, 0.47]),
    shingle: m('shingle', [0.38, 0.25, 0.17], true),
    pennant: m('pennant', [0.72, 0.2, 0.15], true),
    picket: m('picket', [0.88, 0.86, 0.8]),
    soil: m('soil', [0.3, 0.21, 0.14]),
    leaf: m('leaf', [0.33, 0.56, 0.22]),
    leafDark: m('leaf_dark', [0.21, 0.42, 0.17]),
    pumpkin: m('pumpkin', [0.86, 0.5, 0.16]),
    straw: m('straw', [0.82, 0.7, 0.38]),
    cloth: m('cloth', [0.38, 0.44, 0.6]),
    glass: windowGlassMaterial(scene),
  };
}

export type VillagePalette = ReturnType<typeof villagePalette>;

interface PartOptions {
  parent?: any;
  rx?: number;
  ry?: number;
  rz?: number;
}

/**
 * Collects primitive parts and merges them per material on flush().
 * Frames are TransformNodes used only while authoring; merging bakes their
 * transforms into the vertices, after which they are disposed.
 */
export class PartBatch {
  private readonly B = (window as any).BABYLON;
  private groups = new Map<any, any[]>();
  private nodes: any[] = [];
  private counter = 0;

  constructor(
    readonly scene: any,
    private prefix: string
  ) {}

  /** Local authoring frame: +Z forward, +X right, at world/parent position with a yaw. */
  frame(x: number, y: number, z: number, yaw = 0, parent?: any): any {
    const node = new this.B.TransformNode(`${this.prefix}_frame`, this.scene);
    if (parent) node.parent = parent;
    node.position.set(x, y, z);
    node.rotation.y = yaw;
    this.nodes.push(node);
    return node;
  }

  add(mesh: any, material: any, x: number, y: number, z: number, o: PartOptions = {}): any {
    if (o.parent) mesh.parent = o.parent;
    mesh.position.set(x, y, z);
    if (o.rx) mesh.rotation.x = o.rx;
    if (o.ry) mesh.rotation.y = o.ry;
    if (o.rz) mesh.rotation.z = o.rz;
    let list = this.groups.get(material);
    if (!list) this.groups.set(material, (list = []));
    list.push(mesh);
    return mesh;
  }

  box(mat: any, w: number, h: number, d: number, x: number, y: number, z: number, o: PartOptions = {}): any {
    const mesh = this.B.MeshBuilder.CreateBox(this.name(), { width: w, height: h, depth: d }, this.scene);
    return this.add(mesh, mat, x, y, z, o);
  }

  cyl(
    mat: any,
    dims: { top: number; bottom: number; height: number; tess?: number },
    x: number,
    y: number,
    z: number,
    o: PartOptions = {}
  ): any {
    const mesh = this.B.MeshBuilder.CreateCylinder(
      this.name(),
      { diameterTop: dims.top, diameterBottom: dims.bottom, height: dims.height, tessellation: dims.tess ?? 7 },
      this.scene
    );
    return this.add(mesh, mat, x, y, z, o);
  }

  /** Low-poly blob (crops, bushes, rope coils). */
  ico(mat: any, radius: number, x: number, y: number, z: number, squashY = 1, o: PartOptions = {}): any {
    const mesh = this.B.MeshBuilder.CreateIcoSphere(this.name(), { radius, subdivisions: 1, flat: true }, this.scene);
    mesh.scaling.y = squashY;
    return this.add(mesh, mat, x, y, z, o);
  }

  roof(mat: any, opts: { width: number; depth: number; height: number; overhang: number }, x: number, y: number, z: number, o: PartOptions = {}): any {
    return this.add(createGableRoof(this.scene, this.name(), opts), mat, x, y, z, o);
  }

  /**
   * Log/plank spanning two points (in the parent's space). Round logs are
   * cylinders; square beams are boxes whose `w` is horizontal and `d` vertical.
   */
  beam(mat: any, a: V3, b: V3, w: number, d = w, round = true, parent?: any): any {
    const B = this.B;
    const dir = new B.Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
    const len = dir.length();
    if (len < 1e-4) return null;
    dir.scaleInPlace(1 / len);
    const mesh = round
      ? B.MeshBuilder.CreateCylinder(this.name(), { diameter: w, height: len, tessellation: 6 }, this.scene)
      : B.MeshBuilder.CreateBox(this.name(), { width: w, height: len, depth: d }, this.scene);

    // Basis: local Y along the beam, local X horizontal and perpendicular to it.
    let side = B.Vector3.Cross(B.Vector3.Up(), dir);
    if (side.lengthSquared() < 1e-6) side = new B.Vector3(1, 0, 0);
    side.normalize();
    const third = B.Vector3.Cross(side, dir);
    mesh.rotationQuaternion = B.Quaternion.RotationQuaternionFromAxis(side, dir, third);
    return this.add(mesh, mat, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, { parent });
  }

  /** Merges every collected part into one mesh per material. */
  flush(): any[] {
    const B = this.B;
    const out: any[] = [];
    for (const n of this.nodes) n.computeWorldMatrix(true);
    for (const [material, parts] of this.groups) {
      for (const p of parts) p.computeWorldMatrix(true);
      // Chunk to keep each merged buffer comfortably sized.
      for (let i = 0; i < parts.length; i += 600) {
        const chunk = parts.slice(i, i + 600);
        const merged = B.Mesh.MergeMeshes(chunk, true, true);
        if (!merged) continue;
        merged.name = `prop_${this.prefix}_${out.length}`;
        merged.material = material;
        merged.receiveShadows = true;
        merged.isPickable = false;
        merged.freezeWorldMatrix();
        out.push(merged);
      }
    }
    for (const n of this.nodes) n.dispose();
    this.nodes = [];
    this.groups.clear();
    return out;
  }

  private name(): string {
    return `${this.prefix}_part_${this.counter++}`;
  }
}

// ── Reusable props ─────────────────────────────────────────────

/** Hanging lantern: iron cap and base around a glowing glass box. Origin at the hook. */
export function lantern(batch: PartBatch, pal: VillagePalette, x: number, y: number, z: number, parent?: any): void {
  batch.box(pal.iron, 0.04, 0.22, 0.04, x, y - 0.11, z, { parent });
  batch.cyl(pal.iron, { top: 0.06, bottom: 0.46, height: 0.2, tess: 4 }, x, y - 0.3, z, { parent, ry: Math.PI / 4 });
  batch.box(pal.glass, 0.26, 0.36, 0.26, x, y - 0.58, z, { parent });
  batch.box(pal.iron, 0.34, 0.06, 0.34, x, y - 0.79, z, { parent });
}

/** Street lamp: timber post with a crossarm and a hanging lantern. `yaw` points the arm. */
export function streetLamp(batch: PartBatch, pal: VillagePalette, x: number, y: number, z: number, yaw: number, parent?: any): void {
  const f = batch.frame(x, y, z, yaw, parent);
  batch.box(pal.stone, 0.5, 0.3, 0.5, 0, 0.1, 0, { parent: f });
  batch.cyl(pal.timber, { top: 0.15, bottom: 0.2, height: 3.3 }, 0, 1.65, 0, { parent: f });
  batch.box(pal.timber, 0.12, 0.12, 0.95, 0, 3.15, 0.38, { parent: f });
  batch.beam(pal.timber, { x: 0, y: 2.65, z: 0.05 }, { x: 0, y: 3.1, z: 0.5 }, 0.08, 0.08, false, f);
  lantern(batch, pal, 0, 3.1, 0.75, f);
}

export function barrel(batch: PartBatch, pal: VillagePalette, x: number, y: number, z: number, parent?: any): void {
  const wood = pal.planks[Math.floor(hashPosition(x, z, 9) * 3)];
  batch.cyl(wood, { top: 0.62, bottom: 0.62, height: 0.9, tess: 9 }, x, y + 0.45, z, { parent });
  batch.cyl(wood, { top: 0.7, bottom: 0.7, height: 0.3, tess: 9 }, x, y + 0.45, z, { parent });
  for (const h of [0.12, 0.78]) {
    batch.cyl(pal.iron, { top: 0.66, bottom: 0.66, height: 0.06, tess: 9 }, x, y + h, z, { parent });
  }
}

export function crate(batch: PartBatch, pal: VillagePalette, s: number, x: number, y: number, z: number, ry: number, parent?: any): void {
  const wood = pal.planks[Math.floor(hashPosition(x, z, 4) * 3)];
  batch.box(wood, s, s, s, x, y + s / 2, z, { parent, ry });
  // Corner battens give the box a little silhouette.
  batch.box(pal.timber, s + 0.04, 0.08, s + 0.04, x, y + s - 0.05, z, { parent, ry });
  batch.box(pal.timber, s + 0.04, 0.08, s + 0.04, x, y + 0.05, z, { parent, ry });
}

export function bollard(batch: PartBatch, pal: VillagePalette, x: number, y: number, z: number, parent?: any): void {
  batch.cyl(pal.pile, { top: 0.32, bottom: 0.36, height: 0.7, tess: 8 }, x, y + 0.35, z, { parent });
  batch.cyl(pal.pile, { top: 0.46, bottom: 0.4, height: 0.1, tess: 8 }, x, y + 0.72, z, { parent });
  batch.cyl(pal.rope, { top: 0.4, bottom: 0.4, height: 0.12, tess: 8 }, x, y + 0.45, z, { parent });
}

/** Coil of rope lying on a deck. */
export function ropeCoil(batch: PartBatch, pal: VillagePalette, x: number, y: number, z: number, parent?: any): void {
  const B = (window as any).BABYLON;
  const torus = B.MeshBuilder.CreateTorus('rope_coil', { diameter: 0.7, thickness: 0.14, tessellation: 12 }, batch.scene);
  batch.add(torus, pal.rope, x, y + 0.07, z, { parent });
  const inner = B.MeshBuilder.CreateTorus('rope_coil', { diameter: 0.42, thickness: 0.12, tessellation: 10 }, batch.scene);
  batch.add(inner, pal.rope, x, y + 0.16, z, { parent });
}
