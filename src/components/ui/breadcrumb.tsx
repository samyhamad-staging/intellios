/**
 * Breadcrumb — hierarchical navigation component
 *
 * Renders a breadcrumb trail with ChevronRight separators.
 * Last item is plain text (current page, no link).
 */

import { ChevronRight } from "lucide-react";
import { CatalystLink } from "./catalyst-link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-0">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-0">
            {index > 0 && (
              <ChevronRight
                size={14}
                className="mx-2 text-text-tertiary flex-shrink-0"
                aria-hidden="true"
              />
            )}
            {item.href ? (
              <CatalystLink
                href={item.href}
                className="text-sm text-text-secondary hover:text-text transition-colors"
              >
                {item.label}
              </CatalystLink>
            ) : (
              <span className="text-sm text-text-secondary">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
