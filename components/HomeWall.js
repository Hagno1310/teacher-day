"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Intro from "@/components/Intro";
import Wall from "@/components/Wall";

function InviteDialog({ active }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!active) return;
    try { if (sessionStorage.getItem("invite-seen")) return; } catch {}
    // Chỉ mời gửi khi cổng còn mở (OPEN_AT/CLOSE_AT ở server); đã đóng thì tường chỉ để đọc
    let t, gone = false;
    fetch("/api/me", { cache: "no-store" }).then((r) => r.json()).then((d) => {
      if (gone || !d.window?.open) return;
      t = setTimeout(() => {
        if (document.body.classList.contains("presenting")) return;
        ref.current?.showModal();
        try { sessionStorage.setItem("invite-seen", "1"); } catch {}
      }, 5000);
    }).catch(() => {});
    return () => { gone = true; clearTimeout(t); };
  }, [active]);
  const close = () => ref.current?.close();
  return (
    <dialog ref={ref} className="invite" aria-labelledby="invite-t" onClick={(e) => e.target === ref.current && close()}>
      <svg className="invite-art" viewBox="0 0 44 44" aria-hidden="true"><use href="#s-seal" width="44" height="44" /></svg>
      <h2 id="invite-t">Gửi một lời cảm ơn tới thầy cô?</h2>
      <p>Lời chúc của bạn hiện ẩn danh trên tường này, và thầy cô được gửi riêng sẽ đọc được trong trang của mình.</p>
      <div className="invite-act">
        <button className="btn ghost" type="button" onClick={close}>Để sau</button>
        <Link className="btn" href="/gui" onClick={close}>Viết lời chúc</Link>
      </div>
    </dialog>
  );
}

// Đã xem màn mở đầu trong lần mở web này chưa. Biến module nên còn nguyên khi chuyển qua lại giữa các tab trong web
// (bấm "Tường lời chúc" không chiếu lại mở đầu), nhưng tải lại trang thì xem lại từ đầu.
let introSeen = false;

export default function HomeWall() {
  const [intro, setIntro] = useState(() => !introSeen);
  const [reveal, setReveal] = useState(() => introSeen);
  const [presenting, setPresenting] = useState(false);

  useEffect(() => {
    const onFs = () => setPresenting(Boolean(document.fullscreenElement));
    onFs();
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("presenting", presenting);
    return () => document.body.classList.remove("presenting");
  }, [presenting]);

  const togglePresent = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen?.();
      setPresenting(Boolean(document.fullscreenElement));
    } catch {
      setPresenting(Boolean(document.fullscreenElement));
    }
  };

  return (
    <section aria-label="Tường lời chúc">
      {intro && <Intro onDone={() => setIntro(false)} onReveal={() => { introSeen = true; setReveal(true); }} />}
      <Wall active={!intro || reveal} />
      <InviteDialog active={!intro} />
      <div className="dock">
        <div className="legend" aria-hidden="true">
          <span><i style={{ background: "var(--leaf-700)" }} />Gửi tất cả thầy cô</span>
          <span><i style={{ background: "var(--wax)" }} />Gửi riêng</span>
        </div>
        <button className="chip-btn" type="button" onClick={() => { setReveal(false); setIntro(true); }}>↻ Xem lại lời mở đầu</button>
        <button className="chip-btn present" type="button" onClick={togglePresent}>{presenting ? "✕ Thoát trình chiếu" : "⛶ Trình chiếu"}</button>
      </div>
    </section>
  );
}
