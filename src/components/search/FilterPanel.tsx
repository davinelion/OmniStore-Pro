"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import {
  UPDATED_WINDOWS,
  withFilterChange,
  type SearchFilters,
} from "@/lib/search/query";
import { ARCHITECTURE_IDS, PACKAGE_TYPE_IDS, PLATFORM_IDS, type Platform } from "@/lib/schemas/omnisource";
import { architectureLabel, packageTypeLabel, platformLabel } from "@/lib/formatters";
import { FilterCheckbox, SegmentedControl, Select } from "@/components/ui/select";
import { BottomSheet } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export type FacetOption = { value: string; label: string; count?: number };

/**
 * Search facets.
 *
 * Every control writes to the URL query string, so a filtered search is a
 * shareable link and the back button behaves as users expect.
 */
export function FilterPanel({
  filters,
  onChange,
  facets,
  className,
}: {
  filters: SearchFilters;
  onChange: (next: Partial<SearchFilters>) => void;
  facets: {
    categories: FacetOption[];
    platforms: FacetOption[];
    licenses: FacetOption[];
  };
  className?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeCount =
    filters.platforms.length +
    filters.categories.length +
    filters.licenses.length +
    filters.architectures.length +
    filters.packageTypes.length +
    (filters.openSource === null ? 0 : 1) +
    (filters.minTrust == null ? 0 : 1) +
    (filters.minQuality == null ? 0 : 1) +
    (filters.updatedWithinDays == null ? 0 : 1);

  const body = (
    <FilterBody filters={filters} onChange={onChange} facets={facets} />
  );

  return (
    <div className={className}>
      {/* Mobile: filters live behind a button and open as a bottom sheet. */}
      <div className="lg:hidden">
        <Button variant="outline" size="sm" onClick={() => setMobileOpen(true)}>
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          Filters
          {activeCount > 0 ? <Badge tone="accent">{activeCount}</Badge> : null}
        </Button>
        <BottomSheet open={mobileOpen} onClose={() => setMobileOpen(false)} title="Filters">
          {body}
          <div className="mt-6 flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                onChange({
                  platforms: [],
                  categories: [],
                  licenses: [],
                  architectures: [],
                  packageTypes: [],
                  openSource: null,
                  minTrust: null,
                  minQuality: null,
                  updatedWithinDays: null,
                  page: 1,
                });
                setMobileOpen(false);
              }}
            >
              Clear all
            </Button>
            <Button className="flex-1" onClick={() => setMobileOpen(false)}>
              Show results
            </Button>
          </div>
        </BottomSheet>
      </div>

      <div className="hidden lg:block">{body}</div>
    </div>
  );
}

function FilterBody({
  filters,
  onChange,
  facets,
}: {
  filters: SearchFilters;
  onChange: (next: Partial<SearchFilters>) => void;
  facets: {
    categories: FacetOption[];
    platforms: FacetOption[];
    licenses: FacetOption[];
  };
}) {
  const sortedCategories = useMemo(
    () => [...facets.categories].sort((a, b) => (b.count ?? 0) - (a.count ?? 0)),
    [facets.categories],
  );

  const toggle = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K] extends (infer U)[] ? U : never) => {
    const current = filters[key] as unknown as typeof value[];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    onChange(withFilterChange(filters, { [key]: next } as Partial<SearchFilters>));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Filters</h2>
        {(
          filters.platforms.length +
          filters.categories.length +
          filters.licenses.length +
          filters.architectures.length +
          filters.packageTypes.length +
          (filters.openSource === null ? 0 : 1) +
          (filters.minTrust == null ? 0 : 1) +
          (filters.minQuality == null ? 0 : 1) +
          (filters.updatedWithinDays == null ? 0 : 1)
        ) > 0 ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-2xs text-accent hover:underline"
            onClick={() =>
              onChange({
                platforms: [],
                categories: [],
                licenses: [],
                architectures: [],
                packageTypes: [],
                openSource: null,
                minTrust: null,
                minQuality: null,
                updatedWithinDays: null,
                page: 1,
              })
            }
          >
            <X className="h-3 w-3" aria-hidden />
            Clear all
          </button>
        ) : null}
      </div>

      <FacetGroup title="Platform">
        {PLATFORM_IDS.map((platform) => (
          <FilterCheckbox
            key={platform}
            label={platformLabel(platform)}
            count={facets.platforms.find((p) => p.value === platform)?.count}
            checked={filters.platforms.includes(platform as Platform)}
            onChange={() => toggle("platforms", platform as Platform)}
          />
        ))}
      </FacetGroup>

      <FacetGroup title="Category">
        {sortedCategories.slice(0, 12).map((category) => (
          <FilterCheckbox
            key={category.value}
            label={category.label}
            count={category.count}
            checked={filters.categories.includes(category.value)}
            onChange={() => toggle("categories", category.value)}
          />
        ))}
      </FacetGroup>

      <FacetGroup title="License">
        {facets.licenses.slice(0, 8).map((license) => (
          <FilterCheckbox
            key={license.value}
            label={license.value}
            count={license.count}
            checked={filters.licenses.includes(license.value)}
            onChange={() => toggle("licenses", license.value)}
          />
        ))}
      </FacetGroup>

      <FacetGroup title="Architecture">
        {ARCHITECTURE_IDS.map((architecture) => (
          <FilterCheckbox
            key={architecture}
            label={architectureLabel(architecture)}
            checked={filters.architectures.includes(architecture)}
            onChange={() => toggle("architectures", architecture)}
          />
        ))}
      </FacetGroup>

      <FacetGroup title="Package">
        {PACKAGE_TYPE_IDS.filter((type) => type !== "SOURCE" && type !== "OTHER").map((type) => (
          <FilterCheckbox
            key={type}
            label={packageTypeLabel(type)}
            checked={filters.packageTypes.includes(type)}
            onChange={() => toggle("packageTypes", type)}
          />
        ))}
      </FacetGroup>

      <SegmentedControl
        label="Open source"
        value={filters.openSource === null ? "any" : filters.openSource ? "yes" : "no"}
        onChange={(value) =>
          onChange({ openSource: value === "any" ? null : value === "yes", page: 1 })
        }
        options={[
          { value: "any", label: "Any" },
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ]}
      />

      <Select
        label="Updated within"
        value={filters.updatedWithinDays == null ? "any" : String(filters.updatedWithinDays)}
        onChange={(value) => onChange({ updatedWithinDays: value === "any" ? null : Number(value), page: 1 })}
        options={[
          { value: "any", label: "Any time" },
          ...UPDATED_WINDOWS.map((window) => ({ value: String(window.value), label: window.label })),
        ]}
      />

      <Select
        label="Minimum Trust Score"
        value={filters.minTrust == null ? "any" : String(filters.minTrust)}
        onChange={(value) => onChange({ minTrust: value === "any" ? null : Number(value), page: 1 })}
        options={[
          { value: "any", label: "Any" },
          { value: "90", label: "90+" },
          { value: "80", label: "80+" },
          { value: "70", label: "70+" },
          { value: "60", label: "60+" },
        ]}
      />

      <Select
        label="Minimum Quality Score"
        value={filters.minQuality == null ? "any" : String(filters.minQuality)}
        onChange={(value) => onChange({ minQuality: value === "any" ? null : Number(value), page: 1 })}
        options={[
          { value: "any", label: "Any" },
          { value: "90", label: "90+" },
          { value: "80", label: "80+" },
          { value: "70", label: "70+" },
          { value: "60", label: "60+" },
        ]}
      />
    </div>
  );
}

function FacetGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{title}</legend>
      <div className="space-y-1.5">{children}</div>
    </fieldset>
  );
}

/** Chips describing the active filters, each removable. */
export function ActiveFilterChips({
  filters,
  onChange,
  labels,
}: {
  filters: SearchFilters;
  onChange: (next: Partial<SearchFilters>) => void;
  labels: { categories: FacetOption[] };
}) {
  const chips: Array<{ key: string; label: string; clear: Partial<SearchFilters> }> = [];

  filters.platforms.forEach((platform) =>
    chips.push({
      key: `platform-${platform}`,
      label: platformLabel(platform),
      clear: { platforms: filters.platforms.filter((p) => p !== platform), page: 1 },
    }),
  );
  filters.categories.forEach((category) =>
    chips.push({
      key: `category-${category}`,
      label: labels.categories.find((c) => c.value === category)?.label ?? category,
      clear: { categories: filters.categories.filter((c) => c !== category), page: 1 },
    }),
  );
  filters.licenses.forEach((license) =>
    chips.push({
      key: `license-${license}`,
      label: license,
      clear: { licenses: filters.licenses.filter((l) => l !== license), page: 1 },
    }),
  );
  filters.architectures.forEach((architecture) =>
    chips.push({
      key: `arch-${architecture}`,
      label: architectureLabel(architecture),
      clear: { architectures: filters.architectures.filter((a) => a !== architecture), page: 1 },
    }),
  );
  filters.packageTypes.forEach((type) =>
    chips.push({
      key: `pkg-${type}`,
      label: packageTypeLabel(type),
      clear: { packageTypes: filters.packageTypes.filter((p) => p !== type), page: 1 },
    }),
  );
  if (filters.openSource !== null) {
    chips.push({ key: "oss", label: filters.openSource ? "Open source" : "Not open source", clear: { openSource: null, page: 1 } });
  }
  if (filters.minTrust != null) {
    chips.push({ key: "trust", label: `Trust ${filters.minTrust}+`, clear: { minTrust: null, page: 1 } });
  }
  if (filters.minQuality != null) {
    chips.push({ key: "quality", label: `Quality ${filters.minQuality}+`, clear: { minQuality: null, page: 1 } });
  }
  if (filters.updatedWithinDays != null) {
    const window = UPDATED_WINDOWS.find((w) => w.value === filters.updatedWithinDays);
    chips.push({
      key: "updated",
      label: window?.label ?? `Updated within ${filters.updatedWithinDays} days`,
      clear: { updatedWithinDays: null, page: 1 },
    });
  }

  if (chips.length === 0) return null;

  return (
    <ul className={cn("flex flex-wrap gap-1.5")}>
      {chips.map((chip) => (
        <li key={chip.key}>
          <button
            type="button"
            onClick={() => onChange(chip.clear)}
            className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-1 text-2xs text-accent"
            aria-label={`Remove filter ${chip.label}`}
          >
            {chip.label}
            <X className="h-3 w-3" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
