'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import AppShell from '@/components/AppShell';
import { getLocalHistory } from '@/lib/storage';
import {
  filterHistory,
  computeSummary,
  computeTrend,
  computeTopicBreakdown,
  getAvailableTopics,
  toDateInputValue
} from '@/lib/reportUtils';

const PRESETS = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 Days' },
  { key: '90d', label: 'Last 90 Days' }
];

function computePresetRange(key) {
  const today = new Date();
  const toStr = toDateInputValue(today);

  if (key === 'all') return { from: '', to: '' };
  if (key === 'today') return { from: toStr, to: toStr };

  const days = key === '7d' ? 7 : key === '30d' ? 30 : 90;
  const fromDate = new Date(today);
  fromDate.setDate(fromDate.getDate() - (days - 1));
  return { from: toDateInputValue(fromDate), to: toStr };
}

function TrendTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-value">{point.percentage}%</div>
      <div className="tooltip-label">{point.dateLabel}</div>
    </div>
  );
}

function TopicTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-value">{point.avgPercentage}%</div>
      <div className="tooltip-label">
        {point.label} &middot; {point.attempts} attempt{point.attempts === 1 ? '' : 's'}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [history, setHistory] = useState(null);
  const [activePreset, setActivePreset] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [topic, setTopic] = useState('all');

  useEffect(() => {
    setHistory(getLocalHistory());
  }, []);

  function applyPreset(key) {
    setActivePreset(key);
    const range = computePresetRange(key);
    setFrom(range.from);
    setTo(range.to);
  }

  const availableTopics = useMemo(() => getAvailableTopics(history || []), [history]);
  const filtered = useMemo(() => filterHistory(history || [], { from, to, topic }), [history, from, to, topic]);
  const summary = useMemo(() => computeSummary(filtered), [filtered]);
  const trend = useMemo(() => computeTrend(filtered), [filtered]);
  const breakdown = useMemo(() => computeTopicBreakdown(filtered), [filtered]);

  const breakdownData = [
    {
      name: 'Answers',
      correct: summary.totalCorrect,
      wrong: summary.totalWrong,
      unanswered: summary.totalUnanswered
    }
  ];

  const hasAnyHistory = (history || []).length > 0;

  return (
    <AppShell title="Reports">
      <section className="content-card">
        <div className="filter-bar">
          <div className="field-group">
            <label>Date Range</label>
            <div className="preset-group">
              {PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  className={`preset-btn${activePreset === preset.key ? ' active' : ''}`}
                  onClick={() => applyPreset(preset.key)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="date-range-fields">
            <div className="field-group">
              <label>From</label>
              <input
                type="date"
                value={from}
                onChange={(event) => {
                  setFrom(event.target.value);
                  setActivePreset(null);
                }}
              />
            </div>
            <div className="field-group">
              <label>To</label>
              <input
                type="date"
                value={to}
                onChange={(event) => {
                  setTo(event.target.value);
                  setActivePreset(null);
                }}
              />
            </div>
          </div>

          <div className="field-group">
            <label>Topic</label>
            <select value={topic} onChange={(event) => setTopic(event.target.value)}>
              <option value="all">All Topics</option>
              {availableTopics.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {!hasAnyHistory ? (
        <section className="content-card">
          <div className="empty-state">No quiz history yet. Take a quiz to start seeing your reports.</div>
        </section>
      ) : (
        <>
          <section className="dashboard-grid">
            <div className="stat-card">
              <div className="label">Quizzes Taken</div>
              <div className="value">{summary.totalQuizzes}</div>
            </div>
            <div className="stat-card">
              <div className="label">Questions Answered</div>
              <div className="value">{summary.totalQuestions}</div>
            </div>
            <div className="stat-card">
              <div className="label">Overall Accuracy</div>
              <div className="value">{summary.averagePercentage}%</div>
            </div>
            <div className="stat-card">
              <div className="label">Best Score</div>
              <div className="value">{summary.bestPercentage}%</div>
            </div>
          </section>

          <section className="content-card">
            <div className="section-header">
              <h3>Score Trend</h3>
            </div>
            {trend.length === 0 ? (
              <div className="empty-state chart-empty">No results match the selected filters.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="dateLabel"
                    stroke="var(--muted)"
                    tick={{ fill: 'var(--muted)', fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border)' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    unit="%"
                    stroke="var(--muted)"
                    tick={{ fill: 'var(--muted)', fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border)' }}
                    width={44}
                  />
                  <Tooltip content={<TrendTooltip />} cursor={{ stroke: 'var(--border)' }} />
                  <Area
                    type="monotone"
                    dataKey="percentage"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fill="var(--primary)"
                    fillOpacity={0.1}
                    dot={{ r: 4, fill: 'var(--primary)', stroke: 'var(--panel)', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: 'var(--primary)', stroke: 'var(--panel)', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </section>

          <section className="content-card">
            <div className="section-header">
              <h3>Performance by Topic</h3>
            </div>
            {breakdown.length === 0 ? (
              <div className="empty-state chart-empty">No results match the selected filters.</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={breakdown} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="var(--muted)"
                      tick={{ fill: 'var(--muted)', fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: 'var(--border)' }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      unit="%"
                      stroke="var(--muted)"
                      tick={{ fill: 'var(--muted)', fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: 'var(--border)' }}
                      width={44}
                    />
                    <Tooltip content={<TopicTooltip />} cursor={{ fill: 'var(--panel-alt)' }} />
                    <Bar dataKey="avgPercentage" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>

                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Topic</th>
                        <th>Attempts</th>
                        <th>Avg. Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {breakdown.map((item) => (
                        <tr key={item.topic}>
                          <td>{item.label}</td>
                          <td>{item.attempts}</td>
                          <td>{item.avgPercentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          <section className="content-card">
            <div className="section-header">
              <h3>Answer Breakdown</h3>
            </div>
            {summary.totalQuizzes === 0 ? (
              <div className="empty-state chart-empty">No results match the selected filters.</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={90}>
                  <BarChart data={breakdownData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                    <XAxis type="number" hide domain={[0, summary.totalQuestions || 1]} />
                    <YAxis type="category" dataKey="name" hide />
                    <Tooltip
                      cursor={{ fill: 'var(--panel-alt)' }}
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        return (
                          <div className="chart-tooltip">
                            {payload.map((entry) => (
                              <div key={entry.dataKey}>
                                <span className="tooltip-value">{entry.value}</span>{' '}
                                <span className="tooltip-label">{entry.name}</span>
                              </div>
                            ))}
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="correct" name="Correct" stackId="answers" fill="var(--success)" stroke="var(--panel)" strokeWidth={2} barSize={28} />
                    <Bar dataKey="wrong" name="Wrong" stackId="answers" fill="var(--danger)" stroke="var(--panel)" strokeWidth={2} barSize={28} />
                    <Bar dataKey="unanswered" name="Unanswered" stackId="answers" fill="var(--border)" stroke="var(--panel)" strokeWidth={2} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>

                <div className="chart-legend">
                  <span className="legend-item">
                    <span className="legend-swatch" style={{ background: 'var(--success)' }} />
                    Correct: <strong>{summary.totalCorrect}</strong>
                  </span>
                  <span className="legend-item">
                    <span className="legend-swatch" style={{ background: 'var(--danger)' }} />
                    Wrong: <strong>{summary.totalWrong}</strong>
                  </span>
                  <span className="legend-item">
                    <span className="legend-swatch" style={{ background: 'var(--border)' }} />
                    Unanswered: <strong>{summary.totalUnanswered}</strong>
                  </span>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}
