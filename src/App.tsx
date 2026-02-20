/**
 * Main application component.
 *
 * Manages the scenario and decision state, saves to localStorage,
 * and renders all the panels. The chart updates in real-time as
 * the user edits their scenario.
 */

import { useState, useEffect, useCallback } from 'react';
import type { ScenarioConfig, DecisionConfig, CashStream } from './engine';
import { useForecaster } from './hooks/useForecaster';
import { localStorageStore } from './store/localStorage';
import { createDemoBaseline, createDemoDecision } from './data/demo';
import { SetupPanel } from './components/SetupPanel';
import { StreamList } from './components/StreamList';
import { DecisionPanel } from './components/DecisionPanel';
import { ForecastChart } from './components/ForecastChart';
import { MetricsPanel } from './components/MetricsPanel';
import './App.css';

function App() {
  const [baseline, setBaseline] = useState<ScenarioConfig | null>(null);
  const [decision, setDecision] = useState<DecisionConfig | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Run the forecast engine whenever baseline or decision changes
  const { baselineResult, decisionResult, comparison } = useForecaster(baseline, decision);

  // Load from localStorage on mount (or create demo data)
  useEffect(() => {
    async function load() {
      const savedBaseline = await localStorageStore.getBaseline();
      const savedDecision = await localStorageStore.getDecision();

      if (savedBaseline) {
        setBaseline(savedBaseline);
        setDecision(savedDecision);
      } else {
        // First visit: load demo data
        const demo = createDemoBaseline();
        const demoDecision = createDemoDecision(demo.id);
        setBaseline(demo);
        setDecision(demoDecision);
      }
      setIsLoaded(true);
    }
    load();
  }, []);

  // Auto-save whenever state changes
  useEffect(() => {
    if (!isLoaded) return;
    if (baseline) {
      localStorageStore.saveBaseline(baseline);
    }
    if (decision) {
      localStorageStore.saveDecision(decision);
    } else {
      // If decision was cleared, remove it from storage
      localStorageStore.getDecision().then((saved) => {
        if (saved) {
          localStorage.removeItem('scenario-cashflow:decision');
        }
      });
    }
  }, [baseline, decision, isLoaded]);

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
    // Also clean up any decision references to this stream
    setDecision((prev) =>
      prev
        ? {
            ...prev,
            removeStreamIds: prev.removeStreamIds.filter((id) => id !== streamId),
            modifyStreams: prev.modifyStreams.filter((m) => m.streamId !== streamId),
          }
        : prev
    );
  }, []);

  // Decision handlers
  const handleUpdateDecision = useCallback((updated: DecisionConfig) => {
    setDecision(updated);
  }, []);

  const handleClearDecision = useCallback(() => {
    setDecision(null);
  }, []);

  // Start fresh (clear demo data)
  const handleStartFresh = useCallback(async () => {
    await localStorageStore.clear();
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
    setDecision(null);
  }, []);

  if (!isLoaded || !baseline) {
    return <div className="app loading">Loading...</div>;
  }

  const isDemo = baseline.name === 'Demo Baseline';

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Scenario Cashflow Forecaster</h1>
          <p className="subtitle">See how decisions change your financial future</p>
        </div>
        {isDemo && (
          <button className="primary" onClick={handleStartFresh}>
            Use My Numbers
          </button>
        )}
        {!isDemo && (
          <button onClick={handleStartFresh}>
            Start Over
          </button>
        )}
      </header>

      {isDemo && (
        <div className="demo-banner">
          This is demo data. Click "Use My Numbers" to enter your own scenario.
        </div>
      )}

      {/* Chart — the centerpiece */}
      <section className="section">
        <ForecastChart
          baselineResult={baselineResult}
          decisionResult={decisionResult}
          safetyBuffer={baseline.safetyBuffer}
        />
      </section>

      {/* Metrics */}
      <section className="section">
        <MetricsPanel
          baselineMetrics={baselineResult?.metrics ?? null}
          comparison={comparison}
        />
      </section>

      {/* Setup */}
      <section className="section">
        <SetupPanel
          checkingBalance={baseline.checkingBalance}
          savingsBalance={baseline.savingsBalance}
          safetyBuffer={baseline.safetyBuffer}
          startDate={baseline.startDate}
          endDate={baseline.endDate}
          onChange={handleSetupChange}
        />
      </section>

      {/* Baseline streams */}
      <section className="section">
        <StreamList
          streams={baseline.streams}
          onAdd={handleAddStream}
          onUpdate={handleUpdateStream}
          onDelete={handleDeleteStream}
        />
      </section>

      {/* Decision */}
      <section className="section">
        <h2>Decision Scenario</h2>
        <DecisionPanel
          decision={decision}
          baselineStreams={baseline.streams}
          onUpdate={handleUpdateDecision}
          onClear={handleClearDecision}
          baselineId={baseline.id}
        />
      </section>
    </div>
  );
}

export default App;
