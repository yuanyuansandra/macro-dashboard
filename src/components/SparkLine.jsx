import { Line } from 'react-chartjs-2';

const SIGNAL_COLORS = {
  red: '#ef4444',
  amber: '#f59e0b',
  green: '#22c55e',
};

export default function SparkLine({ values, thresholdHigh, thresholdLow, signal }) {
  const labels = values.map(v => v.date);
  const dataPoints = values.map(v => v.value);
  const color = SIGNAL_COLORS[signal] ?? SIGNAL_COLORS.green;

  const datasets = [
    {
      data: dataPoints,
      borderColor: color,
      backgroundColor: color + '18',
      fill: true,
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 3,
      borderWidth: 2,
    },
  ];

  // 阈值参考线 (红色虚线)
  if (thresholdHigh != null) {
    datasets.push({
      data: Array(dataPoints.length).fill(thresholdHigh),
      borderColor: '#ef444460',
      borderWidth: 1,
      borderDash: [4, 4],
      pointRadius: 0,
      fill: false,
    });
  }

  // 橙色阈值线
  if (thresholdLow != null) {
    datasets.push({
      data: Array(dataPoints.length).fill(thresholdLow),
      borderColor: '#f59e0b40',
      borderWidth: 1,
      borderDash: [3, 3],
      pointRadius: 0,
      fill: false,
    });
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: { enabled: false },
      legend: { display: false },
    },
    scales: {
      x: { display: false },
      y: { display: false },
    },
    interaction: {
      mode: 'nearest',
      intersect: false,
    },
    elements: {
      line: { capBezierPoints: true },
    },
  };

  return (
    <div className="sparkline-container">
      <Line data={{ labels, datasets }} options={options} />
    </div>
  );
}
