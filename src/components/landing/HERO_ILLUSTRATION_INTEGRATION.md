# Hero Illustration Integration Guide

## Component Details

The `HeroIllustration` component has been created at:
```
src/components/landing/hero-illustration.tsx
```

### Component API

```tsx
import { HeroIllustration } from '@/components/landing/hero-illustration';

<HeroIllustration
  size="lg"           // 'sm' | 'md' | 'lg' (default: 'lg')
  className=""        // Additional Tailwind classes
/>
```

### Component Features

- **SVG-based illustration** depicting an abstract "agent factory" concept
- **On-brand colors**: Indigo-500 and Violet-500 from the Intellios palette
- **CSS animations**:
  - Gentle pulse effect on nodes (3s cycle)
  - Subtle float animation on the entire container (4s cycle)
  - Data flow animation on connector paths (4s cycle)
- **Responsive**: Adjusts size via `size` prop (sm: 256x192px, md: 384x288px, lg: full width)
- **Accessibility**: Uses `aria-hidden="true"` automatically (decorative SVG)
- **Dark mode ready**: Uses SVG gradients that work in any theme

### How It Works

The illustration shows:
1. **Central node** (large, glowing): The "Governed Control Plane" - the heart of Intellios
2. **Layer 1 nodes** (4 medium nodes): Governance enforcement points
3. **Layer 2 nodes** (6 small nodes): Enterprise agents being governed
4. **Connection paths**: Show data flow and governance enforcement with animated dashes
5. **Decorative shield**: Represents compliance/governance within the center
6. **Background accents**: Subtle gradient circles and shapes for depth

### Recommended Placement in Hero Section

#### Option 1: Below the CTA buttons (Current mockup in page.tsx shows a product screenshot)
Add the illustration **after line 415** in `/src/app/landing/page.tsx`:

```tsx
          <div className="reveal mt-8 flex flex-wrap items-center justify-center gap-2">
            {/* Industry badges ... */}
          </div>

          {/* ADD HERE: HeroIllustration component */}
          <div className="reveal mt-16 flex justify-center">
            <HeroIllustration size="lg" className="opacity-90 dark:opacity-75" />
          </div>

          {/* ── Product visualization mockup ── */}
          <div className="reveal mt-14 mx-auto max-w-4xl">
            {/* Existing product screenshot mockup ... */}
          </div>
```

**Advantages**: Sits naturally between the CTA and the product mockup, provides visual breathing room.

#### Option 2: Replace background decoration (Alternative)
Replace the existing `hero-bg-float` SVG (lines 326-367) with a more structured version using this component positioned as a background decoration with lower opacity.

#### Integration Checklist

- [ ] Import the component at the top of `page.tsx`:
  ```tsx
  import { HeroIllustration } from "@/components/landing/hero-illustration";
  ```

- [ ] Add the component to the hero section (see Option 1 above)

- [ ] Test responsive sizing by viewing at breakpoints:
  - Mobile (sm): ~256px width
  - Tablet (md): ~384px width
  - Desktop (lg): ~672px width (max-w-2xl)

- [ ] Verify animations work and respect `prefers-reduced-motion`
  - The component includes a CSS animation that should respect the media query

- [ ] Check dark mode appearance (gradients and opacity values)

### Customization Options

#### Change animation speeds
Modify these values in the `<style>` block:
- `gentle-pulse` duration: `3s` (change to 2s or 4s)
- `gentle-float` duration: `4s`
- `flow-animation` duration: `4s`

#### Change colors
Modify the gradient IDs in the SVG `<defs>`:
- `hero-gradient-1`: Primary (currently indigo to violet)
- `hero-gradient-2`: Secondary (currently violet to indigo)

#### Adjust animation intensity
- Pulse: Change the `50% { opacity: 0.6; }` value (lower = more dramatic)
- Float: Change the `translateY(-8px)` value (larger = more movement)

### Browser Support

The component uses:
- SVG gradients and filters (all modern browsers)
- CSS animations (all modern browsers)
- CSS filters (all modern browsers)
- No JavaScript required (pure CSS animation)

Tested and supported on:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

---

**Created**: 2026-04-06
**Component Path**: `/src/components/landing/hero-illustration.tsx`
**Status**: Ready for integration
