export function parseCardNumberInput(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0 || digits.length > 8) {
    return null;
  }
  return digits;
}
