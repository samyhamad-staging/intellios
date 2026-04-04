/**
 * Catalyst Link — wraps Next.js Link with Headless UI DataInteractive
 * so Catalyst components (Table row links, Badge links, etc.) get proper
 * data-hover / data-focus attributes for CSS-driven interaction states.
 *
 * Source: Tailwind Plus — Catalyst UI Kit (typescript)
 */

import * as Headless from "@headlessui/react";
import NextLink, { type LinkProps } from "next/link";
import React, { forwardRef } from "react";

export const CatalystLink = forwardRef(function CatalystLink(
  props: LinkProps & React.ComponentPropsWithoutRef<"a">,
  ref: React.ForwardedRef<HTMLAnchorElement>
) {
  return (
    <Headless.DataInteractive>
      <NextLink {...props} ref={ref} />
    </Headless.DataInteractive>
  );
});
