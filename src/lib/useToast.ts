"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ToastKind = "ok" | "err" | "info";

export function useToast(timeoutMs = 2200) {
  const [toast, setToast] = useState<{ kind: ToastKind; msg: string } | null>(null);
  const tRef = useRef<number | null>(null);

  const show = useCallback(
    (kind: ToastKind, msg: string) => {
      setToast({ kind, msg });
      if (tRef.current) window.clearTimeout(tRef.current);
      tRef.current = window.setTimeout(() => setToast(null), timeoutMs);
    },
    [timeoutMs]
  );

  useEffect(() => {
    return () => {
      if (tRef.current) window.clearTimeout(tRef.current);
    };
  }, []);

  return { toast, show, clear: () => setToast(null) };
}
