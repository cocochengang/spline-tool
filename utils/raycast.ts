import { geometry, Layers, renderer, Mat4, Vec3, GFXPrimitiveMode, Node } from 'cc'
const { intersect, Ray, Triangle } = geometry;

type IBArray = Uint8Array | Uint16Array | Uint32Array;

let resultModels = [];
let m4 = new Mat4;
let modelRay = new Ray();
let tri = Triangle.create();
let v3 = new Vec3();

let narrowDis = Infinity;

const narrowphase = (vb: Float32Array, ib: IBArray, pm: GFXPrimitiveMode, sides: boolean, distance = Infinity) => {
    narrowDis = distance;
    if (pm === GFXPrimitiveMode.TRIANGLE_LIST) {
        const cnt = ib.length;
        for (let j = 0; j < cnt; j += 3) {
            const i0 = ib[j] * 3;
            const i1 = ib[j + 1] * 3;
            const i2 = ib[j + 2] * 3;
            Vec3.set(tri.a, vb[i0], vb[i0 + 1], vb[i0 + 2]);
            Vec3.set(tri.b, vb[i1], vb[i1 + 1], vb[i1 + 2]);
            Vec3.set(tri.c, vb[i2], vb[i2 + 1], vb[i2 + 2]);
            const dist = intersect.rayTriangle(modelRay, tri, sides);
            if (dist <= 0 || dist >= narrowDis) { continue; }
            narrowDis = dist;
        }
    } else if (pm === GFXPrimitiveMode.TRIANGLE_STRIP) {
        const cnt = ib.length - 2;
        let rev = 0;
        for (let j = 0; j < cnt; j += 1) {
            const i0 = ib[j - rev] * 3;
            const i1 = ib[j + rev + 1] * 3;
            const i2 = ib[j + 2] * 3;
            Vec3.set(tri.a, vb[i0], vb[i0 + 1], vb[i0 + 2]);
            Vec3.set(tri.b, vb[i1], vb[i1 + 1], vb[i1 + 2]);
            Vec3.set(tri.c, vb[i2], vb[i2 + 1], vb[i2 + 2]);
            rev = ~rev;
            const dist = intersect.rayTriangle(modelRay, tri, sides);
            if (dist <= 0 || dist >= narrowDis) { continue; }
            narrowDis = dist;
        }
    } else if (pm === GFXPrimitiveMode.TRIANGLE_FAN) {
        const cnt = ib.length - 1;
        const i0 = ib[0] * 3;
        Vec3.set(tri.a, vb[i0], vb[i0 + 1], vb[i0 + 2]);
        for (let j = 1; j < cnt; j += 1) {
            const i1 = ib[j] * 3;
            const i2 = ib[j + 1] * 3;
            Vec3.set(tri.b, vb[i1], vb[i1 + 1], vb[i1 + 2]);
            Vec3.set(tri.c, vb[i2], vb[i2 + 1], vb[i2 + 2]);
            const dist = intersect.rayTriangle(modelRay, tri, sides);
            if (dist <= 0 || dist >= narrowDis) { continue; }
            narrowDis = dist;
        }
    }
};

export default {
    raycastAllModels (renderScene: renderer.scene.RenderScene, worldRay: geometry.Ray, mask = Layers.Enum.DEFAULT, distance = Infinity): { node: Node, distance: number }[] {
        resultModels.length = 0;

        for (const m of renderScene.models) {
            const transform = m.transform;
            if (!transform || !m.enabled || !(m.node.layer & mask) || !m.worldBounds) { continue; }
            // broadphase
            let d = intersect.rayAABB(worldRay, m.worldBounds);
            if (d <= 0 || d >= distance) { continue; }
            if (m.type === renderer.scene.ModelType.DEFAULT) {
                // transform ray back to model space
                Mat4.invert(m4, transform.getWorldMatrix(m4));
                Vec3.transformMat4(modelRay.o, worldRay.o, m4);
                Vec3.normalize(modelRay.d, Vec3.transformMat4Normal(modelRay.d, worldRay.d, m4));
                d = Infinity;
                for (let i = 0; i < m.subModels.length; ++i) {
                    const subModel = m.subModels[i].subMesh;
                    if (subModel && subModel.geometricInfo) {
                        const { positions: vb, indices: ib, doubleSided: sides } = subModel.geometricInfo;
                        narrowphase(vb, ib!, subModel.primitiveMode, sides!, distance);
                        d = Math.min(d, narrowDis * Vec3.multiply(v3, modelRay.d, transform.worldScale).length());
                    }
                }
            }
            if (d < distance) {
                resultModels.push({
                    node: m.node,
                    distance: d
                });
            }
        }
        resultModels.sort((a, b) => {
            return a.distance - b.distance;
        })
        return resultModels;
    },

    raycastModels (models: renderer.scene.Model[], worldRay: geometry.Ray, mask = Layers.Enum.DEFAULT, distance = Infinity): { node: Node, distance: number }[] {
        resultModels.length = 0;

        for (const m of models) {
            const transform = m.transform;
            if (!transform || !m.enabled || !(m.node.layer & mask) || !m.worldBounds) { continue; }
            // broadphase
            let d = intersect.rayAABB(worldRay, m.worldBounds);
            if (d <= 0 || d >= distance) { continue; }
            if (m.type === renderer.scene.ModelType.DEFAULT) {
                // transform ray back to model space
                Mat4.invert(m4, transform.getWorldMatrix(m4));
                Vec3.transformMat4(modelRay.o, worldRay.o, m4);
                Vec3.normalize(modelRay.d, Vec3.transformMat4Normal(modelRay.d, worldRay.d, m4));
                d = Infinity;
                for (let i = 0; i < m.subModels.length; ++i) {
                    const subModel = m.subModels[i].subMesh;
                    if (subModel && subModel.geometricInfo) {
                        const { positions: vb, indices: ib, doubleSided: sides } = subModel.geometricInfo;
                        narrowphase(vb, ib!, subModel.primitiveMode, sides!, distance);
                        d = Math.min(d, narrowDis * Vec3.multiply(v3, modelRay.d, transform.worldScale).length());
                    }
                }
            }
            if (d < distance) {
                resultModels.push({
                    node: m.node,
                    distance: d
                });
            }
        }
        resultModels.sort((a, b) => {
            return a.distance - b.distance;
        })
        return resultModels;
    },

    raycastModel (m: renderer.scene.Model, worldRay: geometry.Ray, distance = Infinity): { node: Node, distance: number } | null {
        const transform = m.transform;
        // broadphase
        let d = intersect.rayAABB(worldRay, m.worldBounds!);
        if (d <= 0 || d >= distance) {
            return null;
        }
        if (m.type === renderer.scene.ModelType.DEFAULT) {
            // transform ray back to model space
            Mat4.invert(m4, transform.getWorldMatrix(m4));
            Vec3.transformMat4(modelRay.o, worldRay.o, m4);
            Vec3.normalize(modelRay.d, Vec3.transformMat4Normal(modelRay.d, worldRay.d, m4));
            d = Infinity;
            for (let i = 0; i < m.subModels.length; ++i) {
                const subModel = m.subModels[i].subMesh;
                if (subModel && subModel.geometricInfo) {
                    const { positions: vb, indices: ib, doubleSided: sides } = subModel.geometricInfo;
                    narrowphase(vb, ib!, subModel.primitiveMode, sides!, distance);
                    d = Math.min(d, narrowDis * Vec3.multiply(v3, modelRay.d, transform.worldScale).length());
                }
            }
        }
        if (d < distance) {
            return {
                node: m.node,
                distance: d
            };
        }
        return null;
    }
}