import { getSignalLabel } from '../data/indicators';

export default function SignalBadge({ code, signal }) {
  const label = getSignalLabel(code, signal);
  const className = `signal-badge signal-${signal}`;

  return (
    <span className={className}>
      <span className="signal-dot" />
      {label}
    </span>
  );
}
