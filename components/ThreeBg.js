"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

// Nền 3D: hoa sữa rơi chậm, parallax nhẹ theo chuột.
export default function ThreeBg() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); } catch { return; } // máy không có WebGL: bỏ qua
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = innerWidth < 640;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    cam.position.z = 14;
    scene.add(new THREE.AmbientLight(0xffffff, 2.2));
    const dl = new THREE.DirectionalLight(0xffffff, 1.6);
    dl.position.set(4, 8, 6);
    scene.add(dl);

    // Hoa sữa: chùm hoa nhỏ 5 cánh màu kem, mùa hoa của tháng 11. Rơi chậm, mờ, chỉ là lớp nền.
    const shape = new THREE.Shape();
    for (let i = 0; i <= 60; i++) {
      const a = (i / 60) * Math.PI * 2, r = 0.32 + 0.68 * Math.pow(Math.abs(Math.cos(2.5 * a)), 0.7);
      i ? shape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const pgeo = new THREE.ShapeGeometry(shape); pgeo.scale(0.17, 0.17, 0.17);
    const N = small ? 40 : 110;
    const petals = new THREE.InstancedMesh(pgeo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, opacity: 0.9 }), N);
    const cols = [0xfbf8ec, 0xf1ead2, 0xe6e2c8, 0xd8dcc5, 0xfffdf6].map((c) => new THREE.Color(c));
    const P = [];
    for (let i = 0; i < N; i++) {
      P.push({ x: (Math.random() - 0.5) * 30, y: Math.random() * 20 - 10, z: (Math.random() - 0.5) * 10, vy: 0.25 + Math.random() * 0.35, sw: Math.random() * 6.28, rs: 0.3 + Math.random() * 0.6, s: 0.6 + Math.random() * 0.8, r: Math.random() * 6 });
      petals.setColorAt(i, cols[i % cols.length]);
    }
    scene.add(petals);

    const mouse = { x: 0, y: 0 };
    const onMove = (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; };
    const resize = () => { renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); };
    addEventListener("pointermove", onMove);
    addEventListener("resize", resize);
    resize();

    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
    let last = performance.now(), raf;
    const frame = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      if (document.body.dataset.view !== "admin" && !document.hidden) {
        for (let i = 0; i < N; i++) {
          const p = P[i]; p.y -= p.vy * dt; p.sw += dt * p.rs; p.r += dt * p.rs;
          if (p.y < -11) { p.y = 11; p.x = (Math.random() - 0.5) * 30; }
          pos.set(p.x + Math.sin(p.sw) * 0.8, p.y, p.z); eu.set(p.r, p.r * 0.7, Math.sin(p.sw)); q.setFromEuler(eu); sc.setScalar(p.s);
          m4.compose(pos, q, sc); petals.setMatrixAt(i, m4);
        }
        petals.instanceMatrix.needsUpdate = true;
        cam.position.x += (mouse.x * 1.0 - cam.position.x) * 0.03; cam.position.y += (-mouse.y * 0.6 - cam.position.y) * 0.03; cam.lookAt(0, 0, 0);
        renderer.render(scene, cam);
      }
      if (!reduced) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); removeEventListener("pointermove", onMove); removeEventListener("resize", resize); renderer.dispose(); };
  }, []);

  return <canvas id="three" ref={ref} aria-hidden="true" />;
}
