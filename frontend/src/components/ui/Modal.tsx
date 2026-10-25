import { useEffect, type ReactNode } from "react";

interface Props {
  onClose: () => void;
  children: ReactNode;
}

/** Window over the page. Closes with ESC or clicking outside. On phones it slides up from the bottom. */
export default function Modal({ onClose, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-60 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="glass-strong max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl sm:rounded-3xl"
      >
        {children}
      </div>
    </div>
  );
}
