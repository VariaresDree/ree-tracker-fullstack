import { Card } from './Card';
import { cn } from './cn';

// The card a question is answered on, the same in Practice, the simulator,
// the Gauntlet and a battle. They used four paddings and two radii; this is
// the one (Card's lg inset, the card radius).
export function QuestionSurface({ className, children, ...rest }) {
  return (
    <Card elevated padding="lg" className={cn('flex flex-col relative min-w-0', className)} {...rest}>
      {children}
    </Card>
  );
}

export default QuestionSurface;
