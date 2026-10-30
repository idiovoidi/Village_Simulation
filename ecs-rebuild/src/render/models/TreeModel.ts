/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * TreeModel
 *
 * Low-poly flat-shaded trees. 'pine' stacks cones, anything else is an oak
 * with clumped foliage. Size and green tone vary deterministically by
 * position.
 */

import { sharedMaterial, hashPosition, mergeIntoRoot, type RGBTuple } from './Materials.ts';

export interface TreeParts {
  root: unknown;
  trunk: unknown;
  canopy: unknown;
}

export interface TreeOptions {
  treeType?: string;
  age?: number;
}

const OAK_GREENS: RGBTuple[] = [
  [0.27, 0.5, 0.2],
  [0.34, 0.56, 0.2],
  [0.22, 0.43, 0.2],
];
const PINE_GREENS: RGBTuple[] = [
  [0.12, 0.33, 0.2],
  [0.14, 0.38, 0.22],
];

export class TreeModel {
  private scene: any;
  private roots: any[] = [];

  constructor(scene: any) {
    this.scene = scene;
  }

  create(position: { x: number; y: number; z: number }, options: TreeOptions = {}): TreeParts {
    const B = (window as any).BABYLON;
    const s = this.scene;
    const name = `tree_${this.roots.length}`;
    const h1 = hashPosition(position.x, position.z, 11);
    const h2 = hashPosition(position.x, position.z, 12);
    const isPine = options.treeType === 'pine';
    const age = options.age ?? 10;
    const size = (0.75 + (Math.min(age, 20) / 20) * 0.7) * (0.9 + h1 * 0.25);

    const root = new B.TransformNode(name, s);
    const pivot = new B.TransformNode(`${name}_pivot`, s);
    pivot.parent = root;
    pivot.scaling.setAll(size);
    pivot.rotation.y = h2 * Math.PI * 2;

    const barkMat = sharedMaterial(
      s,
      isPine ? 'tree_bark_dark' : 'tree_bark',
      isPine ? [0.28, 0.19, 0.12] : [0.38, 0.26, 0.15]
    );

    const trunk = B.MeshBuilder.CreateCylinder(
      `${name}_trunk`,
      {
        diameterTop: isPine ? 0.2 : 0.3,
        diameterBottom: isPine ? 0.5 : 0.62,
        height: isPine ? 3.2 : 2.6,
        tessellation: 7,
      },
      s
    );
    trunk.parent = pivot;
    trunk.position.y = isPine ? 1.6 : 1.3;
    trunk.material = barkMat;
    const parts: any[] = [trunk];

    let canopy: any;
    if (isPine) {
      const idx = Math.floor(h1 * PINE_GREENS.length);
      const mat = sharedMaterial(s, `tree_pine_${idx}`, PINE_GREENS[idx]);
      const tiers = [
        { d: 3.4, h: 2.2, y: 3.0 },
        { d: 2.6, h: 2.0, y: 4.2 },
        { d: 1.7, h: 1.8, y: 5.3 },
      ];
      tiers.forEach((t, i) => {
        const cone = B.MeshBuilder.CreateCylinder(
          `${name}_cone${i}`,
          { diameterTop: 0, diameterBottom: t.d, height: t.h, tessellation: 7 },
          s
        );
        cone.parent = pivot;
        cone.position.y = t.y;
        cone.rotation.y = i * 0.5;
        cone.material = mat;
        parts.push(cone);
        canopy ??= cone;
      });
    } else {
      const idx = Math.floor(h1 * OAK_GREENS.length);
      const mat = sharedMaterial(s, `tree_oak_${idx}`, OAK_GREENS[idx]);
      const clumps = [
        { x: 0, y: 3.6, z: 0, r: 1.7 },
        { x: 1.0, y: 3.1, z: 0.4, r: 1.2 },
        { x: -0.9, y: 3.2, z: -0.5, r: 1.3 },
        { x: 0.1, y: 4.4, z: 0.2, r: 1.1 },
      ];
      clumps.forEach((c, i) => {
        const blob = B.MeshBuilder.CreateIcoSphere(
          `${name}_leaf${i}`,
          { radius: c.r, subdivisions: 2, flat: true },
          s
        );
        blob.parent = pivot;
        blob.position.set(c.x, c.y, c.z);
        blob.scaling.y = 0.85;
        blob.rotation.y = i;
        blob.material = mat;
        parts.push(blob);
        canopy ??= blob;
      });
    }

    const merged = mergeIntoRoot(root, parts, [pivot]);
    root.position = new B.Vector3(position.x, position.y, position.z);

    this.roots.push(root);
    return { root, trunk: merged, canopy: merged };
  }

  dispose(): void {
    for (const r of this.roots) r?.dispose?.();
    this.roots = [];
  }
}
