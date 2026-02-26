/**
 * Safe arithmetic expression evaluator.
 *
 * Supports +, -, *, /, parentheses, and decimal numbers.
 * Uses a recursive descent parser — no eval() or Function().
 *
 * Returns the result rounded to cents, or null if the expression is invalid.
 */

export function evaluateExpression(input: string): number | null {
  const expr = input.replace(/\s/g, '');
  if (!expr || !/\d/.test(expr)) return null;
  // Only allow safe characters
  if (!/^[\d.+\-*/()]+$/.test(expr)) return null;

  let pos = 0;

  function peek(): string {
    return expr[pos] ?? '';
  }

  function consume(): string {
    return expr[pos++];
  }

  // Grammar: expression = term (('+' | '-') term)*
  function parseExpression(): number {
    let result = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const right = parseTerm();
      result = op === '+' ? result + right : result - right;
    }
    return result;
  }

  // term = factor (('*' | '/') factor)*
  function parseTerm(): number {
    let result = parseFactor();
    while (peek() === '*' || peek() === '/') {
      const op = consume();
      const right = parseFactor();
      result = op === '*' ? result * right : result / right;
    }
    return result;
  }

  // factor = '(' expression ')' | number
  function parseFactor(): number {
    if (peek() === '(') {
      consume(); // '('
      const result = parseExpression();
      if (peek() === ')') consume(); // ')'
      return result;
    }
    // Parse a number (including negative via unary minus)
    let numStr = '';
    if (peek() === '-') {
      numStr += consume();
    }
    while (/[\d.]/.test(peek())) {
      numStr += consume();
    }
    const num = Number(numStr);
    if (isNaN(num)) return NaN;
    return num;
  }

  try {
    const result = parseExpression();
    // Make sure we consumed everything
    if (pos !== expr.length) return null;
    if (!isFinite(result)) return null;
    return Math.round(result * 100) / 100;
  } catch {
    return null;
  }
}
