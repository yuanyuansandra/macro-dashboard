import { Bar } from 'react-chartjs-2';

export default function PCEForecast({ forecast }) {
  const {
    path, current_core_pce, current_date,
    six_month_avg, weighted_mae, direction, fed_target,
    model_version,
  } = forecast;

  const labels = path.map(p => p.month);
  const dataPoints = path.map(p => p.value);

  // 颜色编码: >3% 红, >2.5% 橙, ≤2.5% 绿
  const barColors = dataPoints.map(v =>
    v > 3.0 ? '#ef4444' : v > 2.5 ? '#f59e0b' : '#22c55e'
  );

  const data = {
    labels,
    datasets: [
      {
        data: dataPoints,
        backgroundColor: barColors,
        borderRadius: 4,
        barPercentage: 0.7,
      },
      // Fed 目标参考线 (flat line dataset)
      {
        type: 'line',
        data: Array(dataPoints.length).fill(fed_target),
        borderColor: '#3b82f680',
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  const yMin = Math.min(fed_target - 0.3, Math.min(...dataPoints) - 0.2);
  const yMax = Math.max(current_core_pce + 0.2, Math.max(...dataPoints) + 0.2);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            if (ctx.datasetIndex === 1) return `Fed目标: ${fed_target}%`;
            return `核心PCE: ${ctx.parsed.y.toFixed(2)}%`;
          },
        },
        backgroundColor: '#1e293b',
        borderColor: '#334155',
        borderWidth: 1,
        titleFont: { size: 12 },
        bodyFont: { family: "'SF Mono', monospace", size: 12 },
      },
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8', font: { size: 11 } },
        grid: { display: false },
      },
      y: {
        min: yMin,
        max: yMax,
        ticks: {
          color: '#94a3b8',
          font: { size: 11, family: "'SF Mono', monospace" },
          callback: (v) => `${v.toFixed(1)}%`,
        },
        grid: { color: '#334155' },
      },
    },
  };

  const dirMap = { down: '↓ 下行', up: '↑ 上行', flat: '→ 持平' };
  const dirText = dirMap[direction] ?? direction;

  return (
    <section className="pce-forecast">
      <h2 className="pce-title">核心PCE预测路径</h2>

      <div className="pce-meta">
        <div className="pce-stat">
          <span className="stat-label">当前</span>
          <span className="stat-value">{current_core_pce.toFixed(2)}%</span>
          <span className="stat-date">{current_date}</span>
        </div>
        <div className="pce-stat">
          <span className="stat-label">终点</span>
          <span className="stat-value">{dataPoints[dataPoints.length - 1].toFixed(2)}%</span>
          <span className="stat-date">{labels[labels.length - 1]}</span>
        </div>
        <div className="pce-stat">
          <span className="stat-label">6月均值</span>
          <span className="stat-value">{six_month_avg.toFixed(2)}%</span>
        </div>
        <div className="pce-stat">
          <span className="stat-label">方向</span>
          <span className="stat-value">{dirText}</span>
        </div>
        <div className="pce-stat">
          <span className="stat-label">加权MAE</span>
          <span className="stat-value">±{weighted_mae.toFixed(3)}</span>
        </div>
        <div className="pce-stat">
          <span className="stat-label">Fed目标</span>
          <span className="stat-value" style={{ color: '#3b82f6' }}>{fed_target.toFixed(1)}%</span>
        </div>
      </div>

      <div className="pce-chart">
        <Bar data={data} options={options} />
      </div>

      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.5rem', textAlign: 'right' }}>
        模型: Bottom-Up {model_version}
      </div>
    </section>
  );
}
