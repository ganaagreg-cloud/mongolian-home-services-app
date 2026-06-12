// Money is always integer MNT
export function formatMnt(amount: number): string {
  return `${Math.floor(amount).toLocaleString('en-US')}₮`
}
