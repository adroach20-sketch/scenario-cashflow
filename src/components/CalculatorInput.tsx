/**
 * Amount input that supports basic math expressions.
 *
 * Type "1200+350" and it evaluates to 1550 on blur or Enter.
 * Falls back to the previous value if the expression is invalid.
 */

import { useState, useEffect, useRef } from 'react';
import { evaluateExpression } from '../engine/calc';

interface CalculatorInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  required?: boolean;
}

export function CalculatorInput({
  value,
  onChange,
  min,
  placeholder,
  className,
  autoFocus,
  required,
}: CalculatorInputProps) {
  const [displayValue, setDisplayValue] = useState(value ? String(value) : '');
  const isFocused = useRef(false);

  // Sync from prop when not focused (external value changes)
  useEffect(() => {
    if (!isFocused.current) {
      setDisplayValue(value ? String(value) : '');
    }
  }, [value]);

  function evaluate() {
    const trimmed = displayValue.trim();
    if (!trimmed) {
      // Empty input — reset to 0 or keep previous
      if (required) {
        setDisplayValue(value ? String(value) : '');
      } else {
        onChange(0);
        setDisplayValue('');
      }
      return;
    }

    const result = evaluateExpression(trimmed);
    if (result !== null && (min === undefined || result >= min)) {
      onChange(result);
      setDisplayValue(String(result));
    } else {
      // Invalid expression — revert
      setDisplayValue(value ? String(value) : '');
    }
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={(e) => setDisplayValue(e.target.value)}
      onFocus={() => {
        isFocused.current = true;
      }}
      onBlur={() => {
        isFocused.current = false;
        evaluate();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          evaluate();
        }
      }}
      placeholder={placeholder}
      className={className}
      autoFocus={autoFocus}
      required={required}
      title="Supports math: 1200+350"
    />
  );
}
