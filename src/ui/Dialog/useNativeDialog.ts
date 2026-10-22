"use client";

import { useEffect, useRef, type MouseEvent, type SyntheticEvent } from "react";

/**
 * Drives a native <dialog> from a controlled `open` prop. showModal() gives us the focus trap,
 * inert background, Esc handling and focus return for free.
 */
export function useNativeDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return {
    ref,
    onCancel: (e: SyntheticEvent<HTMLDialogElement>) => {
      e.preventDefault();
      onClose();
    },
    onClose: () => {
      if (open) onClose();
    },
    onClick: (e: MouseEvent<HTMLDialogElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
  };
}
