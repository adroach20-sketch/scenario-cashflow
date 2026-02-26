import { useState, useEffect } from 'react';
import type { ScenarioConfig, DecisionConfig } from '../engine';
import type { Page } from '../components/AppShell';
import type { ScenarioSummary } from '../store/types';
import { apiStore } from '../store/apiClient';
import { SetupPanel } from '../components/SetupPanel';
import { StreamToggleList } from '../components/StreamToggleList';
import { DecisionList } from '../components/DecisionList';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type Step = 'decision' | 'accounts' | 'streams';

const STEPS: { key: Step; label: string; number: number }[] = [
  { key: 'decision', label: 'Decision', number: 1 },
  { key: 'accounts', label: 'Accounts & Settings', number: 2 },
  { key: 'streams', label: 'Adjust Streams', number: 3 },
];

interface ScenariosPageProps {
  baseline: ScenarioConfig;
  decisions: DecisionConfig[];
  enabledDecisionIds: Set<string>;
  scenarioList: ScenarioSummary[];
  isDemo: boolean;
  onSetupChange: (field: string, value: number | string) => void;
  onToggleStream: (streamId: string) => void;
  onOverrideStream: (streamId: string, amount: number | null) => void;
  onAddDecision: () => void;
  onUpdateDecision: (updated: DecisionConfig) => void;
  onDeleteDecision: (id: string) => void;
  onToggleDecision: (id: string) => void;
  onStartFresh: () => void;
  onNavigate: (page: Page) => void;
  onSwitchScenario: (scenarioId: string) => void;
  onNewScenario: () => void;
  onDeleteScenario: (scenarioId: string) => void;
  onImportDecisionAsStream: (scenarioId: string, decisionId: string) => void;
  onScenarioNameChange: (name: string) => void;
}

export function ScenariosPage({
  baseline,
  decisions,
  enabledDecisionIds,
  scenarioList,
  isDemo,
  onSetupChange,
  onToggleStream,
  onOverrideStream,
  onAddDecision,
  onUpdateDecision,
  onDeleteDecision,
  onToggleDecision,
  onStartFresh,
  onNavigate,
  onSwitchScenario,
  onNewScenario,
  onDeleteScenario,
  onImportDecisionAsStream,
  onScenarioNameChange,
}: ScenariosPageProps) {
  const [step, setStep] = useState<Step>('decision');
  const [showImportModal, setShowImportModal] = useState(false);
  const allDecisionIds = decisions.map((d) => d.id);

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  function goNext() {
    if (stepIndex < STEPS.length - 1) {
      setStep(STEPS[stepIndex + 1].key);
    }
  }

  function goBack() {
    if (stepIndex > 0) {
      setStep(STEPS[stepIndex - 1].key);
    }
  }

  const otherScenarios = scenarioList.filter((s) => s.id !== baseline.id);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scenarios</h1>
          <p className="text-sm text-muted-foreground">Build and configure what-if scenarios</p>
        </div>
        <div className="flex gap-2">
          {isDemo ? (
            <Button onClick={onStartFresh}>Use My Numbers</Button>
          ) : (
            <Button variant="outline" onClick={onStartFresh}>Start Over</Button>
          )}
        </div>
      </header>

      {isDemo && (
        <div className="bg-accent border-l-4 border-l-primary rounded-lg px-4 py-3 text-sm text-primary">
          This is demo data. Click "Use My Numbers" to enter your own scenario.
        </div>
      )}

      {/* Scenario Picker */}
      <Card className="py-0 overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3">
          <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-primary whitespace-nowrap">EDITING:</span>
          <Input
            type="text"
            value={baseline.name}
            onChange={(e) => onScenarioNameChange(e.target.value)}
            className="border-transparent bg-transparent hover:border-input focus:border-input font-semibold h-8"
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 border-t bg-muted/30">
          {otherScenarios.length > 0 && (
            <select
              className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  const targetName = otherScenarios.find((s) => s.id === e.target.value)?.name ?? 'scenario';
                  if (confirm(`Switch to "${targetName}"? Your current scenario is saved automatically.`)) {
                    onSwitchScenario(e.target.value);
                  }
                  e.target.value = '';
                }
              }}
            >
              <option value="">Switch to another scenario...</option>
              {otherScenarios.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          <Button
            size="sm"
            onClick={() => {
              if (confirm('Create a new scenario? Your current scenario is saved automatically.')) {
                onNewScenario();
              }
            }}
          >
            + New Scenario
          </Button>
          {scenarioList.length > 1 && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (confirm(`Delete "${baseline.name}"? This cannot be undone.`)) {
                  onDeleteScenario(baseline.id);
                }
              }}
            >
              Delete
            </Button>
          )}
        </div>
      </Card>

      {/* Wizard Steps */}
      <div className="flex border rounded-lg overflow-hidden bg-muted/30">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm transition-colors border-0 cursor-pointer",
              i < STEPS.length - 1 && "border-r",
              s.key === step
                ? "bg-card font-semibold text-foreground shadow-[inset_0_-2px_0] shadow-primary"
                : "bg-transparent text-muted-foreground hover:bg-muted/50",
              i < stepIndex && "text-income"
            )}
            onClick={() => setStep(s.key)}
          >
            <span className={cn(
              "flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold flex-shrink-0",
              s.key === step
                ? "bg-primary text-primary-foreground"
                : i < stepIndex
                  ? "bg-income/10 text-income"
                  : "bg-muted text-muted-foreground"
            )}>
              {i < stepIndex ? '\u2713' : s.number}
            </span>
            <span className="whitespace-nowrap">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Wizard Content */}
      <div className="min-h-[400px]">
        {step === 'decision' && (
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold mb-1">What are you considering?</h2>
            <p className="text-sm text-muted-foreground mb-5">Define the new streams that come with this decision</p>
            <div className="flex-1 mb-6">
              <DecisionList
                decisions={decisions}
                enabledDecisionIds={enabledDecisionIds}
                allDecisionIds={allDecisionIds}
                onAdd={onAddDecision}
                onUpdate={onUpdateDecision}
                onDelete={onDeleteDecision}
                onToggle={onToggleDecision}
              />

              {otherScenarios.length > 0 && (
                <div className="flex items-center gap-3 mt-5 pt-5 border-t">
                  <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)}>
                    Import from previous scenario
                  </Button>
                  <span className="text-xs text-muted-foreground">Add a previous decision's net monthly impact as a stream</span>
                </div>
              )}

              <ImportModal
                open={showImportModal}
                scenarios={otherScenarios}
                onImport={(scenarioId, decisionId) => {
                  onImportDecisionAsStream(scenarioId, decisionId);
                  setShowImportModal(false);
                }}
                onClose={() => setShowImportModal(false)}
              />
            </div>
            <div className="flex justify-between items-center pt-5 border-t">
              <div />
              <Button onClick={goNext}>
                Next: Review Accounts &rarr;
              </Button>
            </div>
          </div>
        )}

        {step === 'accounts' && (
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold mb-1">Your Accounts & Settings</h2>
            <p className="text-sm text-muted-foreground mb-5">Confirm your starting balances and forecast settings</p>
            <div className="flex-1 mb-6">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 mb-4">
                {(baseline.accounts || []).map((account) => {
                  const isDebt = account.accountType === 'credit-card' || account.accountType === 'loan';
                  return (
                    <Card key={account.id} className="py-4">
                      <CardContent className="px-4 py-0">
                        <div className="font-semibold text-sm mb-0.5">{account.name}</div>
                        <div className="text-[0.6875rem] uppercase tracking-wider text-muted-foreground mb-2">{account.accountType}</div>
                        <div className={cn("text-xl font-bold tabular-nums", isDebt ? "text-expense" : "text-income")}>
                          ${Math.abs(account.balance).toLocaleString()}
                        </div>
                        {account.accountType === 'credit-card' && account.creditLimit && (
                          <div className="text-xs text-muted-foreground mt-1">Limit: ${account.creditLimit.toLocaleString()}</div>
                        )}
                        {isDebt && account.interestRate && (
                          <div className="text-xs text-muted-foreground mt-0.5">{account.interestRate}% APR</div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {(baseline.accounts || []).length === 0 && (
                <p className="text-sm text-muted-foreground py-6">No accounts set up yet.</p>
              )}
              <Button
                variant="link"
                className="p-0 h-auto text-sm"
                onClick={() => onNavigate('worksheet')}
              >
                Edit accounts on the Cash Flow page &rarr;
              </Button>

              <div className="h-px bg-border my-5" />

              <SetupPanel
                safetyBuffer={baseline.safetyBuffer}
                startDate={baseline.startDate}
                endDate={baseline.endDate}
                onChange={onSetupChange}
              />
            </div>
            <div className="flex justify-between items-center pt-5 border-t">
              <Button variant="outline" onClick={goBack}>&larr; Back</Button>
              <Button onClick={goNext}>
                Next: Adjust Streams &rarr;
              </Button>
            </div>
          </div>
        )}

        {step === 'streams' && (
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold mb-1">Adjust Streams</h2>
            <p className="text-sm text-muted-foreground mb-5">Toggle streams on/off or click an amount to override it for this forecast</p>
            <div className="flex-1 mb-6">
              {baseline.streams.length > 0 ? (
                <StreamToggleList
                  streams={baseline.streams}
                  disabledStreamIds={baseline.disabledStreamIds ?? []}
                  streamOverrides={baseline.streamOverrides ?? {}}
                  onToggle={onToggleStream}
                  onOverride={onOverrideStream}
                />
              ) : (
                <div className="text-sm text-muted-foreground py-6">
                  <p className="mb-2">No income or expense streams yet.</p>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-sm"
                    onClick={() => onNavigate('worksheet')}
                  >
                    Add streams on the Cash Flow page &rarr;
                  </Button>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center pt-5 border-t">
              <Button variant="outline" onClick={goBack}>&larr; Back</Button>
              <Button size="lg" onClick={() => onNavigate('forecast')}>
                View Forecast &rarr;
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Import Modal ---------- */

interface ImportModalProps {
  open: boolean;
  scenarios: ScenarioSummary[];
  onImport: (scenarioId: string, decisionId: string) => void;
  onClose: () => void;
}

function ImportModal({ open, scenarios, onImport, onClose }: ImportModalProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState('');
  const [availableDecisions, setAvailableDecisions] = useState<DecisionConfig[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedScenarioId) {
      setAvailableDecisions([]);
      return;
    }
    setLoading(true);
    apiStore.getDecisionsForScenario(selectedScenarioId).then((decs) => {
      setAvailableDecisions(decs);
      setLoading(false);
    });
  }, [selectedScenarioId]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import from Previous Scenario</DialogTitle>
          <DialogDescription>
            Select a scenario and decision. Its net monthly impact will be added as a new stream in your current scenario.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <Label>Scenario</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={selectedScenarioId}
              onChange={(e) => setSelectedScenarioId(e.target.value)}
            >
              <option value="">Select a scenario...</option>
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {loading && <p className="text-sm text-muted-foreground">Loading decisions...</p>}

          {selectedScenarioId && !loading && availableDecisions.length === 0 && (
            <p className="text-sm text-muted-foreground">No decisions in this scenario</p>
          )}

          {availableDecisions.length > 0 && (
            <div className="flex flex-col gap-2 mt-3">
              {availableDecisions.map((d) => (
                <button
                  key={d.id}
                  className="flex items-center gap-3 px-4 py-3 bg-muted/50 border rounded-lg cursor-pointer text-left transition-colors hover:bg-accent hover:border-primary/30 w-full"
                  onClick={() => onImport(selectedScenarioId, d.id)}
                >
                  <span className="text-sm font-semibold flex-1">{d.name || 'Untitled'}</span>
                  <span className="text-xs text-muted-foreground">
                    {d.addStreams.length > 0 && `${d.addStreams.length} stream${d.addStreams.length > 1 ? 's' : ''}`}
                    {d.addStreams.length > 0 && d.removeStreamIds.length > 0 && ' \u00B7 '}
                    {d.removeStreamIds.length > 0 && `${d.removeStreamIds.length} removed`}
                  </span>
                  <span className="text-primary text-sm">&rarr;</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
