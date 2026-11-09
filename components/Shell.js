"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const VIEW = { "/": "tuong", "/gui": "gui", "/thay-co": "thay-co", "/admin": "admin" };
const NAV = [
  ["/", "Tường lời chúc"],
  ["/thay-co", "Dành cho thầy cô"],
];

export default function Shell({ children }) {
  const path = usePathname();
  const hdr = useRef(null);
  const [count, setCount] = useState(null);

  useEffect(() => { document.body.dataset.view = VIEW[path] || "tuong"; }, [path]);

  useEffect(() => {
    const set = () => document.documentElement.style.setProperty("--hdr", hdr.current.offsetHeight + "px");
    set();
    const ro = new ResizeObserver(set);
    ro.observe(hdr.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const load = () => fetch("/api/wishes").then((r) => r.json()).then((d) => setCount(d.length)).catch(() => {});
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <header className="top" ref={hdr}>
        <div className="top-in">
          <Link className="brand" href="/" aria-label="Trang chủ">
            <svg width="28" height="28" viewBox="-22 -22 44 44" aria-hidden="true"><use href="#s-seal" x="-22" y="-22" width="44" height="44" /></svg>
            <b>Tri ân 20/11</b>
            <small>Ngày Nhà giáo Việt Nam</small>
          </Link>
          <nav className="nav" aria-label="Điều hướng">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>
                {label}
                {href === "/" && count !== null && <span className="badge" aria-label={`${count} lời chúc`}>{count}</span>}
              </Link>
            ))}
            <Link href="/gui" className="cta" aria-current={path === "/gui" ? "page" : undefined}>Gửi lời chúc</Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </>
  );
}
