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
  // Mép lá là Bezier bậc 2 nên nửa bề rộng thật chỉ tới w/2: gạch bóng giữ trong 0.4w để không lòi ra ngoài viền
  for (let k = 1; k < 7; k++) { const t = k / 7, hx = L * t, hy = w * 0.4 * Math.sin(Math.PI * t); h += `M${f(hx)} 1L${f(hx + L * 0.04)} ${f(hy)}`; }
  // Lá tô màu giấy để che cành và lá phía sau (không bị nét xuyên qua)
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(a)})"><path d="M0 0Q${f(L * 0.45)} ${f(-w)} ${L} 0Q${f(L * 0.45)} ${f(w)} 0 0Z" stroke-width="1.1" fill="var(--sheet,#FBF9F2)"/><path d="M2 0L${f(L * 0.92)} 0" stroke-width=".7"/><path d="${h}" stroke-width=".55"/></g>`;
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
// Cành hoa sữa ngắn gọn: một cành cong mảnh, 4 lá so le nhỏ dần về ngọn, một chùm hoa nhỏ ở đầu cành
const BRANCH = (() => {
  const P = [[10, 290], [80, 245], [160, 185], [250, 130]];
  const pt = (t) => [0, 1].map((k) => (1 - t) ** 3 * P[0][k] + 3 * (1 - t) ** 2 * t * P[1][k] + 3 * (1 - t) * t * t * P[2][k] + t ** 3 * P[3][k]);
  const tan = (t) => { const [x0, y0] = pt(t - 0.01), [x1, y1] = pt(t + 0.01); return (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI; };
  let s = `<path d="M${P[0]}C${P[1]} ${P[2]} ${P[3]}" stroke-width="1.6"/>`;
  [0.3, 0.48, 0.64, 0.8].forEach((t, i) => {
    const [x, y] = pt(t), side = i % 2 ? 1 : -1;
    s += leaf(x, y, tan(t) + side * 42, 54 - i * 6);
  });
  return s + umbel(250, 130, -0.55, 5, 18);
})();

// Họa tiết vặt rải khắp nền (khung 40×40, nét mực một màu)
const MOTIFS = {
  pencil: `<g transform="rotate(-35 20 20)"><rect x="5" y="16" width="23" height="8" rx="1"/><path d="M28 16L36 20L28 24Z"/><path d="M34 19L36 20L34 21Z" fill="currentColor"/><path d="M9 16V24M5 20H28" stroke-width=".6"/></g>`,
  plane: `<path d="M4 22L36 8L22 34L18 25Z"/><path d="M18 25L36 8M18 25L17 33L22 34" stroke-width=".8"/>`,
  trail: `<path d="M2 34C10 30 12 18 20 20C27 22 22 31 16 27C10 22 24 10 38 6" stroke-dasharray="2.2 2.2" stroke-width=".9"/>`,
  star: `<path d="M20 5L23.8 15.2L34.6 15.6L26.1 22.3L29 32.8L20 26.7L11 32.8L13.9 22.3L5.4 15.6L16.2 15.2Z"/><path d="M33 4V9M30.5 6.5H35.5" stroke-width=".8"/>`,
  flower: `${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="20" cy="12" rx="4.2" ry="7" transform="rotate(${a} 20 20)"/>`).join("")}<circle cx="20" cy="20" r="2.6" fill="currentColor"/>`,
  book: `<path d="M20 12C14 8 8 9 4 11V31C8 29 14 28 20 32C26 28 32 29 36 31V11C32 9 26 8 20 12Z"/><path d="M20 12V32M8 15C11 14 14 14 17 15.5M8 19C11 18 14 18 17 19.5M23 15.5C26 14 29 14 32 15M23 19.5C26 18 29 18 32 19" stroke-width=".7"/>`,
  ruler: `<g transform="rotate(20 20 20)"><rect x="3" y="15" width="34" height="10" rx="1"/><path d="M7 15V19M11 15V21M15 15V19M19 15V21M23 15V19M27 15V21M31 15V19" stroke-width=".7"/></g>`,
  note: `<path d="M15 30V10L31 6V26"/><ellipse cx="11.5" cy="30" rx="4" ry="3" fill="currentColor"/><ellipse cx="27.5" cy="26" rx="4" ry="3" fill="currentColor"/><path d="M15 15L31 11" stroke-width=".9"/>`,
  heart: `<path d="M20 33C9 25 5 19 5 14C5 9 9 6 13 6C16.5 6 18.6 8 20 10.5C21.4 8 23.5 6 27 6C31 6 35 9 35 14C35 19 31 25 20 33Z"/><path d="M11 12C11.5 10 13 9 14.5 9" stroke-width=".7"/>`,
  mail: `<rect x="5" y="10" width="30" height="21" rx="1.5"/><path d="M5 11L20 22L35 11" stroke-width=".9"/><circle cx="20" cy="22" r="2.4" fill="currentColor"/>`,
  sparkle: `<path d="M20 6C21 16 24 19 34 20C24 21 21 24 20 34C19 24 16 21 6 20C16 19 19 16 20 6Z"/>`,
};
// [kiểu, trái %, trên %, cỡ px, xoay °]; chừa trống giữa màn hình cho lời chúc. m: ẩn trên điện thoại
const SCATTER = [
  ["flower", 4, 40, 30, 10], ["pencil", 13, 58, 40, 0, 1], ["star", 22, 8, 26, -12], ["trail", 27, 30, 52, 0, 1], ["plane", 34, 20, 30, -8],
  ["note", 42, 6, 26, 8, 1], ["sparkle", 55, 12, 18, 0], ["book", 64, 5, 38, -6, 1], ["heart", 74, 18, 24, 14], ["flower", 86, 8, 28, -20],
  ["mail", 93, 30, 32, 12, 1], ["ruler", 88, 46, 44, -10, 1], ["sparkle", 80, 60, 16, 0], ["star", 6, 76, 22, 18, 1], ["flower", 30, 70, 26, 30, 1],
  ["sparkle", 70, 72, 14, 0, 1], ["heart", 20, 86, 20, -16, 1], ["note", 78, 84, 24, -8],
];

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

// Tòa nhà Học viện (theo ảnh): tháp kính cong giữa hai mảng ốp đục lỗ, khối thấp phía trước có mái sảnh cong và hàng cột.
// Vẽ trong khung 300×216, đặt ở (50, 8) để thay thẳng chỗ hình cũ (viewBox "50 8 300 216").
const SCHOOL = (() => {
  const rnd = (n) => ((Math.imul(n + 1, 2654435761) >>> 0) % 1000) / 1000;
  let s = "";
  // --- Tháp ---
  // Mảng ốp đục lỗ hai bên: chấm li ti rải theo lưới lệch (vẽ kiểu chấm khắc)
  // Mỗi bên là MỘT mảng ốp liền (mép ngoài thẳng), chỉ khác màu: phần ngoài phía dưới là ốp tối, ranh giới bậc thang.
  // Ốp sáng: chấm thưa nhỏ; ốp tối: chấm dày to hơn + gạch chéo.
  const darkR = (x, y) => x > (y < 64 ? 999 : y < 86 ? 202 : y < 108 ? 197 : y < 128 ? 192 : 187); // bậc thang phải, rộng dần xuống dưới
  const darkL = (x, y) => x < (y < 84 ? -1 : y < 104 ? 97 : y < 124 ? 101 : 105);                   // bậc thang trái
  let dots = "", dark = "";
  [[94, 122, darkL], [178, 206, darkR]].forEach(([x0, x1, isDark], side) => {
    for (let y = 21, r = 0; y < 145; y += 3.2, r++) for (let x = x0 + 1.5 + (r % 2) * 1.5; x < x1 - 1; x += 3) {
      const n = side * 5000 + r * 31 + Math.round(x * 7), dk = isDark(x, y);
      if (rnd(n) < (dk ? 0.95 : 0.6)) (dk ? (v) => (dark += v) : (v) => (dots += v))(`<circle cx="${f(x + (rnd(n + 1) - 0.5) * 0.7)}" cy="${f(y + (rnd(n + 2) - 0.5) * 0.7)}" r="${f((dk ? 0.6 : 0.3) + rnd(n + 3) * 0.3)}"/>`);
    }
  });
  let dh = "";
  for (let y = 64; y < 146; y += 2) { const xs = y < 86 ? 202 : y < 108 ? 197 : y < 128 ? 192 : 187; dh += `M${xs} ${y}L206 ${f(y + 1.6)}`; }
  for (let y = 84; y < 146; y += 2) { const xe = y < 104 ? 97 : y < 124 ? 101 : 105; dh += `M94 ${y}L${xe} ${f(y + 1.6)}`; }
  s += `<g fill="currentColor" stroke="none"><g opacity=".6">${dots}</g><g opacity=".9">${dark}</g></g><path d="${dh}" stroke-width=".35"/>`;
  s += `<path d="M206 64H202V86H197V108H192V128H187V146M94 84H97V104H101V124H105V146" stroke-width=".6"/>`; // ranh giới hai màu
  s += `<path d="M94 146V20H122M178 20H206V146" stroke-width="1.1"/>`;
  // Dải đỉnh cong ở giữa + chữ PTIT
  s += `<path d="M122 34V20Q150 13 178 20V34" stroke-width="1.1"/><path d="M122 34Q150 30 178 34" stroke-width=".8"/>`;
  s += `<text x="150" y="29.5" text-anchor="middle" font-family="var(--font-display),Georgia,serif" font-size="10" font-weight="600" letter-spacing="1.2" fill="currentColor" stroke="none">PTIT</text>`;
  // Vách kính cong: sàn võng nhẹ, đố kính dày dần về hai mép (mặt cong quay đi), mép trái gạch bóng
  let glass = "";
  for (let y = 42; y < 144; y += 8.5) glass += `M122 ${f(y)}Q150 ${f(y + 2.6)} 178 ${f(y)}`;
  let mull = "";
  for (let a = -78; a <= 78; a += 13) { const x = 150 + 28 * Math.sin((a * Math.PI) / 180); mull += `M${f(x)} ${f(34 + 2.4 * (1 - ((x - 150) / 28) ** 2))}V146`; }
  let shade = "";
  for (let x = 123.5; x < 133; x += 1.6) shade += `M${f(x)} 36V146`;
  for (let x = 172; x < 177.5; x += 2.2) shade += `M${f(x)} 36V146`;
  s += `<path d="${glass}" stroke-width=".55"/><path d="${mull}" stroke-width=".6"/><path d="${shade}" stroke-width=".35"/>`;
  s += `<path d="M122 34V146M178 34V146" stroke-width="1"/>`;
  // Cột cờ và lá cờ bay
  s += `<path d="M131 146V40" stroke-width="1"/><circle cx="131" cy="39" r="1.2" stroke-width=".7"/>`;
  s += `<path d="M131.5 42C137 39 142 45 149 42V54C142 57 137 51 131.5 54Z" stroke-width=".9" fill="var(--sheet,#FBF9F2)"/>`;
  s += `<path d="M140 44.6L141.1 47.4L144 47.5L141.7 49.2L142.6 52L140 50.4L137.4 52L138.3 49.2L136 47.5L138.9 47.4Z" stroke-width=".5" fill="currentColor"/>`;

  // --- Khối thấp phía trước (vẽ đè lên chân tháp: nền giấy che phía sau) ---
  s += `<path d="M14 146H286V206H14Z" fill="var(--sheet,#FBF9F2)" stroke="none"/>`;
  s += `<path d="M10 146H290M10 151H290M14 151V206M286 151V206" stroke-width="1.1"/>`;
  // Cửa sổ hai cánh nhà: 2 tầng, mỗi ô có song giữa và bóng đổ phía trên
  let win = "";
  for (const y of [160, 183]) for (const x of [22, 41, 60, 222, 241, 260]) {
    win += `<rect x="${x}" y="${y}" width="14" height="13" stroke-width=".8"/><path d="M${x + 7} ${y}V${y + 13}M${x} ${y + 5}H${x + 14}" stroke-width=".45"/>`;
    for (let k = 1; k < 5; k++) win += `<path d="M${x + k * 1.4} ${y + 0.5}V${y + 4.5}" stroke-width=".35"/>`;
  }
  for (const x of [17.5, 36.5, 55.5, 74.5, 217.5, 236.5, 255.5, 274.5]) win += `<path d="M${x} 151V206" stroke-width=".55"/>`; // trụ tường
  s += win;
  // Sảnh: mái biển hiệu cong + hai dòng chữ gợi ý, hàng cột tròn, cửa chính
  s += `<path d="M90 140H210V158Q150 168 90 158Z" fill="var(--sheet,#FBF9F2)" stroke-width="1.1"/>`;
  s += `<path d="M98 147.5H190M98 152.5H176" stroke-width=".9" stroke-dasharray="3 1.4"/><path d="M194 145.5V154.5M200 145.5V154.5" stroke-width=".7"/>`;
  let cols = "";
  for (const x of [102, 124, 168, 190]) {
    const top = 160 + 6 * (1 - ((x + 4 - 150) / 60) ** 2); // chân mái cong
    cols += `<path d="M${x} ${f(top)}V203M${x + 8} ${f(top)}V203" stroke-width="1"/><path d="M${x - 1.5} ${f(top + 2)}H${x + 9.5}M${x - 2} 203H${x + 10}V206H${x - 2}Z" stroke-width=".8"/>`;
    cols += `<path d="M${x + 5.5} ${f(top + 3)}V202M${x + 6.8} ${f(top + 3)}V202" stroke-width=".35"/>`;
  }
  s += cols;
  let door = "";
  for (let x = 140; x < 162; x += 2.4) door += `M${f(x)} 178L${f(x + 3)} 205`;
  s += `<path d="M136 206V174H164V206M140 206V178H160V206" stroke-width=".9"/><path d="${door}" stroke-width=".35"/>`;
  // Cột đèn chùm cầu hai bên sảnh
  for (const x of [82, 218]) {
    s += `<path d="M${x} 178V206M${x - 7} 176H${x + 7}" stroke-width=".8"/>`;
    for (const [dx, dy] of [[-6, -2], [6, -2], [-3, -5.5], [3, -5.5], [0, -1]]) s += `<circle cx="${x + dx}" cy="${174 + dy}" r="2.6" stroke-width=".7" fill="var(--sheet,#FBF9F2)"/>`;
  }
  // Cây xanh phía trước hai cánh nhà (như trong ảnh): tán gợn sóng tô màu giấy để che nhà, lá là các nét cong nhỏ,
  // dày hơn ở nửa dưới bên phải cho có bóng; thân cây chẽ nhánh.
  const tree = (cx, cy, rx, ry, seed) => {
    let t = `<path d="M${cx - 2.5} 206C${cx - 1.5} 190 ${cx - 3} ${cy + 18} ${cx - 8} ${cy + 8}M${cx + 2.5} 206C${cx + 1.5} 188 ${cx + 2} ${cy + 16} ${cx + 9} ${cy + 6}M${cx - 1} ${cy + 22}L${cx + 1} ${cy + 4}" stroke-width="1"/>`;
    const N = 15, P = [];
    for (let k = 0; k < N; k++) { const a = (k / N) * Math.PI * 2, r = 0.9 + rnd(seed + k) * 0.18; P.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r * (Math.sin(a) > 0 ? 0.75 : 1)]); }
    let d = `M${f(P[0][0])} ${f(P[0][1])}`;
    P.forEach((p, k) => { const q = P[(k + 1) % N], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2; d += `Q${f(cx + (mx - cx) * 1.2)} ${f(cy + (my - cy) * 1.2)} ${f(q[0])} ${f(q[1])}`; });
    t += `<path d="${d}" stroke-width="1" fill="var(--sheet,#FBF9F2)"/>`;
    let lv = "";
    for (let i = 0; i < 90; i++) {
      const u = rnd(seed + 100 + i) * 2 - 1, v = rnd(seed + 300 + i) * 2 - 1;
      if (u * u + v * v > 0.8) continue;
      const shadow = u * 0.6 + v * 0.8 > 0.1; // nửa dưới bên phải: dày nét để tạo khối
      if (!shadow && rnd(seed + 500 + i) < 0.55) continue;
      const x = cx + u * rx, y = cy + v * ry * 0.85;
      lv += `M${f(x)} ${f(y)}q1.6 -1.8 3.4 0`;
    }
    return t + `<path d="${lv}" stroke-width=".5"/>`;
  };
  s += tree(40, 150, 34, 30, 7000) + tree(262, 154, 32, 27, 8000);
  // Mặt đất
  s += `<path d="M0 206H300" stroke-width="1.1"/><path d="M8 210H292M30 213.5H270" stroke-width=".5"/>`;
  return `<g transform="translate(50 8)">${s}</g>`;
})();

// Tem thư răng cưa: tòa Học viện thu nhỏ + mệnh giá
const STAMP = (() => {
  let edge = "";
  const W = 70, H = 86, r = 3.2, step = 8.6;
  for (let x = 0; x <= W; x += step) edge += `<circle cx="${f(x)}" cy="0" r="${r}"/><circle cx="${f(x)}" cy="${H}" r="${r}"/>`;
  for (let y = step; y < H; y += step) edge += `<circle cx="0" cy="${f(y)}" r="${r}"/><circle cx="${W}" cy="${f(y)}" r="${r}"/>`;
  return `<defs><mask id="stp-m"><rect x="-4" y="-4" width="${W + 8}" height="${H + 8}" fill="#fff"/><g fill="#000">${edge}</g></mask></defs>
    <rect x="-3" y="-3" width="${W + 6}" height="${H + 6}" fill="#FBF9F2" mask="url(#stp-m)"/><rect x="7" y="7" width="${W - 14}" height="${H - 14}" stroke-width=".9"/>
    <g transform="translate(9 14) scale(.13)">${SCHOOL.replace(/stroke-width="([\d.]+)"/g, (_, v) => `stroke-width="${v * 6}"`)}</g>
    <text x="${W / 2}" y="${H - 14}" text-anchor="middle" font-family="var(--font-display),Georgia,serif" font-size="11" font-weight="600" fill="currentColor" stroke="none">20·11</text>`;
})();

const sym = (id, vb, body) => `<symbol id="${id}" viewBox="${vb}"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${body}</g></symbol>`;

export const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<symbol id="s-seal" viewBox="-22 -22 44 44"><path d="${WAX}" fill="#7B1E2B"/><circle r="14.5" fill="none" stroke="#A8434F" stroke-width="1.2"/><circle r="14.5" fill="none" stroke="#5A1420" stroke-width=".6" transform="translate(.6 .8)"/><text y="3.6" text-anchor="middle" font-family="var(--font-display),Georgia,serif" font-size="10.5" font-weight="600" fill="#EBC9C0">20/11</text></symbol>
${sym("s-branch", "0 85 290 215", BRANCH)}
${Object.entries(MOTIFS).map(([k, v]) => sym(`s-m-${k}`, "0 0 40 40", v)).join("")}
${sym("s-pen", "20 60 250 160", PEN)}
${sym("s-books", "0 50 240 110", BOOKS)}
${sym("s-school", "50 8 300 216", SCHOOL)}
${sym("s-stamp", "-6 -6 82 98", STAMP)}
</defs></svg>`;

/** Lớp minh họa nét khắc trang trí góc màn hình (chỉ để nhìn) */
export function Engrave({ className = "" }) {
  return (
    <div className={`engrave ${className}`} aria-hidden="true">
      <svg className="eg-br eg-tl"><use href="#s-branch" /></svg>
      <svg className="eg-br eg-br2"><use href="#s-branch" /></svg>
      <svg className="eg-school"><use href="#s-school" /></svg>
      <svg className="eg-pen"><use href="#s-pen" /></svg>
      <svg className="eg-books"><use href="#s-books" /></svg>
      {SCATTER.map(([k, x, y, size, rot, m], i) => (
        <svg key={i} className={`eg-m${m ? " eg-m-wide" : ""}`} style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, rotate: `${rot}deg` }}><use href={`#s-m-${k}`} /></svg>
      ))}
    </div>
  );
}
