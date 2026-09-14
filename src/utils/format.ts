export function formatTZS(amount: number) {
  return 'TZS ' + Math.round(amount).toLocaleString('en-US')
}
