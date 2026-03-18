"use client";
import {
  ChevronRight,
  EyeClosed,
  Home,
  TestTube,
  LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

const SidebarItem = ({
  icon: Icon,
  label,
  path,
}: {
  icon?: LucideIcon;
  label: string;

  path: string;
}) => {
  const pathname = usePathname();
  const isActive = pathname === path;
  return (
    <li className={isActive ? "active" : ""}>
      <Link href={path} className="sidebar-link-wrapper">
        {Icon ? <Icon className="sidebar-menu-icon" size={20} /> : ""}
        <span>{label}</span>
      </Link>
    </li>
  );
};

const SidebarCollapse = ({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <li className={isOpen ? "open" : ""}>
      <a onClick={() => setIsOpen(!isOpen)} style={{ cursor: "pointer" }}>
        <Icon className="sidebar-menu-icon" size={20} />
        <span style={{ flex: 1 }}>{label}</span>
        <ChevronRight
          className="sidebar-collapse-icon"
          style={{
            transform: isOpen ? "rotate(90deg)" : "none",
            transition: "0.2s",
          }}
        />
      </a>
      {isOpen && <ul className="sidebar-submenu">{children}</ul>}
    </li>
  );
};

export default function Sidebar() {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <button>
          <EyeClosed size={20} />
        </button>
        <h3>Open Exam</h3>
      </div>

      <nav className="sidebar-menu">
        <ul>
          <SidebarItem path="/dashboard" icon={Home} label="Trang chủ" />

          <SidebarCollapse icon={TestTube} label="Bài kiểm tra">
            <SidebarItem path="/exam/join" label="Tham gia" />
            <SidebarItem path="/exam/add" label="Tạo bài kiểm tra" />
            <SidebarItem path="/exam/start" label="Danh sách bài kiểm tra" />
            <SidebarItem path="/exam/history" label="Lịch sử làm bài" />
            <SidebarItem path="/exam/statistics" label="Thống kê người làm" />
          </SidebarCollapse>
        </ul>
      </nav>
    </div>
  );
}

export function SidebarContainer({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => {
      setIsMobileOpen((previous) => !previous);
    };

    window.addEventListener("openexam:toggle-sidebar", handleToggle);
    return () => {
      window.removeEventListener("openexam:toggle-sidebar", handleToggle);
    };
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  return (
    <div className={`sidebar-container ${isMobileOpen ? "mobile-open" : ""}`}>
      <button
        type="button"
        aria-label="Đóng menu"
        className="sidebar-backdrop"
        onClick={() => setIsMobileOpen(false)}
      />
      <Sidebar />
      <div className="content">{children}</div>
    </div>
  );
}
