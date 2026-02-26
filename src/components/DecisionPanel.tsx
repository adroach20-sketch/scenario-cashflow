/**
 * Decision editor: define the streams that come with a financial decision.
 *
 * The user can:
 * - Name the decision (e.g., "Home Addition")
 * - Add new streams (recurring or one-time)
 * - Add upfront costs as one-time expense streams
 * - Edit and delete added streams inline
 *
 * Balance adjustments and baseline stream toggles have been removed.
 * Baseline stream toggling lives in the wizard's "Adjust Streams" step.
 * Upfront costs are modeled as self-documenting one-time expense streams.
 */

import { useState } from 'react';
import type { CashStream, DecisionConfig } from '../engine';
import { StreamEditor } from './StreamEditor';

interface DecisionPanelProps {
  decision: DecisionConfig;
  onUpdate: (decision: DecisionConfig) => void;
  onDelete: () => void;
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
  onUpdate,
  onDelete,
}: DecisionPanelProps) {
  // Auto-open the add form when the decision has no streams yet
  const [addMode, setAddMode] = useState<'stream' | 'upfront' | null>(
    decision.addStreams.length === 0 ? 'stream' : null
  );
  const [editingStreamId, setEditingStreamId] = useState<string | null>(null);

  function handleNameChange(name: string) {
    onUpdate({ ...decision, name });
  }

  function handleAddStream(stream: CashStream) {
    onUpdate({
      ...decision,
      addStreams: [...decision.addStreams, stream],
    });
    setAddMode(null);
  }

  function handleUpdateStream(updated: CashStream) {
    onUpdate({
      ...decision,
      addStreams: decision.addStreams.map((s) => (s.id === updated.id ? updated : s)),
    });
    setEditingStreamId(null);
  }

  function handleRemoveStream(streamId: string) {
    onUpdate({
      ...decision,
      addStreams: decision.addStreams.filter((s) => s.id !== streamId),
    });
  }

  return (
    <div className="decision-panel-active">
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
        <button className="danger" onClick={onDelete}>
          Delete
        </button>
      </div>

      <div className="decision-section">
        <div className="stream-list-header">
          <h3>What changes with this decision?</h3>
          {decision.addStreams.length > 0 && !addMode && (
            <div className="decision-action-buttons">
              <button className="primary" onClick={() => setAddMode('stream')}>
                + Add Stream
              </button>
              <button onClick={() => setAddMode('upfront')}>
                + Upfront Cost
              </button>
            </div>
          )}
        </div>

        {/* Add stream / upfront cost form — shown at top */}
        {addMode === 'stream' && (
          <div className="stream-editor-container">
            <StreamEditor
              onSave={handleAddStream}
              onCancel={() => setAddMode(null)}
            />
          </div>
        )}

        {addMode === 'upfront' && (
          <div className="stream-editor-container">
            <StreamEditor
              defaultType="expense"
              defaultCategory="fixed"
              lockFrequency="one-time"
              onSave={handleAddStream}
              onCancel={() => setAddMode(null)}
            />
          </div>
        )}

        {/* Existing streams with inline edit/delete */}
        {decision.addStreams.map((stream) =>
          editingStreamId === stream.id ? (
            <div key={stream.id} className="stream-editor-container">
              <StreamEditor
                stream={stream}
                onSave={handleUpdateStream}
                onCancel={() => setEditingStreamId(null)}
              />
            </div>
          ) : (
            <div key={stream.id} className="stream-row">
              <div className="stream-info">
                <span className="stream-name">{stream.name}</span>
                <span className="stream-details">
                  ${stream.amount.toLocaleString()} · {FREQUENCY_LABELS[stream.frequency]}
                  {stream.endDate && ` · ends ${stream.endDate}`}
                </span>
              </div>
              <div className="stream-actions">
                <button onClick={() => setEditingStreamId(stream.id)}>Edit</button>
                <button className="danger" onClick={() => handleRemoveStream(stream.id)}>
                  Delete
                </button>
              </div>
            </div>
          )
        )}

        {/* Empty state */}
        {decision.addStreams.length === 0 && !addMode && (
          <div className="decision-empty-streams">
            <p>Add streams to model this decision's financial impact.</p>
            <p className="field-hint">
              Tip: Use "Upfront Cost" for one-time expenses like deposits or down payments.
            </p>
            <div className="decision-action-buttons">
              <button className="primary" onClick={() => setAddMode('stream')}>
                + Add Stream
              </button>
              <button onClick={() => setAddMode('upfront')}>
                + Upfront Cost
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
