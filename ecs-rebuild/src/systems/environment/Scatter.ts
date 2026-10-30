/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Scatter
 *
 * Instanced ground dressing (grass tufts, flowers, rocks, bushes) placed by
 * rejection sampling over the dry parts of the bowl. One thin-instanced mesh
 * per kind keeps hundreds of props down to a handful of draw calls.
 */

import { Random } from '../../utils/Random.ts';
import { valueNoise2 } from '../../utils/Noise.ts';
import { sharedMaterial } from '../../render/models/Materials.ts';

export interface ScatterOptions {
  bowlRadius: number;
  waterLevel: number;
  heightAt: (x: number, z: number) => number;
  /** Return true to keep (x,z) clear (buildings, roads…). */
  isBlocked: (x: number, z: number, margin: number) => boolean;
  seed?: number;
  density?: number;
  /** Instanced woodland outside the village; 0 disables. */
  forestDensity?: number;
  /** Keep the middle of the bowl open meadow within this radius. */
  clearingRadius?: number;
}

interface Kind {
  name: string;
  mesh: any;
  matrices: number[];
  colors: number[];
}

export class Scatter {
  private scene: any;
  private kinds: Kind[] = [];

  constructor(scene: any) {
    this.scene = scene;
  }

  build(opts: ScatterOptions): void {
    const B = (window as any).BABYLON;
    const rng = new Random(opts.seed ?? 7);
    const density = opts.density ?? 1;
    const { bowlRadius, waterLevel, heightAt, isBlocked } = opts;

    const tuft = this.makeKind('scatter_tuft', () => {
      const m = B.MeshBuilder.CreateCylinder(
        'scatter_tuft_src',
        { diameterTop: 0, diameterBottom: 0.55, height: 0.7, tessellation: 5 },
        this.scene
      );
      m.bakeTransformIntoVertices(B.Matrix.Translation(0, 0.35, 0));
      return m;
    });
    const flower = this.makeKind('scatter_flower', () => {
      const m = B.MeshBuilder.CreateIcoSphere(
        'scatter_flower_src',
        { radius: 0.17, subdivisions: 1, flat: true },
        this.scene
      );
      m.bakeTransformIntoVertices(B.Matrix.Translation(0, 0.35, 0));
      return m;
    });
    const rock = this.makeKind(
      'prop_rock',
      () => {
        const m = B.MeshBuilder.CreateIcoSphere(
          'prop_rock_src',
          { radius: 0.7, subdivisions: 1, flat: true },
          this.scene
        );
        m.bakeTransformIntoVertices(B.Matrix.Translation(0, 0.15, 0));
        return m;
      },
      [0.5, 0.49, 0.46]
    );
    const bush = this.makeKind(
      'prop_bush',
      () => {
        const m = B.MeshBuilder.CreateIcoSphere(
          'prop_bush_src',
          { radius: 0.9, subdivisions: 2, flat: true },
          this.scene
        );
        m.bakeTransformIntoVertices(B.Matrix.Translation(0, 0.55, 0));
        return m;
      },
      [0.24, 0.45, 0.2]
    );

    const greens = [
      [0.36, 0.6, 0.2],
      [0.3, 0.54, 0.18],
      [0.46, 0.64, 0.22],
      [0.55, 0.62, 0.26],
    ];
    const bloom = [
      [0.97, 0.9, 0.3],
      [0.95, 0.95, 0.95],
      [0.9, 0.35, 0.45],
      [0.6, 0.5, 0.9],
    ];

    const push = (k: Kind, x: number, y: number, z: number, sx: number, sy: number, rotY: number, c?: number[]) => {
      const m = B.Matrix.Compose(
        new B.Vector3(sx, sy, sx),
        B.Quaternion.RotationYawPitchRoll(rotY, 0, 0),
        new B.Vector3(x, y, z)
      );
      k.matrices.push(...m.toArray());
      if (c) k.colors.push(c[0], c[1], c[2], 1);
    };

    const tries = Math.round(5200 * density);
    for (let i = 0; i < tries; i++) {
      const a = rng.next() * Math.PI * 2;
      const r = Math.sqrt(rng.next()) * bowlRadius * 0.86;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const y = heightAt(x, z);
      const rel = y - waterLevel;
      if (rel < 0.9 || rel > 11) continue;

      const roll = rng.next();
      if (roll < 0.7) {
        if (isBlocked(x, z, 0.5)) continue;
        const g = greens[Math.floor(rng.next() * greens.length)];
        // Taller tufts on the meadow, shorter near the sand.
        const s = 0.7 + rng.next() * 0.8;
        push(tuft, x, y - 0.05, z, s, s * (0.8 + rng.next() * 0.7), rng.next() * 6.28, g);
      } else if (roll < 0.86) {
        if (isBlocked(x, z, 0.5) || rel > 6) continue;
        const c = bloom[Math.floor(rng.next() * bloom.length)];
        push(flower, x, y, z, 0.8 + rng.next() * 0.5, 1, 0, c);
      } else if (roll < 0.94) {
        if (isBlocked(x, z, 1.2)) continue;
        const s = 0.5 + rng.next() * 1.1;
        push(rock, x, y - 0.1, z, s, s * (0.6 + rng.next() * 0.5), rng.next() * 6.28);
      } else {
        if (isBlocked(x, z, 1.8) || rel < 1.4) continue;
        const s = 0.8 + rng.next() * 0.9;
        push(bush, x, y - 0.1, z, s, s * 0.85, rng.next() * 6.28);
      }
    }

    this.buildForest(opts, rng);

    for (const k of this.kinds) {
      if (k.matrices.length === 0) {
        k.mesh.dispose();
        continue;
      }
      k.mesh.thinInstanceSetBuffer('matrix', new Float32Array(k.matrices), 16, true);
      if (k.colors.length) k.mesh.thinInstanceSetBuffer('color', new Float32Array(k.colors), 4, true);
      k.mesh.thinInstanceRefreshBoundingInfo(true);
      k.mesh.alwaysSelectAsActiveMesh = true;
      k.mesh.isPickable = false;
      k.mesh.receiveShadows = true;
      k.mesh.freezeWorldMatrix();
    }
  }

  /** Patchy woodland of merged low-poly pines and oaks, one draw call per material. */
  private buildForest(opts: ScatterOptions, rng: Random): void {
    const B = (window as any).BABYLON;
    const density = opts.forestDensity ?? 0;
    if (density <= 0) return;
    const { bowlRadius, waterLevel, heightAt, isBlocked } = opts;
    const clearing = opts.clearingRadius ?? 0;

    const pine = this.makeMerged('prop_pine', () => {
      const bark = sharedMaterial(this.scene, 'tree_bark_dark', [0.28, 0.19, 0.12]);
      const leaf = sharedMaterial(this.scene, 'tree_pine_0', [0.12, 0.33, 0.2]);
      const parts: any[] = [];
      const trunk = B.MeshBuilder.CreateCylinder(
        't',
        { diameterTop: 0.2, diameterBottom: 0.5, height: 3.2, tessellation: 6 },
        this.scene
      );
      trunk.position.y = 1.6;
      trunk.material = bark;
      parts.push(trunk);
      [
        [3.4, 2.2, 3.0],
        [2.6, 2.0, 4.2],
        [1.7, 1.8, 5.3],
      ].forEach(([d, h, y], i) => {
        const cone = B.MeshBuilder.CreateCylinder(
          'c' + i,
          { diameterTop: 0, diameterBottom: d, height: h, tessellation: 6 },
          this.scene
        );
        cone.position.y = y;
        cone.rotation.y = i * 0.5;
        cone.material = leaf;
        parts.push(cone);
      });
      return parts;
    });

    const oak = this.makeMerged('prop_oak', () => {
      const bark = sharedMaterial(this.scene, 'tree_bark', [0.38, 0.26, 0.15]);
      const leaf = sharedMaterial(this.scene, 'tree_oak_0', [0.27, 0.5, 0.2]);
      const parts: any[] = [];
      const trunk = B.MeshBuilder.CreateCylinder(
        't',
        { diameterTop: 0.3, diameterBottom: 0.62, height: 2.6, tessellation: 6 },
        this.scene
      );
      trunk.position.y = 1.3;
      trunk.material = bark;
      parts.push(trunk);
      [
        [0, 3.6, 0, 1.7],
        [1.0, 3.1, 0.4, 1.2],
        [-0.9, 3.2, -0.5, 1.3],
        [0.1, 4.4, 0.2, 1.1],
      ].forEach(([x, y, z, r], i) => {
        const blob = B.MeshBuilder.CreateIcoSphere('b' + i, { radius: r, subdivisions: 1, flat: true }, this.scene);
        blob.position.set(x, y, z);
        blob.scaling.y = 0.85;
        blob.material = leaf;
        parts.push(blob);
      });
      return parts;
    });

    const taken = new Set<number>();
    const tries = Math.round(3600 * density);
    for (let i = 0; i < tries; i++) {
      const a = rng.next() * Math.PI * 2;
      const r = Math.sqrt(rng.next()) * bowlRadius * 0.92;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const rel = heightAt(x, z) - waterLevel;
      if (rel < 1.7 || rel > 16) continue;

      // Forest patches from two octaves of noise; thin out towards the clearing.
      const n = valueNoise2(x * 0.035 + 11, z * 0.035 - 7) * 0.65 + valueNoise2(x * 0.11, z * 0.11) * 0.35;
      const edge = clearing > 0 ? Math.min(1, Math.max(0, (r - clearing * 0.8) / (clearing * 0.4))) : 1;
      if (n < 0.5 + (1 - edge) * 0.3 || rng.next() > 0.35 + edge * 0.65) continue;
      if (isBlocked(x, z, 2.6)) continue;

      // One tree per 3m cell avoids z-fighting piles.
      const cell = Math.floor(x / 3) * 4099 + Math.floor(z / 3);
      if (taken.has(cell)) continue;
      taken.add(cell);

      const useOak = rel < 6 && valueNoise2(x * 0.07 + 3, z * 0.07) > 0.5;
      const kind = useOak ? oak : pine;
      const s = 0.8 + rng.next() * 0.9;
      const tint = 0.82 + rng.next() * 0.32;
      const m = B.Matrix.Compose(
        new B.Vector3(s, s * (0.9 + rng.next() * 0.35), s),
        B.Quaternion.RotationYawPitchRoll(rng.next() * 6.28, 0, 0),
        new B.Vector3(x, heightAt(x, z) - 0.15, z)
      );
      kind.matrices.push(...m.toArray());
      kind.colors.push(tint, tint * (0.95 + rng.next() * 0.1), tint * 0.95, 1);
    }
  }

  /** Builds a merged multi-material mesh from sub-parts (disposing them). */
  private makeMerged(name: string, parts: () => any[]): Kind {
    const B = (window as any).BABYLON;
    const merged = B.Mesh.MergeMeshes(parts(), true, true, undefined, false, true);
    merged.name = name;
    merged.thinInstanceEnablePicking = false;
    const kind: Kind = { name, mesh: merged, matrices: [], colors: [] };
    this.kinds.push(kind);
    return kind;
  }

  /** Meshes that should cast shadows (trees, rocks, bushes). */
  getShadowCasters(): any[] {
    return this.kinds.filter((k) => k.name.startsWith('prop_')).map((k) => k.mesh);
  }

  private makeKind(name: string, factory: () => any, fixedColor?: number[]): Kind {
    const B = (window as any).BABYLON;
    const mesh = factory();
    mesh.name = name;
    const mat = new B.StandardMaterial(`${name}_mat`, this.scene);
    mat.diffuseColor = fixedColor
      ? new B.Color3(fixedColor[0], fixedColor[1], fixedColor[2])
      : new B.Color3(1, 1, 1);
    mat.specularColor = new B.Color3(0.02, 0.02, 0.02);
    mesh.material = mat;
    mesh.thinInstanceEnablePicking = false;
    const kind: Kind = { name, mesh, matrices: [], colors: [] };
    this.kinds.push(kind);
    return kind;
  }

  dispose(): void {
    for (const k of this.kinds) {
      // Single-material kinds own their material; merged kinds use shared ones.
      if (k.mesh?.material?.name === `${k.name}_mat`) k.mesh.material.dispose();
      k.mesh?.dispose();
    }
    this.kinds = [];
  }
}
