// CPF (11 digits) or CNPJ (14 digits), with the usual punctuation allowed. Returns the
// digits when the check digits match, null otherwise.
export function normalizeCpfCnpj(input: string): string | null {
  if (!/^[\d.\-/\s]+$/.test(input)) return null;
  const digits = input.replace(/\D/g, "");
  if (/^(\d)\1*$/.test(digits)) return null;
  if (digits.length === 11) return isValid(digits, [10, 9, 8, 7, 6, 5, 4, 3, 2]) ? digits : null;
  if (digits.length === 14) return isValid(digits, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) ? digits : null;
  return null;
}

// Mod 11 for both: the second check digit uses the first weights shifted by one (CPF 11..2, CNPJ 6,5,..2).
function isValid(digits: string, weights: number[]): boolean {
  const nums = [...digits].map(Number);
  const checkDigit = (w: number[]) => {
    const rest = w.reduce((sum, weight, i) => sum + weight * nums[i], 0) % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const second = [weights[0] + 1, ...weights];
  const n = weights.length;
  return checkDigit(weights) === nums[n] && checkDigit(second) === nums[n + 1];
}
