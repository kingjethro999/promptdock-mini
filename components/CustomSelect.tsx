"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  id?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Custom dropdown (listbox) that matches the Prompt Dock Mini theme instead of
 * the browser's generic <select>.
 *
 * - Theme tokens: bg-panel / border-line / text-fg / text-muted / green.
 * - No native <select>: a button trigger opens a role="listbox" popover.
 * - Keyboard: ArrowUp/Down move highlight, Enter/Space select, Escape closes,
 *   Home/End jump to edges, typing jumps to matching options.
 * - Click outside closes; hover highlights options.
 * - Accessible: aria-expanded / aria-haspopup / aria-labelledby / aria-selected,
 *   ChevronDown rotates when open, Check marks the chosen option.
 */
export function CustomSelect({
  id,
  value,
  options,
  onChange,
  disabled = false,
  placeholder = "Select",
  className,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listboxRef = useRef<HTMLUListElement | null>(null);
  const typeaheadRef = useRef<{
    timer: ReturnType<typeof setTimeout> | null;
    text: string;
  }>({ timer: null, text: "" });

  const valueIndex = options.findIndex((o) => o.value === value);
  const initialHighlight = valueIndex !== -1 ? valueIndex : 0;

  const openListbox = useCallback(() => {
    if (disabled || options.length === 0) return;
    setOpen(true);
    setHighlighted(Math.max(0, Math.min(initialHighlight, options.length - 1)));
  }, [disabled, options.length, initialHighlight]);

  const closeListbox = useCallback(() => setOpen(false), []);

  const selectOption = useCallback(
    (opt: SelectOption) => {
      if (opt.value !== value) onChange(opt.value);
      closeListbox();
      triggerRef.current?.focus();
    },
    [value, onChange, closeListbox],
  );

  // Click outside to close.
  useEffect(() => {
    function handleClickDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        listboxRef.current &&
        !listboxRef.current.contains(target)
      ) {
        closeListbox();
      }
    }
    document.addEventListener("mousedown", handleClickDown);
    return () => document.removeEventListener("mousedown", handleClickDown);
  }, [closeListbox]);

  // Typeahead buffer: typing jumps to the first option starting with the text.
  const handleTypeahead = useCallback(
    (char: string) => {
      if (disabled || options.length === 0) return;
      if (typeaheadRef.current.timer) clearTimeout(typeaheadRef.current.timer);
      typeaheadRef.current.text = (typeaheadRef.current.text + char).toLowerCase();
      const match = options.find(
        (o) => o.label.toLowerCase().startsWith(typeaheadRef.current.text),
      );
      if (match) {
        const index = options.indexOf(match);
        setHighlighted(index);
        selectOption(match);
      }
      typeaheadRef.current.timer = setTimeout(() => {
        typeaheadRef.current.text = "";
      }, 500);
    },
    [disabled, options, selectOption],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled) return;
      switch (event.key) {
        case "Enter":
        case " ":
          event.preventDefault();
          if (open) {
            selectOption(options[highlighted]);
          } else {
            openListbox();
          }
          break;
        case "ArrowDown":
          event.preventDefault();
          if (!open) openListbox();
          else setHighlighted((h) => Math.min(h + 1, options.length - 1));
          break;
        case "ArrowUp":
          event.preventDefault();
          if (!open) openListbox();
          else setHighlighted((h) => Math.max(h - 1, 0));
          break;
        case "Home":
          event.preventDefault();
          if (open) setHighlighted(0);
          break;
        case "End":
          event.preventDefault();
          if (open) setHighlighted(options.length - 1);
          break;
        case "Escape":
          event.preventDefault();
          closeListbox();
          break;
        default:
          if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
            handleTypeahead(event.key);
          }
      }
    },
    [disabled, open, options, highlighted, selectOption, openListbox, closeListbox, handleTypeahead],
  );

  const currentOption = options.find((o) => o.value === value);

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={id ? `${id}-listbox` : undefined}
        disabled={disabled}
        onClick={openListbox}
        onKeyDown={handleKeyDown}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border border-line ${
          disabled
            ? "bg-bg text-muted cursor-not-allowed opacity-60"
            : "bg-panel text-fg hover:border-green"
        } px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-green focus-visible:ring-inset`}
      >
        <span className="truncate">{currentOption?.label ?? placeholder}</span>
        <ChevronDown
          aria-hidden
          className={`size-4 shrink-0 text-muted transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && options.length > 0 && (
        <ul
          ref={listboxRef}
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          aria-labelledby={id}
          className="mt-1 w-full rounded-xl border border-line bg-panel shadow-lg overflow-hidden overflow-y-auto max-h-60 z-50 text-sm focus:outline-none"
        >
          {options.map((opt, index) => {
            const active = index === highlighted;
            const selected = opt.value === value;
            const isDisabled = disabled || opt.value === "__disabled__";
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={selected}
                aria-disabled={isDisabled || undefined}
                id={id ? `${id}-option-${index}` : undefined}
                onClick={() => (isDisabled ? null : selectOption(opt))}
                onMouseMove={() => (isDisabled ? null : setHighlighted(index))}
                className={`select-none py-2.5 px-3 text-left ${
                  selected
                    ? "bg-green text-bg"
                    : active
                      ? "bg-green/10 text-fg"
                      : "text-fg hover:bg-bg"
                } ${isDisabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {opt.label}
                {selected && (
                  <Check aria-hidden className="size-3 ml-2" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
