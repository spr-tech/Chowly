import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { RoleToggle } from "@/components/RoleToggle";
import { DEFAULT_VIEWER_ROLE, VIEWER_ROLE_COOKIE, isViewerRole } from "@/lib/role";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chowly — The Juniper Room",
  description: "Dine-in ordering for The Juniper Room",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const roleCookie = cookieStore.get(VIEWER_ROLE_COOKIE)?.value;
  const role = isViewerRole(roleCookie) ? roleCookie : DEFAULT_VIEWER_ROLE;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b p-3 flex items-center justify-between">
          <span className="font-semibold">Chowly</span>
          <RoleToggle role={role} />
        </header>
        {children}
      </body>
    </html>
  );
}
