"use client";

import { Menu } from "lucide-react";

export default function MobileSidebarToggle() {
  const handleToggle = () => {
    window.dispatchEvent(new CustomEvent("openexam:toggle-sidebar"));
  };

  return (
    <button type="button" onClick={handleToggle} aria-label="Mở hoặc đóng menu">
      <Menu />
    </button>
  );
}
