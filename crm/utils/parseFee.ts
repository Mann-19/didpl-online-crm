export function parseFee(feeValue: string | number | undefined | null, baseAmount: number): number {
  if (!feeValue) return 0;
  const str = String(feeValue).trim();
  if (str.endsWith('%')) {
    const pct = Number(str.replace('%', ''));
    if (isNaN(pct)) return 0;
    return (baseAmount * pct) / 100;
  }
  const amt = Number(str);
  return isNaN(amt) ? 0 : amt;
}
