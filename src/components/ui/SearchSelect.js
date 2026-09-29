import { useEffect, useId, useRef, useState } from "react";
import { fieldClass } from "./formStyles";

export default function SearchSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  disabled = false,
  required = false,
  invalid = false,
  shakeKey = 0,
  className = "",
  emptyText = "No matches",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef(null);
  const listId = `${useId()}-options`;

  useEffect(() => {
    if (!invalid || !rootRef.current) return undefined;
    const el = rootRef.current;
    el.classList.remove("field-shake");
    void el.offsetWidth;
    el.classList.add("field-shake");
    return undefined;
  }, [invalid, shakeKey]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);
  const selected = options.find((item) => item.value === value);
  const selectedLabel = selected?.label || "";
  const showingAll = query.trim().toLowerCase() === selectedLabel.trim().toLowerCase();
  const filtered = !query.trim() || showingAll
    ? options
    : options.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()));

  const openList = () => {
    if (disabled) return;
    setQuery(selectedLabel);
    setHighlight(0);
    setOpen(true);
  };

  const choose = (option) => {
    onChange(option.value);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (event) => {
    if (disabled) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        openList();
        return;
      }
      setHighlight((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      if (filtered[highlight]) choose(filtered[highlight]);
    } else if (event.key === "Escape") {
      setQuery("");
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${open ? "z-30" : ""} ${className}`}>
      <input
        className={`${fieldClass} !pr-10 ${invalid ? "field-invalid" : ""}`}
        value={open ? query : selectedLabel}
        placeholder={placeholder}
        disabled={disabled}
        required={required && !value}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        onFocus={(event) => {
          openList();
          event.target.select();
        }}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          setHighlight(0);
          setOpen(true);
          if (!next.trim()) onChange("");
        }}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-lg leading-none text-brand-navy/45 disabled:opacity-40"
        tabIndex={-1}
        disabled={disabled}
        aria-label="Show options"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => (open ? setOpen(false) : openList())}
      >
        ▾
      </button>
      {open && !disabled ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-2xl border border-white/20 bg-white py-1 text-sm text-brand-navy shadow-lg"
        >
          {filtered.length ? (
            filtered.map((item, index) => (
              <li key={item.value}>
                <button
                  type="button"
                  className={`block w-full px-4 py-2 text-left hover:bg-brand-blue/10 ${
                    index === highlight || item.value === value ? "bg-brand-blue/10" : ""
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => choose(item)}
                >
                  {item.label}
                </button>
              </li>
            ))
          ) : (
            <li className="px-4 py-2 text-brand-navy/50">{emptyText}</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
