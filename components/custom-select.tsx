"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type CustomSelectOption<T extends string> = {
  value: T;
  label: string;
};

export function CustomSelect<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
  menuClassName = ""
}: {
  value: T;
  options: Array<CustomSelectOption<T>>;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  menuClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <button
        className="inline-flex h-10 w-full min-w-44 items-center justify-between gap-3 rounded-md border border-[#cfd8df] bg-white px-3 text-left text-sm font-bold text-[#17212b] outline-none transition hover:border-[#b8c7d0] hover:bg-[#f8fafb] focus-visible:border-[#164e63] focus-visible:ring-2 focus-visible:ring-[#dbe8ed]"
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} size={16} strokeWidth={1.75} />
      </button>

      {open ? (
        <div
          className={`absolute right-0 z-50 mt-2 min-w-full overflow-hidden rounded-md border border-[#cfd8df] bg-white p-1 shadow-lg shadow-slate-200/70 ${menuClassName}`}
          role="listbox"
          aria-label={ariaLabel}
        >
          {options.map((option) => {
            const selectedOption = option.value === value;
            return (
              <button
                className={`flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-sm font-semibold transition ${
                  selectedOption ? "bg-[#eef3f5] text-[#164e63]" : "text-[#46515c] hover:bg-[#f8fafb] hover:text-[#17212b]"
                }`}
                key={option.value}
                type="button"
                role="option"
                aria-selected={selectedOption}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span className="whitespace-nowrap">{option.label}</span>
                {selectedOption ? <Check className="shrink-0 text-[#164e63]" size={15} strokeWidth={1.75} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
