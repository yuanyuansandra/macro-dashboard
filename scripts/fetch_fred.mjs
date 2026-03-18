/**
 * FRED 数据拉取脚本 — Node.js
 *
 * 运行: FRED_API_KEY=xxx node scripts/fetch_fred.mjs
 * 或:   配置 .env 后运行 npm run fetch
 *
 * 输出: src/data/indicators_data.json (13 个月 monthly 数据 + 信号阈值)
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '..', 'src', 'data', 'indicators_data.json');

// ── 加载 .env (简易实现, 不依赖 dotenv 包) ──
function loadEnv() {
  const envPaths = [
    join(__dirname, '..', '.env'),
    join(__dirname, '..', '..', '.env'),  // 父项目 .env
  ];
  for (const p of envPaths) {
    if (existsSync(p)) {
      const lines = readFileSync(p, 'utf-8').split('\n');
      for (const line of lines) {
        const match = line.match(/^\s*([^#=]+?)\s*=\s*(.+?)\s*$/);
        if (match && !process.env[match[1]]) {
          process.env[match[1]] = match[2];
        }
      }
    }
  }
}

loadEnv();

const API_KEY = process.env.FRED_API_KEY;
if (!API_KEY) {
  console.error('ERROR: FRED_API_KEY not found');
  console.error('  Set via environment variable or .env file');
  process.exit(1);
}

const BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';

// ══════════════════════════════════════
//  指标配置 (镜像 Python update_indicators.py)
// ══════════════════════════════════════
const INDICATORS = {
  UMCSENT: {
    label: '密歇根消费者信心', transform: 'level',
    frequency: 'monthly', category: '服务-消费者情绪',
    threshold_high: null, threshold_low: 60,
  },
  U6RATE: {
    label: 'U6失业率', transform: 'level',
    frequency: 'monthly', category: '服务-劳动市场',
    threshold_high: null, threshold_low: 6.5,  // below = tight = inflationary
  },
  AHETPI: {
    label: '工资增长 YoY', transform: 'yoy',
    frequency: 'monthly', category: '服务-劳动市场',
    threshold_high: 4.5, threshold_low: 4.0,
  },
  PPIACO: {
    label: 'PPI全商品 YoY', transform: 'yoy',
    frequency: 'monthly', category: '商品',
    threshold_high: null, threshold_low: null,
  },
  IR: {
    label: '进口价格 YoY', transform: 'yoy',
    frequency: 'monthly', category: '商品',
    threshold_high: null, threshold_low: null,
  },
  T5YIFR: {
    label: '5y5y Breakeven', transform: 'level',
    frequency: 'daily', category: '通胀预期',
    threshold_high: 2.5, threshold_low: 2.3,
  },
  DFII10: {
    label: 'TIPS实际利率', transform: 'level',
    frequency: 'daily', category: '通胀预期',
    threshold_high: null, threshold_low: null,
  },
  BAMLH0A0HYM2: {
    label: 'HY利差', transform: 'level',
    frequency: 'daily', category: '信贷',
    threshold_high: 5.0, threshold_low: 4.0,  // FRED 单位=百分点, 5.0=500bps
  },
  DHHNGSP: {
    label: 'Henry Hub天然气', transform: 'level',
    frequency: 'daily', category: '能源',
    threshold_high: 3.5, threshold_low: 3.0,
  },
  WPSID62: {
    label: 'PPI中间品 YoY', transform: 'yoy',
    frequency: 'monthly', category: '商品',
    threshold_high: null, threshold_low: null,
  },
  CUUR0000SEHA: {
    label: 'CPI OER YoY', transform: 'yoy',
    frequency: 'monthly', category: '住房',
    threshold_high: null, threshold_low: null,
  },
};

// ══════════════════════════════════════
//  FRED API 拉取
// ══════════════════════════════════════
async function fetchSeries(seriesId, limit = 36) {
  const url = `${BASE_URL}?series_id=${seriesId}&limit=${limit}&sort_order=desc&api_key=${API_KEY}&file_type=json`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: ${await resp.text().catch(() => '')}`);
  }
  const json = await resp.json();
  return json.observations
    .filter(o => o.value !== '.')
    .map(o => ({ date: o.date, value: parseFloat(o.value) }))
    .reverse();  // 时间正序
}

// ══════════════════════════════════════
//  按月重采样 (daily → monthly, 取月末值)
// ══════════════════════════════════════
function resampleMonthly(observations) {
  const byMonth = new Map();
  for (const obs of observations) {
    const month = obs.date.slice(0, 7);  // "2025-02"
    byMonth.set(month, obs);  // 后来的覆盖前面 → 取月内最后观测
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, obs]) => ({ date: month, value: obs.value }));
}

// ══════════════════════════════════════
//  YoY 计算
// ══════════════════════════════════════
function computeYoY(monthlyObs) {
  const result = [];
  for (let i = 12; i < monthlyObs.length; i++) {
    const current = monthlyObs[i].value;
    const yearAgo = monthlyObs[i - 12].value;
    if (yearAgo !== 0 && !isNaN(current) && !isNaN(yearAgo)) {
      result.push({
        date: monthlyObs[i].date,
        value: ((current / yearAgo) - 1) * 100,
      });
    }
  }
  return result;
}

// ══════════════════════════════════════
//  主流程
// ══════════════════════════════════════
async function main() {
  console.log('='.repeat(50));
  console.log('  FRED Data Fetch for Dashboard');
  console.log('='.repeat(50));

  const output = {
    updated_at: new Date().toISOString(),
    indicators: {},
  };

  for (const [code, meta] of Object.entries(INDICATORS)) {
    try {
      // YoY 需要 25+ 个月原始数据 (13月YoY + 12月lookback)
      // daily 序列每月~22个交易日, 13月≈286天, 取400确保足够
      let limit;
      if (meta.transform === 'yoy' && meta.frequency === 'daily') {
        limit = 800;  // 25个月 daily
      } else if (meta.transform === 'yoy') {
        limit = 36;   // 25+ 个月 monthly
      } else if (meta.frequency === 'daily') {
        limit = 400;  // 13 个月 daily
      } else {
        limit = 25;   // 13+ 个月 monthly
      }
      const raw = await fetchSeries(code, limit);

      let monthly;
      if (meta.frequency === 'daily') {
        monthly = resampleMonthly(raw);
      } else {
        // 月频数据, 直接用 (date 已是 YYYY-MM-DD, 截取为 YYYY-MM)
        monthly = raw.map(o => ({ date: o.date.slice(0, 7), value: o.value }));
      }

      let values;
      if (meta.transform === 'yoy') {
        values = computeYoY(monthly);
      } else {
        values = monthly;
      }

      // 取最近 13 个月
      values = values.slice(-13);

      output.indicators[code] = {
        label: meta.label,
        transform: meta.transform,
        frequency: meta.frequency,
        category: meta.category,
        values,
        threshold_high: meta.threshold_high,
        threshold_low: meta.threshold_low,
      };

      const latest = values[values.length - 1];
      console.log(`  OK ${meta.label.padEnd(18)} (${code.padEnd(16)}): ${values.length} pts  latest=${latest.value.toFixed(2)} @ ${latest.date}`);
    } catch (err) {
      console.error(`  FAIL ${meta.label.padEnd(18)} (${code.padEnd(16)}): ${err.message}`);
    }
  }

  // 写入 JSON
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`\n  Output: ${OUTPUT_PATH}`);
  console.log(`  Indicators: ${Object.keys(output.indicators).length}/${Object.keys(INDICATORS).length}`);
  console.log('  Done.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
