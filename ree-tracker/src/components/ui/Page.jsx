import { cn } from './cn';

// The frame every app page sits in: one width per kind of page, the same top
// spacing and gap. The bottom space (clear of the phone's bottom bar) is the
// layout's <main>, so pages don't add their own. Pages used five widths
// (3xl to 6xl), some with top padding and some without, so the header moved
// between tabs.
//   wide    — hubs with grids and charts (Today, Practice, Exams, Progress,
//             Library, Admin)
//   reading — one question or one result at a time
//   narrow  — forms and settings (Account, the placement test)
const WIDTHS = { wide: 'max-w-6xl', reading: 'max-w-4xl', narrow: 'max-w-3xl' };

export function Page({ width = 'wide', className, children, ...rest }) {
  return (
    <div className={cn('flex flex-col gap-6 w-full mx-auto pt-4 page-fade-in', WIDTHS[width] || WIDTHS.wide, className)} {...rest}>
      {children}
    </div>
  );
}

export default Page;
