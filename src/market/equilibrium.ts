/**
 * Off-chain equilibrium calculation for PredictionMarket contracts.
 *
 * These pure functions mirror the on-chain `calculateEquilibrium()` and
 * `_hasTwoSidedMarket()` logic so that callers can pre-compute the equilibrium
 * and pass it to `resolveMarketWithEquilibrium()`, saving ~200k gas per resolution.
 */

/**
 * Calculate the equilibrium percentage point for a prediction market.
 *
 * The equilibrium is the percentage `p` (1-99) where
 *   `totalBelow * (100 - p)` is closest to `totalAbove * p`,
 * i.e., `total_below / total_above ≈ p / (100 - p)`.
 *
 * This mirrors the on-chain `calculateEquilibrium()` exactly but computes
 * `cumulativeAbove` with an O(n) right-to-left pass instead of the
 * contract's O(n^2) nested loop.
 *
 * @param percentageTotals - Array of exactly 101 elements where index = percentage
 *   (0-100) and value = total USDC staked at that percentage (as bigint).
 * @returns The equilibrium percentage (0-100). Returns 0 when no valid
 *   equilibrium exists (e.g., empty market or all stakes at a single point).
 */
export function calculateEquilibrium(percentageTotals: bigint[]): number {
  if (percentageTotals.length !== 101) {
    throw new Error(
      `percentageTotals must have exactly 101 elements, got ${percentageTotals.length}`
    );
  }

  // Build cumulative below: cumulativeBelow[i] = sum of percentageTotals[0..i-1]
  const cumulativeBelow: bigint[] = new Array(101);
  cumulativeBelow[0] = 0n;
  for (let i = 1; i <= 100; i++) {
    cumulativeBelow[i] = cumulativeBelow[i - 1] + percentageTotals[i - 1];
  }

  // Build cumulative above: cumulativeAbove[i] = sum of percentageTotals[i+1..100]
  // O(n) right-to-left pass instead of the contract's O(n^2) nested loop
  const cumulativeAbove: bigint[] = new Array(101);
  cumulativeAbove[100] = 0n;
  for (let i = 99; i >= 0; i--) {
    cumulativeAbove[i] = cumulativeAbove[i + 1] + percentageTotals[i + 1];
  }

  // Find the percentage p (1-99) that minimizes |below*(100-p) - above*p|
  let bestEquilibrium = 0;
  let bestDifference: bigint | null = null;

  for (let p = 1; p < 100; p++) {
    const below = cumulativeBelow[p];
    const above = cumulativeAbove[p];

    if (below === 0n && above === 0n) {
      continue;
    }

    const leftSide = below * BigInt(100 - p);
    const rightSide = above * BigInt(p);
    const difference =
      leftSide > rightSide ? leftSide - rightSide : rightSide - leftSide;

    if (bestDifference === null || difference < bestDifference) {
      bestDifference = difference;
      bestEquilibrium = p;
    }
  }

  return bestEquilibrium;
}

/**
 * Check whether a market has stakes on both sides of the equilibrium.
 *
 * Mirrors the on-chain `_hasTwoSidedMarket()`. If the market is one-sided,
 * the contract will auto-cancel it instead of resolving.
 *
 * @param percentageTotals - Array of exactly 101 elements (same as `calculateEquilibrium`).
 * @param equilibrium - The equilibrium percentage (0-100), as returned by `calculateEquilibrium`.
 * @returns `true` if there are stakes on both sides of the equilibrium.
 */
export function hasTwoSidedMarket(
  percentageTotals: bigint[],
  equilibrium: number
): boolean {
  if (percentageTotals.length !== 101) {
    throw new Error(
      `percentageTotals must have exactly 101 elements, got ${percentageTotals.length}`
    );
  }

  let hasBelow = false;
  let hasAbove = false;

  if (equilibrium > 0) {
    for (let i = 0; i < equilibrium; i++) {
      if (percentageTotals[i] > 0n) {
        hasBelow = true;
        break;
      }
    }
  }

  if (equilibrium < 100) {
    for (let j = equilibrium + 1; j <= 100; j++) {
      if (percentageTotals[j] > 0n) {
        hasAbove = true;
        break;
      }
    }
  }

  return hasBelow && hasAbove;
}
