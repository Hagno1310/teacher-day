import * as THREE from "three";

// Lá thư gấp thành máy bay giấy bằng Three.js rồi bay đi — cùng một vật thể từ đầu đến cuối.
// Tờ giấy là các mảnh đa giác phẳng (tọa độ gốc, dài 2 đơn vị, cao 2h, mũi hướng sang phải, y hướng lên).
// Mỗi mảnh có ma trận M (gốc → hiện tại). Một nếp gấp: cắt các mảnh theo đường gấp, quay nửa bị gấp quanh trục nếp.

// Đường bay thẳng (tỉ lệ màn hình, gốc = chỗ gập xong, y hướng xuống): vút chéo lên bên phải, đồng thời lùi sâu vào nền.
const ROUTE = [[0, 0], [0.5, -0.35]];

/**
 * Spline Catmull-Rom hướng tâm (centripetal, α = 0.5) qua ROUTE: không tạo nút thắt/gãy khúc khi các điểm mốc cách nhau
 * không đều. Lấy mẫu đều theo độ dài cung (tốc độ đều), hướng bay được làm mượt để mũi máy bay xoay êm.
 * Trả về [{x, y, a}] (a: hướng bay, độ, liền mạch qua vòng nhào lộn).
 */
export function flightPath(W, H, r0 = 0) {
  const K = ROUTE.map(([x, y]) => [x * W * 0.62, y * H]); // thu hẹp ngang cho đường bay nằm gọn trong màn hình
  const ext = [[2 * K[0][0] - K[1][0], 2 * K[0][1] - K[1][1]], ...K, [2 * K.at(-1)[0] - K.at(-2)[0], 2 * K.at(-1)[1] - K.at(-2)[1]]];
  const lerp = (p, q, ta, tb, t) => [0, 1].map((k) => ((tb - t) * p[k] + (t - ta) * q[k]) / (tb - ta));
  const pts = [];
  for (let i = 1; i < ext.length - 2; i++) {
    const [p0, p1, p2, p3] = ext.slice(i - 1, i + 3), T = [0];
    for (const [a, b] of [[p0, p1], [p1, p2], [p2, p3]]) T.push(T.at(-1) + Math.max(1e-6, Math.hypot(b[0] - a[0], b[1] - a[1]) ** 0.5));
    for (let j = 0; j < 40; j++) {
      const t = T[1] + ((T[2] - T[1]) * j) / 40;
      const A1 = lerp(p0, p1, T[0], T[1], t), A2 = lerp(p1, p2, T[1], T[2], t), A3 = lerp(p2, p3, T[2], T[3], t);
      pts.push(lerp(lerp(A1, A2, T[0], T[2], t), lerp(A2, A3, T[1], T[3], t), T[1], T[2], t));
    }
  }
  pts.push(K.at(-1));
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const N = 240, out = [];
  let j = 0, prev = r0;
  for (let i = 0; i <= N; i++) {
    const L = (len.at(-1) * i) / N;
    while (j < pts.length - 2 && len[j + 1] < L) j++;
    const u = (L - len[j]) / (len[j + 1] - len[j] || 1), a = pts[j], b = pts[j + 1];
    let ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
    while (ang - prev > 180) ang -= 360; // nối liền góc để vòng nhào lộn quay trọn 360° thay vì giật ngược
    while (ang - prev < -180) ang += 360;
    prev = ang;
    out.push({ x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, a: ang });
  }
  // Làm mượt hướng bay (trung bình trượt) để không còn bước xoay gấp giữa các mẫu
  const raw = out.map((p) => p.a);
  out.forEach((p, i) => { let s = 0, n = 0; for (let k = -6; k <= 6; k++) { const v = raw[Math.min(N, Math.max(0, i + k))]; s += v; n++; } p.a = s / n; });
  return out;
}

export const sideOf = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
/** Giữ phần đa giác lồi nằm cùng phía sgn của đường a→b */
export function clip(poly, a, b, sgn) {
  const out = [];
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length], sp = sideOf(a, b, p) * sgn, sq = sideOf(a, b, q) * sgn;
    if (sp >= 0) out.push(p);
    if (sp * sq < 0) { const t = sp / (sp - sq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
  });
  return out.length > 2 ? out : null;
}
/**
 * Các nếp gấp tàu lượn cánh rộng kiểu Nakamura (mũi hướng sang phải). s: một điểm thuộc phần bị gấp.
 * mark: gắn nhãn cho các mảnh bị gấp ở bước đó; only: chỉ gấp các mảnh mang nhãn đó (nếp gấp cục bộ, không gập cả tờ).
 */
export const foldSteps = (h) => {
  const x1 = 2 - h, d = 0.75 * h; // x1: mép mũi tù sau khi gập mũi; d: chỗ hai góc gặp nhau, chừa đầu mũi lòi ra để khóa
  const corner = (sy) => { // gập góc (x1, sy·h) vào đường giữa tại (x1 - d, 0): nếp là trung trực của hai điểm đó
    const M = [x1 - d / 2, (sy * h) / 2];
    return { a: M, b: [M[0] + h, M[1] - sy * d], s: [x1 - 0.01, sy * (h - 0.01)] };
  };
  return [
    { a: [x1, h], b: [2, 0], s: [2, h] }, { a: [x1, -h], b: [2, 0], s: [2, -h] }, // 1. hai góc gập vào giữa → mũi nhọn
    { a: [x1, -h], b: [x1, h], s: [2, 0], mark: "nose" },                          // 2. gập cả mũi nhọn ngược xuống → mũi tù
    corner(1), corner(-1),                                                          // 3. hai góc mới gập vào giữa, chừa đầu mũi
    { a: [x1 - d, -h], b: [x1 - d, h], s: [2 - 2 * h + 0.01, 0], only: "nose" },  // 4. lật đầu mũi lên khóa hai góc
    { a: [0, 0], b: [2, 0], s: [1, -h], mark: "half" },                            // 5. gập đôi theo sống, thân nằm ở y > 0
  ];
};
/** Nếp cánh: từ mũi chạy chéo về đuôi, thân (sống) mảnh ở mũi và sâu dần về đuôi → cánh rộng bản. */
export const wingCrease = (h) => ({ a: [2 - h, 0.12 * h], b: [0, 0.34 * h], s: [1, h] });

const ease = (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2); // vào/ra êm, giữa nhanh như tay gấp thật
const EPS = 0.0016; // khoảng cách giữa các lớp giấy chồng nhau (~0.6px ở cỡ thật): đủ tránh z-fighting mà vẫn ép sát như giấy thật
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const inRange = (cp, range) => range.split(",").some((r) => {
  const [lo, hi] = r.trim().replace(/^U\+/i, "").split("-");
  return cp >= parseInt(lo.replace(/\?/g, "0"), 16) && cp <= parseInt(hi ?? lo.replace(/\?/g, "F"), 16);
});
/**
 * @font-face cho đúng những file font mà các dòng chữ cần (đúng họ, kiểu, độ đậm và dải ký tự), nhúng thẳng dạng data URL
 * để ảnh SVG vẽ đúng font của trang. Chỉ nhúng phần cần: nhúng cả bộ (~20 file) thì Chrome vẽ ảnh khi font chưa kịp nạp → mất chữ.
 */
async function embeddedFonts(texts) {
  const need = texts.map((t) => { const s = getComputedStyle(t); return { fam: s.fontFamily.split(",")[0].replace(/["']/g, "").trim(), style: s.fontStyle, weight: s.fontWeight, chars: [...t.textContent].map((c) => c.codePointAt(0)) }; });
  const css = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; } // stylesheet khác domain: bỏ qua
    for (const r of rules) {
      if (!(r instanceof CSSFontFaceRule)) continue;
      const fam = r.style.getPropertyValue("font-family").replace(/["']/g, "").trim(), style = r.style.getPropertyValue("font-style") || "normal";
      const weight = r.style.getPropertyValue("font-weight") || "400", range = r.style.getPropertyValue("unicode-range");
      const m = r.style.getPropertyValue("src").match(/url\(["']?([^"')]+)["']?\)/);
      if (!m || !need.some((n) => n.fam === fam && n.style === style && n.weight === weight && (!range || n.chars.some((c) => inRange(c, range))))) continue;
      const blob = await (await fetch(new URL(m[1], sheet.href || location.href))).blob();
      const data = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
      css.push(`@font-face{font-family:"${fam}";src:url(${data});font-weight:${weight};font-style:${style};${range ? `unicode-range:${range};` : ""}}`);
    }
  }
  return css.join("");
}

/**
 * Chụp lại lá thư làm texture mặt trước. Chữ viết tay được vẽ lại từ CHÍNH SVG của lá thư (kèm font nhúng và mọi thuộc tính
 * chữ như số kiểu lining), nên khi thay lá thư DOM bằng tờ giấy 3D chữ không xê dịch, không đổi dáng.
 */
async function letterTexture(letter, w, hh, dpr) {
  const c = document.createElement("canvas");
  c.width = Math.round(w * dpr); c.height = Math.round(hh * dpr);
  const g = c.getContext("2d");
  g.scale(dpr, dpr);
  g.fillStyle = "#FBF9F2"; g.fillRect(0, 0, w, hh);
  const cs = getComputedStyle(letter), inset = parseFloat(getComputedStyle(letter, "::before").top) || 0;
  g.strokeStyle = "#D9D3BF"; g.lineWidth = 1; g.strokeRect(inset + 0.5, inset + 0.5, w - 2 * inset - 1, hh - 2 * inset - 1);
  const pl = parseFloat(cs.paddingLeft), pt = parseFloat(cs.paddingTop), sw = letter.clientWidth - pl - parseFloat(cs.paddingRight), k = sw / 1000;

  const texts = [...letter.querySelectorAll("svg.write text")];
  const body = texts.map((t) => {
    const ts = getComputedStyle(t), el = t.cloneNode(true);
    el.removeAttribute("mask"); el.removeAttribute("class");
    el.setAttribute("style", `font-family:${ts.fontFamily};fill:${ts.fill};font-variant-numeric:${ts.fontVariantNumeric};font-kerning:${ts.fontKerning}`);
    return el.outerHTML;
  }).join("");
  const M = 60; // lề quanh khung 1000×350 để đuôi chữ nghiêng không bị cắt
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round((1000 + 2 * M) * k * dpr)}" height="${Math.round((350 + 2 * M) * k * dpr)}" viewBox="${-M} ${-M} ${1000 + 2 * M} ${350 + 2 * M}"><style>${await embeddedFonts(texts)}</style>${body}</svg>`;
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  await img.decode();
  g.drawImage(img, pl - M * k, pt - M * k, (1000 + 2 * M) * k, (350 + 2 * M) * k);

  const sig = letter.querySelector(".sig"), ss = getComputedStyle(sig);
  g.font = `${ss.fontStyle} ${ss.fontWeight} ${ss.fontSize} ${ss.fontFamily}`; g.fillStyle = ss.color; g.textAlign = "right"; g.textBaseline = "middle";
  g.fillText(sig.textContent, sig.offsetLeft + sig.offsetWidth, sig.offsetTop + sig.offsetHeight / 2);
  g.getImageData(0, 0, 1, 1); // trình duyệt nào coi ảnh SVG là "bẩn" thì ném lỗi ở đây → nơi gọi dùng lá thư DOM như cũ
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Dựng sẵn máy bay giấy đè khít lên `letter` (canvas WebGL gắn vào `host`, còn ẩn). Gọi trước vài trăm ms để chụp
 * chữ, nạp font, biên dịch shader xong xuôi; tới lúc gấp chỉ cần show() là thay lá thư DOM trong cùng một khung hình.
 * Trả về { show(), fold(alive), fly(ms), pos, dispose() }. Ném lỗi nếu máy không có WebGL.
 */
export async function createPaperPlane(host, letter) {
  const W = innerWidth, H = innerHeight, rect = letter.getBoundingClientRect(), w = letter.offsetWidth, hh = letter.offsetHeight, h = hh / w;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  const dpr = Math.min(devicePixelRatio, 2);
  renderer.setPixelRatio(dpr); renderer.setSize(W, H);
  renderer.domElement.className = "iplane3d";
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.style.opacity = "0";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  // Camera phối cảnh đặt sao cho mặt phẳng z = 0 khớp 1:1 với pixel màn hình
  const cam = new THREE.PerspectiveCamera(30, W / H, 50, 200000);
  cam.position.z = H / 2 / Math.tan(Math.PI / 12);
  // Ánh sáng: tổng = 1 trên mặt phẳng chính diện để giấy lúc đầu trùng màu với lá thư DOM; mặt nghiêng tự tối/sáng.
  // (Three r155+: cường độ π ứng với độ sáng 1 trên vật liệu Lambert)
  const sunDir = new THREE.Vector3(0.25, 0.35, 1).normalize();
  scene.add(new THREE.AmbientLight(0xffffff, 0.62 * Math.PI));
  const sun = new THREE.DirectionalLight(0xffffff, (0.38 * Math.PI) / sunDir.z);
  sun.position.copy(sunDir); scene.add(sun);

  let tex;
  try { tex = await letterTexture(letter, w, hh, dpr); } catch (e) { renderer.dispose(); renderer.domElement.remove(); throw e; }
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const mats = {
    // polygonOffset đẩy mặt giấy lùi một chút để nét mép giấy (cùng mặt phẳng) không chập chờn
    // transparent từ đầu (opacity 1) để lúc tan vào nền chỉ cần hạ opacity, không phải biên dịch lại shader
    front: new THREE.MeshLambertMaterial({ map: tex, side: THREE.FrontSide, transparent: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
    back: new THREE.MeshLambertMaterial({ color: 0xece6d3, side: THREE.BackSide, transparent: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
    line: new THREE.LineBasicMaterial({ color: 0x1e3a2f, transparent: true, opacity: 0.16 }),
  };
  // outer: vị trí/hướng bay/tỉ lệ · tilt: nghiêng cho thấy cánh · sheet: dời để tâm tờ giấy (1, 0) nằm ở gốc
  const outer = new THREE.Group(), tilt = new THREE.Group(), sheet = new THREE.Group();
  sheet.position.x = -1; tilt.add(sheet); outer.add(tilt); scene.add(outer);

  // Tư thế (tọa độ màn hình, y xuống; r là góc CSS, độ). Lá thư DOM đang rotate(-1deg).
  const pose = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, s: w / 2, r: -1, tilt: 0, yaw: 0 };
  const target = { ...pose };
  let depth = 0; // z < 0 = lùi vào sâu; vị trí x, y được bù để điểm trên màn hình vẫn đúng (pose.x, pose.y)
  const apply = () => {
    const back = (cam.position.z - depth) / cam.position.z;
    outer.position.set((pose.x - W / 2) * back, (H / 2 - pose.y) * back, depth);
    outer.scale.setScalar(pose.s);
    outer.rotation.z = (-pose.r * Math.PI) / 180;
    tilt.rotation.x = pose.tilt;
    tilt.rotation.y = pose.yaw;
  };

  /** Tạo một mảnh giấy (lưới tam giác + viền) từ đa giác gốc f.o, đặt theo ma trận f.M */
  const makeFace = (f) => {
    const geo = new THREE.ShapeGeometry(new THREE.Shape(f.o.map(([x, y]) => new THREE.Vector2(x, y))));
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 2, (pos.getY(i) + h) / (2 * h));
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, mats.front), new THREE.Mesh(geo, mats.back),
      new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(f.o.map(([x, y]) => new THREE.Vector3(x, y, 0))), mats.line));
    g.matrixAutoUpdate = false; g.matrix.copy(f.M); sheet.add(g);
    return { ...f, g };
  };
  const dropFace = (f) => { f.g.children.forEach((m) => m.geometry.dispose()); sheet.remove(f.g); };
  let faces = [makeFace({ o: [[0, -h], [2, -h], [2, h], [0, h]], M: new THREE.Matrix4(), tags: [] })];

  /** Cắt các mảnh theo nếp a→b (tọa độ hiện tại, các mảnh đang phẳng). Trả về mảnh đứng yên và mảnh bị gấp.
   *  only: chỉ cắt/gấp các mảnh có nhãn này. Chỉ dựng lại lưới cho mảnh thực sự bị nếp cắt ngang — dựng lại cả tờ
   *  mỗi nếp (vài chục mảnh) làm rơi khung hình giữa lúc gấp. */
  const split = (a, b, s, only) => {
    const keep = [], move = [];
    for (const f of faces) {
      if (only && !f.tags.includes(only)) { keep.push(f); continue; }
      const inv = f.M.clone().invert(), z = f.M.elements[14];
      const P = (p) => { const v = new THREE.Vector3(p[0], p[1], z).applyMatrix4(inv); return [v.x, v.y]; };
      const A = P(a), B = P(b), sg = Math.sign(sideOf(A, B, P(s)));
      const k = clip(f.o, A, B, -sg), m = clip(f.o, A, B, sg);
      if (k && m) {
        dropFace(f);
        keep.push(makeFace({ o: k, M: f.M.clone(), tags: f.tags }));
        move.push(makeFace({ o: m, M: f.M.clone(), tags: f.tags }));
      } else (k ? keep : move).push(f);
    }
    faces = [...keep, ...move];
    return { keep, move };
  };
  // Ma trận/vector dùng lại mỗi khung hình: tạo mới hàng trăm ma trận mỗi giây khiến trình duyệt dọn rác giữa chừng → khựng
  const _ax = new THREE.Vector3(), _m1 = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _R = new THREE.Matrix4(), _T = new THREE.Matrix4();
  /** Quay góc ang quanh trục nếp a→b (đặt ở độ cao z), ghi vào out */
  const rotAbout = (a, b, ang, z = 0, out = new THREE.Matrix4()) => {
    _ax.set(b[0] - a[0], b[1] - a[1], 0).normalize();
    out.makeTranslation(a[0], a[1], z).multiply(_m1.makeRotationAxis(_ax, ang));
    return out.multiply(_m2.makeTranslation(-a[0], -a[1], -z));
  };

  // Vòng render duy nhất: chạy tween hiện tại, đưa tư thế mượt về target, vẽ.
  let raf, tw = null, last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (tw) {
      const x = Math.min(1, (now - tw.t0) / tw.D);
      tw.fn(tw.linear ? x : ease(x));
      if (x >= 1) { const r = tw.res; tw = null; r(); }
    }
    const k = 1 - Math.exp(-dt * 10);
    for (const key in target) pose[key] += (target[key] - pose[key]) * k;
    apply(); renderer.render(scene, cam);
    raf = requestAnimationFrame(loop);
  };
  const tween = (D, fn, linear) => new Promise((res) => { tw = { t0: performance.now(), D, fn, res, linear }; });
  apply(); renderer.compile(scene, cam); renderer.render(scene, cam); // biên dịch shader + vẽ khung đầu từ trước khi hiện
  raf = requestAnimationFrame(loop);

  /** Ép chồng giấy: các mức z khác nhau xếp lại sát nhau cách đều EPS, giữ nguyên thứ tự lớp.
   *  Không ép thì mỗi lần gấp độ dày chồng giấy nhân đôi (lớp lật lên phải nằm trên cả chồng) → các mảnh tách rời nhau. */
  const compact = () => {
    const key = (f) => Math.round(f.M.elements[14] * 1e5), lv = [...new Set(faces.map(key))].sort((a, b) => a - b);
    for (const f of faces) {
      f.M.premultiply(new THREE.Matrix4().makeTranslation(0, 0, lv.indexOf(key(f)) * EPS - f.M.elements[14]));
      f.g.matrix.copy(f.M);
    }
  };
  /** Gấp lật 180°: phần bị gấp nâng về phía người xem rồi nằm lên trên cùng. */
  const foldFlat = async ({ a, b, s, mark, only }, D) => {
    const { keep, move } = split(a, b, s, only), dir = Math.sign(sideOf(a, b, s));
    const zk = keep.length ? Math.max(...keep.map((f) => f.M.elements[14])) : 0;
    const lift = zk + EPS + Math.max(...move.map((f) => f.M.elements[14])); // sau khi quay π thì z → -z
    const base = move.map((f) => f.M.clone());
    await tween(D, (e) => {
      const T = _T.makeTranslation(0, 0, lift * e).multiply(rotAbout(a, b, dir * Math.PI * e, 0, _R));
      move.forEach((f, i) => f.g.matrix.multiplyMatrices(T, base[i]));
    });
    move.forEach((f) => { f.M.copy(f.g.matrix); if (mark) f.tags = [...f.tags, mark]; });
    compact();
  };
  /** Cánh: gập mỗi cánh xuống áp sát thân (180°), rồi mở hai cánh ra ngang (về 90°). Hai nửa thân đi hai phía ngược nhau.
   *  Trục quay đặt ở mặt ngoài cùng của mỗi nửa để cánh gập nằm bên ngoài, không xuyên vào các lớp giấy. */
  const foldWings = async ({ a, b, s }, D1, D2, pause, alive) => {
    const { keep, move } = split(a, b, s), dir = Math.sign(sideOf(a, b, s));
    for (const f of [...keep, ...move]) f.half = f.tags.includes("half");
    const zs = (half) => [...keep, ...move].filter((f) => f.half === half).map((f) => f.M.elements[14]);
    const zFront = Math.max(...zs(true)) + EPS, zBack = Math.min(...zs(false)) - EPS;
    const base = move.map((f) => f.M.clone());
    // Mỗi lớp cánh bản lề ngay tại nếp của chính nó (z của lớp đó) nên khi mở ra các lớp vẫn ép sát vào nhau;
    // chỉ khi gập áp xuống thân (gần 180°) trục mới dời ra mặt ngoài để cánh nằm bên ngoài, không xuyên vào thân.
    const pose = (ang) => move.forEach((f, i) => {
      const z0 = base[i].elements[14], zAxis = z0 + ((f.half ? zFront : zBack) - z0) * Math.max(0, -Math.cos(ang));
      f.g.matrix.multiplyMatrices(rotAbout(a, b, dir * (f.half ? 1 : -1) * ang, zAxis, _R), base[i]);
    });
    await tween(D1, (e) => pose(Math.PI * e));
    if (!alive()) return;
    await sleep(pause);
    target.tilt = 1.0; // nhìn chếch từ trên khi mở cánh để thấy hai cánh rộng
    await tween(D2, (e) => pose(Math.PI - (Math.PI * 0.45) * e)); // mở tới ~99°: cánh hơi vểnh lên như tàu lượn
  };

  return {
    /** Hiện tờ giấy 3D (đã vẽ sẵn khung đầu, khớp lá thư DOM) */
    show() { renderer.domElement.style.opacity = ""; },
    async fold(alive) {
      const steps = foldSteps(h), last = steps.length - 1, scale = [0.86, 0.76, 0.66, 0.58, 0.52, 0.48, 0.42];
      for (const [n, st] of steps.entries()) {
        if (!alive()) return;
        target.s = (w / 2) * scale[n];
        if (n >= 2) { target.x = W / 2; target.y = H * 0.46; target.r = 0; }
        if (n === last) target.r = -8; // gập đôi xong thì ngóc mũi lên
        await foldFlat(st, n === last ? 620 : st.only ? 420 : 480);
        await sleep(50);
      }
      if (!alive()) return;
      target.s = (w / 2) * 0.4;
      await foldWings(wingCrease(h), 520, 620, 70, alive);
      await sleep(60);
    },
    /** Bay theo đường lượn, sau vòng nhào lộn thì lùi dần vào sâu (z âm, phối cảnh thật) tới khi nhỏ như một chấm rồi tan vào nền. */
    fly(D) {
      const path = flightPath(W, H, pose.r), x0 = pose.x, y0 = pose.y, r0 = pose.r, tilt0 = pose.tilt, N = path.length - 1, d = cam.position.z;
      return tween(D, (e) => {
        // q: quãng đường đã bay theo thời gian e — bậc 2 nên xuất phát từ đứng yên rồi nhanh dần
        const q = e * e, f = q * N, i = Math.min(N - 1, Math.floor(f)), u = f - i, A = path[i], B = path[i + 1];
        const a = A.a + (B.a - A.a) * u;
        // k = tỉ lệ hiện trên màn hình do độ xa: lùi vào nền ngay từ khi cất cánh, nhỏ dần tới 3%
        const t = Math.max(0, (q - 0.05) / 0.95), k = 1 - 0.97 * (1 - (1 - t) ** 2.2);
        depth = d - d / k; // z sao cho d / (d - z) = k
        // Cho sống động mà vẫn giữ đường thẳng:
        //  · ném: 18% đầu lùi lại lấy đà, mũi ngóc lên, rồi mới vút đi
        //  · lượn: nhấp nhô vuông góc đường bay như tàu lượn gặp gió, mũi ngóc/chúc theo nhịp nhấp nhô
        //  · chao: cánh nghiêng lắc và lệch hướng nhẹ; mọi dao động tắt dần khi bay xa
        const rad = (a * Math.PI) / 180, ux = Math.cos(rad), uy = Math.sin(rad);
        const wind = e < 0.18 ? Math.sin((Math.PI * e) / 0.18) : 0, on = Math.min(1, e / 0.25), calm = 1 - 0.7 * q;
        const ph = 2 * Math.PI * 2.2 * q, bob = Math.sin(ph) * 14 * on * calm;
        Object.assign(pose, {
          x: x0 + A.x + (B.x - A.x) * u - ux * 18 * wind - uy * bob,
          y: y0 + A.y + (B.y - A.y) * u - uy * 18 * wind + ux * bob,
          r: r0 + (a - r0) * Math.min(1, f / 10) - 9 * wind - 7 * Math.cos(ph) * on * calm,
          tilt: tilt0 + (1.0 - tilt0) * Math.min(1, f / 10) + 0.22 * Math.sin(2 * Math.PI * 1.4 * e) * on * calm,
          yaw: 0.22 * Math.sin(2 * Math.PI * 1.1 * e + 0.6) * on * calm,
        });
        Object.assign(target, pose);
        // Tan vào nền bằng opacity của vật liệu: đổi opacity CSS của canvas toàn màn hình bắt trình duyệt dựng lại lớp → khựng
        const fade = e > 0.85 ? 1 - (e - 0.85) / 0.15 : 1;
        mats.front.opacity = mats.back.opacity = fade; mats.line.opacity = 0.16 * fade;
      }, true);
    },
    /** Vị trí trên màn hình (px) nơi máy bay đang ở / vừa tan vào nền */
    get pos() { return { x: pose.x, y: pose.y }; },
    dispose() {
      cancelAnimationFrame(raf);
      faces.forEach(dropFace);
      Object.values(mats).forEach((m) => m.dispose()); tex.dispose(); renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
