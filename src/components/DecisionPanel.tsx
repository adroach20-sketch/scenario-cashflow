/**
 * Decision editor: define the streams that come with a financial decision.
 */

import { useState } from 'react';
import type { CashStream, DecisionConfig } from '../engine';
import { StreamEditor } from './StreamEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
    <div className="p-5">
      <div className="flex items-end gap-4 mb-5 pb-4 border-b">
        <div className="flex-1 flex flex-col gap-1">
          <Label>Decision Name</Label>
          <Input
            type="text"
            value={decision.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g., Home Addition"
          />
        </div>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          Delete
        </Button>
      </div>

      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">What changes with this decision?</h3>
          {decision.addStreams.length > 0 && !addMode && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setAddMode('stream')}>
                + Add Stream
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAddMode('upfront')}>
                + Upfront Cost
              </Button>
            </div>
          )}
        </div>

        {/* Add stream / upfront cost form */}
        {addMode === 'stream' && (
          <div className="bg-muted/50 border rounded-lg p-4 mb-4">
            <StreamEditor
              onSave={handleAddStream}
              onCancel={() => setAddMode(null)}
            />
          </div>
        )}

        {addMode === 'upfront' && (
          <div className="bg-muted/50 border rounded-lg p-4 mb-4">
            <StreamEditor
              defaultType="expense"
              defaultCategory="fixed"
              lockFrequency="one-time"
              onSave={handleAddStream}
              onCancel={() => setAddMode(null)}
            />
          </div>
        )}

        {/* Existing streams */}
        {decision.addStreams.map((stream) =>
          editingStreamId === stream.id ? (
            <div key={stream.id} className="bg-muted/50 border rounded-lg p-4 mb-3">
              <StreamEditor
                stream={stream}
                onSave={handleUpdateStream}
                onCancel={() => setEditingStreamId(null)}
              />
            </div>
          ) : (
            <div key={stream.id} className="flex items-center justify-between py-2.5 border-b border-muted last:border-b-0 group">
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-sm">{stream.name}</span>
                <span className="text-[0.8125rem] text-muted-foreground">
                  ${stream.amount.toLocaleString()} · {FREQUENCY_LABELS[stream.frequency]}
                  {stream.endDate && ` · ends ${stream.endDate}`}
                </span>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <Button variant="ghost" size="xs" onClick={() => setEditingStreamId(stream.id)}>Edit</Button>
                <Button variant="ghost" size="xs" className="text-destructive hover:text-destructive" onClick={() => handleRemoveStream(stream.id)}>
                  Delete
                </Button>
              </div>
            </div>
          )
        )}

        {/* Empty state */}
        {decision.addStreams.length === 0 && !addMode && (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm mb-1">Add streams to model this decision's financial impact.</p>
            <p className="text-xs mb-4">
              Tip: Use "Upfront Cost" for one-time expenses like deposits or down payments.
            </p>
            <div className="flex gap-2 justify-center">
              <Button size="sm" onClick={() => setAddMode('stream')}>
                + Add Stream
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAddMode('upfront')}>
                + Upfront Cost
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
