# TableToolbar & Pagination — Quick Reference

**Component location:** `/src/components/ui/table-toolbar.tsx`
**Import path:** `@/components/ui` (via index.ts)

---

## Quick Start

### TableToolbar (Search + Filters)

```tsx
import { TableToolbar } from "@/components/ui";
import { useState } from "react";

export function MyTable() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const filters = [
    { key: "draft", label: "Draft", active: status === "draft", count: 5 },
    { key: "approved", label: "Approved", active: status === "approved", count: 12 },
  ];

  return (
    <>
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        filters={filters}
        onFilterClick={(key) => setStatus(status === key ? null : key)}
        resultCount={17}
        resultLabel="agents"
      />
      {/* Your table below */}
    </>
  );
}
```

### Pagination

```tsx
import { Pagination } from "@/components/ui";
import { useState } from "react";

export function MyTable() {
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const total = 247;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <>
      {/* Your table */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </>
  );
}
```

---

## FilterChip Structure

```typescript
interface FilterChip {
  key: string;              // Unique ID (use for onFilterClick callback)
  label: string;            // Display text ("Draft", "Approved", etc.)
  active: boolean;          // Currently selected
  count?: number;           // Optional badge (e.g., "5 items")
}
```

### Building Filter Chips

From a status enum:
```tsx
const statusOptions = ["draft", "in_review", "approved", "rejected"];
const activeStatus = "approved";

const filters = statusOptions.map((s) => ({
  key: s,
  label: statusLabels[s],           // Your label map
  active: activeStatus === s,
  count: statusCounts[s],           // Your count data
}));
```

From a fixed list:
```tsx
const filters: FilterChip[] = [
  { key: "all", label: "All", active: !activeStatus, count: 25 },
  { key: "clean", label: "Healthy", active: activeStatus === "clean", count: 15 },
  { key: "critical", label: "Critical", active: activeStatus === "critical", count: 3 },
];
```

---

## TableToolbar Props Reference

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `searchPlaceholder` | string | `"Search…"` | Shown in search input when empty |
| `searchValue` | string | `""` | Controlled input value |
| `onSearchChange` | (value: string) => void | — | Called on every keystroke; receives "" on clear |
| `filters` | FilterChip[] | — | Array of filter options to display |
| `onFilterClick` | (key: string) => void | — | Called when any filter chip is clicked |
| `resultCount` | number | — | Total result count (shown on right) |
| `resultLabel` | string | `"result"` | Singular form; auto-pluralizes ("1 result" vs "2 results") |
| `action` | React.ReactNode | — | Button or component for right side (typically "Create" button) |
| `className` | string | — | Additional Tailwind classes for root div |

---

## Pagination Props Reference

| Prop | Type | Notes |
|------|------|-------|
| `currentPage` | number | 1-indexed page number (1 = first page) |
| `totalPages` | number | Total number of pages |
| `onPageChange` | (page: number) => void | Called with new page number (1-indexed) |

---

## Common Patterns

### 1. URL-Synced Search & Filters (like Registry)

```tsx
const router = useRouter();
const searchParams = useSearchParams();

const [search, setSearchState] = useState(() => searchParams.get("q") ?? "");
const [status, setStatusState] = useState(() => searchParams.get("status") ?? "");

// Sync to URL on change
const setSearch = (q: string) => {
  setSearchState(q);
  router.replace(`/mypage?q=${q}&status=${status}`, { scroll: false });
};

const setStatus = (s: string) => {
  setStatusState(s);
  router.replace(`/mypage?q=${search}&status=${s}`, { scroll: false });
};
```

### 2. Load Data with Pagination

```tsx
const [page, setPage] = useState(1);
const [items, setItems] = useState([]);
const [loading, setLoading] = useState(false);

async function loadPage(newPage: number) {
  setLoading(true);
  const data = await fetch(`/api/items?page=${newPage}&limit=50`);
  setItems(await data.json());
  setLoading(false);
  setPage(newPage);
}

// In render:
<Pagination
  currentPage={page}
  totalPages={10}
  onPageChange={loadPage}
/>
```

### 3. All-in-One Example (with Create Button)

```tsx
import { TableToolbar, Pagination } from "@/components/ui";
import { Button } from "@/components/catalyst";
import { Plus } from "lucide-react";

export function AgentsTable() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | null>("draft");
  const [page, setPage] = useState(1);

  const filtered = agents.filter((a) => {
    const matchSearch = !search || a.name.includes(search);
    const matchStatus = !status || a.status === status;
    return matchSearch && matchStatus;
  });

  const pageSize = 50;
  const totalPages = Math.ceil(filtered.length / pageSize);

  return (
    <div>
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          { key: "draft", label: "Draft", active: status === "draft", count: 5 },
          { key: "approved", label: "Approved", active: status === "approved", count: 12 },
        ]}
        onFilterClick={(key) => {
          setStatus(status === key ? null : key);
          setPage(1); // Reset to page 1 on filter change
        }}
        resultCount={filtered.length}
        resultLabel="agent"
        action={
          <Button href="/intake" color="indigo">
            <Plus size={15} />
            New Agent
          </Button>
        }
      />

      {/* Table here */}
      <div className="mt-4 border rounded">
        {/* render agents[pageStart:pageEnd] */}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
```

---

## Styling Notes

### Default Colors (from globals.css)

**Active filter chip:**
- Background: `var(--color-primary-subtle)` (indigo-100)
- Text: `var(--color-primary)` (indigo-600)
- Border: `var(--color-primary-subtle)`

**Inactive filter chip:**
- Background: `var(--color-surface)` (white)
- Text: `var(--color-text-secondary)` (slate-500)
- Border: `var(--color-border)` (slate-200)
- Hover: `var(--color-surface-raised)` (slate-50)

### Custom Styling

Pass `className` to root:
```tsx
<TableToolbar
  // ... props
  className="bg-blue-50 rounded-lg p-4"
/>
```

---

## Accessibility Checklist

- ✓ Search input has `placeholder` attribute (reads as label)
- ✓ Clear button has `aria-label="Clear search"`
- ✓ Filter chips are keyboard-navigable buttons
- ✓ Pagination buttons properly disabled at boundaries
- ✓ Result count announces total results to screen readers
- ✓ No hidden click-only functionality

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Search not clearing | Ensure `onSearchChange` is called with `""` on X button click — this is automatic |
| Filters not toggling | Check `active` boolean is computed correctly (should be `status === key`) |
| Pagination disabled at wrong page | Verify `currentPage` is 1-indexed (page 1 is first) |
| Results show wrong count | `resultCount` must equal filtered array length; recalculate on filter change |
| Colors look wrong | Check globals.css is imported in page (`@import "tw-animate-css"` at top) |
| Icons not showing | Verify `lucide-react` is installed (`npm list lucide-react`) |

---

## Migration Checklist

To migrate an existing page to use TableToolbar:

- [ ] Remove custom search input HTML
- [ ] Remove custom filter button/pill HTML
- [ ] Import `TableToolbar` from `@/components/ui`
- [ ] Extract filter state (`activeStatus`, `search`, etc.)
- [ ] Build `filters` array with correct `key`, `label`, `active`, `count`
- [ ] Pass `onSearchChange`, `onFilterClick` handlers to TableToolbar
- [ ] Update result count calculation
- [ ] Test search input clears with X button
- [ ] Test filter chips toggle active state
- [ ] Test responsive layout on mobile (flex-wrap)
- [ ] Verify design tokens apply correct colors

---

## Related Components

- **Catalyst Button** — Used in Pagination; available as `import { Button } from "@/components/catalyst"`
- **lucide-react** — Icons; `Search` (14px), `X` (12px)
- **globals.css** — Design tokens; `input-field-sm` class for search styling

---

## Examples in Codebase

After migration, these pages will use TableToolbar:
- `/blueprints/page.tsx`
- `/registry/page.tsx`
- `/monitor/page.tsx`
- `/audit/page.tsx`
- `/compliance/page.tsx`

Check `/docs/specs/table-toolbar.md` for full spec and usage examples.
