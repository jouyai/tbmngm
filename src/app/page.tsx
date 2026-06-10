import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const uid = await getSession();
  redirect(uid ? "/dashboard" : "/login");
}
