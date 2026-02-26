/**
 * List of decision scenarios with toggle, expand/collapse, and color indicators.
 */

import { useState } from 'react';
import type { DecisionConfig } from '../engine';
import { DecisionPanel } from './DecisionPanel';
import { DECISION_COLORS } from './ForecastChart';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface DecisionListProps {
  decisions: DecisionConfig[];
  enabledDecisionIds: Set<string>;
  allDecisionIds: string[];
  onAdd: () => void;
  onUpdate: (updated: DecisionConfig) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

export function DecisionList({
  decisions,
  enabledDecisionIds,
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
      <div className="text-center py-8">
        <Button size="lg" onClick={onAdd}>
          What if...?
        </Button>
        <p className="text-sm text-muted-foreground mt-2">
          Create a scenario to see how changes affect your forecast
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {decisions.map((decision) => {
        const isExpanded = expandedId === decision.id;
        const isEnabled = enabledDecisionIds.has(decision.id);
        const color = colorFor(decision.id);
        const streamCount = decision.addStreams.length;

        return (
          <Card key={decision.id} className="overflow-hidden py-0">
            <div className="flex items-center justify-between px-4 py-3 gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => onToggle(decision.id)}
                    className="w-4 h-4 cursor-pointer rounded accent-primary"
                  />
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: isEnabled ? color.main : 'var(--border)' }}
                  />
                </label>
                <button
                  className="bg-transparent border-0 p-0 text-sm font-medium cursor-pointer text-left truncate hover:text-primary transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : decision.id)}
                >
                  {decision.name || 'Untitled Decision'}
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {isExpanded ? '▾' : '▸'}
                  </span>
                </button>
              </div>
              <div className="flex-shrink-0">
                <span className="text-xs text-muted-foreground">
                  {streamCount > 0
                    ? `${streamCount} stream${streamCount > 1 ? 's' : ''}`
                    : 'No streams yet'}
                </span>
              </div>
            </div>
            {isExpanded && (
              <div className="border-t">
                <DecisionPanel
                  decision={decision}
                  onUpdate={onUpdate}
                  onDelete={() => onDelete(decision.id)}
                />
              </div>
            )}
          </Card>
        );
      })}
      <Button variant="outline" onClick={onAdd} className="self-start">
        + Add Decision
      </Button>
    </div>
  );
}
