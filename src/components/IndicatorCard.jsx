import SignalBadge from './SignalBadge';
import SparkLine from './SparkLine';
import { formatValue } from '../data/indicators';

export default function IndicatorCard({ indicator }) {
  const {
    code, label, category, signal, values,
    latest, change, threshold_high, threshold_low,
  } = indicator;

  const changeArrow =
    change?.direction === 'up' ? '▲' :
    change?.direction === 'down' ? '▼' : '—';

  const changeClass =
    change?.direction === 'up' ? 'change-up' :
    change?.direction === 'down' ? 'change-down' : '';

  // 环比变动的格式化
  const changeText = change
    ? `${changeArrow} ${Math.abs(change.absolute).toFixed(2)}`
    : '';

  return (
    <div className={`indicator-card signal-border-${signal}`}>
      <div className="card-header">
        <SignalBadge code={code} signal={signal} />
        <span className="category-tag">{category}</span>
      </div>

      <div className="card-body">
        <h3 className="indicator-name">{label}</h3>
        <div className="latest-value">
          {latest ? formatValue(code, latest.value) : '—'}
        </div>
        {change && (
          <div className={`change-indicator ${changeClass}`}>
            {changeText}
          </div>
        )}
      </div>

      <div className="card-chart">
        <SparkLine
          values={values}
          thresholdHigh={threshold_high}
          thresholdLow={threshold_low}
          signal={signal}
        />
      </div>

      <div className="card-footer">
        <span className="date-label">{latest?.date ?? ''}</span>
        <span className="code-label">{code}</span>
      </div>
    </div>
  );
}
