/**
 * Catalyst Heading / Subheading — semantic heading elements with
 * consistent type scale.
 * Source: Tailwind Plus — Catalyst UI Kit (typescript)
 *
 * Usage:
 *   <Heading level={2}>Agents</Heading>
 *   <Subheading>Active this month</Subheading>
 */

import clsx from "clsx";
import type React from "react";

type HeadingProps = { level?: 1 | 2 | 3 | 4 | 5 | 6 } & React.ComponentPropsWithoutRef<
  "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
>;

export function Heading({ className, level = 1, ...props }: HeadingProps) {
  const Element: `h${typeof level}` = `h${level}`;
  return (
    <Element
      {...props}
      className={clsx(className, "text-2xl/8 font-semibold text-zinc-950 sm:text-xl/8")}
    />
  );
}

export function Subheading({ className, level = 2, ...props }: HeadingProps) {
  const Element: `h${typeof level}` = `h${level}`;
  return (
    <Element
      {...props}
      className={clsx(className, "text-base/7 font-semibold text-zinc-950 sm:text-sm/6")}
    />
  );
}
