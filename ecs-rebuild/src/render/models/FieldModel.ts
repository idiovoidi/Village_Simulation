/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * FieldModel — tilled market garden with crop rows and two striped stalls.
 */

import { sharedMaterial, createGableRoof, mergeIntoRoot } from './Materials.ts';

export interface FieldParts {
  root: unknown;
}

export class FieldModel {
  private scene: any;
  private roots: any[] = [];

  constructor(scene: any) {
    this.scene = scene;
  }

  create(position: { x: number; y: number; z: number }): FieldParts {
    const B = (window as any).BABYLON;
    const s = this.scene;
    const name = `prop_field_${this.roots.length}`;

    const root = new B.TransformNode(name, s);
    const soil = sharedMaterial(s, 'field_soil', [0.33, 0.23, 0.14]);
    const crop = sharedMaterial(s, 'field_crop', [0.35, 0.6, 0.18]);
    const wood = sharedMaterial(s, 'house_wood', [0.3, 0.2, 0.13]);
    const cloths = [
      sharedMaterial(s, 'stall_red', [0.75, 0.2, 0.18], { twoSided: true }),
      sharedMaterial(s, 'stall_blue', [0.2, 0.4, 0.7], { twoSided: true }),
    ];

    const patch = B.MeshBuilder.CreateBox(`${name}_patch`, { width: 9, height: 0.12, depth: 7 }, s);
    patch.parent = root;
    patch.position.y = 0.06;
    patch.material = soil;

    for (let i = 0; i < 5; i++) {
      const row = B.MeshBuilder.CreateBox(`${name}_row${i}`, { width: 8, height: 0.35, depth: 0.55 }, s);
      row.parent = root;
      row.position.set(0, 0.25, -2.6 + i * 1.3);
      row.material = crop;
    }

    // Two market stalls on the edge of the field.
    [-1, 1].forEach((side, i) => {
      const stall = new B.TransformNode(`${name}_stall${i}`, s);
      stall.parent = root;
      stall.position.set(side * 3.2, 0, 4.6);
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const post = B.MeshBuilder.CreateBox(`${name}_sp`, { width: 0.12, height: 2.0, depth: 0.12 }, s);
          post.parent = stall;
          post.position.set(sx * 0.9, 1.0, sz * 0.6);
          post.material = wood;
        }
      }
      const counter = B.MeshBuilder.CreateBox(`${name}_counter`, { width: 2.0, height: 0.7, depth: 0.7 }, s);
      counter.parent = stall;
      counter.position.set(0, 0.45, 0.4);
      counter.material = wood;
      const awning = createGableRoof(s, `${name}_awning`, { width: 1.8, depth: 1.2, height: 0.5, overhang: 0.25 });
      awning.parent = stall;
      awning.position.y = 2.0;
      awning.material = cloths[i % cloths.length];
    });

    const stalls = root.getChildTransformNodes(true);
    mergeIntoRoot(root, root.getChildMeshes(false), stalls);
    root.position = new B.Vector3(position.x, position.y, position.z);

    this.roots.push(root);
    return { root };
  }

  dispose(): void {
    for (const r of this.roots) r?.dispose?.();
    this.roots = [];
  }
}
