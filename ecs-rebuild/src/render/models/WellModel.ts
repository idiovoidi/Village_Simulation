/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * WellModel — stone well with a small gabled roof, crank beam and water.
 */

import { sharedMaterial, createGableRoof, mergeIntoRoot } from './Materials.ts';

export interface WellParts {
  root: unknown;
}

export class WellModel {
  private scene: any;
  private roots: any[] = [];

  constructor(scene: any) {
    this.scene = scene;
  }

  create(position: { x: number; y: number; z: number }): WellParts {
    const B = (window as any).BABYLON;
    const s = this.scene;
    const name = `well_${this.roots.length}`;

    const root = new B.TransformNode(name, s);
    const stone = sharedMaterial(s, 'well_stone', [0.55, 0.54, 0.52]);
    const wood = sharedMaterial(s, 'house_wood', [0.3, 0.2, 0.13]);
    const roofMat = sharedMaterial(s, 'well_roof', [0.45, 0.3, 0.2], { twoSided: true });
    const water = sharedMaterial(s, 'well_water', [0.1, 0.25, 0.4], { specular: 0.8, specularPower: 64 });

    const ring = B.MeshBuilder.CreateCylinder(`${name}_ring`, { diameter: 2.1, height: 1.0, tessellation: 12 }, s);
    ring.parent = root;
    ring.position.y = 0.5;
    ring.material = stone;

    const pool = B.MeshBuilder.CreateDisc(`${name}_pool`, { radius: 0.8, tessellation: 16 }, s);
    pool.parent = root;
    pool.position.y = 0.92;
    pool.rotation.x = Math.PI / 2;
    pool.material = water;

    for (const sx of [-1, 1]) {
      const post = B.MeshBuilder.CreateBox(`${name}_post`, { width: 0.18, height: 2.2, depth: 0.18 }, s);
      post.parent = root;
      post.position.set(sx * 0.95, 1.9, 0);
      post.material = wood;
    }

    const roof = createGableRoof(s, `${name}_roof`, { width: 2.0, depth: 1.6, height: 0.9, overhang: 0.3 });
    roof.parent = root;
    roof.position.y = 3.0;
    roof.material = roofMat;

    const beam = B.MeshBuilder.CreateCylinder(`${name}_beam`, { diameter: 0.14, height: 1.9, tessellation: 6 }, s);
    beam.parent = root;
    beam.position.y = 2.4;
    beam.rotation.z = Math.PI / 2;
    beam.material = wood;

    mergeIntoRoot(root, root.getChildMeshes(true));
    root.position = new B.Vector3(position.x, position.y, position.z);

    this.roots.push(root);
    return { root };
  }

  dispose(): void {
    for (const r of this.roots) r?.dispose?.();
    this.roots = [];
  }
}
