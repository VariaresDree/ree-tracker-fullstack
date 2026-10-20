import { Card, CardHeader, CardTitle, CardEyebrow, CardBody } from './Card';
import { cn } from './cn';

// Convenience wrapper enforcing the dashboard panel contract:
//   Card(elevated) -> CardHeader(icon + eyebrow + title + action) -> CardBody
// Keeps every dashboard section visually consistent with one import.
export function Panel({
  eyebrow,
  title,
  icon: Icon,
  action,
  children,
  className,
  bodyClassName,
  elevated = true,
  ...rest
}) {
  const hasHeader = title || eyebrow || action;
  return (
    <Card elevated={elevated} className={cn('flex flex-col min-w-0', className)} {...rest}>
      {hasHeader && (
        <CardHeader>
          <div className="min-w-0 flex items-start gap-2.5">
            {Icon && (
              <span className="mt-0.5 text-muted2 shrink-0" aria-hidden="true">
                <Icon size={18} strokeWidth={1.75} />
              </span>
            )}
            <div className="min-w-0">
              {eyebrow && <CardEyebrow>{eyebrow}</CardEyebrow>}
              {/* Wraps, never truncates: a long title ("Questions you missed
                  (first 10 of 14)") lost its end to an ellipsis on a phone. */}
              {title && <CardTitle className="mt-0.5 text-pretty [overflow-wrap:anywhere]">{title}</CardTitle>}
            </div>
          </div>
          {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
        </CardHeader>
      )}
      <CardBody className={cn('flex-1 min-h-0', bodyClassName)}>{children}</CardBody>
    </Card>
  );
}
