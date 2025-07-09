"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface BlurModalProps {
  /** Whether the modal is visible */
  open: boolean;
  /** Callback fired when the modal requests to close */
  onClose?: () => void;
  /** Modal content */
  children: ReactNode;
}

export default function BlurModal({
  open,
  onClose,
  children,
}: BlurModalProps) {
  const [mounted, setMounted] = useState(false);

  // Ensure the modal is rendered only after the component is mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !open) return null;

  const handleOverlayClick = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
  ) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center"
      onClick={handleOverlayClick}
    >
      <div className="bg-white/20 text-white border border-white/30 rounded-2xl p-4">
        {children}
      </div>
    </div>,
    document.body,
  );
}
