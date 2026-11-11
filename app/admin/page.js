"use client";
import { useCallback, useEffect, useState } from "react";

const ST = { approved: "Đã hiện", rejected: "Bị từ chối", pending: "Chờ duyệt", hidden: "Đã ẩn" };
const fmt = (t) => new Date(t).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });

export default function AdminPage() {
  const [authed, setAuthed] = useState(null);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("all");
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);

  const load = useCallback(async () => {
    const qs = filter === "all" ? "" : `?status=${filter}`;
    const [r, s] = await Promise.all([fetch(`/api/admin/wishes${qs}`), fetch("/api/admin/stats")]);
    if (r.status === 401) return setAuthed(false);
    setAuthed(true);
    setRows(await r.json());
    setStats(await s.json());
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function login(e) {
    e.preventDefault();
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pw }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok) { setPw(""); setErr(""); load(); } else setErr(d.error || "Không đăng nhập được.");
  }
  async function setStatus(id, status) {
    await fetch(`/api/admin/wishes/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
    load();
  }

  if (authed === null) return <div className="page"><p className="muted">Đang tải…</p></div>;
  if (!authed) {
    return (
      <div className="page">
        <h1>Quản trị</h1>
        <p className="lede">Khu vực dành cho ban tổ chức.</p>
        <form className="card stack" onSubmit={login} style={{ maxWidth: 380 }}>
          <div><label className="lbl" htmlFor="adminPw">Mật khẩu quản trị</label><input className="field" id="adminPw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
          {err && <div className="result bad" role="alert"><span>!</span><span>{err}</span></div>}
          <button className="btn" type="submit">Vào trang quản trị</button>
        </form>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
        <div><h1>Quản trị</h1><p className="lede" style={{ margin: 0 }}>Dữ liệu dùng chung với API <code>/api/admin/*</code>.</p></div>
        <div className="row">
          <a className="btn ghost" href="/api/admin/export">Xuất CSV</a>
          <button className="btn ghost" type="button" onClick={load}>Làm mới</button>
          <button className="btn ghost" type="button" onClick={async () => { await fetch("/api/admin/logout", { method: "POST" }); setAuthed(false); }}>Đăng xuất</button>
        </div>
      </div>
      {stats && (
        <div className="tiles">
          {["approved", "rejected", "pending", "hidden"].map((k) => <div className="tile" key={k}><small>{ST[k]}</small><b>{stats[k]}</b></div>)}
        </div>
      )}
      {stats && <p className="small muted" style={{ marginTop: -8 }}>{stats.students} sinh viên đã gửi lời chúc.</p>}
      <div className="filters">
        {["all", "approved", "rejected", "pending", "hidden"].map((k) => (
          <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>{k === "all" ? "Tất cả" : ST[k]}</button>
        ))}
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Thời gian</th><th>Người nhận</th><th>Nội dung</th><th>Trạng thái</th><th>Người gửi</th><th /></tr></thead>
          <tbody>
            {rows.length ? rows.map((m) => (
              <tr key={m.id}>
                <td className="num">{fmt(m.createdAt)}</td>
                <td>{m.teacherName || "Tất cả thầy cô"}</td>
                <td className="msg">{m.text}{m.reason && <div className="small" style={{ color: "var(--warn)", fontFamily: "var(--body)", marginTop: 4 }}>{m.reason}</div>}</td>
                <td><span className={`pill ${m.status}`}>{ST[m.status]}</span></td>
                <td className="small muted">{m.studentEmail}</td>
                <td>
                  {m.status === "pending" && <button className="linkbtn" type="button" onClick={() => setStatus(m.id, "approved")}>Duyệt</button>}
                  {(m.status === "approved" || m.status === "pending") && <button className="linkbtn" type="button" onClick={() => setStatus(m.id, "hidden")}>Ẩn</button>}
                  {m.status === "hidden" && <button className="linkbtn" type="button" onClick={() => setStatus(m.id, "approved")}>Hiện lại</button>}
                </td>
              </tr>
            )) : <tr><td colSpan={6} className="muted">Không có lời chúc ở mục này.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
