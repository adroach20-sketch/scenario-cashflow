import { useState } from 'react';
import type { ScenarioConfig, DecisionConfig, ForecastResult } from '../engine';
import type { DecisionForecast } from '../hooks/useForecaster';
import type { Page } from '../components/AppShell';
import type { ScenarioSummary } from '../store/types';
import { ForecastChart } from '../components/ForecastChart';
import { MetricsPanel } from '../components/MetricsPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const FREQ_LABELS: Record<string, string> = {
  weekly: '/wk',
  biweekly: '/2wk',
  semimonthly: '2x/mo',
  monthly: '/mo',
  'one-time': 'once',
};

interface ForecastPageProps {
  baseline: ScenarioConfig;
  decisions: DecisionConfig[];
  enabledDecisionIds: Set<string>;
  baselineResult: ForecastResult | null;
  decisionForecasts: DecisionForecast[];
  scenarioList: ScenarioSummary[];
  onNavigate: (page: Page) => void;
  onSwitchScenario: (scenarioId: string) => void;
}

export function ForecastPage({
  baseline,
  decisions,
  enabledDecisionIds,
  baselineResult,
  decisionForecasts,
  scenarioList,
  onNavigate,
  onSwitchScenario,
}: ForecastPageProps) {
  const [summaryOpen, setSummaryOpen] = useState(false);
  const allDecisionIds = decisions.map((d) => d.id);
  const enabledDecisions = decisions.filter((d) => enabledDecisionIds.has(d.id));

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Forecast</h1>
          <p className="text-sm text-muted-foreground">See how decisions change your financial future</p>
        </div>
        <Button variant="outline" onClick={() => onNavigate('scenarios')}>
          Edit Scenario
        </Button>
      </header>

      {/* Scenario Bar */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 bg-accent border rounded-lg">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-[0.8125rem] font-semibold text-muted-foreground whitespace-nowrap">Viewing:</span>
          <span className="text-sm font-bold text-primary">{baseline.name}</span>
          {enabledDecisions.length > 0 && (
            <span className="text-[0.8125rem] text-muted-foreground italic">
              vs {enabledDecisions.map((d) => d.name).join(', ')}
            </span>
          )}
        </div>
        {scenarioList.length > 1 && (
          <select
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
            value=""
            onChange={(e) => {
              if (e.target.value) onSwitchScenario(e.target.value);
            }}
          >
            <option value="">Switch scenario...</option>
            {scenarioList
              .filter((s) => s.id !== baseline.id)
              .map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
          </select>
        )}
      </div>

      {/* Summary Toggle */}
      <button
        className="flex items-center justify-between w-full px-4 py-3 bg-muted/30 border rounded-lg cursor-pointer text-sm font-semibold text-foreground transition-colors hover:bg-muted/50 border-0"
        onClick={() => setSummaryOpen(!summaryOpen)}
      >
        <span>Scenario Summary</span>
        <span className="text-xs text-muted-foreground">{summaryOpen ? '▾' : '▸'}</span>
      </button>

      {summaryOpen && (
        <Card className="py-4 -mt-4">
          <CardContent className="px-4 py-0 space-y-3">
            <div>
              <h4 className="text-[0.6875rem] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Accounts</h4>
              <div className="flex flex-wrap gap-1.5">
                {(baseline.accounts || []).map((a) => (
                  <Badge key={a.id} variant="outline" className="tabular-nums">
                    {a.name}: ${a.balance.toLocaleString()}
                  </Badge>
                ))}
              </div>
            </div>
            {decisions.length > 0 && (
              <div>
                <h4 className="text-[0.6875rem] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Decisions</h4>
                {decisions.map((d) => (
                  <div key={d.id} className="text-[0.8125rem] text-foreground mb-1">
                    <strong>{d.name || 'Untitled'}</strong>
                    {(d.checkingBalanceAdjustment ?? 0) !== 0 && (
                      <span> &middot; Checking {(d.checkingBalanceAdjustment ?? 0) > 0 ? '+' : ''}${(d.checkingBalanceAdjustment ?? 0).toLocaleString()}</span>
                    )}
                    {(d.savingsBalanceAdjustment ?? 0) !== 0 && (
                      <span> &middot; Savings {(d.savingsBalanceAdjustment ?? 0) > 0 ? '+' : ''}${(d.savingsBalanceAdjustment ?? 0).toLocaleString()}</span>
                    )}
                    {d.addStreams.length > 0 && <span> &middot; {d.addStreams.length} new stream{d.addStreams.length > 1 ? 's' : ''}</span>}
                    {d.removeStreamIds.length > 0 && <span> &middot; {d.removeStreamIds.length} removed</span>}
                  </div>
                ))}
              </div>
            )}
            {(baseline.disabledStreamIds?.length ?? 0) > 0 && (
              <div>
                <h4 className="text-[0.6875rem] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Disabled Streams</h4>
                <div className="flex flex-wrap gap-1.5">
                  {baseline.streams
                    .filter((s) => baseline.disabledStreamIds?.includes(s.id))
                    .map((s) => (
                      <Badge key={s.id} variant="outline" className="line-through text-muted-foreground">
                        {s.name}
                      </Badge>
                    ))}
                </div>
              </div>
            )}
            {Object.keys(baseline.streamOverrides ?? {}).length > 0 && (
              <div>
                <h4 className="text-[0.6875rem] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Overridden Streams</h4>
                <div className="flex flex-wrap gap-1.5">
                  {baseline.streams
                    .filter((s) => (baseline.streamOverrides ?? {})[s.id])
                    .map((s) => {
                      const override = (baseline.streamOverrides ?? {})[s.id];
                      return (
                        <Badge key={s.id} variant="secondary" className="tabular-nums border-primary/30 bg-accent text-primary">
                          {s.name}: ${s.amount.toLocaleString()} &rarr; ${override.amount?.toLocaleString()}{FREQ_LABELS[s.frequency]}
                        </Badge>
                      );
                    })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <section>
        <ForecastChart
          baselineResult={baselineResult}
          decisionForecasts={decisionForecasts}
          safetyBuffer={baseline.safetyBuffer}
          allDecisionIds={allDecisionIds}
        />
      </section>

      <section>
        <MetricsPanel
          baselineMetrics={baselineResult?.metrics ?? null}
          decisionForecasts={decisionForecasts}
          allDecisionIds={allDecisionIds}
        />
      </section>
    </div>
  );
}
