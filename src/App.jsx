import { getIndicators, getUpdatedAt, getPCEForecast } from './data/indicators';
import PCEForecast from './components/PCEForecast';
import IndicatorCard from './components/IndicatorCard';

// 分类显示顺序 (匹配 Python 系统的逻辑分组)
const CATEGORY_ORDER = [
  '通胀预期',
  '服务-劳动市场',
  '服务-消费者情绪',
  '商品',
  '信贷',
  '能源',
  '住房',
];

export default function App() {
  const indicators = getIndicators();
  const updatedAt = getUpdatedAt();
  const forecast = getPCEForecast();

  // 按 category 分组
  const byCategory = {};
  for (const ind of indicators) {
    (byCategory[ind.category] ??= []).push(ind);
  }

  // 信号统计
  const redCount = indicators.filter(i => i.signal === 'red').length;
  const amberCount = indicators.filter(i => i.signal === 'amber').length;

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <h1>PCE 通胀监控面板</h1>
        <div className="header-meta">
          <span className="update-time">
            更新: {new Date(updatedAt).toLocaleString('zh-CN', {
              year: 'numeric', month: '2-digit', day: '2-digit',
              hour: '2-digit', minute: '2-digit',
            })}
          </span>
          <span className="signal-summary">
            {redCount > 0 && (
              <span className="badge badge-red">{redCount} 红色警报</span>
            )}
            {amberCount > 0 && (
              <span className="badge badge-amber">{amberCount} 橙色关注</span>
            )}
            {redCount === 0 && amberCount === 0 && (
              <span className="badge badge-green">全部正常</span>
            )}
          </span>
        </div>
      </header>

      {/* ── PCE 预测路径 ── */}
      <PCEForecast forecast={forecast} />

      {/* ── 指标卡片 Grid ── */}
      <main className="indicator-grid">
        {CATEGORY_ORDER.map(cat =>
          byCategory[cat]?.map(ind => (
            <IndicatorCard key={ind.code} indicator={ind} />
          ))
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="footer">
        Bottom-Up PCE {forecast.model_version} &middot; 加权MAE: ±{forecast.weighted_mae}
      </footer>
    </div>
  );
}
