/* eslint-disable @next/next/no-img-element */
import { auth } from "@/lib/auth";
import Link from "next/link";
import { headers } from "next/headers";
import MobileSidebarToggle from "@/components/ui/mobile-sidebar-toggle";

export async function Navbar() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <nav className="navbar">
      <div className="navbar-header">
        <MobileSidebarToggle />
        <h3>Open Exam</h3>
      </div>

      <div className="navbar-items">
        {session?.user ? (
          <div
            className="avatar"
            title={session.user.name || session.user.email}
          >
            <img
              src={
                session.user.image ||
                "https://ui-avatars.com/api/?name=Open+Exam&background=eef2ff&color=3730a3"
              }
              alt={session.user.name || session.user.email || "User avatar"}
            />
          </div>
        ) : (
          <Link href="/login" className="text-sm font-semibold text-indigo-600">
            Đăng nhập
          </Link>
        )}
      </div>
    </nav>
  );
}
