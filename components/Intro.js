"use client";
import { useEffect, useRef } from "react";
import { Engrave } from "@/lib/art";
import { createPaperPlane } from "@/lib/paperPlane";

const LINES = [
  { size: 150, y: 140, d: 1100, text: "20/11", bold: true },
  { size: 54, y: 236, d: 1500, text: "Kính chúc quý thầy cô luôn mạnh khỏe," },
  { size: 54, y: 310, d: 1600, text: "hạnh phúc và vững bước trên bục giảng." },
];
// Giả ngẫu nhiên theo chỉ số (không dùng Math.random): server và client phải ra cùng style, nếu không sẽ lỗi hydration
const rnd = (n) => ((Math.imul(n + 1, 2654435761) >>> 0) % 1000) / 1000;
const BURST = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2 + rnd(i) * 0.4, r = 70 + rnd(i + 50) * 90;
  return { "--x": `${(Math.cos(a) * r).toFixed(1)}px`, "--y": `${(Math.sin(a) * r - 30).toFixed(1)}px`, "--a": `${Math.round(rnd(i + 99) * 360)}deg`, "--c": ["#7B1E2B", "#9A2E3C", "#5A1420", "#B5525F"][i % 4] };
});
const AUTO_OPEN = 9000; // không ai bấm (máy chiếu) thì tự mở, khi đó không có nhạc vì trình duyệt chặn
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Màn mở đầu: phong thư niêm sáp → bấm con dấu → thư bật nắp, lá thư trượt ra, chữ viết tay hiện dần
 * → thư gấp thành máy bay giấy bay đi, để lộ tường lời chúc. onReveal khi bắt đầu lộ tường, onDone khi xong.
 */
export default function Intro({ onDone, onReveal }) {
  const root = useRef(null), svg = useRef(null), pen = useRef(null), sig = useRef(null), seal = useRef(null), plane = useRef(null);
  const st = useRef({ opened: false, done: false, cancelled: false });
  const finishTimer = useRef(null);

  const add = (c) => root.current?.classList.add(c);
  const finish = () => {
    const s = st.current;
    if (s.done || s.cancelled) return;
    s.done = true; s.cancelled = true;
    onReveal?.();
    add("gone");
    document.body.classList.remove("intro-on", "intro-hold");
    finishTimer.current = setTimeout(onDone, 900);
  };

  const write = async (s) => {
    const masks = [...svg.current.querySelectorAll("mask rect.m")], feathers = [...svg.current.querySelectorAll("mask rect.f")];
    const texts = [...svg.current.querySelectorAll("text")];
    for (let i = 0; i < LINES.length && !s.cancelled; i++) {
      const b = texts[i].getBBox(), m = masks[i], f = feathers[i], d = LINES[i].d, t0 = performance.now();
      m.setAttribute("x", b.x - 10); f.setAttribute("opacity", 1);
      pen.current.setAttribute("opacity", 1);
      await new Promise((res) => {
        const step = (t) => {
          if (s.cancelled) return res();
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
    if (s.opened || s.done || s.cancelled) return;
    s.opened = true;
    if (byUser) dispatchEvent(new Event("vinyl:play")); // kim đặt xuống đĩa đúng lúc mở thư
    // Các nhịp gối lên nhau (nắp chưa mở hết thì thư đã nhô lên) để không có khoảng chết
    add("open");                      await wait(450);
    if (s.cancelled) return; add("rise"); await wait(750);
    if (s.cancelled) return; add("out");  await wait(650);
    if (s.cancelled) return; await write(s);
    if (s.cancelled) return; sig.current.classList.add("show"); await wait(1000);
    if (s.cancelled) return;
    // Lá thư sắp được thay bằng tờ giấy 3D (Three.js) cùng hình dạng, rồi chính tờ giấy đó gấp thành máy bay và bay đi.
    // Dựng sẵn trong lúc chữ ký hiện (chụp chữ, nạp font, biên dịch shader); bóng đổ của lá thư DOM mờ dần cho khớp.
    add("prep");
    root.current.querySelector(".iphoto img").decode().catch(() => {}); // giải mã ảnh tập thể từ trước, tránh giật lúc ảnh hiện
    const ready = createPaperPlane(root.current, root.current.querySelector(".letter")).catch(() => null);
    await wait(700);
    const p = await ready;
    if (s.cancelled) { p?.dispose(); return; }
    if (!p) return finish(); // không có WebGL hoặc không chụp được chữ
    plane.current = p;
    p.show(); add("folding"); // cùng một khung hình: hiện tờ giấy 3D, ẩn lá thư DOM
    await plane.current.fold(() => !s.cancelled);
    if (s.cancelled) return;
    add("fly");
    await plane.current.fly(2600); // bay thẳng, nhanh dần, xa dần rồi tan vào nền
    if (s.cancelled) return;
    // Ảnh tập thể nở ra từ đúng chấm máy bay vừa biến mất, dừng một nhịp rồi cả màn mở đầu mờ vào tường lời chúc
    const { x, y } = plane.current.pos, ph = root.current.querySelector(".iphoto");
    ph.style.setProperty("--fx", `${x - innerWidth / 2}px`); ph.style.setProperty("--fy", `${y - innerHeight / 2}px`);
    ph.getBoundingClientRect(); // áp vị trí xuất phát trước khi chuyển cảnh
    ph.style.removeProperty("--fx"); ph.style.removeProperty("--fy"); // style inline thắng CSS, nên gỡ ra để ảnh về giữa
    add("photo");
    await wait(1100);
    if (s.cancelled) return;
    // Lộ tường lời chúc khi ảnh đã nằm yên: dựng tường (React + DOM) lúc máy bay đang bay hay ảnh đang nở làm rơi khung hình
    document.body.classList.remove("intro-hold"); onReveal?.();
    await wait(1500);
    finish();
  };

  useEffect(() => {
    // Strict Mode chạy setup → cleanup → setup trên cùng ref: mỗi lượt cần trạng thái mới.
    const s = { opened: false, done: false, cancelled: false };
    st.current = s;
    document.body.classList.add("intro-on", "intro-hold");
    let timer;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      s.opened = true;
      ["open", "rise", "out"].forEach(add);
      svg.current.querySelectorAll("mask rect.m").forEach((r) => r.setAttribute("width", 1000));
      sig.current.classList.add("show");
      timer = setTimeout(finish, 4000);
    } else {
      timer = setTimeout(() => open(false), AUTO_OPEN);
      seal.current?.focus({ preventScroll: true });
    }
    return () => {
      clearTimeout(timer); clearTimeout(finishTimer.current);
      s.cancelled = true;
      plane.current?.dispose(); plane.current = null;
      document.body.classList.remove("intro-on", "intro-hold");
    };
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
        <div className="flap ep">
          <button ref={seal} className="seal" type="button" aria-label="Mở thư" onClick={() => open(true)}>
            <svg viewBox="-22 -22 44 44" aria-hidden="true"><use href="#s-seal" x="-22" y="-22" width="44" height="44" /></svg>
          </button>
        </div>
        <div className="burst" aria-hidden="true">{BURST.map((s, i) => <i key={i} style={s} />)}</div>
        <div className="ihint">
          <p className="ih-t">Một lá thư từ sinh viên</p>
          <p className="ih-s">Bấm vào con dấu để mở</p>
        </div>
      </div>


      <figure className="iphoto">
        <img src="/images/anh-tap-the.jpg" alt="Ảnh tập thể thầy cô Học viện" width="2177" height="1229" />
        <figcaption>Tri ân quý thầy cô</figcaption>
      </figure>

      <p className="sr-only">20/11. Kính chúc quý thầy cô luôn mạnh khỏe, hạnh phúc và vững bước trên bục giảng. Trân trọng, các thế hệ sinh viên.</p>
      <button className="skip" type="button" onClick={finish}>Bỏ qua</button>
    </div>
  );
}
