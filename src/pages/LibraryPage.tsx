import { useMemo, useState, useRef, type ReactNode, type UIEvent } from "react";
import { Link } from "react-router-dom";
import { Check, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { EquipmentSlotId, GearEnchantment, GearItem } from "@/data/schemas";
import {
  EQUIPMENT_SLOT_IDS,
  EQUIPMENT_SLOT_LABELS,
  getGearEnchantment,
  getGearItem,
  suggestedSlotsForItem,
  type WishlistEntry,
} from "@/lib/gearLibrary";
import { cn } from "@/lib/utils";
import { useBuildStore } from "@/store/buildStore";
import { useThemeConfig } from "@/theme/ThemeProvider";

type LibraryTab = "weapons" | "armor" | "enchantments" | "equipped" | "wishlist";

const ROW_HEIGHT = 44;
const LIST_HEIGHT = 520;

function matchesQuery(text: string, query: string): boolean {
  if (!query) return true;
  return text.toLowerCase().includes(query);
}

function VirtualRows<T>({
  items,
  renderRow,
}: {
  items: T[];
  renderRow: (item: T, index: number) => ReactNode;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 5);
  const visibleCount = Math.ceil(LIST_HEIGHT / ROW_HEIGHT) + 10;
  const end = Math.min(items.length, start + visibleCount);
  const offsetY = start * ROW_HEIGHT;

  return (
    <div
      ref={viewportRef}
      className="overflow-auto rounded-[var(--radius-md)] border border-[var(--color-border)]"
      style={{ height: LIST_HEIGHT }}
      onScroll={(event: UIEvent<HTMLDivElement>) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div style={{ height: items.length * ROW_HEIGHT, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {items.slice(start, end).map((item, index) => renderRow(item, start + index))}
        </div>
      </div>
    </div>
  );
}

function itemSubtitle(item: GearItem): string {
  if (item.kind === "weapon") {
    return `${item.weaponType} · dmg ${item.damage} · ${item.weight} wt`;
  }
  return `${item.armorType} · AR ${item.armorRating} · ${item.weight} wt`;
}

export function LibraryPage() {
  const { labels } = useThemeConfig();
  const gameData = useBuildStore((state) => state.gameData);
  const build = useBuildStore((state) => state.build);
  const setEquipmentSlot = useBuildStore((state) => state.setEquipmentSlot);
  const toggleWishlistEntry = useBuildStore((state) => state.toggleWishlistEntry);

  const [tab, setTab] = useState<LibraryTab>("weapons");
  const [query, setQuery] = useState("");
  const [staticOnly, setStaticOnly] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedEnchantId, setSelectedEnchantId] = useState<string | null>(null);

  const items = gameData?.game.items;
  const normalizedQuery = query.trim().toLowerCase();

  const weapons = useMemo(() => {
    if (!items) return [];
    return items.weapons.filter((item) => {
      if (staticOnly && !item.static) return false;
      return (
        matchesQuery(item.name, normalizedQuery) ||
        matchesQuery(item.edid, normalizedQuery) ||
        matchesQuery(item.weaponType, normalizedQuery)
      );
    });
  }, [items, normalizedQuery, staticOnly]);

  const armor = useMemo(() => {
    if (!items) return [];
    return items.armor.filter((item) => {
      if (staticOnly && !item.static) return false;
      return (
        matchesQuery(item.name, normalizedQuery) ||
        matchesQuery(item.edid, normalizedQuery) ||
        matchesQuery(item.armorType, normalizedQuery) ||
        matchesQuery(item.slot, normalizedQuery)
      );
    });
  }, [items, normalizedQuery, staticOnly]);

  const enchantments = useMemo(() => {
    if (!items) return [];
    return items.enchantments.filter(
      (entry) =>
        matchesQuery(entry.name, normalizedQuery) || matchesQuery(entry.edid, normalizedQuery),
    );
  }, [items, normalizedQuery]);

  if (!gameData || !items) {
    return <div className="p-6 text-[var(--color-muted)]">Loading library…</div>;
  }

  const selectedItem = selectedItemId ? getGearItem(gameData.game, selectedItemId) : undefined;
  const selectedEnchant = selectedEnchantId
    ? getGearEnchantment(gameData.game, selectedEnchantId)
    : undefined;

  const wishlistHas = (entry: WishlistEntry) =>
    (build.wishlist ?? []).some((item) => item.kind === entry.kind && item.id === entry.id);

  const tabs: Array<{ id: LibraryTab; label: string; count: number }> = [
    { id: "weapons", label: labels.library?.tabs?.weapons ?? "Weapons", count: weapons.length },
    { id: "armor", label: labels.library?.tabs?.armor ?? "Armor", count: armor.length },
    {
      id: "enchantments",
      label: labels.library?.tabs?.enchantments ?? "Enchantments",
      count: enchantments.length,
    },
    {
      id: "equipped",
      label: labels.library?.tabs?.equipped ?? "Equipped",
      count: Object.keys(build.equipment ?? {}).length,
    },
    {
      id: "wishlist",
      label: labels.library?.tabs?.wishlist ?? "Wishlist",
      count: (build.wishlist ?? []).length,
    },
  ];

  function renderItemRow(item: GearItem) {
    const active = selectedItemId === item.id;
    return (
      <button
        key={item.id}
        type="button"
        className={cn(
          "flex w-full items-center justify-between gap-3 border-b border-[var(--color-border)] px-3 text-left text-sm",
          active
            ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
            : "hover:bg-[var(--color-surface-elevated)]",
        )}
        style={{ height: ROW_HEIGHT }}
        onClick={() => {
          setSelectedItemId(item.id);
          setSelectedEnchantId(null);
        }}
      >
        <span className="min-w-0 truncate">
          <span className="font-medium">{item.name}</span>
          <span className="ml-2 text-[var(--color-muted)]">{itemSubtitle(item)}</span>
        </span>
        {item.static ? (
          <span className="shrink-0 text-xs text-[var(--color-muted)]">static</span>
        ) : null}
      </button>
    );
  }

  function renderEnchantRow(entry: GearEnchantment) {
    const active = selectedEnchantId === entry.id;
    return (
      <button
        key={entry.id}
        type="button"
        className={cn(
          "flex w-full items-center justify-between gap-3 border-b border-[var(--color-border)] px-3 text-left text-sm",
          active
            ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
            : "hover:bg-[var(--color-surface-elevated)]",
        )}
        style={{ height: ROW_HEIGHT }}
        onClick={() => {
          setSelectedEnchantId(entry.id);
          setSelectedItemId(null);
        }}
      >
        <span className="min-w-0 truncate font-medium">{entry.name}</span>
        <span className="shrink-0 text-xs text-[var(--color-muted)]">{entry.effects.length} fx</span>
      </button>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 overflow-hidden p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">
            {labels.library?.title ?? "Gear Library"}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {labels.library?.subtitle ??
              "Browse weapons, armor, and enchantments. Selections save with your build and share codes."}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/planner">{labels.library?.openPlanner ?? "Open planner"}</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={cn(
              "rounded-[var(--radius-md)] px-3 py-1.5 text-sm transition-colors",
              tab === entry.id
                ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                : "text-[var(--color-muted)] hover:bg-[var(--color-surface-elevated)]",
            )}
            onClick={() => setTab(entry.id)}
          >
            {entry.label} ({entry.count})
          </button>
        ))}
      </div>

      {tab !== "equipped" && tab !== "wishlist" ? (
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={labels.library?.searchPlaceholder ?? "Search by name or editor id…"}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pr-3 pl-9 text-sm outline-none focus:border-[var(--color-accent)]"
            />
          </label>
          {tab !== "enchantments" ? (
            <label className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
              <input
                type="checkbox"
                checked={staticOnly}
                onChange={(event) => setStaticOnly(event.target.checked)}
              />
              {labels.library?.staticOnly ?? "Static only"}
            </label>
          ) : null}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <Card className="min-h-0 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {tabs.find((entry) => entry.id === tab)?.label}
            </CardTitle>
            <CardDescription>
              {tab === "equipped"
                ? (labels.library?.equippedHint ?? "Current build loadout")
                : tab === "wishlist"
                  ? (labels.library?.wishlistHint ?? "Saved wishlist entries for this build")
                  : (labels.library?.browseHint ?? "Select a row for details and actions")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {tab === "weapons" ? (
              <VirtualRows items={weapons} renderRow={(item) => renderItemRow(item)} />
            ) : null}
            {tab === "armor" ? (
              <VirtualRows items={armor} renderRow={(item) => renderItemRow(item)} />
            ) : null}
            {tab === "enchantments" ? (
              <VirtualRows items={enchantments} renderRow={(item) => renderEnchantRow(item)} />
            ) : null}
            {tab === "equipped" ? (
              <div className="space-y-2">
                {EQUIPMENT_SLOT_IDS.map((slot) => {
                  const selection = build.equipment?.[slot];
                  const item = selection ? getGearItem(gameData.game, selection.itemId) : undefined;
                  return (
                    <div
                      key={slot}
                      className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="font-medium">{EQUIPMENT_SLOT_LABELS[slot]}</div>
                        <div className="truncate text-[var(--color-muted)]">
                          {item?.name ?? "Empty"}
                        </div>
                      </div>
                      {selection ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEquipmentSlot(slot, null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
            {tab === "wishlist" ? (
              <div className="space-y-2">
                {(build.wishlist ?? []).length === 0 ? (
                  <p className="text-sm text-[var(--color-muted)]">Wishlist is empty.</p>
                ) : (
                  (build.wishlist ?? []).map((entry) => {
                    const label =
                      entry.kind === "item"
                        ? getGearItem(gameData.game, entry.id)?.name
                        : getGearEnchantment(gameData.game, entry.id)?.name;
                    return (
                      <div
                        key={`${entry.kind}:${entry.id}`}
                        className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"
                      >
                        <div>
                          <div className="font-medium">{label ?? entry.id}</div>
                          <div className="text-[var(--color-muted)]">{entry.kind}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleWishlistEntry(entry)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedItem?.name ?? selectedEnchant?.name ?? (labels.library?.detailTitle ?? "Details")}
            </CardTitle>
            <CardDescription>
              {selectedItem?.edid ?? selectedEnchant?.edid ?? "Select an entry to inspect it."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {selectedItem ? (
              <>
                <p className="text-[var(--color-muted)]">
                  {selectedItem.description || itemSubtitle(selectedItem)}
                </p>
                {selectedItem.enchantId ? (
                  <p>
                    Built-in enchant:{" "}
                    {getGearEnchantment(gameData.game, selectedItem.enchantId)?.name ??
                      selectedItem.enchantId}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {suggestedSlotsForItem(selectedItem).map((slot: EquipmentSlotId) => (
                    <Button
                      key={slot}
                      size="sm"
                      onClick={() =>
                        setEquipmentSlot(slot, {
                          itemId: selectedItem.id,
                          enchantId: selectedItem.enchantId,
                        })
                      }
                    >
                      Equip {EQUIPMENT_SLOT_LABELS[slot]}
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleWishlistEntry({ kind: "item", id: selectedItem.id })}
                  >
                    {wishlistHas({ kind: "item", id: selectedItem.id }) ? (
                      <>
                        <Check className="mr-1 h-4 w-4" /> On wishlist
                      </>
                    ) : (
                      <>
                        <Plus className="mr-1 h-4 w-4" /> Wishlist
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : null}

            {selectedEnchant ? (
              <>
                <p className="text-[var(--color-muted)]">
                  {selectedEnchant.description || "No description."}
                </p>
                {selectedEnchant.effects.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5">
                    {selectedEnchant.effects.map((effect, index) => (
                      <li key={`${effect.type}-${index}`}>
                        {effect.type}
                        {"stat" in effect ? ` · ${effect.stat}` : ""}
                        {"value" in effect ? ` · ${effect.value}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[var(--color-muted)]">No mapped planner effects.</p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleWishlistEntry({ kind: "enchant", id: selectedEnchant.id })}
                >
                  {wishlistHas({ kind: "enchant", id: selectedEnchant.id }) ? (
                    <>
                      <Check className="mr-1 h-4 w-4" /> On wishlist
                    </>
                  ) : (
                    <>
                      <Plus className="mr-1 h-4 w-4" /> Wishlist
                    </>
                  )}
                </Button>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
