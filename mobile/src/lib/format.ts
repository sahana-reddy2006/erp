export function formatINR(amount: number): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);

  try {
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: abs % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(abs);
    if (formatted.includes('₹')) {
      return isNegative ? `-${formatted}` : formatted;
    }
  } catch {
    // Fallback below for limited JS engines
  }

  const fixed = abs % 1 === 0 ? String(Math.round(abs)) : abs.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const lastThree = intPart.slice(-3);
  const otherDigits = intPart.slice(0, -3);
  const grouped =
    otherDigits.length > 0
      ? otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
      : lastThree;

  return `${isNegative ? '-' : ''}₹${grouped}${decPart ? `.${decPart}` : ''}`;
}
