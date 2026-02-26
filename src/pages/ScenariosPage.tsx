import { useState, useEffect } from 'react';
import type { ScenarioConfig, DecisionConfig } from '../engine';
import type { Page } from '../components/AppShell';
import type { ScenarioSummary } from '../store/types';
import { apiStore } from '../store/apiClient';
import { StreamToggleList } from '../components/StreamToggleList';
import { DecisionList } from '../components/DecisionList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ScenariosPageProps {
  baseline: ScenarioConfig;
  decisions: DecisionConfig[];
  enabledDecisionIds: Set<string>;
  scenarioList: ScenarioSummary[];
  isDemo: boolean;
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
  const [showImportModal, setShowImportModal] = useState(false);
  const allDecisionIds = decisions.map((d) => d.id);
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

      {/* Scenario Tabs */}
      <ScenarioTabs
        scenarios={scenarioList}
        activeId={baseline.id}
        activeName={baseline.name}
        onSwitch={onSwitchScenario}
        onCreate={onNewScenario}
        onDelete={onDeleteScenario}
        onRename={onScenarioNameChange}
      />

      {/* Decisions */}
      <section>
        <h2 className="text-lg font-semibold mb-1">What are you considering?</h2>
        <p className="text-sm text-muted-foreground mb-5">Define the new streams that come with this decision</p>
        <DecisionList
          key={baseline.id}
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
      </section>

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Adjust Existing Streams */}
      <section>
        <h2 className="text-lg font-semibold mb-1">Adjust Existing Streams</h2>
        <p className="text-sm text-muted-foreground mb-5">Toggle streams on/off or click an amount to override it</p>
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
      </section>

      {/* View Forecast */}
      <div className="flex justify-end pt-5 border-t">
        <Button size="lg" onClick={() => onNavigate('forecast')}>
          View Forecast &rarr;
        </Button>
      </div>
    </div>
  );
}

/* ---------- Scenario Tabs ---------- */

interface ScenarioTabsProps {
  scenarios: ScenarioSummary[];
  activeId: string;
  activeName: string;
  onSwitch: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onRename: (name: string) => void;
}

function ScenarioTabs({ scenarios, activeId, activeName, onSwitch, onCreate, onDelete, onRename }: ScenarioTabsProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [draft, setDraft] = useState(activeName);

  function handleSaveRename() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== activeName) onRename(trimmed);
    setIsRenaming(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSaveRename();
    if (e.key === 'Escape') { setDraft(activeName); setIsRenaming(false); }
  }

  return (
    <div>
      <div className="flex items-center gap-1 border-b">
        {scenarios.map((s) => {
          const isActive = s.id === activeId;
          const displayName = isActive ? activeName : s.name;

          if (isActive && isRenaming) {
            return (
              <div key={s.id} className="px-1 py-1.5">
                <Input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleSaveRename}
                  autoFocus
                  className="h-8 w-48 text-sm font-semibold"
                />
              </div>
            );
          }

          return (
            <button
              key={s.id}
              className={cn(
                "px-4 py-2.5 text-sm transition-colors border-0 cursor-pointer rounded-t-md whitespace-nowrap",
                isActive
                  ? "bg-card font-semibold text-foreground shadow-[inset_0_-2px_0] shadow-primary"
                  : "bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
              onClick={() => { if (!isActive) onSwitch(s.id); }}
              onDoubleClick={() => {
                if (isActive) {
                  setDraft(activeName);
                  setIsRenaming(true);
                }
              }}
              title={isActive ? 'Double-click to rename' : `Switch to ${displayName}`}
            >
              {displayName}
            </button>
          );
        })}
        <button
          className="px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-0 cursor-pointer rounded-t-md"
          onClick={onCreate}
          title="Create new scenario"
        >
          +
        </button>
      </div>
      {scenarios.length > 1 && (
        <div className="flex justify-end pt-2">
          <button
            className="text-xs text-destructive hover:text-destructive/80 bg-transparent border-0 cursor-pointer underline"
            onClick={() => {
              if (confirm(`Delete "${activeName}"? This cannot be undone.`)) {
                onDelete(activeId);
              }
            }}
          >
            Delete scenario
          </button>
        </div>
      )}
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
    apiStore.getDecisionsForScenario(selectedScenarioId)
      .then((decs) => {
        setAvailableDecisions(decs);
        setLoading(false);
      })
      .catch(() => {
        setAvailableDecisions([]);
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
