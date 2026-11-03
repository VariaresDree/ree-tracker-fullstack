// src/features/progress/NothingYet.jsx
//
// A Progress tab before there's anything to show: what will be here, and where to
// begin. It stands in for the zeroes and empty charts, which looked broken.
import { Link } from 'react-router-dom';
import { Button, Card, CardWatermark } from '../../components/ui';

export default function NothingYet({ icon, title, description }) {
  return (
    <Card as="section" variant="hero" aria-label={title} className="flex flex-col gap-3">
      <CardWatermark icon={icon} />
      <h2 className="text-h2 text-textMain">{title}</h2>
      <p className="text-sm text-muted2 max-w-prose">{description}</p>
      <div className="pt-1 flex flex-wrap gap-2">
        <Button as={Link} to="/practice" size="lg">Start practising</Button>
        <Button as={Link} to="/diagnostic" size="lg" variant="secondary">Take the placement test</Button>
      </div>
    </Card>
  );
}
