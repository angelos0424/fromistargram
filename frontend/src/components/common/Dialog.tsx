import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  labelledBy?: string;
  label?: string;
  className?: string;
  panelClassName?: string;
  children: ReactNode;
}

const focusableSelector =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
const stack: { portal: HTMLElement; panel: HTMLElement }[] = [];
const previousBackground = new Map<HTMLElement, { inert: boolean; hidden: string | null }>();
let previousOverflow = '';

const updateBackground = () => {
  const top = stack.at(-1);
  for (const child of Array.from(document.body.children)) {
    if (!(child instanceof HTMLElement)) continue;
    if (top) {
      if (!previousBackground.has(child)) {
        previousBackground.set(child, { inert: child.inert, hidden: child.getAttribute('aria-hidden') });
      }
      child.inert = child !== top.portal;
      if (child !== top.portal) child.setAttribute('aria-hidden', 'true');
      else child.removeAttribute('aria-hidden');
    }
  }
  if (!top) {
    for (const [element, previous] of previousBackground) {
      element.inert = previous.inert;
      if (previous.hidden === null) element.removeAttribute('aria-hidden');
      else element.setAttribute('aria-hidden', previous.hidden);
    }
    previousBackground.clear();
  }
};

const focusableElements = (panel: HTMLElement) =>
  Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => !element.closest('[hidden], [inert]') && getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden'
  );

/** Portals escape filtered ancestors; only the top dialog handles focus and Escape. */
const Dialog = ({ isOpen, onClose, labelledBy, label, className, panelClassName, children }: DialogProps) => {
  const [portal] = useState(() => document.createElement('div'));
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    if (!isOpen || !panelRef.current) return;
    const panel = panelRef.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const entry = { portal, panel };
    if (!stack.length) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    document.body.appendChild(portal);
    stack.push(entry);
    updateBackground();
    const focusFirst = () => (focusableElements(panel)[0] ?? panel).focus();
    focusFirst();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (stack.at(-1) !== entry) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
      } else if (event.key === 'Tab') {
        const elements = focusableElements(panel);
        const first = elements[0];
        const last = elements.at(-1);
        if (!first || !last) {
          event.preventDefault();
          panel.focus();
        } else if (!panel.contains(document.activeElement) || document.activeElement === panel) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    const handleFocus = (event: FocusEvent) => {
      if (stack.at(-1) === entry && !panel.contains(event.target as Node)) focusFirst();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocus);
    return () => {
      const wasTop = stack.at(-1) === entry;
      stack.splice(stack.indexOf(entry), 1);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocus);
      portal.remove();
      updateBackground();
      if (!stack.length) document.body.style.overflow = previousOverflow;
      if (wasTop && opener?.isConnected && !opener.closest('[inert]')) opener.focus();
      else if (wasTop && stack.length) stack.at(-1)?.panel.focus();
    };
  }, [isOpen, portal]);

  if (!isOpen) return null;
  return createPortal(
    <div
      className={className ?? 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm'}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && stack.at(-1)?.portal === portal) onCloseRef.current();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={label}
        tabIndex={-1}
        className={panelClassName ?? 'relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl outline-none dark:bg-slate-900'}
      >
        {children}
      </div>
    </div>,
    portal
  );
};

export default Dialog;
