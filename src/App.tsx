/**
 * Main application component.
 *
 * Manages scenario and decision state, saves to the API server,
 * and routes between pages. Business logic lives here;
 * pages handle layout and rendering.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ScenarioConfig, DecisionConfig, CashStream, Account } from './engine';
import { useForecaster } from './hooks/useForecaster';
import { apiStore } from './store/apiClient';
import type { ScenarioSummary } from './store/types';
import { createDemoBaseline, createDemoDecision } from './data/demo';
import { AppShell, type Page } from './components/AppShell';
import { ForecastPage } from './pages/ForecastPage';
import { WorksheetPage } from './pages/WorksheetPage';
import './App.css';

function syncAccountBalances(config: ScenarioConfig): ScenarioConfig {
  const accounts = config.accounts || [];
  const checking = accounts.find((a) => a.accountType === 'checking');
  const savings = accounts.find((a) => a.accountType === 'savings');
  return {
    ...config,
    checkingBalance: checking?.balance ?? config.checkingBalance,
    savingsBalance: savings?.balance ?? config.savingsBalance,
  };
}

function App() {
  const [baseline, setBaseline] = useState<ScenarioConfig | null>(null);
  const [decisions, setDecisions] = useState<DecisionConfig[]>([]);
  const [enabledDecisionIds, setEnabledDecisionIds] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);
  const [activePage, setActivePage] = useState<Page>('worksheet');
  const [scenarioList, setScenarioList] = useState<ScenarioSummary[]>([]);

  const { baselineResult, decisionForecasts } = useForecaster(
    baseline,
    decisions,
    enabledDecisionIds
  );

  const saveInFlight = useRef(false);

  async function loadScenario(id: string) {
    const scenario = await apiStore.getScenario(id);
    if (!scenario) return;
    if (!scenario.accounts || scenario.accounts.length === 0) {
      scenario.accounts = [
        { id: crypto.randomUUID(), name: 'Checking', accountType: 'checking' as const, balance: scenario.checkingBalance },
        { id: crypto.randomUUID(), name: 'Savings', accountType: 'savings' as const, balance: scenario.savingsBalance },
      ];
    }
    const scenarioDecisions = await apiStore.getDecisionsForScenario(id);
    setBaseline(scenario);
    setDecisions(scenarioDecisions);
    setEnabledDecisionIds(new Set(scenarioDecisions.map((d) => d.id)));
  }

  async function refreshScenarioList() {
    const list = await apiStore.listScenarios();
    setScenarioList(list);
    return list;
  }

  useEffect(() => {
    async function load() {
      const list = await refreshScenarioList();

      if (list.length > 0) {
        await loadScenario(list[0].id);
      } else {
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

  useEffect(() => {
    if (!isLoaded) return;

    const timer = setTimeout(async () => {
      if (saveInFlight.current) return;
      saveInFlight.current = true;
      try {
        if (baseline) {
          await apiStore.saveScenario(baseline);
        }
        for (const decision of decisions) {
          await apiStore.saveDecision(decision);
        }
        await refreshScenarioList();
      } catch (err) {
        console.error('Auto-save failed:', err);
      } finally {
        saveInFlight.current = false;
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [baseline, decisions, isLoaded]);

  const handleSetupChange = useCallback(
    (field: string, value: number | string) => {
      setBaseline((prev) => (prev ? { ...prev, [field]: value } : prev));
    },
    []
  );

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
    setDecisions((prev) =>
      prev.map((d) => ({
        ...d,
        removeStreamIds: d.removeStreamIds.filter((id) => id !== streamId),
        modifyStreams: d.modifyStreams.filter((m) => m.streamId !== streamId),
      }))
    );
  }, []);

  const handleToggleStream = useCallback((streamId: string) => {
    setBaseline((prev) => {
      if (!prev) return prev;
      const disabled = prev.disabledStreamIds ?? [];
      const isDisabled = disabled.includes(streamId);
      return {
        ...prev,
        disabledStreamIds: isDisabled
          ? disabled.filter((id) => id !== streamId)
          : [...disabled, streamId],
      };
    });
  }, []);

  const handleOverrideStream = useCallback((streamId: string, amount: number | null) => {
    setBaseline((prev) => {
      if (!prev) return prev;
      const overrides = { ...(prev.streamOverrides ?? {}) };
      if (amount === null) {
        delete overrides[streamId];
      } else {
        overrides[streamId] = { amount };
      }
      return { ...prev, streamOverrides: overrides };
    });
  }, []);

  const handleAddAccount = useCallback((account: Account) => {
    setBaseline((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, accounts: [...(prev.accounts || []), account] };
      return syncAccountBalances(updated);
    });
  }, []);

  const handleUpdateAccount = useCallback((updated: Account) => {
    setBaseline((prev) => {
      if (!prev) return prev;
      const newBaseline = {
        ...prev,
        accounts: (prev.accounts || []).map((a) => (a.id === updated.id ? updated : a)),
      };
      return syncAccountBalances(newBaseline);
    });
  }, []);

  const handleDeleteAccount = useCallback((id: string) => {
    setBaseline((prev) => {
      if (!prev) return prev;
      const newBaseline = {
        ...prev,
        accounts: (prev.accounts || []).filter((a) => a.id !== id),
      };
      return syncAccountBalances(newBaseline);
    });
  }, []);

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

  const handleSwitchScenario = useCallback(async (scenarioId: string) => {
    await loadScenario(scenarioId);
  }, []);

  const handleNewScenario = useCallback(async () => {
    const fresh: ScenarioConfig = {
      id: crypto.randomUUID(),
      name: 'New Scenario',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      checkingBalance: 0,
      savingsBalance: 0,
      safetyBuffer: 3000,
      accounts: [
        { id: crypto.randomUUID(), name: 'Checking', accountType: 'checking' as const, balance: 0 },
        { id: crypto.randomUUID(), name: 'Savings', accountType: 'savings' as const, balance: 0 },
      ],
      streams: [],
    };
    setBaseline(fresh);
    setDecisions([]);
    setEnabledDecisionIds(new Set());
  }, []);

  const handleDeleteScenario = useCallback(async (scenarioId: string) => {
    await apiStore.deleteScenario(scenarioId);
    const list = await refreshScenarioList();
    if (list.length > 0) {
      await loadScenario(list[0].id);
    } else {
      await handleNewScenario();
    }
  }, [handleNewScenario]);

  const handleImportDecisionAsStream = useCallback(
    async (scenarioId: string, decisionId: string) => {
      const scenario = await apiStore.getScenario(scenarioId);
      if (!scenario) return;
      const scenarioDecisions = await apiStore.getDecisionsForScenario(scenarioId);
      const decision = scenarioDecisions.find((d) => d.id === decisionId);
      if (!decision) return;

      const MONTHLY_MULTIPLIER: Record<string, number> = {
        weekly: 52 / 12,
        biweekly: 26 / 12,
        semimonthly: 2,
        monthly: 1,
        'one-time': 0,
      };

      let netMonthly = 0;

      for (const stream of decision.addStreams) {
        const mult = MONTHLY_MULTIPLIER[stream.frequency] ?? 1;
        if (stream.type === 'income') {
          netMonthly += stream.amount * mult;
        } else if (stream.type === 'expense') {
          netMonthly -= stream.amount * mult;
        }
      }

      for (const removedId of decision.removeStreamIds) {
        const baseStream = scenario.streams.find((s) => s.id === removedId);
        if (baseStream) {
          const mult = MONTHLY_MULTIPLIER[baseStream.frequency] ?? 1;
          if (baseStream.type === 'income') {
            netMonthly -= baseStream.amount * mult;
          } else if (baseStream.type === 'expense') {
            netMonthly += baseStream.amount * mult;
          }
        }
      }

      const netAmount = Math.round(Math.abs(netMonthly));
      if (netAmount === 0) return;

      const isExpense = netMonthly < 0;
      const today = new Date().toISOString().split('T')[0];

      const newStream: CashStream = {
        id: crypto.randomUUID(),
        name: `${decision.name} (from ${scenario.name})`,
        amount: netAmount,
        type: isExpense ? 'expense' : 'income',
        frequency: 'monthly',
        account: 'checking',
        startDate: today,
        dayOfMonth: 1,
      };

      setBaseline((prev) =>
        prev ? { ...prev, streams: [...prev.streams, newStream] } : prev
      );
    },
    []
  );

  const handleStartFresh = useCallback(async () => {
    await apiStore.clear();
    setScenarioList([]);
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
      accounts: [
        { id: crypto.randomUUID(), name: 'Checking', accountType: 'checking' as const, balance: 0 },
        { id: crypto.randomUUID(), name: 'Savings', accountType: 'savings' as const, balance: 0 },
      ],
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
          scenarioList={scenarioList}
          onSetupChange={handleSetupChange}
          onToggleStream={handleToggleStream}
          onOverrideStream={handleOverrideStream}
          onAddDecision={handleAddDecision}
          onUpdateDecision={handleUpdateDecision}
          onDeleteDecision={handleDeleteDecision}
          onToggleDecision={handleToggleDecision}
          onStartFresh={handleStartFresh}
          onNavigate={setActivePage}
          onSwitchScenario={handleSwitchScenario}
          onNewScenario={handleNewScenario}
          onDeleteScenario={handleDeleteScenario}
          onImportDecisionAsStream={handleImportDecisionAsStream}
          onScenarioNameChange={(name: string) => setBaseline((prev) => prev ? { ...prev, name } : prev)}
        />
      )}
      {activePage === 'worksheet' && (
        <WorksheetPage
          baseline={baseline}
          onAddStream={handleAddStream}
          onUpdateStream={handleUpdateStream}
          onDeleteStream={handleDeleteStream}
          onSetupChange={handleSetupChange}
          onAddAccount={handleAddAccount}
          onUpdateAccount={handleUpdateAccount}
          onDeleteAccount={handleDeleteAccount}
        />
      )}
    </AppShell>
  );
}

export default App;
