import type { Metadata } from "next";
import { Geist, Lora } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { RoleToggle } from "@/components/RoleToggle";
import { DEFAULT_VIEWER_ROLE, VIEWER_ROLE_COOKIE, isViewerRole } from "@/lib/role";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-heading",
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
    <html lang="en" className={`${geistSans.variable} ${lora.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-cream font-sans text-ink">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper px-4 py-3">
          <span className="font-serif text-lg font-semibold">The Juniper Room</span>
          <RoleToggle role={role} />
        </header>
        <div className="flex-1">{children}</div>
        <footer className="py-6 text-center text-xs text-muted">Powered by Chowly</footer>
      </body>
    </html>
  );
}
