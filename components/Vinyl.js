"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// ponytail: bài piano chậm tự soạn, tổng hợp bằng Web Audio (không cần file, không vướng bản quyền).
// Piano = vài họa âm sine hơi lệch (inharmonic), họa âm cao tắt nhanh hơn. Muốn dùng mp3 thật: thay engine bằng <audio>.
const BPM = 70, E8 = 60 / BPM / 2; // nhịp 4/4: 8 móc đơn mỗi ô nhịp
// [bass, 4 nốt hợp âm tay trái]: Cmaj7 Am7 Fmaj7 G | Em7 Am7 Dm7 G7
const CH = [[36, [48, 55, 59, 64]], [45, [52, 55, 60, 64]], [41, [48, 53, 57, 64]], [43, [50, 55, 59, 62]],
  [40, [47, 52, 55, 62]], [45, [52, 55, 60, 64]], [38, [50, 53, 57, 60]], [43, [50, 53, 55, 59]]];
// Giai điệu tay phải: [móc đơn bắt đầu, nốt, độ dài tính bằng móc đơn]
const MEL = [
  [[0, 76, 3], [3, 74, 1], [4, 76, 2], [6, 79, 2]], [[0, 72, 4], [4, 71, 2], [6, 69, 2]],
  [[0, 69, 3], [3, 72, 1], [4, 77, 4]], [[0, 76, 2], [2, 74, 6]],
  [[0, 71, 3], [3, 76, 1], [4, 79, 4]], [[0, 81, 3], [3, 79, 1], [4, 76, 4]],
  [[0, 77, 2], [2, 76, 2], [4, 74, 2], [6, 72, 2]], [[0, 74, 6], [6, 71, 2]],
];
const ARP = { 2: 0, 3: 1, 4: 2, 5: 3, 6: 2 }; // móc đơn → nốt hợp âm tay trái rải
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

function createEngine() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  const verb = ctx.createConvolver();
  const len = ctx.sampleRate * 2.2, buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
  verb.buffer = buf;
  const vg = ctx.createGain(); vg.gain.value = 0.35; verb.connect(vg); vg.connect(ctx.destination);

  const tone = ctx.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 3200; // piano ấm, bớt chói
  tone.connect(master); tone.connect(verb);
  const PART = [1, 0.45, 0.22, 0.1, 0.05];
  const piano = (m, t, dur, vol) => {
    const f0 = hz(m), decay = 1.6 - (m - 60) / 50; // nốt trầm ngân lâu hơn
    PART.forEach((amp, i) => {
      const n = i + 1, o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f0 * n * (1 + 0.0004 * n * n);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * amp, t + 0.006);
      g.gain.setTargetAtTime(0, t + 0.006, decay / Math.pow(n, 0.8));
      g.gain.setTargetAtTime(0, t + dur, 0.12); // nhả phím
      o.connect(g); g.connect(tone); o.start(t); o.stop(t + dur + 0.8);
    });
  };
  // Dây nền: 2 sawtooth lệch nhẹ qua lọc thấp, vào/ra chậm theo từng ô nhịp
  const pad = (ms, t, dur) => ms.forEach((m) => [-6, 6].forEach((cents) => {
    const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = "sawtooth"; o.frequency.value = hz(m); o.detune.value = cents;
    lp.type = "lowpass"; lp.frequency.value = 700;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.006, t + dur * 0.4); g.gain.linearRampToValueAtTime(0, t + dur + 0.6);
    o.connect(lp); lp.connect(g); g.connect(master); g.connect(verb); o.start(t); o.stop(t + dur + 0.7);
  }));
  // Tiếng cơ của mâm đĩa: nhiễu trắng lọc dải (click/xước) + sine trầm (tiếng "bộp" khi kim chạm đĩa)
  const white = ctx.createBuffer(1, ctx.sampleRate / 2, ctx.sampleRate);
  { const d = white.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const burst = (t, dur, freq, q, vol) => {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = white; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(ctx.destination); s.start(t); s.stop(t + dur + 0.05);
  };
  const thump = (t, f0, vol, dur) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.5, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + 0.05);
  };
  // Tiếng lách tách của đĩa than: hiss nhỏ + các "pop" ngẫu nhiên, lặp suốt khi đang phát
  const cbuf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
  { const d = cbuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] += (Math.random() * 2 - 1) * 0.012;
      if (Math.random() < 0.00015) { const a = (Math.random() ** 2) * (Math.random() < 0.5 ? -1 : 1); for (let k = 0; k < 40 && i + k < d.length; k++) d[i + k] += a * Math.exp(-k / 5) * (Math.random() * 2 - 1); }
    } }
  const crackle = ctx.createBufferSource(), chp = ctx.createBiquadFilter(), cg = ctx.createGain();
  crackle.buffer = cbuf; crackle.loop = true; chp.type = "highpass"; chp.frequency.value = 400; cg.gain.value = 0;
  crackle.connect(chp); chp.connect(cg); cg.connect(ctx.destination); crackle.start();
  const ramp = (p, to, at, s) => { p.cancelScheduledValues(at); p.setValueAtTime(p.value, at); p.linearRampToValueAtTime(to, at + s); };

  let timer, off, nextT = 0, step = 0;
  const schedule = () => {
    while (nextT < ctx.currentTime + 0.25) {
      const bar = Math.floor(step / 8) % 8, e = step % 8, [bass, chord] = CH[bar];
      if (e === 0) { piano(bass, nextT, E8 * 8, 0.1); pad(chord.slice(1).map((m) => m + 12), nextT, E8 * 8); }
      if (e in ARP) piano(chord[ARP[e]], nextT, E8 * (8 - e), 0.035);
      for (const [at, m, len] of MEL[bar]) if (at === e) piano(m, nextT + 0.012, E8 * len, 0.09); // tay phải trễ nhẹ cho tự nhiên
      nextT += E8; step++;
    }
  };
  return {
    start() {
      clearTimeout(off); ctx.resume();
      const n = ctx.currentTime, land = n + 0.6; // tay đĩa quay 0.8s (CSS .arm), kim chạm đĩa ở ~0.6s
      burst(n + 0.02, 0.04, 2600, 2, 0.25);                                  // bật cần nâng
      thump(land, 75, 0.45, 0.22); burst(land, 0.03, 3200, 1, 0.5);          // kim chạm đĩa
      burst(land + 0.07, 0.02, 2000, 1, 0.18);                               // kim nảy nhẹ
      ramp(cg.gain, 0.2, land, 0.25);
      nextT = land + 0.9; ramp(master.gain, 0.9, nextT, 1.5);
      clearInterval(timer); timer = setInterval(schedule, 60);
    },
    stop() {
      const n = ctx.currentTime;
      burst(n, 0.12, 900, 0.8, 0.15); burst(n, 0.04, 2400, 1.5, 0.3);        // nhấc kim: xước + click
      ramp(cg.gain, 0, n, 0.15); ramp(master.gain, 0, n, 0.5);
      clearInterval(timer); off = setTimeout(() => ctx.suspend(), 700);
    },
  };
}

export default function Vinyl() {
  const admin = usePathname()?.startsWith("/admin"); // trang quản trị: không phát nhạc
  const adminRef = useRef(admin);
  adminRef.current = admin;
  const eng = useRef(null);
  const userOff = useRef(false);
  const [on, setOn] = useState(false);
  const [hint, setHint] = useState(true);

  const playing = useRef(false);
  const start = () => {
    if (playing.current || adminRef.current) return;
    eng.current ??= createEngine();
    if (!eng.current) return;
    playing.current = true; eng.current.start(); setOn(true);
  };
  const stop = () => { playing.current = false; eng.current?.stop(); setOn(false); };

  useEffect(() => { if (admin && playing.current) stop(); }, [admin]); // vào trang quản trị khi nhạc đang phát thì tắt

  useEffect(() => {
    // Trình duyệt chỉ cho phát âm thanh sau thao tác đầu tiên của người xem
    const first = (e) => {
      if (adminRef.current) return; // ở trang quản trị: chưa phát, giữ lại để lần bấm đầu ở trang khác vẫn bật nhạc
      if (!e.target.closest?.(".vinyl") && !userOff.current) start();
      removeEventListener("pointerdown", first);
    };
    // Màn mở đầu phát "vinyl:play" khi người xem bấm mở thư (kể cả bằng bàn phím)
    const play = () => { if (!userOff.current) start(); };
    addEventListener("pointerdown", first);
    addEventListener("vinyl:play", play);
    const t = setTimeout(() => setHint(false), 6000);
    return () => { removeEventListener("pointerdown", first); removeEventListener("vinyl:play", play); clearTimeout(t); };
  }, []);

  return (
    <button
      className={`vinyl${on ? " on" : ""}${hint ? " hint" : ""}`}
      type="button"
      aria-pressed={on}
      aria-label={on ? "Tắt nhạc nền" : "Bật nhạc nền"}
      onClick={() => { if (on) { userOff.current = true; stop(); } else { userOff.current = false; start(); } }}
    >
      <span className="base" />
      <span className="notes" aria-hidden="true"><span>♪</span><span>♫</span><span>♪</span></span>
      <span className="disc"><svg viewBox="0 0 44 44"><use href="#s-seal" width="44" height="44" /></svg></span>
      <svg className="arm" viewBox="0 0 18 72" aria-hidden="true"><circle cx="9" cy="9" r="7" fill="#C9B08A" stroke="#8C6E45" strokeWidth="1.5" /><path d="M9 9 L9 56 L4 66" fill="none" stroke="#8C6E45" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><rect x="0" y="62" width="9" height="8" rx="2" fill="#5E4A2E" transform="rotate(25 4 66)" /></svg>
      <span className="tip">{on ? "♪ Piano tri ân · bấm để tắt" : "Bật nhạc nền"}</span>
    </button>
  );
}
