"use client";

import { useState } from "react";

type HelpOverlayProps = {
  storageKey: string;
  title: string;
  body: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
};

export function useFirstRunHelp(storageKey: string) {
  const [open, setOpen] = useState(() => {
    try {
      if (typeof window === "undefined") return false;
      const v = window.localStorage.getItem(storageKey);
      return v !== "dismissed";
    } catch {
      return true;
    }
  });

  const dismiss = () => {
    try {
      window.localStorage.setItem(storageKey, "dismissed");
    } catch {
      // ignore
    }
    setOpen(false);
  };

  return {
    open,
    setOpen,
    dismiss,
  };
}

export default function HelpOverlay({ storageKey, title, body, isOpen, onClose }: HelpOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="overlayRoot" role="dialog" aria-modal="true">
      <div className="overlayBackdrop" onClick={onClose} />
      <div className="overlayPanel">
        <div className="overlayHeader">
          <div className="mono">{title}</div>
          <button
            className="btn"
            onClick={() => {
              try {
                window.localStorage.setItem(storageKey, "dismissed");
              } catch {
                // ignore
              }
              onClose();
            }}
          >
            Close
          </button>
        </div>

        <div className="overlayBody">{body}</div>

        <div className="overlayFooter">
          <div className="muted small">Tip: you can reopen this via the HELP button in the top bar.</div>
        </div>
      </div>
    </div>
  );
}
