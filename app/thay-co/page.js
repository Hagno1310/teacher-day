"use client";
import { useEffect, useMemo, useState } from "react";
import { fold } from "@/lib/fold";

const initials = (n) => n.split(" ").slice(-2).map((w) => w[0]).join("");
const fmt = (t) => new Date(t).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });

export default function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [sel, setSel] = useState(null);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("private");
  const [wishes, setWishes] = useState(null);

  useEffect(() => {
    fetch("/api/teachers").then((r) => r.json()).then((t) => { setTeachers(t); setSel((s) => s ?? t[0]?.id ?? null); }).catch(() => {});
  }, []);
  useEffect(() => {
    if (!sel) return;
    setWishes(null);
    fetch(`/api/wishes?teacher=${sel}`).then((r) => r.json()).then(setWishes).catch(() => setWishes([]));
  }, [sel]);

  const list = useMemo(() => teachers.filter((t) => fold(t.name).includes(fold(q))), [teachers, q]);
  const t = teachers.find((x) => x.id === sel);
  const priv = (wishes || []).filter((w) => w.teacherId === sel);
  const gen = (wishes || []).filter((w) => !w.teacherId);
  const items = tab === "private" ? priv : gen;

  return (
    <div className="page">
      <h1>Dành cho thầy cô</h1>
      <p className="lede">Thầy cô chọn tên mình để đọc những lời chúc sinh viên gửi riêng. Không cần đăng nhập.</p>
      <div className="tc-layout">
        <div className="card">
          <label className="lbl" htmlFor="tcSearch">Tìm tên thầy cô</label>
          <input className="field" id="tcSearch" type="search" placeholder="Gõ tên, có dấu hoặc không" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="tc-list" role="list">
            {list.length ? list.map((x) => (
              <button key={x.id} className="tc-item" role="listitem" type="button" aria-pressed={x.id === sel} onClick={() => { setSel(x.id); setTab("private"); }}>
                <span className="ava">{initials(x.name)}</span><span className="n">{x.name}</span><span className="c">{x.count ? `${x.count} lời` : ""}</span>
              </button>
            )) : <p className="small muted" style={{ padding: 8 }}>Không tìm thấy tên phù hợp.</p>}
          </div>
        </div>
        <div>
          {t && (
            <>
              <div className="tc-head"><span className="ava lg">{initials(t.name)}</span><div><div className="small muted">Lời chúc gửi</div><h2>{t.name}</h2></div></div>
              <div className="tabs" role="tablist">
                <button role="tab" type="button" aria-selected={tab === "private"} onClick={() => setTab("private")}>Gửi riêng ({priv.length})</button>
                <button role="tab" type="button" aria-selected={tab === "all"} onClick={() => setTab("all")}>Gửi tất cả thầy cô ({gen.length})</button>
              </div>
              {wishes === null ? <p className="muted">Đang tải…</p>
                : items.length ? (
                  <div className="cards">{items.map((w) => (
                    <article className={`note${w.teacherId ? " private" : ""}`} key={w.id}><p>{w.text}</p><time>{fmt(w.createdAt)}</time></article>
                  ))}</div>
                ) : (
                  <div className="empty">{tab === "private" ? <>Chưa có lời chúc riêng nào gửi {t.name}.<br />Lời chúc chung từ sinh viên đang ở tab bên cạnh.</> : "Chưa có lời chúc chung nào."}</div>
                )}
            </>
          )}
          {!teachers.length && <div className="empty">Chưa có danh sách thầy cô.</div>}
        </div>
      </div>
    </div>
  );
}
