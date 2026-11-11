"use client";
import { useEffect, useRef } from "react";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const label = (w) => (w.teacherName ? `Gửi ${w.teacherName}` : "Gửi tất cả thầy cô");

/**
 * Tường lời chúc kiểu bình luận livestream.
 * Chuột: rê vào thẻ là dừng + phóng to, bấm để ghim. Cảm ứng: nhấn giữ là dừng, chạm nhanh để ghim/bỏ ghim.
 */
export default function Wall({ active }) {
  const stageRef = useRef(null);
  const api = useRef(null);

  useEffect(() => {
    const stage = stageRef.current;
    let on = false, bubbles = [], queue = [], pool = [], seen = new Set(), last = 0, laneFree = [];
    const small = () => innerWidth < 640;
    const LANE_H = () => (small() ? 84 : 108); // điện thoại: thẻ nhỏ hơn nên làn thấp hơn, chứa được nhiều thẻ hơn
    const TOP = () => (small() ? 56 : 92);
    const MAX = () => (small() ? 6 : 14);
    const lanes = () => Math.max(2, Math.floor((stage.clientHeight - TOP() - 70) / LANE_H()));
    const refill = () => { queue = pool.slice().sort(() => Math.random() - 0.5); };
    const setHot = (b, v) => { b.hot = v; b.el.classList.toggle("hot", v); };
    const unpinAll = (except) => bubbles.forEach((o) => { if (o !== except && (o.pinned || o.hot)) { o.pinned = false; setHot(o, false); } });
    const place = (b) => { b.el.style.transform = `translate3d(${b.x}px,${b.y}px,0)`; };

    function spawn(msg, fresh) {
      const n = lanes(); if (laneFree.length !== n) laneFree = Array(n).fill(0);
      const W = stage.clientWidth;
      const free = [...laneFree.keys()].filter((i) => laneFree[i] < W - 160);
      if (!free.length) return false;
      const lane = free[(Math.random() * free.length) | 0];
      const el = document.createElement("div");
      el.className = "wish" + (msg.teacherId ? " private" : "") + (fresh ? " fresh" : "");
      el.tabIndex = 0;
      el.innerHTML = `<div class="wish-in" style="--rot:${(Math.random() * 1.6 - 0.8).toFixed(1)}deg"><span class="to">${esc(label(msg))}</span><p>${esc(msg.text)}</p></div>`;
      stage.appendChild(el);
      const b = { el, lane, x: W + 30 + Math.random() * 120, y: TOP() + lane * LANE_H() + Math.random() * (LANE_H() - 76), v: (small() ? 34 : 46) + Math.random() * 40, w: el.offsetWidth, hot: false, pinned: false };
      laneFree[lane] = b.x + b.w;
      let downAt = 0, wasPinned = false;
      el.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") setHot(b, true); });
      el.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") setHot(b, b.pinned); });
      el.addEventListener("pointerdown", (e) => {
        downAt = performance.now(); wasPinned = b.pinned; unpinAll(b); setHot(b, true);
        if (e.pointerType !== "mouse") try { el.setPointerCapture(e.pointerId); } catch {}
      });
      el.addEventListener("pointerup", (e) => {
        if (e.pointerType === "mouse") { b.pinned = !wasPinned; setHot(b, true); return; }
        b.pinned = performance.now() - downAt < 300 ? !wasPinned : false;
        setHot(b, b.pinned);
      });
      el.addEventListener("pointercancel", () => setHot(b, b.pinned));
      el.addEventListener("contextmenu", (e) => e.preventDefault());
      el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); b.pinned = !b.pinned; setHot(b, b.pinned); } });
      el.addEventListener("blur", () => { b.pinned = false; setHot(b, false); });
      bubbles.push(b); place(b);
      return true;
    }

    function tick(t) {
      if (!on) return;
      const dt = Math.min(0.05, (t - (last || t)) / 1000); last = t;
      laneFree = Array(lanes()).fill(0);
      // Thẻ đang dừng nổi lên trên; các thẻ khác vẫn trôi qua bên dưới, không bị dồn hàng
      for (const b of bubbles) {
        if (!b.hot) b.x -= b.v * dt;
        place(b);
        if (!b.hot && b.lane < laneFree.length) laneFree[b.lane] = Math.max(laneFree[b.lane], b.x + b.w);
      }
      bubbles = bubbles.filter((b) => { if (b.x + b.w < -40) { b.el.remove(); return false; } return true; });
      if (bubbles.length < MAX() && pool.length) {
        if (!queue.length) refill();
        if (queue.length && spawn(queue[0], queue[0]._fresh)) { delete queue[0]._fresh; queue.shift(); }
      }
      requestAnimationFrame(tick);
    }

    function seed() {
      refill();
      const W = stage.clientWidth;
      for (let i = 0; i < Math.min(MAX() - 4, queue.length); i++) {
        if (!spawn(queue[0])) break; // mỗi thẻ seed nằm làn riêng nên đặt x ngẫu nhiên không chồng nhau
        const b = bubbles[bubbles.length - 1]; b.x = W * (0.08 + Math.random() * 0.72); place(b); queue.shift();
      }
    }

    async function load() {
      try {
        const rows = await fetch("/api/wishes").then((r) => r.json());
        if (!Array.isArray(rows)) return;
        const firstLoad = !seen.size;
        for (const w of rows.slice().reverse()) {
          if (seen.has(w.id)) continue;
          seen.add(w.id);
          if (!firstLoad) { w._fresh = true; queue.unshift(w); } // lời chúc mới chen lên sớm
        }
        const ids = new Set(rows.map((w) => w.id)); // lời bị admin ẩn sẽ rơi khỏi pool
        pool = rows;
        queue = queue.filter((w) => ids.has(w.id));
        if (firstLoad && on && !bubbles.length) seed();
      } catch {}
    }

    stage.addEventListener("pointerdown", (e) => { if (e.target === stage) unpinAll(null); });
    load();
    const poll = setInterval(load, 15_000);
    api.current = {
      setActive(v) {
        if (v === on) return; on = v;
        if (v) { last = 0; if (!bubbles.length && pool.length) seed(); requestAnimationFrame(tick); }
      },
    };
    return () => { on = false; clearInterval(poll); bubbles.forEach((b) => b.el.remove()); };
  }, []);

  useEffect(() => { api.current?.setActive(active); }, [active]);

  return (
    <div className="stage" ref={stageRef}>
    </div>
  );
}
