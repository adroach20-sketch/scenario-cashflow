/**
 * Displays all cash streams in a worksheet-style layout:
 * Income → Fixed Expenses → Variable Expenses → Transfers
 *
 * Each section has its own "Add" button and monthly subtotal.
 */

import { useState } from 'react';
import type { CashStream, StreamType, ExpenseCategory } from '../engine';
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

// Convert any frequency to a monthly equivalent for subtotals
function monthlyEquivalent(stream: CashStream): number {
  switch (stream.frequency) {
    case 'weekly': return stream.amount * 52 / 12;
    case 'biweekly': return stream.amount * 26 / 12;
    case 'semimonthly': return stream.amount * 2;
    case 'monthly': return stream.amount;
    case 'one-time': return 0; // Not a monthly rate
  }
}

function formatMonthly(streams: CashStream[]): string {
  const total = streams.reduce((sum, s) => sum + monthlyEquivalent(s), 0);
  return `~$${Math.round(total).toLocaleString()}/mo`;
}

export function StreamList({ streams, onAdd, onUpdate, onDelete }: StreamListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingSection, setAddingSection] = useState<string | null>(null);

  const incomeStreams = streams.filter((s) => s.type === 'income');
  const fixedExpenses = streams.filter((s) => s.type === 'expense' && s.category !== 'variable');
  const variableExpenses = streams.filter((s) => s.type === 'expense' && s.category === 'variable');
  const transferStreams = streams.filter((s) => s.type === 'transfer');

  function handleSaveNew(stream: CashStream) {
    onAdd(stream);
    setAddingSection(null);
  }

  function handleSaveEdit(stream: CashStream) {
    onUpdate(stream);
    setEditingId(null);
  }

  return (
    <div className="stream-list">
      <div className="stream-list-header">
        <h2>Cash Streams</h2>
      </div>

      <StreamGroup
        title="Income"
        subtitle={formatMonthly(incomeStreams)}
        streams={incomeStreams}
        sectionKey="income"
        addingSection={addingSection}
        onStartAdd={setAddingSection}
        onSaveNew={handleSaveNew}
        onCancelAdd={() => setAddingSection(null)}
        editingId={editingId}
        onEdit={setEditingId}
        onSave={handleSaveEdit}
        onCancelEdit={() => setEditingId(null)}
        onDelete={onDelete}
        defaultType="income"
      />

      <StreamGroup
        title="Fixed Expenses"
        subtitle={formatMonthly(fixedExpenses)}
        streams={fixedExpenses}
        sectionKey="fixed"
        addingSection={addingSection}
        onStartAdd={setAddingSection}
        onSaveNew={handleSaveNew}
        onCancelAdd={() => setAddingSection(null)}
        editingId={editingId}
        onEdit={setEditingId}
        onSave={handleSaveEdit}
        onCancelEdit={() => setEditingId(null)}
        onDelete={onDelete}
        defaultType="expense"
        defaultCategory="fixed"
      />

      <StreamGroup
        title="Variable Expenses"
        subtitle={formatMonthly(variableExpenses)}
        streams={variableExpenses}
        sectionKey="variable"
        addingSection={addingSection}
        onStartAdd={setAddingSection}
        onSaveNew={handleSaveNew}
        onCancelAdd={() => setAddingSection(null)}
        editingId={editingId}
        onEdit={setEditingId}
        onSave={handleSaveEdit}
        onCancelEdit={() => setEditingId(null)}
        onDelete={onDelete}
        defaultType="expense"
        defaultCategory="variable"
      />

      <StreamGroup
        title="Transfers"
        subtitle={formatMonthly(transferStreams)}
        streams={transferStreams}
        sectionKey="transfer"
        addingSection={addingSection}
        onStartAdd={setAddingSection}
        onSaveNew={handleSaveNew}
        onCancelAdd={() => setAddingSection(null)}
        editingId={editingId}
        onEdit={setEditingId}
        onSave={handleSaveEdit}
        onCancelEdit={() => setEditingId(null)}
        onDelete={onDelete}
        defaultType="transfer"
      />
    </div>
  );
}

interface StreamGroupProps {
  title: string;
  subtitle: string;
  streams: CashStream[];
  sectionKey: string;
  addingSection: string | null;
  onStartAdd: (section: string) => void;
  onSaveNew: (stream: CashStream) => void;
  onCancelAdd: () => void;
  editingId: string | null;
  onEdit: (id: string) => void;
  onSave: (stream: CashStream) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  defaultType: StreamType;
  defaultCategory?: ExpenseCategory;
}

function StreamGroup({
  title,
  subtitle,
  streams,
  sectionKey,
  addingSection,
  onStartAdd,
  onSaveNew,
  onCancelAdd,
  editingId,
  onEdit,
  onSave,
  onCancelEdit,
  onDelete,
  defaultType,
  defaultCategory,
}: StreamGroupProps) {
  return (
    <div className="stream-group">
      <div className="stream-group-header">
        <div>
          <h3 className="stream-group-title">{title}</h3>
          <span className="stream-group-subtotal">{subtitle}</span>
        </div>
        <button className="stream-group-add" onClick={() => onStartAdd(sectionKey)}>
          + Add
        </button>
      </div>

      {addingSection === sectionKey && (
        <div className="stream-editor-container">
          <StreamEditor
            defaultType={defaultType}
            defaultCategory={defaultCategory}
            onSave={onSaveNew}
            onCancel={onCancelAdd}
          />
        </div>
      )}

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

      {streams.length === 0 && addingSection !== sectionKey && (
        <p className="stream-list-empty">No streams yet</p>
      )}
    </div>
  );
}
