/**
 * Decision panel: define modifications to the baseline scenario.
 *
 * The user can:
 * - Name the decision (e.g., "Home Addition")
 * - Add new expense/income streams
 * - Remove baseline streams (e.g., drop daycare)
 * - Adjust starting balances (e.g., -$10k upfront cost)
 */

import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import type { CashStream, DecisionConfig } from '../engine';
import { StreamEditor } from './StreamEditor';

interface DecisionPanelProps {
  decision: DecisionConfig | null;
  baselineStreams: CashStream[];
  onUpdate: (decision: DecisionConfig) => void;
  onClear: () => void;
  baselineId: string;
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  semimonthly: '1st & 15th',
  monthly: 'Monthly',
  'one-time': 'One-time',
};

export function DecisionPanel({
  decision,
  baselineStreams,
  onUpdate,
  onClear,
  baselineId,
}: DecisionPanelProps) {
  const [isAddingStream, setIsAddingStream] = useState(false);

  // If no decision exists yet, show the "What if?" prompt
  if (!decision) {
    return (
      <div className="decision-panel">
        <button
          className="primary what-if-button"
          onClick={() =>
            onUpdate({
              id: uuid(),
              name: 'New Decision',
              baselineId,
              addStreams: [],
              removeStreamIds: [],
              modifyStreams: [],
            })
          }
        >
          What if...?
        </button>
        <p className="decision-hint">
          Create a decision scenario to see how a change affects your forecast
        </p>
      </div>
    );
  }

  const removedSet = new Set(decision.removeStreamIds);

  function handleNameChange(name: string) {
    onUpdate({ ...decision!, name });
  }

  function handleAddStream(stream: CashStream) {
    onUpdate({
      ...decision!,
      addStreams: [...decision!.addStreams, stream],
    });
    setIsAddingStream(false);
  }

  function handleRemoveAddedStream(streamId: string) {
    onUpdate({
      ...decision!,
      addStreams: decision!.addStreams.filter((s) => s.id !== streamId),
    });
  }

  function handleToggleBaselineStream(streamId: string) {
    const isCurrentlyRemoved = removedSet.has(streamId);
    const newRemoved = isCurrentlyRemoved
      ? decision!.removeStreamIds.filter((id) => id !== streamId)
      : [...decision!.removeStreamIds, streamId];
    onUpdate({ ...decision!, removeStreamIds: newRemoved });
  }

  function handleBalanceAdjustment(field: string, value: number) {
    onUpdate({ ...decision!, [field]: value || 0 });
  }

  return (
    <div className="decision-panel decision-panel-active">
      <div className="decision-header">
        <div className="setup-field" style={{ flex: 1 }}>
          <label>Decision Name</label>
          <input
            type="text"
            value={decision.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g., Home Addition"
          />
        </div>
        <button className="danger" onClick={onClear}>
          Remove Decision
        </button>
      </div>

      {/* Balance adjustments */}
      <div className="decision-section">
        <h3>Upfront Balance Changes</h3>
        <div className="setup-grid">
          <div className="setup-field">
            <label>Checking Adjustment</label>
            <div className="input-with-prefix">
              <span className="input-prefix">$</span>
              <input
                type="number"
                value={decision.checkingBalanceAdjustment ?? 0}
                onChange={(e) => handleBalanceAdjustment('checkingBalanceAdjustment', Number(e.target.value))}
                step={1000}
              />
            </div>
            <span className="field-hint">Negative for upfront costs (e.g., -10000)</span>
          </div>
          <div className="setup-field">
            <label>Savings Adjustment</label>
            <div className="input-with-prefix">
              <span className="input-prefix">$</span>
              <input
                type="number"
                value={decision.savingsBalanceAdjustment ?? 0}
                onChange={(e) => handleBalanceAdjustment('savingsBalanceAdjustment', Number(e.target.value))}
                step={1000}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Toggle baseline streams on/off */}
      <div className="decision-section">
        <h3>Baseline Streams</h3>
        <p className="field-hint">Uncheck streams you want to remove in this scenario</p>
        <div className="decision-stream-toggles">
          {baselineStreams.map((stream) => (
            <label key={stream.id} className="decision-toggle">
              <input
                type="checkbox"
                checked={!removedSet.has(stream.id)}
                onChange={() => handleToggleBaselineStream(stream.id)}
              />
              <span className={removedSet.has(stream.id) ? 'stream-removed' : ''}>
                {stream.name} — ${stream.amount.toLocaleString()}/{FREQUENCY_LABELS[stream.frequency]}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* New streams added by this decision */}
      <div className="decision-section">
        <div className="stream-list-header">
          <h3>New Streams</h3>
          <button className="primary" onClick={() => setIsAddingStream(true)}>
            + Add Stream
          </button>
        </div>

        {isAddingStream && (
          <div className="stream-editor-container">
            <StreamEditor
              onSave={handleAddStream}
              onCancel={() => setIsAddingStream(false)}
            />
          </div>
        )}

        {decision.addStreams.map((stream) => (
          <div key={stream.id} className="stream-row">
            <div className="stream-info">
              <span className="stream-name">{stream.name}</span>
              <span className="stream-details">
                ${stream.amount.toLocaleString()} · {FREQUENCY_LABELS[stream.frequency]}
              </span>
            </div>
            <div className="stream-actions">
              <button className="danger" onClick={() => handleRemoveAddedStream(stream.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}

        {decision.addStreams.length === 0 && !isAddingStream && (
          <p className="stream-list-empty">No new streams added to this decision yet.</p>
        )}
      </div>
    </div>
  );
}
