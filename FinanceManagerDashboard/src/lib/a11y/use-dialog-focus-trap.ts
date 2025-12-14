"use client";

import { useEffect, useRef } from "react";

type FocusTrapOptions = {
  active: boolean;
  initialFocus?: () => HTMLElement | null | undefined;
  onEscape?: () => void;
};

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "[contenteditable='true']",
].join(",");

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)).filter(
    (element) => !element.hasAttribute("aria-hidden"),
  );
}

export function useDialogFocusTrap(ref: React.RefObject<HTMLElement | null>, options: FocusTrapOptions) {
  const { active, initialFocus, onEscape } = options;
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!active || !node) {
      return;
    }

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const resolveInitialFocus = () => {
      if (initialFocus) {
        const element = initialFocus();
        if (element) {
          return element;
        }
      }
      const focusable = getFocusableElements(node);
      if (focusable.length > 0) {
        return focusable[0];
      }
      return node;
    };

    const focusTarget = resolveInitialFocus();
    if (focusTarget && typeof focusTarget.focus === "function") {
      focusTarget.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!node.contains(event.target as Node)) {
        return;
      }

      if (event.key === "Escape") {
        onEscape?.();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = getFocusableElements(node);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    node.addEventListener("keydown", handleKeyDown);

    return () => {
      node.removeEventListener("keydown", handleKeyDown);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === "function") {
        previousFocusRef.current.focus();
      }
      previousFocusRef.current = null;
    };
  }, [active, initialFocus, onEscape, ref]);
}
