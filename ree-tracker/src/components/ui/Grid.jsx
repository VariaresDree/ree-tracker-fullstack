import { cn } from './cn';

// Grids that follow the room they actually have. Viewport breakpoints (md:,
// lg:) ignored the 288px sidebar: at 768px a `md:grid-cols-3` split about
// 430px of content into three 140px columns. These are container queries on
// a wrapper around the grid, so the columns follow the space the grid is
// given, beside the sidebar, inside a card or on a phone.
//   kpi    2, then 4 from 48rem: headline figures
//   tiles  2, then 3 from 32rem: small figures (never a column of tiny tiles)
//   icons  2, then 3 from 20rem, 4 from 42rem, 6 from 56rem: icon tiles
//   duo    2, then 3 from 42rem: tiles with more in them. One that needs the
//          whole row on a phone takes `col-span-2 @2xl:col-span-1`
//   pair   1, then 2 from 42rem: two panels side by side
//   cards  1, then 2 from 36rem, then 3 from 56rem: option and content cards
//   options  as cards, with an odd last card taking the whole row at 2 columns,
//          for a short list of choices that left one card and a gap
//   split  1, then 3 from 56rem: a main column and an aside; give the main
//          child `@4xl:col-span-2`
//   bento  1, then 2 from 36rem, then 4 from 56rem: a screen's mixed cards,
//          sized by what they hold. A wide card takes `@xl:col-span-2`, a
//          headline row `@xl:col-span-2 @4xl:col-span-4`; a chart beside a
//          figure `@4xl:col-span-3`.
// The wrapper is a block that fills its parent's width; in a flex row, give
// the Grid `className` on a parent with flex-1.
const KINDS = {
  kpi: 'grid-cols-2 @3xl:grid-cols-4',
  tiles: 'grid-cols-2 @lg:grid-cols-3',
  icons: 'grid-cols-2 @xs:grid-cols-3 @2xl:grid-cols-4 @4xl:grid-cols-6',
  duo: 'grid-cols-2 @2xl:grid-cols-3',
  pair: 'grid-cols-1 @2xl:grid-cols-2',
  cards: 'grid-cols-1 @xl:grid-cols-2 @4xl:grid-cols-3',
  options: 'grid-cols-1 @xl:grid-cols-2 @4xl:grid-cols-3 @xl:@max-4xl:[&>:last-child:nth-child(odd)]:col-span-2',
  split: 'grid-cols-1 @4xl:grid-cols-3',
  bento: 'grid-cols-1 @xl:grid-cols-2 @4xl:grid-cols-4',
};
const GAPS = { sm: 'gap-3', md: 'gap-4', lg: 'gap-6' };

export function Grid({ kind = 'cards', gap = 'md', as: Tag = 'div', className, children, ...rest }) {
  return (
    <div className="@container min-w-0">
      <Tag className={cn('grid', KINDS[kind] || KINDS.cards, GAPS[gap] || GAPS.md, className)} {...rest}>
        {children}
      </Tag>
    </div>
  );
}

export default Grid;
