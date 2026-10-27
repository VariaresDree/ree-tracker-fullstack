import { cn } from './cn';

// `as` renders another element (an <li> in a list of cards, a <section>).
// `padding` is the one inset a card's own content takes when it doesn't use
// CardHeader/CardBody: sm for tiles and list rows, md for a section's card,
// lg for a hero or a question. Cards had ten hand-picked paddings.
const PADDING = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6 sm:p-8' };

// `glass`: frosted over the page's texture (index.css, .surface-glass). On by
// default, since most cards sit straight on the page; a card inside another
// card, and every card on an exam screen, turns solid by itself. Off for
// surfaces that float over content or must read as paper: dialogs and the
// question card.
//
// `variant` (index.css, CARD SURFACES):
//   default      the page card: glass, with the light rim along its top edge
//   hero         the one card a screen leads with: solid, on the page colour
//                washed with the theme's accent, elevated, `lg` inset unless
//                told otherwise.
//                Takes a <CardWatermark>.
//   interactive  a card that is itself a choice (a preset, a mock profile):
//                lifts and takes the accent edge on hover and focus. Takes a
//                <CardWatermark>.
//   inset        a well or row inside another card: the panel colour at
//                half strength, the smaller radius, no rim, never glass.
const VARIANT = {
  default: '',
  hero: 'card-hero relative isolate elevate-2',
  interactive: 'card-interactive relative isolate',
  inset: '',
};

export function Card({ as: Tag = 'div', className, variant = 'default', padding, elevated = false, glow = false, grain = false, glass = true, ...rest }) {
  const inset = variant === 'inset';
  const hero = variant === 'hero';
  return (
    <Tag
      className={cn(
        inset
          ? 'bg-surface2/50 border border-border rounded-[var(--radius-default)]'
          : cn(hero ? '' : glass ? 'surface-glass' : 'bg-surface', 'card-edge border border-border rounded-[var(--radius-lg)]'),
        VARIANT[variant],
        PADDING[padding ?? (variant === 'hero' ? 'lg' : 'none')],
        elevated && 'elevate-2',
        glow && 'elevate-glow',
        grain && 'grain-overlay',
        className
      )}
      {...rest}
    />
  );
}

// A large, faint icon in a corner of a hero or interactive card: the card's
// subject at a glance, behind the content (the card is its own stacking
// context, so -z-10 sits over the card colour and under the text). Its own
// box clips it to the card's corner, so the card keeps its overflow and focus
// rings are never cut. `corner="top"` for a card that ends in a full-width
// button, which the bottom corner would sit behind. Gone in a box narrower
// than 22rem, where it would sit behind words, and in forced colours and
// print.
const CORNER = { bottom: '-right-5 -bottom-7', top: '-right-6 -top-6' };

export function CardWatermark({ icon: Icon, corner = 'bottom', className }) {
  return (
    <div aria-hidden="true" data-watermark className="@container absolute inset-0 -z-10 overflow-hidden rounded-[inherit] pointer-events-none">
      <Icon className={cn('card-watermark absolute size-36 @max-[22rem]:hidden', CORNER[corner] || CORNER.bottom, className)} strokeWidth={1.25} />
    </div>
  );
}

export function CardHeader({ className, ...rest }) {
  // flex-wrap: a wide `action` slot (e.g. a Day/Week/Month SegmentedControl)
  // has no reason to shrink, so on a narrow viewport it was squeezing the
  // icon+eyebrow+title group down to nothing instead of wrapping below it —
  // measured live at 390px, the title group collapsed to 16-44px wide (icon
  // only) and its text overflowed unreadably. The title/eyebrow group keeps
  // its DEFAULT flex sizing (flex: 0 1 auto, i.e. no explicit basis/grow) —
  // giving it flex-1 here would zero its hypothetical size the same way
  // KpiTile's label did, which is what stops flex-wrap from ever triggering.
  return (
    <div
      className={cn('px-5 pt-5 pb-3 flex flex-wrap items-start justify-between gap-3', className)}
      {...rest}
    />
  );
}

// h2, not h3. A card is a top-level section of the page, so under a page's h1
// the next level down is h2 — and Lighthouse flagged the real skip: Dashboard
// renders PageHeader's h1 and then jumped straight to h3 at "Daily targets".
//
// Changing this alone would have moved the problem rather than fixed it: the
// six h4 section headings inside cards (Profile, Arena, LibraryOverview)
// would then sit under an h2 and become h2 -> h4 skips of their own. They are
// h3 now, so every chain reads h1/h2 -> h2 -> h3.
//
// `size="lg"` for a card that stands alone at the top of a section (an
// Account section, a battle's Join and Host); the hero card of a screen
// takes .text-h2 instead.
export function CardTitle({ className, size = 'md', ...rest }) {
  return (
    <h2
      className={cn(
        'text-textMain font-semibold tracking-tight',
        size === 'lg' ? 'text-lg' : 'text-base',
        className
      )}
      {...rest}
    />
  );
}

export function CardEyebrow({ className, ...rest }) {
  return <p className={cn('text-eyebrow', className)} {...rest} />;
}

export function CardBody({ className, ...rest }) {
  return <div className={cn('px-5 pb-5', className)} {...rest} />;
}

export function CardFooter({ className, ...rest }) {
  return (
    <div
      className={cn(
        'px-5 py-3 border-t border-border flex flex-wrap items-center justify-end gap-2',
        className
      )}
      {...rest}
    />
  );
}
