/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * HouseModel
 *
 * Procedural cottage: stone foundation, plaster walls with timber posts,
 * gabled roof, chimney, door and windows. Palette, roof and orientation are
 * derived from the position so a village looks varied but is deterministic.
 * Windows share one material that the LightingManager lights up at night.
 */

import {
  sharedMaterial,
  windowGlassMaterial,
  hashPosition,
  createGableRoof,
  createGableEnds,
  mergeIntoRoot,
  type RGBTuple,
} from './Materials.ts';

export interface HouseParts {
  root: unknown;
  body: unknown;
  roof: unknown;
}

const WALLS: RGBTuple[] = [
  [0.88, 0.82, 0.7],
  [0.8, 0.68, 0.52],
  [0.92, 0.9, 0.84],
  [0.74, 0.8, 0.72],
  [0.82, 0.64, 0.52],
];

const ROOFS: RGBTuple[] = [
  [0.62, 0.27, 0.18],
  [0.33, 0.37, 0.44],
  [0.68, 0.56, 0.3],
  [0.42, 0.28, 0.2],
];

export class HouseModel {
  private scene: any;
  private roots: any[] = [];

  constructor(scene: any) {
    this.scene = scene;
  }

  create(position: { x: number; y: number; z: number }): HouseParts {
    const B = (window as any).BABYLON;
    const s = this.scene;
    const name = `house_${this.roots.length}`;
    const h1 = hashPosition(position.x, position.z, 1);
    const h2 = hashPosition(position.x, position.z, 2);
    const h3 = hashPosition(position.x, position.z, 3);

    const root = new B.TransformNode(name, s);
    // Built at the origin so the parts can be merged root-locally (positioned below).
    const parts: any[] = [];

    // Front door faces the village centre, with a little organic jitter.
    const pivot = new B.TransformNode(`${name}_pivot`, s);
    pivot.parent = root;
    pivot.rotation.y = Math.atan2(-position.x, -position.z) + (h3 - 0.5) * 0.3;

    const wallIdx = Math.floor(h1 * WALLS.length);
    const roofIdx = Math.floor(h2 * ROOFS.length);
    const wallMat = sharedMaterial(s, `house_wall_${wallIdx}`, WALLS[wallIdx]);
    const roofMat = sharedMaterial(s, `house_roof_${roofIdx}`, ROOFS[roofIdx], { twoSided: true });
    const stoneMat = sharedMaterial(s, 'house_stone', [0.5, 0.49, 0.47]);
    const woodMat = sharedMaterial(s, 'house_wood', [0.3, 0.2, 0.13]);
    const glassMat = windowGlassMaterial(s);

    const width = 4.2 + h1 * 0.8;
    const depth = 4 + h2 * 0.6;
    const wallH = 2.7;
    const found = 0.45;

    const add = (mesh: any, mat: any, x: number, y: number, z: number) => {
      mesh.parent = pivot;
      mesh.position.set(x, y, z);
      mesh.material = mat;
      parts.push(mesh);
      return mesh;
    };

    // Foundation + walls
    add(
      B.MeshBuilder.CreateBox(`${name}_found`, { width: width + 0.4, height: found, depth: depth + 0.4 }, s),
      stoneMat,
      0,
      found / 2,
      0
    );
    add(
      B.MeshBuilder.CreateBox(`${name}_body`, { width, height: wallH, depth }, s),
      wallMat,
      0,
      found + wallH / 2,
      0
    );

    // Timber corner posts
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        add(
          B.MeshBuilder.CreateBox(`${name}_post`, { width: 0.22, height: wallH + 0.05, depth: 0.22 }, s),
          woodMat,
          sx * (width / 2),
          found + wallH / 2,
          sz * (depth / 2)
        );
      }
    }

    // Roof + gable infill
    const roofH = 1.9 + h3 * 0.5;
    add(
      createGableRoof(s, `${name}_roof`, { width, depth, height: roofH, overhang: 0.45 }),
      roofMat,
      0,
      found + wallH,
      0
    );
    add(createGableEnds(s, `${name}_gable`, width, depth, roofH), wallMat, 0, found + wallH, 0);

    // Ridge beam
    add(
      B.MeshBuilder.CreateBox(`${name}_ridge`, { width: width + 1.0, height: 0.14, depth: 0.22 }, s),
      woodMat,
      0,
      found + wallH + roofH + 0.02,
      0
    );

    // Door (front = +Z) with step
    const frontZ = depth / 2;
    add(
      B.MeshBuilder.CreateBox(`${name}_door`, { width: 0.95, height: 1.8, depth: 0.12 }, s),
      woodMat,
      0,
      found + 0.9,
      frontZ + 0.04
    );
    add(
      B.MeshBuilder.CreateBox(`${name}_step`, { width: 1.5, height: 0.2, depth: 0.7 }, s),
      stoneMat,
      0,
      0.1,
      frontZ + 0.45
    );

    // Windows: front pair + one on each side wall
    const win = (x: number, z: number, rotY: number) => {
      const frame = B.MeshBuilder.CreateBox(`${name}_wframe`, { width: 0.95, height: 0.95, depth: 0.1 }, s);
      add(frame, woodMat, x, found + 1.6, z);
      frame.rotation.y = rotY;
      const glass = B.MeshBuilder.CreateBox(`${name}_window`, { width: 0.7, height: 0.7, depth: 0.14 }, s);
      add(glass, glassMat, x, found + 1.6, z);
      glass.rotation.y = rotY;
    };
    win(-width / 2 + 0.95, frontZ + 0.03, 0);
    win(width / 2 - 0.95, frontZ + 0.03, 0);
    win(width / 2 + 0.03, 0, Math.PI / 2);
    win(-width / 2 - 0.03, 0, Math.PI / 2);

    // Chimney
    const chimneyX = (h1 > 0.5 ? 1 : -1) * (width / 2 - 0.9);
    add(
      B.MeshBuilder.CreateBox(`${name}_chimney`, { width: 0.65, height: 2.4, depth: 0.65 }, s),
      stoneMat,
      chimneyX,
      found + wallH + 0.95,
      -depth * 0.12
    );

    const merged = mergeIntoRoot(root, parts, [pivot]);
    root.position = new B.Vector3(position.x, position.y, position.z);

    this.roots.push(root);
    return { root, body: merged, roof: merged };
  }

  dispose(): void {
    for (const r of this.roots) r?.dispose?.();
    this.roots = [];
  }
}
