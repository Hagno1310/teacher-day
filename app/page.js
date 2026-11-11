import { redirect } from "next/navigation";
import HomeWall from "@/components/HomeWall";
import { studentEmail } from "@/lib/auth";
import { db, sql } from "@/lib/db";
import { studentState, windowState } from "@/lib/wishes";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }) {
  const params = await searchParams;
  // Nút Tường lời chúc luôn cho xem trực tiếp; khi cổng đóng thì chỉ còn chế độ đọc.
  if (params?.wall === "1" || !windowState().open) return <HomeWall />;

  let startWithCompose = true;
  try {
    await db();
    const [{ total }] = await sql`SELECT count(*)::int AS total FROM wishes WHERE status = 'approved'`;
    if (total >= 5) {
      const email = await studentEmail();
      if (email) {
        const state = await studentState(email);
        startWithCompose = !state.sentGeneral && !state.sentTo.length;
      }
    }
  } catch (error) {
    console.error("Home entry: unable to load wish state", error.code || error.name);
  }

  if (startWithCompose) redirect("/gui");
  return <HomeWall />;
}
