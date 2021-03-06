import { _decorator, Vec3, Vec2, Mesh, Vec4 } from 'cc';
const { ccclass, property } = _decorator;

import { Pool } from '../pool';

@ccclass('MeshVertex')
export default class MeshVertex {
    private static _pool: Pool<MeshVertex>;
    static get pool () {
        if (!this._pool) {
            this._pool = new Pool(MeshVertex);
        }
        return this._pool;
    }

    static create (position?: Vec3 | MeshVertex, normal?: Vec3, uv?: Vec2, tangent?: Vec4, uv1?: Vec2,): MeshVertex {
        let v = new MeshVertex();
        v.set(position, normal, uv, tangent, uv1);
        return v;
    }

    @property
    public position: Vec3 = new Vec3();
    @property
    public normal: Vec3 = new Vec3();
    @property
    public tangent: Vec4 = new Vec4();
    @property
    public uv: Vec2 = new Vec2();
    @property
    public uv1: Vec2 = new Vec2();

    set (position?: Vec3 | MeshVertex, normal?: Vec3, uv?: Vec2, tangent?: Vec4, uv1?: Vec2,): MeshVertex {
        if (position instanceof MeshVertex) {
            let vert = position;
            this.position.set(vert.position);
            this.normal.set(vert.normal);
            this.uv.set(vert.uv);
            this.uv1.set(vert.uv1);
            this.tangent.set(vert.tangent);
        }
        else {
            this.position.set(position || Vec3.ZERO);
            this.normal.set(normal || Vec3.ZERO);
            this.uv.set(uv || Vec2.ZERO);
            this.uv1.set(uv1 || Vec2.ZERO);
            this.tangent.set(tangent || Vec4.ZERO)
        }
        return this;
    }
}
