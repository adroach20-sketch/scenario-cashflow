/**
 * List of decision scenarios with toggle, expand/collapse, and color indicators.
 *
 * Each decision shows as a collapsible card with:
 * - Color dot matching its chart line
 * - Name
 * - Enabled/disabled toggle
 * - Expand to show the full DecisionPanel editor
 * - Delete button
 */

import { useState } from 'react';
import type { DecisionConfig, CashStream } from '../engine';
import { DecisionPanel } from './DecisionPanel';
import { DECISION_COLORS } from './ForecastChart';

interface DecisionListProps {
  decisions: DecisionConfig[];
  enabledDecisionIds: Set<string>;
  baselineStreams: CashStream[];
  baselineId: string;
  allDecisionIds: string[];
  onAdd: () => void;
  onUpdate: (updated: DecisionConfig) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

export function DecisionList({
  decisions,
  enabledDecisionIds,
  baselineStreams,
  baselineId,
  allDecisionIds,
  onAdd,
  onUpdate,
  onDelete,
  onToggle,
}: DecisionListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    decisions.length === 1 ? decisions[0].id : null
  );

  function colorFor(decisionId: string) {
    const idx = allDecisionIds.indexOf(decisionId);
    return DECISION_COLORS[(idx >= 0 ? idx : 0) % DECISION_COLORS.length];
  }

  if (decisions.length === 0) {
    return (
      <div className="decision-panel">
        <button className="what-if-button primary" onClick={onAdd}>
          What if...?
        </button>
        <p className="decision-hint">
          Create a scenario to see how changes affect your forecast
        </p>
      </div>
    );
  }

  return (
    <div className="decision-list">
      {decisions.map((decision) => {
        const isExpanded = expandedId === decision.id;
        const isEnabled = enabledDecisionIds.has(decision.id);
        const color = colorFor(decision.id);

        return (
          <div key={decision.id} className="decision-card">
            <div className="decision-card-header">
              <div className="decision-card-left">
                <label className="decision-card-toggle">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => onToggle(decision.id)}
                  />
                  <span
                    className="decision-card-dot"
                    style={{ background: isEnabled ? color.main : '#d1d5db' }}
                  />
                </label>
                <button
                  className="decision-card-name"
                  onClick={() => setExpandedId(isExpanded ? null : decision.id)}
                >
                  {decision.name || 'Untitled Decision'}
                  <span className="decision-card-chevron">
                    {isExpanded ? '▾' : '▸'}
                  </span>
                </button>
              </div>
              <div className="decision-card-right">
                <span className="decision-card-summary">
                  {decision.removeStreamIds.length > 0 &&
                    `${decision.removeStreamIds.length} removed`}
                  {decision.removeStreamIds.length > 0 && decision.addStreams.length > 0 && ' · '}
                  {decision.addStreams.length > 0 &&
                    `${decision.addStreams.length} added`}
                </span>
              </div>
            </div>
            {isExpanded && (
              <div className="decision-card-body">
                <DecisionPanel
                  decision={decision}
                  baselineStreams={baselineStreams}
                  onUpdate={onUpdate}
                  onDelete={() => onDelete(decision.id)}
                  baselineId={baselineId}
                />
              </div>
            )}
          </div>
        );
      })}
      <button className="decision-add-button" onClick={onAdd}>
        + Add Decision
      </button>
    </div>
  );
}
