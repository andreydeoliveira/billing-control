"use client";

import { useMemo, useRef, useState } from "react";

export type ComboboxOption = {
  id: string;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
};

export function Combobox({
  name,
  options,
  defaultValue,
  placeholder,
  disabled,
  onSelectedIdChange,
}: {
  name: string;
  options: ComboboxOption[];
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  onSelectedIdChange?: (id: string) => void;
}) {
  const initialSelectedId = useMemo(() => {
    if (defaultValue && options.some((o) => o.id === defaultValue && !o.disabled)) return defaultValue;
    return "";
  }, [defaultValue, options]);

  const initialLabel = useMemo(() => {
    const found = options.find((o) => o.id === initialSelectedId);
    return found?.label ?? "";
  }, [options, initialSelectedId]);

  const [selectedId, setSelectedId] = useState<string>(initialSelectedId);
  const [query, setQuery] = useState<string>(initialLabel);
  const [open, setOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const selectOption = (opt: ComboboxOption) => {
    if (opt.disabled) return;
    setSelectedId(opt.id);
    setQuery(opt.label);
    setOpen(false);
    onSelectedIdChange?.(opt.id);
    inputRef.current?.focus();
  };

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={selectedId} />
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          setOpen(true);

          const selected = options.find((o) => o.id === selectedId);
          if (selected && next.trim() !== selected.label) {
            setSelectedId("");
            onSelectedIdChange?.("");
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          const next = e.relatedTarget as Node | null;
          if (next && rootRef.current?.contains(next)) return;
          setOpen(false);
        }}
        className="h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/15 disabled:opacity-50 dark:border-white/10 dark:focus:ring-white/15"
      />

      {open && !disabled ? (
        <div
          tabIndex={-1}
          className="absolute z-50 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-black/10 bg-background p-1 shadow-sm dark:border-white/10"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400">Nenhuma conta encontrada</div>
          ) : (
            filtered.map((opt) => {
              const active = opt.id === selectedId;
              const isDisabled = Boolean(opt.disabled);
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isDisabled}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectOption(opt)}
                  className={
                    isDisabled
                      ? "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-zinc-400"
                      : active
                        ? "flex w-full items-center justify-between rounded-lg bg-black/5 px-3 py-2 text-left text-sm font-medium text-foreground dark:bg-white/10"
                        : "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
                  }
                >
                  <span className="truncate">{opt.label}</span>
                  {isDisabled ? (
                    opt.disabledReason ? (
                      <span className="text-xs text-zinc-500">{opt.disabledReason}</span>
                    ) : null
                  ) : active ? (
                    <span className="text-xs text-zinc-500">Selecionado</span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
