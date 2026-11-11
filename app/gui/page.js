"use client";
import { useCallback, useEffect, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { fold } from "@/lib/fold";

const mmss = (ms) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const ERR = { email: "Tài khoản này không phải email sinh viên của trường.", AccessDenied: "Tài khoản này không phải email sinh viên của trường." };

export default function SendPage() {
  const [me, setMe] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [mode, setMode] = useState("all");
  const [teacherName, setTeacherName] = useState("");
  const [pick, setPick] = useState(false);
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [loadedAt, setLoadedAt] = useState(Date.now());
  const [devEmail, setDevEmail] = useState("");

  const loadMe = useCallback(async () => {
    const m = await fetch("/api/me").then((r) => r.json()).catch(() => null);
    setMe(m); setLoadedAt(Date.now());
    if (m?.sentGeneral) setMode("one");
  }, []);

  useEffect(() => {
    loadMe();
    fetch("/api/teachers").then((r) => r.json()).then(setTeachers).catch(() => {});
    const e = new URLSearchParams(location.search).get("loi") || new URLSearchParams(location.search).get("error");
    if (e) setResult({ type: "bad", text: ERR[e] || "Đăng nhập không thành công, bạn thử lại nhé." });
  }, [loadMe]);

  const elapsed = now - loadedAt;
  const cooldown = Math.max(0, (me?.cooldownMs || 0) - elapsed);
  const lock = Math.max(0, (me?.lockMs || 0) - elapsed);
  useEffect(() => {
    if (!cooldown && !lock) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [cooldown, lock]);

  const sentTo = new Set(me?.sentTo || []);
  const available = teachers.filter((t) => !sentTo.has(t.id));
  const hits = available.filter((t) => fold(t.name).includes(fold(teacherName)));
  const len = [...text].length;

  async function submit(e) {
    e.preventDefault();
    if (len < 10) return setResult({ type: "bad", text: "Lời chúc cần ít nhất 10 ký tự." });
    let teacherId = null;
    if (mode === "one") {
      const t = teachers.find((x) => fold(x.name) === fold(teacherName));
      if (!t) return setResult({ type: "bad", text: "Hãy chọn một thầy cô trong danh sách gợi ý." });
      if (sentTo.has(t.id)) return setResult({ type: "bad", text: `Bạn đã gửi lời chúc cho ${t.name} rồi.` });
      teacherId = t.id;
    }
    setBusy(true); setResult({ type: "checking" });
    try {
      const r = await fetch("/api/wishes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, teacherId }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        setText(""); setTeacherName("");
        setResult(d.status === "approved"
          ? { type: "ok", text: "Lời chúc sẽ xuất hiện trên tường trong giây lát." }
          : { type: "wait", text: "Hệ thống kiểm duyệt đang bận. Lời chúc đã được lưu và sẽ tự lên tường khi duyệt xong." });
      } else setResult({ type: "bad", text: d.error || "Có lỗi xảy ra, bạn thử lại nhé." });
    } catch {
      setResult({ type: "bad", text: "Không kết nối được máy chủ, bạn thử lại nhé." });
    }
    setBusy(false);
    loadMe();
  }

  let card;
  if (!me) card = <p className="muted">Đang tải…</p>;
  else if (!me.user) {
    card = (
      <div className="ms-login">
        <div className="seal"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#3C6E2E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg></div>
        <div>
          <b style={{ fontSize: 17 }}>Đăng nhập để gửi lời chúc</b>
          <p className="muted small" style={{ margin: "6px 0 0", maxWidth: "40ch" }}>Dùng tài khoản Outlook sinh viên của trường. Tài khoản chỉ dùng để giới hạn số lần gửi, không hiển thị ra ngoài.</p>
        </div>
        {result && <div style={{ width: "100%" }}><Result r={result} /></div>}
        {me.sso && <button className="btn" type="button" onClick={() => signIn("ptit", { callbackUrl: "/gui" })}>Đăng nhập bằng SLINK PTIT</button>}
        {!me.sso && !me.devLogin && <p className="small muted">Chưa cấu hình đăng nhập SSO.</p>}
        {me.devLogin && (
          <form className="row" style={{ justifyContent: "center" }} onSubmit={(e) => { e.preventDefault(); signIn("dev", { email: devEmail, callbackUrl: "/gui" }); }}>
            <input className="field" id="devEmail" type="email" required placeholder="email sinh viên (đăng nhập thử)" value={devEmail} onChange={(e) => setDevEmail(e.target.value)} style={{ width: 260 }} />
            <button className="btn ghost" type="submit">Đăng nhập thử</button>
          </form>
        )}
      </div>
    );
  } else {
    card = (
      <form className="stack" onSubmit={submit} noValidate>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="user-pill">{me.user} <button type="button" onClick={() => signOut({ callbackUrl: "/gui" })}>Đăng xuất</button></span>
        </div>
        {!me.window.open && <div className="result wait"><span>◷</span><span>{me.window.message}</span></div>}
        <div>
          <span className="lbl">Bạn muốn gửi tới</span>
          <div className="seg" role="radiogroup">
            <label>
              <input type="radio" name="mode" value="all" checked={mode === "all"} disabled={me.sentGeneral} onChange={() => { setMode("all"); setResult(null); }} />
              <span><b>Tất cả thầy cô</b><span>{me.sentGeneral ? "Bạn đã gửi lời chúc chung" : "Chỉ gửi được một lần"}</span></span>
            </label>
            <label>
              <input type="radio" name="mode" value="one" checked={mode === "one"} onChange={() => { setMode("one"); setResult(null); }} />
              <span><b>Riêng một thầy cô</b><span>Đã gửi {sentTo.size}/{teachers.length} thầy cô</span></span>
            </label>
          </div>
        </div>
        {mode === "one" && (
          <div>
            <label className="lbl" htmlFor="teacher">Thầy cô nhận lời chúc</label>
            <div className="combo">
              <input className="field" id="teacher" role="combobox" aria-expanded={pick} aria-controls="teacherList" aria-autocomplete="list" placeholder="Gõ tên, có dấu hoặc không" autoComplete="off"
                value={teacherName} onFocus={() => setPick(true)} onBlur={() => setTimeout(() => setPick(false), 120)}
                onChange={(e) => { setTeacherName(e.target.value); setPick(true); }}
                onKeyDown={(e) => { if (e.key === "Escape") setPick(false); if (e.key === "Enter" && pick && hits[0] && teacherName !== hits[0].name) { e.preventDefault(); setTeacherName(hits[0].name); setPick(false); } }} />
              {pick && (
                  <ul className="combo-list" id="teacherList" role="listbox">
                    {hits.length ? hits.map((t) => (
                      <li key={t.id} role="option" aria-selected={t.name === teacherName} onMouseDown={(e) => { e.preventDefault(); setTeacherName(t.name); setPick(false); }}>{t.name}</li>
                    )) : <li className="none">Không có tên phù hợp</li>}
                  </ul>
              )}
            </div>
          </div>
        )}
        <div>
          <label className="lbl" htmlFor="wishText">Lời chúc</label>
          <textarea className="field" id="wishText" maxLength={300} placeholder="Viết vài dòng thật lòng gửi thầy cô…" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="row small muted" style={{ justifyContent: "space-between", marginTop: 6 }}><span>Hiển thị ẩn danh</span><span>{len}/300</span></div>
        </div>
        {result && <Result r={result} />}
        <div className="row">
          <button className="btn" type="submit" disabled={busy || !!cooldown || !!lock || !me.window.open}>
            {lock ? `Tạm khóa ${mmss(lock)}` : cooldown ? `Gửi tiếp sau ${mmss(cooldown)}` : busy ? "Đang gửi…" : "Gửi lời chúc"}
          </button>
          {!!cooldown && !lock && <span className="small muted">Cần cách 3 phút giữa hai lần gửi</span>}
          {!!lock && <span className="small muted">Bạn có quá nhiều lời chúc chưa được duyệt, thử lại sau ít phút</span>}
        </div>
      </form>
    );
  }

  return (
    <div className="page">
      <h1>Gửi lời chúc tới thầy cô</h1>
      <p className="lede">Lời chúc hiển thị ẩn danh trên tường. Mỗi lời chúc được AI đọc qua trước khi hiện, để ngày 20/11 luôn ấm áp.</p>
      <div className="grid-2">
        <div className="card">{card}</div>
        <aside className="stack">
          <div className="card">
            <h3 style={{ margin: "0 0 14px", fontSize: 15 }}>Quy định gửi</h3>
            <ul className="rules">
              <li><span className="ico">1</span><span><b>Một lời chúc chung</b> gửi tất cả thầy cô, chỉ gửi được một lần.</span></li>
              <li><span className="ico">✉</span><span><b>Mỗi thầy cô một lời riêng</b>. Bạn có thể gửi riêng nhiều thầy cô, mỗi người một lần.</span></li>
              <li><span className="ico">3′</span><span><b>Cách nhau 3 phút</b> giữa hai lần gửi.</span></li>
              <li><span className="ico">✓</span><span><b>Không mất lượt</b> nếu lời chúc chưa được duyệt. Bạn sửa lại và gửi tiếp.</span></li>
              <li><span className="ico">◌</span><span><b>Ẩn danh</b>. Tên bạn không hiện ở bất kỳ đâu trên web.</span></li>
            </ul>
          </div>
          <div className="card">
            <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>Lượt gửi của bạn</h3>
            {me?.user ? (
              <>
                <div className="progress"><span>Lời chúc chung</span><b>{me.sentGeneral ? "Đã gửi" : "Còn 1 lượt"}</b></div>
                <div className="progress"><span>Lời chúc riêng</span><b>{sentTo.size}/{teachers.length} thầy cô</b></div>
                {teachers.filter((t) => sentTo.has(t.id)).map((t) => (
                  <div className="progress" key={t.id}><span className="muted">· {t.name}</span><span className="muted">✓</span></div>
                ))}
              </>
            ) : <p className="small muted" style={{ margin: 0 }}>Đăng nhập để xem lượt gửi còn lại.</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Result({ r }) {
  if (r.type === "checking") return <div className="result wait" role="status"><span className="spinner" /><span><b>Đang đọc lời chúc của bạn…</b>AI kiểm duyệt thường mất vài giây.</span></div>;
  if (r.type === "ok") return <div className="result ok" role="status"><span>✓</span><span><b>Lời chúc đã lên tường!</b>{r.text}</span></div>;
  if (r.type === "wait") return <div className="result wait" role="status"><span>◷</span><span><b>Lời chúc đang chờ duyệt</b>{r.text}</span></div>;
  return <div className="result bad" role="alert"><span>!</span><span><b>Lời chúc chưa được gửi</b>{r.text}</span></div>;
}
