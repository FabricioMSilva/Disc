"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";

export function MobileNavigation({ role }: { role: string }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      <button
        type="button"
        className="mobile-menu-toggle"
        aria-label="Abrir menu"
        aria-controls="mobile-menu-panel"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <Menu size={20} aria-hidden="true" />
      </button>
      {isOpen && (
        <>
          <button
            type="button"
            className="mobile-menu-backdrop"
            aria-label="Fechar menu"
            onClick={closeMenu}
          />
          <div
            id="mobile-menu-panel"
            className="mobile-menu-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navegação principal"
          >
            <button type="button" className="mobile-menu-close" aria-label="Fechar menu" onClick={closeMenu}>
              <X size={20} aria-hidden="true" />
            </button>
            <AppSidebar role={role} onNavigate={closeMenu} />
          </div>
        </>
      )}
    </>
  );
}
