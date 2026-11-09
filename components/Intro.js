"use client";
import { useEffect, useRef } from "react";
import { Engrave } from "@/lib/art";

const LINES = [
  { size: 150, y: 140, d: 1100, text: "20/11", bold: true },
  { size: 54, y: 236, d: 1500, text: "Kính chúc quý thầy cô luôn mạnh khỏe," },
  { size: 54, y: 310, d: 1600, text: "hạnh phúc và vững bước trên bục giảng." },
];
const BURST = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2 + Math.random() * 0.4, r = 70 + Math.random() * 90;
  return { "--x": `${Math.cos(a) * r}px`, "--y": `${Math.sin(a) * r - 30}px`, "--a": `${Math.random() * 360}deg`, "--c": ["#7B1E2B", "#9A2E3C", "#5A1420", "#B5525F"][i % 4] };
});
const AUTO_OPEN = 9000; // không ai bấm (máy chiếu) thì tự mở, khi đó không có nhạc vì trình duyệt chặn
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Đường bay máy bay giấy: 1 đường cong Bezier liền mạch (P1 kéo lùi xuống = lấy đà), lấy mẫu dày
// để mỗi đoạn là tuyến tính, còn easing đặt cho cả hành trình → không bị khựng giữa các keyframe.
function flightFrames(W, H) {
  const P = [[0, 0], [-0.16 * W, 0.16 * H], [0.32 * W, -0.05 * H], [0.78 * W, -0.9 * H]];
  const pt = (t, k) => (1 - t) ** 3 * P[0][k] + 3 * (1 - t) ** 2 * t * P[1][k] + 3 * (1 - t) * t * t * P[2][k] + t ** 3 * P[3][k];
  // Không xoay theo tiếp tuyến (đoạn lấy đà đi lùi sẽ làm máy bay lật ngược): ngóc mũi nhẹ khi lùi, rồi nghiêng dần theo hướng bay
  const ss = (x) => x * x * (3 - 2 * x);
  return Array.from({ length: 41 }, (_, i) => {
    const t = i / 40, a = t < 0.2 ? -6 * ss(t / 0.2) : -6 + 20 * ss((t - 0.2) / 0.8);
    return { transform: `translate(${pt(t, 0)}px,${pt(t, 1)}px) rotate(${a}deg) scale(${1 - 0.55 * t})` };
  });
}

/**
 * Màn mở đầu: phong thư niêm sáp → bấm con dấu → thư bật nắp, lá thư trượt ra, chữ viết tay hiện dần
 * → thư gấp thành máy bay giấy bay đi, để lộ tường lời chúc. onReveal khi bắt đầu lộ tường, onDone khi xong.
 */
export default function Intro({ onDone, onReveal }) {
  const root = useRef(null), svg = useRef(null), pen = useRef(null), sig = useRef(null), seal = useRef(null), plane = useRef(null);
  const st = useRef({ opened: false, done: false, cancelled: false });

  const add = (c) => root.current?.classList.add(c);
  const finish = () => {
    const s = st.current;
    if (s.done) return;
    s.done = true; s.cancelled = true;
    onReveal?.();
    add("gone");
    document.body.classList.remove("intro-on", "intro-hold");
    setTimeout(onDone, 900);
  };

  const write = async () => {
    const masks = [...svg.current.querySelectorAll("mask rect.m")], feathers = [...svg.current.querySelectorAll("mask rect.f")];
    const texts = [...svg.current.querySelectorAll("text")];
    for (let i = 0; i < LINES.length && !st.current.cancelled; i++) {
      const b = texts[i].getBBox(), m = masks[i], f = feathers[i], d = LINES[i].d, t0 = performance.now();
      m.setAttribute("x", b.x - 10); f.setAttribute("opacity", 1);
      pen.current.setAttribute("opacity", 1);
      await new Promise((res) => {
        const step = (t) => {
          if (st.current.cancelled) return res();
          const p = Math.min(1, (t - t0) / d), e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          const w = (b.width + 20) * e;
          m.setAttribute("width", w); f.setAttribute("x", b.x - 10 + w);
          pen.current.setAttribute("transform", `translate(${b.x + w - 6},${b.y + b.height * 0.62 + Math.sin(t / 38) * b.height * 0.18})`);
          p < 1 ? requestAnimationFrame(step) : res();
        };
        requestAnimationFrame(step);
      });
      f.setAttribute("opacity", 0); m.setAttribute("width", 1000);
      await wait(i === 0 ? 250 : 120);
    }
    pen.current?.setAttribute("opacity", 0);
  };

  const open = async (byUser) => {
    const s = st.current;
    if (s.opened || s.done) return;
    s.opened = true;
    if (byUser) dispatchEvent(new Event("vinyl:play")); // kim đặt xuống đĩa đúng lúc mở thư
    // Các nhịp gối lên nhau (nắp chưa mở hết thì thư đã nhô lên) để không có khoảng chết
    add("open");                      await wait(450);
    if (s.cancelled) return; add("rise"); await wait(750);
    if (s.cancelled) return; add("out");  await wait(650);
    if (s.cancelled) return; await write();
    if (s.cancelled) return; sig.current.classList.add("show"); await wait(1700);
    if (s.cancelled) return; add("fold"); await wait(900);
    if (s.cancelled) return;
    add("fly"); document.body.classList.remove("intro-hold"); onReveal?.();
    plane.current.animate(flightFrames(innerWidth, innerHeight), { duration: 1700, easing: "cubic-bezier(.45,0,.4,1)", fill: "forwards" });
    await wait(1250);
    finish();
  };

  useEffect(() => {
    const s = st.current;
    document.body.classList.add("intro-on", "intro-hold");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      ["open", "rise", "out"].forEach(add);
      svg.current.querySelectorAll("mask rect.m").forEach((r) => r.setAttribute("width", 1000));
      sig.current.classList.add("show");
      const t = setTimeout(finish, 4000);
      return () => { clearTimeout(t); document.body.classList.remove("intro-on", "intro-hold"); };
    }
    const t = setTimeout(() => open(false), AUTO_OPEN);
    seal.current?.focus({ preventScroll: true });
    return () => { clearTimeout(t); s.cancelled = true; document.body.classList.remove("intro-on", "intro-hold"); };
  }, []);

  return (
    <div id="intro" ref={root} role="dialog" aria-label="Lời mở đầu">
      <div className="ibg" aria-hidden="true" />
      <Engrave className="in-intro" />

      <div className="scene">
        <div className="env-back ep" />
        <div className="letter">
          <svg className="write" viewBox="0 0 1000 350" ref={svg} aria-hidden="true">
            <defs>
              <linearGradient id="ifeather"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
              {LINES.map((l, i) => (
                <mask id={`im${i}`} key={i} maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="350">
                  <rect className="m" x="0" y={l.y - l.size} width="0" height={l.size * 1.4} fill="#fff" />
                  <rect className="f" x="0" y={l.y - l.size} width="70" height={l.size * 1.4} fill="url(#ifeather)" opacity="0" />
                </mask>
              ))}
            </defs>
            {LINES.map((l, i) => (
              <text key={i} className="ln" mask={`url(#im${i})`} x="500" y={l.y} textAnchor="middle" fontSize={l.size} fontWeight={l.bold ? 600 : 500} fontStyle={l.bold ? "normal" : "italic"}>{l.text}</text>
            ))}
            <g ref={pen} opacity="0">
              <path d="M0 0 L-8 -26 L-2 -60 L10 -60 L16 -26 Z" transform="rotate(28)" fill="var(--leaf-700)" />
              <circle r="3" fill="var(--leaf-700)" />
            </g>
          </svg>
          <p className="sig" ref={sig}>Trân trọng, các thế hệ sinh viên</p>
        </div>
        <div className="env-front ep" />
        <div className="env-bot ep" />
        <svg className="env-stamp ep" viewBox="-6 -6 82 98" aria-hidden="true"><use href="#s-stamp" /></svg>
        <svg className="env-pm ep" viewBox="0 0 150 70" aria-hidden="true">
          <circle cx="35" cy="35" r="30" /><circle cx="35" cy="35" r="23" />
          <text x="35" y="39" textAnchor="middle">20.11</text>
          <path d="M70 22c10-5 20 5 30 0s20-5 30 0 M70 35c10-5 20 5 30 0s20-5 30 0 M70 48c10-5 20 5 30 0s20-5 30 0" />
        </svg>
        <p className="env-to ep" aria-hidden="true">Kính gửi quý thầy cô</p>
        <div className="flap ep" />
        <button ref={seal} className="seal" type="button" aria-label="Mở thư" onClick={() => open(true)}>
          <span className="seal-mark" aria-hidden="true">20/11</span>
        </button>
        <div className="burst" aria-hidden="true">{BURST.map((s, i) => <i key={i} style={s} />)}</div>
        <div className="ihint">
          <p className="ih-t">Một lá thư từ sinh viên</p>
          <p className="ih-s">Bấm vào con dấu để mở</p>
        </div>
      </div>

      <svg className="iplane" ref={plane} viewBox="96 14 64 52" aria-hidden="true">
        <path d="M100 44L156 18L122 62L114 50Z" fill="#FBF9F2" stroke="#1E3A2F" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M114 50L156 18M114 50L112 62L122 62" fill="none" stroke="#1E3A2F" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>

      <p className="sr-only">20/11. Kính chúc quý thầy cô luôn mạnh khỏe, hạnh phúc và vững bước trên bục giảng. Trân trọng, các thế hệ sinh viên.</p>
      <button className="skip" type="button" onClick={finish}>Bỏ qua</button>
    </div>
  );
}
