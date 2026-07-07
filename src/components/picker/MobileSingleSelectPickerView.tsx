import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, ChevronLeft } from "lucide-react";
import { PickerListItem } from "@/components/picker/PickerListItem";
import { PickerSearchInput, matchesPickerSearch } from "@/components/PickerSearchInput";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SingleSelectOption } from "@/panels/SingleSelectPickerView";

type MobilePickerMode = "list" | "detail";

interface MobileSingleSelectPickerViewProps {
  options: SingleSelectOption[];
  selectedId: string | null;
  emptyDetail: ReactNode;
  searchPlaceholder?: string;
  noMatchesLabel?: string;
  selectedLabel?: string;
  backToListLabel?: string;
}

export function MobileSingleSelectPickerView({
  options,
  selectedId,
  emptyDetail,
  searchPlaceholder = "Search...",
  noMatchesLabel = "No matches",
  selectedLabel = "Selected",
  backToListLabel = "Options",
}: MobileSingleSelectPickerViewProps) {
  const [mode, setMode] = useState<MobilePickerMode>("list");
  const [query, setQuery] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(
    selectedId ?? options[0]?.id ?? null,
  );

  const filteredOptions = useMemo(
    () => options.filter((option) => matchesPickerSearch(query, [option.name])),
    [options, query],
  );

  useEffect(() => {
    setPreviewId(selectedId ?? options[0]?.id ?? null);
    setMode("list");
    setQuery("");
  }, [selectedId, options]);

  useEffect(() => {
    if (filteredOptions.length === 0) return;
    if (!filteredOptions.some((option) => option.id === previewId)) {
      setPreviewId(filteredOptions[0].id);
    }
  }, [filteredOptions, previewId]);

  const previewOption =
    filteredOptions.find((option) => option.id === previewId) ?? filteredOptions[0];

  const openDetail = (optionId: string) => {
    setPreviewId(optionId);
    setMode("detail");
  };

  if (mode === "detail" && previewOption) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--color-border)]/70 px-2 py-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => setMode("list")}
            aria-label={backToListLabel}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-[family-name:var(--font-heading)] text-sm font-semibold text-[var(--color-foreground)]">
              {previewOption.name}
            </p>
            {previewOption.isSelected && (
              <p className="text-[10px] font-medium text-[var(--color-accent)]">{selectedLabel}</p>
            )}
          </div>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="px-3 py-3">{previewOption.detail}</div>
        </ScrollArea>
        <div className="shrink-0 border-t border-[var(--color-border)]/70 p-3">
          <Button
            type="button"
            className="h-11 w-full"
            variant={previewOption.isSelected ? "outline" : "default"}
            disabled={previewOption.isEnabled === false && !previewOption.isSelected}
            onClick={previewOption.onSelect}
          >
            {previewOption.isSelected ? selectedLabel : `Select ${previewOption.name}`}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]/70 bg-[var(--color-surface)]/40 p-2">
      <PickerSearchInput value={query} onChange={setQuery} placeholder={searchPlaceholder} />
      <ScrollArea className="picker-list-scroll min-h-0 flex-1">
        <div className="space-y-1">
          {filteredOptions.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-[var(--color-muted)]">
              {noMatchesLabel}
            </p>
          ) : (
            filteredOptions.map((option) => (
              <PickerListItem
                key={option.id}
                name={option.name}
                isSelected={option.isSelected}
                isPreview={previewOption?.id === option.id}
                isEnabled={option.isEnabled}
                onSelect={() => openDetail(option.id)}
                leading={option.leading}
                trailing={
                  option.isSelected ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" />
                  ) : (
                    <ChevronLeft className="h-3.5 w-3.5 shrink-0 rotate-180 text-[var(--color-muted)]" />
                  )
                }
              />
            ))
          )}
        </div>
      </ScrollArea>
      {!previewOption && (
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-[var(--color-muted)]">
          {emptyDetail}
        </div>
      )}
    </div>
  );
}
