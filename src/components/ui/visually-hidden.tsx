/**
 * VisuallyHidden — renders children in a way that is invisible to sighted
 * users but fully accessible to screen readers.
 *
 * Use for supplementary labels, status announcements, or any text that
 * provides context for assistive technology without cluttering the visual UI.
 *
 * Examples:
 *   <VisuallyHidden>Loading blueprints…</VisuallyHidden>
 *   <Button><VisuallyHidden>Delete</VisuallyHidden><TrashIcon /></Button>
 */
export function VisuallyHidden({
  children,
  as: Tag = "span",
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }) {
  return (
    <Tag
      className="sr-only"
      {...props}
    >
      {children}
    </Tag>
  );
}

/**
 * LiveRegion — a polite aria-live region for dynamic status announcements.
 *
 * Render once in the layout; update `message` to announce to screen readers
 * without moving focus. Uses `aria-atomic="true"` so the full message is
 * read, not just the changed portion.
 */
export function LiveRegion({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}
