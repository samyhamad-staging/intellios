/**
 * Catalyst Divider — horizontal rule with soft/hard variants.
 * Source: Tailwind Plus — Catalyst UI Kit (typescript)
 *
 * Usage:
 *   <Divider />           // hard border
 *   <Divider soft />      // subtle border
 */

import clsx from "clsx";
import type React from "react";

export function Divider({
  soft = false,
  className,
  ...props
}: { soft?: boolean } & React.ComponentPropsWithoutRef<"hr">) {
  return (
    <hr
      role="presentation"
      {...props}
      className={clsx(
        className,
        "w-full border-t",
        soft ? "border-zinc-950/5" : "border-zinc-950/10"
      )}
    />
  );
}
