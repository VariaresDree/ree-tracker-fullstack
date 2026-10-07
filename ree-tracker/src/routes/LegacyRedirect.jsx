// src/routes/LegacyRedirect.jsx
//
// A redirect that keeps router state. A plain <Navigate> drops it, and every
// "start a session" deep link travels as state ({ preset }) — so /review →
// /practice would otherwise land on Practice without starting anything.
// `to` may be a function of the location (for URLs that map by their state).
import { Navigate, useLocation } from 'react-router-dom';

export default function LegacyRedirect({ to }) {
  const location = useLocation();
  const target = typeof to === 'function' ? to(location) : to;
  return <Navigate to={target} state={location.state} replace />;
}
