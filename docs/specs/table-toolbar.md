# TableToolbar & Pagination Components

**Status:** Completed
**Location:** `/src/components/ui/table-toolbar.tsx`
**Exports:** `TableToolbar`, `Pagination`, `FilterChip`, `TableToolbarProps`, `PaginationProps`

---

## Overview

Two reusable, production-grade components for standardizing data table interfaces across Intellios:

1. **TableToolbar** — A responsive toolbar for search, filtering, and result display above data tables
2. **Pagination** — A simple previous/next pagination control

Both components use Intellios design tokens and integrate seamlessly with existing Catalyst UI components.

---

## TableToolbar Component

### Purpose

Provides a consistent, reusable toolbar that appears above data tables. Handles search input, filter chips, result counting, and a right-side action slot (e.g., "Create" button).

### Props

```typescript
interface TableToolbarProps {
  searchPlaceholder?: string;      // Placeholder for search input (default: "Search…")
  searchValue?: string;             // Current search value
  onSearchChange?: (value: string) => void; // Callback on search change
  filters?: FilterChip[];            // Array of filter chips
  onFilterClick?: (key: string) => void;   // Callback when filter is clicked
  resultCount?: number;              // Total result count
  resultLabel?: string;              // Label for results (e.g., "agents")
  action?: React.ReactNode;          // Right-side action slot
  className?: string;                // Additional root CSS classes
}

interface FilterChip {
  key: string;                       // Unique identifier
  label: string;                     // Display label
  active: boolean;                   // Currently selected
  count?: number;                    // Optional count badge
}
```

### Layout

The toolbar uses a responsive flexbox layout:

```
┌─────────────────────────────────────────────────────────┐
│ [Search 🔍] [Filter 1] [Filter 2] ...  15 results [Create] │
└─────────────────────────────────────────────────────────┘
```

**Sections:**
- **Left:** Search input (w-64, max-w-xs), Search icon (14px), clear button (X icon)
- **Center:** Filter chips as pill buttons with active/inactive styling, optional count badges
- **Right:** Result count text (text-xs text-text-tertiary), action slot

**Responsive behavior:** Uses `flex-wrap` for multi-line layout on smaller screens. Gap-3 maintains consistent spacing.

### Styling

**Search input:**
- Class: `input-field-sm` (from globals.css)
- Inline left padding (pl-8) for Search icon
- Clear button (X) appears on right when search has value
- Focus state with primary ring from design tokens

**Filter chips:**
- Active: `bg-primary-subtle text-primary border border-primary-subtle`
- Inactive: `bg-surface border border-border text-text-secondary hover:bg-surface-raised`
- Count badge: smaller rounded container with dynamic coloring
- Text size: xs, font-medium, smooth transition on click

**Result count:**
- Text size: xs
- Color: text-text-tertiary
- Whitespace: nowrap (prevents wrapping of number/label)

### Usage Examples

#### Basic Usage with Search Only
```tsx
const [search, setSearch] = useState("");

<TableToolbar
  searchValue={search}
  onSearchChange={setSearch}
/>
```

#### With Filters
```tsx
const [search, setSearch] = useState("");
const [activeStatus, setActiveStatus] = useState<string | null>(null);

<TableToolbar
  searchValue={search}
  onSearchChange={setSearch}
  filters={[
    { key: "draft", label: "Draft", active: activeStatus === "draft", count: 5 },
    { key: "approved", label: "Approved", active: activeStatus === "approved", count: 12 },
    { key: "deployed", label: "Deployed", active: activeStatus === "deployed", count: 8 },
  ]}
  onFilterClick={(key) => setActiveStatus(activeStatus === key ? null : key)}
  resultCount={25}
  resultLabel="blueprints"
/>
```

#### With Search, Filters, and Action
```tsx
<TableToolbar
  searchPlaceholder="Search agents by name or ID…"
  searchValue={search}
  onSearchChange={setSearch}
  filters={statusFilters}
  onFilterClick={handleFilterClick}
  resultCount={filteredAgents.length}
  resultLabel="agent"
  action={
    <Button href="/intake" color="indigo">
      <Plus size={15} />
      New Blueprint
    </Button>
  }
/>
```

### Integration Notes

- **Search clearing:** When user clicks the X button, `onSearchChange("")` is called automatically
- **Filter pills:** Clicking a pill calls `onFilterClick(chipKey)` — consumer decides if it toggles or sets exclusive
- **Result formatting:** Auto-pluralizes result label ("1 result" vs "2 results")
- **Action slot:** Can be any React node — typically a `Button` from Catalyst or custom component
- **No fetching:** Component is purely presentational; data fetching handled by parent

---

## Pagination Component

### Purpose

Displays current page position and provides Previous/Next navigation buttons. Designed to pair with TableToolbar at the bottom of tables.

### Props

```typescript
interface PaginationProps {
  currentPage: number;           // Current page (1-indexed)
  totalPages: number;            // Total number of pages
  onPageChange: (page: number) => void; // Callback on page change
}
```

### Layout

```
┌─────────────────────────────────────────────┐
│ Page 3 of 10     [← Previous] [Next →]      │
└─────────────────────────────────────────────┘
```

**Sections:**
- **Left:** "Page X of Y" text (text-xs text-text-tertiary)
- **Right:** Previous and Next buttons using Catalyst Button (plain variant)

**Button behavior:**
- Previous disabled when `currentPage === 1`
- Next disabled when `currentPage === totalPages`
- Both buttons have `plain` variant from Catalyst for minimal styling

### Styling

- **Container:** Flexbox with `items-center justify-between`, top border (border-border-subtle)
- **Page text:** text-xs text-text-tertiary, whitespace-nowrap
- **Buttons:** Catalyst Button with `plain` variant, gap-2 between buttons

### Usage Examples

#### Basic Pagination
```tsx
const [page, setPage] = useState(1);
const pageSize = 50;
const totalResults = 247;
const totalPages = Math.ceil(totalResults / pageSize);

<Pagination
  currentPage={page}
  totalPages={totalPages}
  onPageChange={setPage}
/>
```

#### With Fetching
```tsx
const [page, setPage] = useState(1);
const [loading, setLoading] = useState(false);

async function handlePageChange(newPage: number) {
  setLoading(true);
  try {
    const data = await fetch(`/api/items?page=${newPage}`);
    setItems(await data.json());
  } finally {
    setLoading(false);
  }
}

<Pagination
  currentPage={page}
  totalPages={10}
  onPageChange={handlePageChange}
/>
```

### Integration Notes

- **1-indexed:** `currentPage` should be 1 for the first page
- **No API calls:** Component is presentational; parent handles data fetching
- **Disable during fetch:** Wrap in loading guard or use parent's loading state to disable buttons
- **Border styling:** Top border matches table border-subtle for visual continuity

---

## Design System Integration

### Color & Typography

Both components use semantic design tokens from globals.css:

| Token | Value | Use |
|-------|-------|-----|
| `text-text-tertiary` | slate-500 | Inactive text, meta labels |
| `text-text-secondary` | slate-600 | Secondary labels, button text |
| `bg-primary-subtle` | indigo-100 | Active filter background |
| `text-primary` | indigo-600 | Active filter text |
| `bg-surface` | white | Default button background |
| `border-border` | slate-200 | Standard borders |
| `border-border-subtle` | slate-100 | Subtle borders (pagination divider) |

### Icons

Both components use lucide-react icons:
- Search (14px) — search input icon
- X (12px) — clear search button

### Typography Scale

- Search placeholder: Uses `input-field-sm` which applies font-size 0.75rem
- Filter chips: text-xs (0.75rem)
- Result count: text-xs (0.75rem)
- Pagination text: text-xs (0.75rem)

---

## Accessibility

### TableToolbar
- Search input has proper `placeholder` attribute
- Clear button has `aria-label="Clear search"`
- Filter chips are keyboard-navigable buttons
- Icons are paired with text labels

### Pagination
- Page text is plain HTML span (no ARIA needed)
- Buttons are properly disabled when appropriate
- Catalyst Button handles focus states and keyboard navigation

---

## Responsiveness

### TableToolbar

**Desktop (full width):**
```
[Search w-64] [Filters] ... [Results] [Action]
```

**Tablet (flex-wrap):**
```
[Search w-64] [Filters] ...
[Results]                 [Action]
```

**Mobile (stacked):**
```
[Search full-width]
[Filters] [Filters]
[Results] [Action]
```

Gap-3 maintains consistent spacing in all configurations.

### Pagination

Fixed width, no responsive changes needed. Typically fills table width.

---

## Testing Checklist

- [ ] Search input filters results correctly
- [ ] Clear button (X) appears/disappears with search text
- [ ] Filter chips toggle active state
- [ ] Result count updates with filtered data
- [ ] Action button renders and is clickable
- [ ] Pagination buttons disable at boundaries
- [ ] Previous button navigates to correct page
- [ ] Next button navigates to correct page
- [ ] Responsive layout adapts on smaller screens
- [ ] Design tokens apply correct colors
- [ ] Icons render at correct sizes
- [ ] Keyboard navigation works (Tab, Enter)
- [ ] Accessibility labels present (aria-label, placeholder)

---

## Related Components

- **Catalyst Button** — Used in Pagination component
- **lucide-react** — Icons (Search, X)
- **globals.css** — Design tokens and `.input-field-sm` class

---

## Future Enhancements

- Sort controls (column header with active sort indicator)
- Bulk action toolbar (checkbox select + action buttons)
- Advanced filter panel (date ranges, multi-select dropdowns)
- Customizable results-per-page selector
- Jump-to-page input (for large datasets)
