import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import {
  PickerDetailPanel,
  PickerListItem,
  PickerListPanel,
} from "@/components/picker/PickerListItem";
import { PickerSearchInput, matchesPickerSearch } from "@/components/PickerSearchInput";
import { ScrollArea } from "@/components/ui/scroll-area";export interface SingleSelectOption {
  id: string;
  name: string;
  isSelected: boolean;
  isEnabled?: boolean;
  onSelect: () => void;
  detail: ReactNode;
  leading?: ReactNode;
}

interface SingleSelectPickerViewProps {
  options: SingleSelectOption[];
  selectedId: string | null;
  emptyDetail: ReactNode;
  searchPlaceholder?: string;
  noMatchesLabel?: string;
  selectedLabel?: string;
}

export function SingleSelectPickerView({
  options,
  selectedId,
  emptyDetail,
  searchPlaceholder = "Search...",
  noMatchesLabel = "No matches",
  selectedLabel = "Selected",
}: SingleSelectPickerViewProps) {
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
  }, [selectedId]);

  useEffect(() => {
    if (filteredOptions.length === 0) return;

    if (!filteredOptions.some((option) => option.id === previewId)) {
      setPreviewId(filteredOptions[0].id);
    }
  }, [filteredOptions, previewId]);

  const previewOption =
    filteredOptions.find((option) => option.id === previewId) ?? filteredOptions[0];

  return (
    <div className="flex min-h-0 flex-1 gap-3">
      <PickerListPanel className="h-full w-[11.5rem] shrink-0 sm:w-52">
        <PickerSearchInput
          value={query}
          onChange={setQuery}
          placeholder={searchPlaceholder}
        />
        <ScrollArea className="picker-list-scroll min-h-0 flex-1">
          <div className="space-y-0.5">            {filteredOptions.length === 0 ? (
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
                  onSelect={option.onSelect}
                  onPreview={() => setPreviewId(option.id)}
                  leading={option.leading}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </PickerListPanel>
      <PickerDetailPanel>
        {previewOption ? (
          <>
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--color-border)]/70 px-4 py-3">
              <h3 className="min-w-0 truncate font-[family-name:var(--font-heading)] text-base font-semibold text-[var(--color-accent)]">
                {previewOption.name}
              </h3>
              {previewOption.isSelected && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-accent)]/12 px-2 py-0.5 text-[10px] font-medium text-[var(--color-accent)]">
                  <Check className="h-3 w-3" />
                  {selectedLabel}
                </span>
              )}
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="px-4 py-3">{previewOption.detail}</div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-[var(--color-muted)]">
            {emptyDetail}
          </div>
        )}
      </PickerDetailPanel>
    </div>
  );
}
