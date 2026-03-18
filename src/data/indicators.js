/**
 * 指标数据层 — 信号判断 + 格式化
 * 信号逻辑精确镜像 Python scripts/update_indicators.py L180-249
 */

import rawData from './indicators_data.json';
import pceForecast from './pce_forecast.json';

// ══════════════════════════════════════
//  信号判断 (镜像 Python evaluate_signal)
// ══════════════════════════════════════
export function evaluateSignal(code, values) {
  if (!values || values.length === 0) return 'green';

  const latest = values[values.length - 1].value;
  const last3 = values.slice(-3).map(v => v.value);

  switch (code) {
    case 'UMCSENT': {
      // 3月连续下滑 > 10pts → red, > 5pts → amber
      if (last3.length >= 3) {
        const decline = last3[0] - last3[last3.length - 1];  // 正值=下滑
        if (decline > 10) return 'red';
        if (decline > 5) return 'amber';
      }
      return 'green';
    }

    case 'U6RATE':
      // 低失业=劳动力紧张=通胀上行压力
      if (latest < 6.5) return 'red';
      if (latest < 7.5) return 'amber';
      return 'green';

    case 'AHETPI':
      if (latest > 4.5) return 'red';
      if (latest > 4.0) return 'amber';
      return 'green';

    case 'PPIACO': {
      // 连续3月加速上行
      if (last3.length >= 3) {
        const accelerating = last3.every((v, i) => i === 0 || v > last3[i - 1]);
        if (accelerating) return 'red';
      }
      return 'green';
    }

    case 'T5YIFR':
      if (latest > 2.5) return 'red';
      if (latest > 2.3) return 'amber';
      return 'green';

    case 'BAMLH0A0HYM2': {
      // FRED 返回百分点 (3.27 = 327bps), 阈值也用百分点
      const bps = latest * 100;
      if (bps > 500) return 'red';
      if (bps > 400) return 'amber';
      return 'green';
    }

    case 'DHHNGSP':
      if (latest > 3.5) return 'red';
      if (latest > 3.0) return 'amber';
      return 'green';

    // IR, DFII10, WPSID62, CUUR0000SEHA: 无显式阈值
    default:
      return 'green';
  }
}

// ══════════════════════════════════════
//  信号标签 (中文描述)
// ══════════════════════════════════════
const SIGNAL_LABELS = {
  UMCSENT: {
    red: '连续下滑>10pts', amber: '持续下滑', green: '正常',
  },
  U6RATE: {
    red: '极度偏紧', amber: '偏紧', green: '宽松',
  },
  AHETPI: {
    red: '超阈值', amber: '临近阈值', green: '正常',
  },
  PPIACO: {
    red: '连续加速上行', amber: '—', green: '正常',
  },
  T5YIFR: {
    red: '锚松动', amber: '临近阈值', green: '锚定良好',
  },
  BAMLH0A0HYM2: {
    red: '超500bps', amber: '偏高', green: '安全区间',
  },
  DHHNGSP: {
    red: '超阈值', amber: '临近', green: '正常',
  },
};

export function getSignalLabel(code, signal) {
  return SIGNAL_LABELS[code]?.[signal] ?? '监控中';
}

// ══════════════════════════════════════
//  值格式化 (镜像 Python format_status_text)
// ══════════════════════════════════════
export function formatValue(code, value) {
  if (value == null || isNaN(value)) return '—';

  switch (code) {
    case 'UMCSENT':
      return value.toFixed(1);
    case 'U6RATE':
      return `${value.toFixed(1)}%`;
    case 'DHHNGSP':
      return `$${value.toFixed(2)}`;
    case 'BAMLH0A0HYM2':
      return `${(value * 100).toFixed(0)} bps`;
    case 'AHETPI':
    case 'PPIACO':
    case 'IR':
    case 'WPSID62':
    case 'CUUR0000SEHA':
      return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    default:
      // T5YIFR, DFII10
      return `${value.toFixed(2)}%`;
  }
}

// ══════════════════════════════════════
//  环比变动
// ══════════════════════════════════════
function computeChange(values) {
  if (!values || values.length < 2) return null;
  const current = values[values.length - 1].value;
  const previous = values[values.length - 2].value;
  const diff = current - previous;
  return {
    absolute: diff,
    direction: diff > 0.001 ? 'up' : diff < -0.001 ? 'down' : 'flat',
  };
}

// ══════════════════════════════════════
//  公开 API
// ══════════════════════════════════════
export function getIndicators() {
  return Object.entries(rawData.indicators).map(([code, data]) => ({
    code,
    ...data,
    signal: evaluateSignal(code, data.values),
    latest: data.values[data.values.length - 1],
    change: computeChange(data.values),
  }));
}

export function getUpdatedAt() {
  return rawData.updated_at;
}

export function getPCEForecast() {
  return pceForecast;
}
