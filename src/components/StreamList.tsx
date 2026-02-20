/**
 * Displays all cash streams (income, expenses, transfers) with
 * add/edit/delete controls. Groups streams by type for readability.
 */

import { useState } from 'react';
import type { CashStream } from '../engine';
import { StreamEditor } from './StreamEditor';

interface StreamListProps {
  streams: CashStream[];
  onAdd: (stream: CashStream) => void;
  onUpdate: (stream: CashStream) => void;
  onDelete: (streamId: string) => void;
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  semimonthly: '1st & 15th',
  monthly: 'Monthly',
  'one-time': 'One-time',
};

export function StreamList({ streams, onAdd, onUpdate, onDelete }: StreamListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const incomeStreams = streams.filter((s) => s.type === 'income');
  const expenseStreams = streams.filter((s) => s.type === 'expense');
  const transferStreams = streams.filter((s) => s.type === 'transfer');

  function handleSaveNew(stream: CashStream) {
    onAdd(stream);
    setIsAdding(false);
  }

  function handleSaveEdit(stream: CashStream) {
    onUpdate(stream);
    setEditingId(null);
  }

  return (
    <div className="stream-list">
      <div className="stream-list-header">
        <h2>Cash Streams</h2>
        <button className="primary" onClick={() => setIsAdding(true)}>
          + Add Stream
        </button>
      </div>

      {isAdding && (
        <div className="stream-editor-container">
          <StreamEditor onSave={handleSaveNew} onCancel={() => setIsAdding(false)} />
        </div>
      )}

      {incomeStreams.length > 0 && (
        <StreamGroup
          title="Income"
          streams={incomeStreams}
          editingId={editingId}
          onEdit={setEditingId}
          onSave={handleSaveEdit}
          onCancelEdit={() => setEditingId(null)}
          onDelete={onDelete}
        />
      )}

      {expenseStreams.length > 0 && (
        <StreamGroup
          title="Expenses"
          streams={expenseStreams}
          editingId={editingId}
          onEdit={setEditingId}
          onSave={handleSaveEdit}
          onCancelEdit={() => setEditingId(null)}
          onDelete={onDelete}
        />
      )}

      {transferStreams.length > 0 && (
        <StreamGroup
          title="Transfers"
          streams={transferStreams}
          editingId={editingId}
          onEdit={setEditingId}
          onSave={handleSaveEdit}
          onCancelEdit={() => setEditingId(null)}
          onDelete={onDelete}
        />
      )}

      {streams.length === 0 && !isAdding && (
        <p className="stream-list-empty">No streams yet. Add your first income or expense.</p>
      )}
    </div>
  );
}

interface StreamGroupProps {
  title: string;
  streams: CashStream[];
  editingId: string | null;
  onEdit: (id: string) => void;
  onSave: (stream: CashStream) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
}

function StreamGroup({
  title,
  streams,
  editingId,
  onEdit,
  onSave,
  onCancelEdit,
  onDelete,
}: StreamGroupProps) {
  return (
    <div className="stream-group">
      <h3 className="stream-group-title">{title}</h3>
      {streams.map((stream) =>
        editingId === stream.id ? (
          <div key={stream.id} className="stream-editor-container">
            <StreamEditor
              stream={stream}
              onSave={onSave}
              onCancel={onCancelEdit}
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
              <button onClick={() => onEdit(stream.id)}>Edit</button>
              <button className="danger" onClick={() => onDelete(stream.id)}>Delete</button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
