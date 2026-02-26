/**
 * Setup panel: safety buffer and forecast date range.
 * Starting balances are managed on the Accounts page.
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SetupPanelProps {
  safetyBuffer: number;
  startDate: string;
  endDate: string;
  onChange: (field: string, value: number | string) => void;
}

export function SetupPanel({
  safetyBuffer,
  startDate,
  endDate,
  onChange,
}: SetupPanelProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Forecast Settings</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="buffer">Safety Buffer</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input
              id="buffer"
              type="number"
              value={safetyBuffer}
              onChange={(e) => onChange('safetyBuffer', Number(e.target.value))}
              step={500}
              className="pl-7"
            />
          </div>
          <span className="text-xs text-muted-foreground">Minimum checking balance you're comfortable with. Days below this get flagged in the forecast.</span>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="start-date">Start Date</Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => onChange('startDate', e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="end-date">End Date</Label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => onChange('endDate', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
