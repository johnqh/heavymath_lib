import { describe, it, expect } from 'vitest';
import { calculateEquilibrium, hasTwoSidedMarket } from '../equilibrium';

/** Helper: creates a zero-filled array of 101 bigints, then sets given entries. */
function makeTotals(
  entries: Record<number, bigint | number>
): bigint[] {
  const arr: bigint[] = new Array(101).fill(0n);
  for (const [pct, val] of Object.entries(entries)) {
    arr[Number(pct)] = BigInt(val);
  }
  return arr;
}

// USDC has 6 decimals
const toUSDC = (value: number) => BigInt(value) * 1_000_000n;

describe('calculateEquilibrium', () => {
  it('finds 50% equilibrium for symmetric bets (150 at 40%, 150 at 60%)', () => {
    const totals = makeTotals({ 40: toUSDC(150), 60: toUSDC(150) });
    expect(calculateEquilibrium(totals)).toBe(50);
  });

  it('finds equilibrium for asymmetric bets (100 at 30%, 120 at 50%, 100 at 70%)', () => {
    const totals = makeTotals({
      30: toUSDC(100),
      50: toUSDC(120),
      70: toUSDC(100),
    });
    expect(calculateEquilibrium(totals)).toBe(50);
  });

  it('finds equilibrium for three bets (150 at 30%, 150 at 50%, 150 at 80%)', () => {
    const totals = makeTotals({
      30: toUSDC(150),
      50: toUSDC(150),
      80: toUSDC(150),
    });
    expect(calculateEquilibrium(totals)).toBe(50);
  });

  it('finds equilibrium for two bets (100 at 40%, 100 at 80%)', () => {
    const totals = makeTotals({ 40: toUSDC(100), 80: toUSDC(100) });
    // With 100 at 40% and 100 at 80%:
    // At p=40: below=0, above=100 → diff = |0 - 100*40| = 4000
    // At p=60: below=100, above=100 → diff = |100*40 - 100*60| = 2000
    // At p=50: below=100, above=100 → diff = |100*50 - 100*50| = 0
    const eq = calculateEquilibrium(totals);
    // Equilibrium should be where ratio balances (around 50 for equal amounts)
    expect(eq).toBe(50);
  });

  it('returns 0 for an empty market (all zeros)', () => {
    const totals = new Array(101).fill(0n);
    expect(calculateEquilibrium(totals)).toBe(0);
  });

  it('returns best-match for single percentage point (all at one spot)', () => {
    const totals = makeTotals({ 60: toUSDC(500) });
    // Only stakes at 60, so:
    // - below = 0 for p<=60, above = 0 for p>=60
    // - Only p where below>0 OR above>0 matters
    // At p<60: below=0, above=500 → diff = 500*p
    // At p>60: below=500, above=0 → diff = 500*(100-p)
    // Smallest diff at p=1 (500) vs p=99 (500) — but 1 comes first
    const eq = calculateEquilibrium(totals);
    // The contract would also pick the first p that minimizes difference
    expect(eq).toBeGreaterThan(0);
  });

  it('handles all bets below 50%', () => {
    const totals = makeTotals({ 10: toUSDC(100), 20: toUSDC(200) });
    const eq = calculateEquilibrium(totals);
    // All stakes are at 10 and 20
    // below=100 at p=11..20, below=300 at p=21+
    // above=200 at p=0..19, above=0 at p=21+
    expect(eq).toBeGreaterThan(0);
    expect(eq).toBeLessThan(100);
  });

  it('handles all bets above 50%', () => {
    const totals = makeTotals({ 70: toUSDC(100), 90: toUSDC(200) });
    const eq = calculateEquilibrium(totals);
    expect(eq).toBeGreaterThan(0);
    expect(eq).toBeLessThan(100);
  });

  it('throws if array length is not 101', () => {
    expect(() => calculateEquilibrium([])).toThrow(
      'percentageTotals must have exactly 101 elements'
    );
    expect(() => calculateEquilibrium(new Array(100).fill(0n))).toThrow(
      'percentageTotals must have exactly 101 elements'
    );
    expect(() => calculateEquilibrium(new Array(102).fill(0n))).toThrow(
      'percentageTotals must have exactly 101 elements'
    );
  });

  it('matches contract result for the payout distribution scenario (100 at 40%, 100 at 80%)', () => {
    // This mirrors the PredictionMarket.test.ts "distributes payouts" scenario
    const totals = makeTotals({ 40: toUSDC(100), 80: toUSDC(100) });
    const eq = calculateEquilibrium(totals);
    // Contract resolves at 70, equilibrium at 50 for equal amounts on both sides
    expect(eq).toBe(50);
  });
});

describe('hasTwoSidedMarket', () => {
  it('returns true when stakes exist on both sides', () => {
    const totals = makeTotals({ 30: toUSDC(100), 70: toUSDC(100) });
    expect(hasTwoSidedMarket(totals, 50)).toBe(true);
  });

  it('returns false when all stakes are on one side (below)', () => {
    const totals = makeTotals({ 10: toUSDC(100), 20: toUSDC(200) });
    // equilibrium=50 → only stakes below 50
    expect(hasTwoSidedMarket(totals, 50)).toBe(false);
  });

  it('returns false when all stakes are on one side (above)', () => {
    const totals = makeTotals({ 60: toUSDC(100), 80: toUSDC(200) });
    expect(hasTwoSidedMarket(totals, 50)).toBe(false);
  });

  it('returns false for single stake at equilibrium only', () => {
    const totals = makeTotals({ 50: toUSDC(100) });
    expect(hasTwoSidedMarket(totals, 50)).toBe(false);
  });

  it('handles edge case: equilibrium = 1', () => {
    const totals = makeTotals({ 0: toUSDC(100), 2: toUSDC(100) });
    expect(hasTwoSidedMarket(totals, 1)).toBe(true);
  });

  it('handles edge case: equilibrium = 99', () => {
    const totals = makeTotals({ 98: toUSDC(100), 100: toUSDC(100) });
    expect(hasTwoSidedMarket(totals, 99)).toBe(true);
  });

  it('returns false when equilibrium = 0 (no below side possible)', () => {
    const totals = makeTotals({ 10: toUSDC(100), 90: toUSDC(100) });
    expect(hasTwoSidedMarket(totals, 0)).toBe(false);
  });

  it('returns false when equilibrium = 100 (no above side possible)', () => {
    const totals = makeTotals({ 10: toUSDC(100), 90: toUSDC(100) });
    expect(hasTwoSidedMarket(totals, 100)).toBe(false);
  });

  it('throws if array length is not 101', () => {
    expect(() => hasTwoSidedMarket([], 50)).toThrow(
      'percentageTotals must have exactly 101 elements'
    );
  });
});
