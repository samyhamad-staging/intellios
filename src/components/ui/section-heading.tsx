import { clsx } from "clsx";

interface SectionHeadingProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * SectionHeading — A consistent component for small uppercase section headers.
 *
 * Used throughout the app for section dividers and subsection headers.
 * Displays text in uppercase with wider letter-spacing and a tertiary text color.
 */
export function SectionHeading({ children, className, style }: SectionHeadingProps) {
  return (
    <h3
      className={clsx(
        "text-xs font-semibold uppercase tracking-wider text-text-tertiary",
        className
      )}
      style={style}
    >
      {children}
    </h3>
  );
}
