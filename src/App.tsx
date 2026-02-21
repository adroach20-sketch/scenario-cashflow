/**
 * Main application component.
 *
 * Manages the scenario and decision state, saves to the API server,
 * and renders all the panels. The chart updates in real-time as
 * the user edits their scenario.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ScenarioConfig, DecisionConfig, CashStream } from './engine';
import { useForecaster } from './hooks/useForecaster';
import { apiStore } from './store/apiClient';
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

  // Track whether a save is already in flight to avoid overlapping requests
  const saveInFlight = useRef(false);

  // Load from server on mount (or create demo data)
  useEffect(() => {
    async function load() {
      const savedBaseline = await apiStore.getBaseline();
      const savedDecision = await apiStore.getDecision();

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

  // Auto-save with debounce (500ms) to avoid hammering the server on every keystroke
  useEffect(() => {
    if (!isLoaded) return;

    const timer = setTimeout(async () => {
      if (saveInFlight.current) return;
      saveInFlight.current = true;
      try {
        if (baseline) {
          await apiStore.saveBaseline(baseline);
        }
        if (decision) {
          await apiStore.saveDecision(decision);
        } else {
          await apiStore.deleteDecision();
        }
      } catch (err) {
        console.error('Auto-save failed:', err);
      } finally {
        saveInFlight.current = false;
      }
    }, 500);

    return () => clearTimeout(timer);
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
