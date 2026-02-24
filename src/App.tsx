/**
 * Main application component.
 *
 * Manages scenario and decision state, saves to the API server,
 * and routes between pages. Business logic lives here;
 * pages handle layout and rendering.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ScenarioConfig, DecisionConfig, CashStream } from './engine';
import { useForecaster } from './hooks/useForecaster';
import { apiStore } from './store/apiClient';
import { createDemoBaseline, createDemoDecision } from './data/demo';
import { AppShell, type Page } from './components/AppShell';
import { ForecastPage } from './pages/ForecastPage';
import { WorksheetPage } from './pages/WorksheetPage';
import './App.css';

function App() {
  const [baseline, setBaseline] = useState<ScenarioConfig | null>(null);
  const [decisions, setDecisions] = useState<DecisionConfig[]>([]);
  const [enabledDecisionIds, setEnabledDecisionIds] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);
  const [activePage, setActivePage] = useState<Page>('forecast');

  // Run the forecast engine whenever baseline or decisions change
  const { baselineResult, decisionForecasts } = useForecaster(
    baseline,
    decisions,
    enabledDecisionIds
  );

  // Track whether a save is already in flight to avoid overlapping requests
  const saveInFlight = useRef(false);

  // Load from server on mount (or create demo data)
  useEffect(() => {
    async function load() {
      const savedBaseline = await apiStore.getBaseline();
      const savedDecisions = await apiStore.getDecisions();

      if (savedBaseline) {
        setBaseline(savedBaseline);
        setDecisions(savedDecisions);
        setEnabledDecisionIds(new Set(savedDecisions.map((d) => d.id)));
      } else {
        // First visit: load demo data
        const demo = createDemoBaseline();
        const demoDecision = createDemoDecision(demo.id);
        setBaseline(demo);
        setDecisions([demoDecision]);
        setEnabledDecisionIds(new Set([demoDecision.id]));
      }
      setIsLoaded(true);
    }
    load();
  }, []);

  // Auto-save with debounce (500ms)
  useEffect(() => {
    if (!isLoaded) return;

    const timer = setTimeout(async () => {
      if (saveInFlight.current) return;
      saveInFlight.current = true;
      try {
        if (baseline) {
          await apiStore.saveBaseline(baseline);
        }
        for (const decision of decisions) {
          await apiStore.saveDecision(decision);
        }
      } catch (err) {
        console.error('Auto-save failed:', err);
      } finally {
        saveInFlight.current = false;
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [baseline, decisions, isLoaded]);

  // Setup panel change handler
  const handleSetupChange = useCallback(
    (field: string, value: number | string) => {
      setBaseline((prev) => (prev ? { ...prev, [field]: value } : prev));
    },
    []
  );

  // Stream handlers for baseline
  const handleAddStream = useCallback((stream: CashStream) => {
    setBaseline((prev) =>
      prev ? { ...prev, streams: [...prev.streams, stream] } : prev
    );
  }, []);

  const handleUpdateStream = useCallback((updated: CashStream) => {
    setBaseline((prev) =>
      prev
        ? {
            ...prev,
            streams: prev.streams.map((s) => (s.id === updated.id ? updated : s)),
          }
        : prev
    );
  }, []);

  const handleDeleteStream = useCallback((streamId: string) => {
    setBaseline((prev) =>
      prev
        ? { ...prev, streams: prev.streams.filter((s) => s.id !== streamId) }
        : prev
    );
    // Clean up references across all decisions
    setDecisions((prev) =>
      prev.map((d) => ({
        ...d,
        removeStreamIds: d.removeStreamIds.filter((id) => id !== streamId),
        modifyStreams: d.modifyStreams.filter((m) => m.streamId !== streamId),
      }))
    );
  }, []);

  // Decision handlers
  const handleAddDecision = useCallback(() => {
    if (!baseline) return;
    const newDecision: DecisionConfig = {
      id: crypto.randomUUID(),
      name: 'New Decision',
      baselineId: baseline.id,
      addStreams: [],
      removeStreamIds: [],
      modifyStreams: [],
      checkingBalanceAdjustment: 0,
      savingsBalanceAdjustment: 0,
    };
    setDecisions((prev) => [...prev, newDecision]);
    setEnabledDecisionIds((prev) => new Set([...prev, newDecision.id]));
  }, [baseline]);

  const handleUpdateDecision = useCallback((updated: DecisionConfig) => {
    setDecisions((prev) =>
      prev.map((d) => (d.id === updated.id ? updated : d))
    );
  }, []);

  const handleDeleteDecision = useCallback((id: string) => {
    setDecisions((prev) => prev.filter((d) => d.id !== id));
    setEnabledDecisionIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    // Fire-and-forget server delete
    apiStore.deleteDecision(id).catch((err) => {
      console.error('Failed to delete decision:', err);
    });
  }, []);

  const handleToggleDecision = useCallback((id: string) => {
    setEnabledDecisionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Start fresh (clear demo data)
  const handleStartFresh = useCallback(async () => {
    await apiStore.clear();
    const fresh: ScenarioConfig = {
      id: crypto.randomUUID(),
      name: 'My Baseline',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      checkingBalance: 0,
      savingsBalance: 0,
      safetyBuffer: 3000,
      streams: [],
    };
    setBaseline(fresh);
    setDecisions([]);
    setEnabledDecisionIds(new Set());
  }, []);

  if (!isLoaded || !baseline) {
    return <div className="app loading">Loading...</div>;
  }

  const isDemo = baseline.name === 'Demo Baseline';

  return (
    <AppShell activePage={activePage} onNavigate={setActivePage}>
      {activePage === 'forecast' && (
        <ForecastPage
          baseline={baseline}
          decisions={decisions}
          enabledDecisionIds={enabledDecisionIds}
          baselineResult={baselineResult}
          decisionForecasts={decisionForecasts}
          isDemo={isDemo}
          onSetupChange={handleSetupChange}
          onAddStream={handleAddStream}
          onUpdateStream={handleUpdateStream}
          onDeleteStream={handleDeleteStream}
          onAddDecision={handleAddDecision}
          onUpdateDecision={handleUpdateDecision}
          onDeleteDecision={handleDeleteDecision}
          onToggleDecision={handleToggleDecision}
          onStartFresh={handleStartFresh}
        />
      )}
      {activePage === 'worksheet' && (
        <WorksheetPage
          baseline={baseline}
          onAddStream={handleAddStream}
          onUpdateStream={handleUpdateStream}
          onDeleteStream={handleDeleteStream}
          onSetupChange={handleSetupChange}
        />
      )}
    </AppShell>
  );
}

export default App;
