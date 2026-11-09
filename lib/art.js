// Họa tiết SVG dùng chung: dấu sáp + bộ minh họa "nét khắc bản đồng" (một màu mực, nét mảnh, gạch bóng).
// Nét khắc dùng stroke=currentColor, nên đổi màu bằng CSS `color`.
const f = (n) => +n.toFixed(1);
const WAX = Array.from({ length: 72 }, (_, i) => {
  const a = (i / 72) * Math.PI * 2, r = 19.5 + Math.sin(a * 9) * 0.9 + Math.sin(a * 4 + 1) * 0.6;
  return `${i ? "L" : "M"}${f(Math.cos(a) * r)} ${f(Math.sin(a) * r)}`;
}).join("") + "Z";

// Lá hoa sữa: thuôn dài, gân giữa, gạch bóng một bên
const leaf = (x, y, a, L, w = L * 0.17) => {
  let h = "";
  for (let k = 1; k < 7; k++) { const t = k / 7, hx = L * t, hy = w * 0.8 * Math.sin(Math.PI * t); h += `M${f(hx)} 1L${f(hx + L * 0.05)} ${f(hy)}`; }
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(a)})"><path d="M0 0Q${f(L * 0.45)} ${f(-w)} ${L} 0Q${f(L * 0.45)} ${f(w)} 0 0Z" stroke-width="1.1"/><path d="M2 0L${f(L * 0.92)} 0" stroke-width=".7"/><path d="${h}" stroke-width=".55"/></g>`;
};
// Chùm hoa sữa: cuống tỏa hình tán, đầu mỗi cuống là nhóm nụ nhỏ
const umbel = (x, y, a, n = 6, len = 26) => {
  let s = "";
  for (let i = 0; i < n; i++) {
    const t = a + (i - (n - 1) / 2) * 0.32, ex = x + Math.cos(t) * len, ey = y + Math.sin(t) * len;
    s += `<path d="M${f(x)} ${f(y)}L${f(ex)} ${f(ey)}" stroke-width=".7"/>`;
    for (let j = 0; j < 5; j++) { const b = (j / 5) * Math.PI * 2 + i; s += `<circle cx="${f(ex + Math.cos(b) * 3.4)}" cy="${f(ey + Math.sin(b) * 3.4)}" r="1.9" stroke-width=".7" fill="var(--sheet,#FBF9F2)"/>`; }
  }
  return s;
};
const BRANCH = (() => {
  const P = [[10, 290], [120, 230], [250, 120], [390, 40]];
  const pt = (t) => [0, 1].map((k) => (1 - t) ** 3 * P[0][k] + 3 * (1 - t) ** 2 * t * P[1][k] + 3 * (1 - t) * t * t * P[2][k] + t ** 3 * P[3][k]);
  let s = `<path d="M${P[0]}C${P[1]} ${P[2]} ${P[3]}" stroke-width="2"/><path d="M${P[0][0] + 3},${P[0][1] + 2}C${P[1][0] + 3},${P[1][1] + 3} ${P[2][0] + 3},${P[2][1] + 3} ${P[3][0]},${P[3][1] + 2}" stroke-width=".5"/>`;
  [[0.28, 72], [0.55, 64], [0.8, 52]].forEach(([t, L], w) => { // các vòng lá mọc vòng
    const [x, y] = pt(t);
    for (let i = 0; i < 7; i++) s += leaf(x, y, i * (360 / 7) + w * 20 - 15, L * (0.8 + ((i * 37) % 10) / 25));
  });
  s += umbel(392, 38, -0.6, 7, 30) + umbel(...pt(0.55), -2.1, 5, 22) + umbel(...pt(0.8), 0.9, 5, 22);
  return s;
})();

// Bút máy nằm chéo trước lọ mực
const PEN = (() => {
  let hatch = "";
  for (let x = 6; x < 150; x += 5) hatch += `M${x} 2L${x + 4} 6.5`;
  let ink = "";
  for (let x = 118; x < 150; x += 4) ink += `M${x} ${x < 140 ? 132 : 136}V${196 - (x - 118) * 0.3}`;
  return `<path d="M58 196C52 196 50 190 50 184V140C50 128 66 122 82 120V108H118V120C134 122 150 128 150 140V184C150 190 148 196 142 196Z" stroke-width="1.3"/>
    <path d="M82 108V100H118V108M78 100H122" stroke-width="1.2"/><path d="M82 120H118" stroke-width=".7"/><path d="${ink}" stroke-width=".55"/>
    <path d="M56 186C80 190 120 190 144 186" stroke-width=".6"/><path d="M50 200H160" stroke-width=".7"/>
    <g transform="translate(104 214) rotate(-26)"><rect y="-7" width="150" height="14" rx="7" stroke-width="1.3"/><path d="${hatch}" stroke-width=".55"/>
      <path d="M96-7V7M101-7V7" stroke-width=".9"/><path d="M110-4H140" stroke-width="1"/>
      <path d="M0-5L-18-3.5V3.5L0 5" stroke-width="1.2"/><path d="M-18-4L-52 0L-18 4Z" stroke-width="1.2"/><path d="M-52 0H-30" stroke-width=".7"/><circle cx="-28" r="1.6" stroke-width=".7"/></g>`;
})();

// Chồng sách nằm, có dải lụa đánh dấu
const BOOKS = (() => {
  const book = (x, y, w, h) => {
    let pages = "";
    for (let yy = y + 3; yy < y + h - 2; yy += 2.6) pages += `M${x + w - 26} ${f(yy)}H${x + w - 3}`;
    let spine = "";
    for (let xx = x + 4; xx < x + 22; xx += 3.5) spine += `M${xx} ${y + 2}L${xx - 2} ${y + h - 2}`;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.5" stroke-width="1.3"/><path d="M${x + w - 28} ${y}V${y + h}" stroke-width="1"/><path d="${pages}" stroke-width=".45"/><path d="M${x + 24} ${y}V${y + h}M${x + 40} ${y + 4}V${y + h - 4}" stroke-width=".8"/><path d="${spine}" stroke-width=".5"/>`;
  };
  return book(20, 120, 200, 30) + book(36, 92, 176, 28) + book(28, 62, 186, 30) + `<path d="M150 92C152 110 146 126 154 156L160 150L163 158C158 128 162 110 158 92" stroke-width="1"/><path d="M10 152H232" stroke-width=".7"/>`;
})();

// Giảng đường mái vòm, vẽ mờ phía sau
const DOME = (() => {
  let cols = "", ribs = "", shade = "";
  for (let i = 0; i < 8; i++) { const x = 92 + i * 31; cols += `<path d="M${x} 150V206M${x + 10} 150V206" stroke-width="1"/><path d="M${x - 2} 150H${x + 12}M${x - 2} 206H${x + 12}" stroke-width="1"/>`; }
  for (let i = -3; i <= 3; i++) ribs += `<path d="M200 46Q${200 + i * 24} 60 ${200 + i * 26} 112" stroke-width=".7"/>`;
  for (let x = 236; x < 278; x += 4) shade += `M${x} ${f(112 - Math.sqrt(Math.max(0, 78 * 78 - (x - 200) ** 2)) * 0.82 + 4)}V112`;
  return `<path d="M60 220H340M70 212H330M78 206H322" stroke-width="1"/>${cols}<path d="M78 150H322L200 124Z M84 146H316" stroke-width="1.1"/>
    <rect x="130" y="112" width="140" height="12" stroke-width="1"/><path d="M122 112A78 64 0 0 1 278 112Z" stroke-width="1.2"/>${ribs}<path d="${shade}" stroke-width=".5"/>
    <path d="M190 46V30H210V46M186 30H214M200 30V18" stroke-width="1"/><circle cx="200" cy="15" r="3" stroke-width="1"/>`;
})();

// Tem thư răng cưa: giảng đường thu nhỏ + mệnh giá
const STAMP = (() => {
  let edge = "";
  const W = 70, H = 86, r = 3.2, step = 8.6;
  for (let x = 0; x <= W; x += step) edge += `<circle cx="${f(x)}" cy="0" r="${r}"/><circle cx="${f(x)}" cy="${H}" r="${r}"/>`;
  for (let y = step; y < H; y += step) edge += `<circle cx="0" cy="${f(y)}" r="${r}"/><circle cx="${W}" cy="${f(y)}" r="${r}"/>`;
  return `<defs><mask id="stp-m"><rect x="-4" y="-4" width="${W + 8}" height="${H + 8}" fill="#fff"/><g fill="#000">${edge}</g></mask></defs>
    <rect x="-3" y="-3" width="${W + 6}" height="${H + 6}" fill="#FBF9F2" mask="url(#stp-m)"/><rect x="7" y="7" width="${W - 14}" height="${H - 14}" stroke-width=".9"/>
    <g transform="translate(9 14) scale(.13)">${DOME.replace(/stroke-width="([\d.]+)"/g, (_, v) => `stroke-width="${v * 6}"`)}</g>
    <text x="${W / 2}" y="${H - 14}" text-anchor="middle" font-family="var(--font-display),Georgia,serif" font-size="11" font-weight="600" fill="currentColor" stroke="none">20·11</text>`;
})();

const sym = (id, vb, body) => `<symbol id="${id}" viewBox="${vb}"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${body}</g></symbol>`;

export const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<symbol id="s-seal" viewBox="-22 -22 44 44"><path d="${WAX}" fill="#7B1E2B"/><circle r="14.5" fill="none" stroke="#A8434F" stroke-width="1.2"/><circle r="14.5" fill="none" stroke="#5A1420" stroke-width=".6" transform="translate(.6 .8)"/><text y="3.6" text-anchor="middle" font-family="var(--font-display),Georgia,serif" font-size="10.5" font-weight="600" fill="#EBC9C0">20/11</text></symbol>
${sym("s-branch", "0 0 420 300", BRANCH)}
${sym("s-pen", "20 60 250 160", PEN)}
${sym("s-books", "0 50 240 110", BOOKS)}
${sym("s-dome", "50 8 300 216", DOME)}
${sym("s-stamp", "-6 -6 82 98", STAMP)}
</defs></svg>`;

/** Lớp minh họa nét khắc trang trí góc màn hình (chỉ để nhìn) */
export function Engrave({ className = "" }) {
  return (
    <div className={`engrave ${className}`} aria-hidden="true">
      <svg className="eg-br eg-tl"><use href="#s-branch" /></svg>
      <svg className="eg-br eg-br2"><use href="#s-branch" /></svg>
      <svg className="eg-dome"><use href="#s-dome" /></svg>
      <svg className="eg-pen"><use href="#s-pen" /></svg>
      <svg className="eg-books"><use href="#s-books" /></svg>
    </div>
  );
}
