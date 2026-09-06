"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { VIEWER_ROLE_COOKIE, type ViewerRole } from "@/lib/role";

export async function setViewerRole(role: ViewerRole): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(VIEWER_ROLE_COOKIE, role, { path: "/" });
  redirect(role === "staff" ? "/staff" : "/");
}
