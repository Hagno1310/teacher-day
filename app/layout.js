import { Cormorant_Garamond, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { SPRITE, Engrave } from "@/lib/art";
import Shell from "@/components/Shell";
import ThreeBg from "@/components/ThreeBg";
import Vinyl from "@/components/Vinyl";

const body = Be_Vietnam_Pro({ subsets: ["vietnamese"], weight: ["400", "500", "600", "700"], variable: "--font-body" });
const display = Cormorant_Garamond({ subsets: ["vietnamese"], weight: ["500", "600"], style: ["normal", "italic"], variable: "--font-display" });

export const metadata = {
  title: "Tri ân 20/11",
  description: "Gửi lời chúc tới thầy cô nhân ngày Nhà giáo Việt Nam 20/11",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={`${display.variable} ${body.variable}`}>
      <body>
        <div dangerouslySetInnerHTML={{ __html: SPRITE }} />
        <div className="bg-pattern" aria-hidden="true" />
        <Engrave />
        <ThreeBg />
        <Shell>{children}</Shell>
        <Vinyl />
      </body>
    </html>
  );
}
