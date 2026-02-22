# Claude Code Workflows for Heavymath Lib

This guide helps you work efficiently with Claude Code on the @heavymath/lib project.

## Quick Start

### Essential Commands

```bash
bun run build         # Compile TypeScript to dist/
bun run typecheck     # Type validation (no emit)
bun test              # Run tests in watch mode
bun run test:run      # Run tests once
bun run lint          # Check for linting errors
bun run lint:fix      # Auto-fix linting issues
bun run format        # Format code with Prettier
bun run check-all     # Run lint + typecheck + tests (use before commits)
bun run quick-check   # Fast validation (lint + typecheck only)
```

### Validation Workflow

Always run before committing:
```bash
bun run check-all     # Combines lint, typecheck, and test:run
```

## Project Overview

### What is @heavymath/lib?

A business logic library for the Heavymath prediction market platform, providing:

- Platform-agnostic business logic (works on web and React Native)
- React hooks for prediction market operations
- Integration with @heavymath/indexer_client for API access
- Type-safe interfaces and utilities

### Key Principles

1. **Platform Abstraction**: Code MUST work on both web and React Native
2. **Interface-First Design**: ALWAYS define interfaces before implementations
3. **Business Logic Separation**: Pure domain logic separate from platform code
4. **Comprehensive Testing**: All business logic MUST be tested
5. **Type Safety**: Strict TypeScript with full type coverage

## Project Structure

```
heavymath_lib/
├── src/
│   ├── index.ts              # Main exports
│   ├── business/             # Core business logic (to be added)
│   │   ├── core/            # Domain operations
│   │   │   ├── market/      # Market business logic
│   │   │   ├── prediction/  # Prediction/betting logic
│   │   │   └── dealer/      # Dealer operations
│   │   ├── hooks/           # React hooks
│   │   │   ├── useMarket.ts
│   │   │   ├── usePredictions.ts
│   │   │   └── useDealer.ts
│   │   └── context/         # React contexts
│   ├── types/               # TypeScript definitions (to be added)
│   │   ├── market.ts
│   │   ├── prediction.ts
│   │   └── dealer.ts
│   ├── utils/               # Utility functions (to be added)
│   │   ├── formatting.ts
│   │   ├── validation.ts
│   │   └── calculations.ts
│   ├── test/
│   │   └── setup.ts         # Test configuration
│   └── __tests__/
│       └── index.test.ts    # Smoke tests
├── package.json
├── tsconfig.json            # TypeScript config (strict mode)
├── tsconfig.build.json      # Build-specific config
├── eslint.config.js         # ESLint flat config
├── vitest.config.ts         # Test configuration
├── .prettierrc              # Code formatting
└── .gitignore
```

### Navigation Tips

- **Adding business logic**: Start in `src/business/core/`
- **Adding React hooks**: Create in `src/business/hooks/`
- **Adding types**: Define in `src/types/`
- **Adding utilities**: Add to `src/utils/`
- **Writing tests**: Add to `src/__tests__/` or alongside source files

## Common Workflows

### 1. Adding a New Business Operation

**Steps:**
1. Define TypeScript interface in `src/types/`
2. Implement business logic in `src/business/core/`
3. Create React hook in `src/business/hooks/`
4. Export from `src/index.ts`
5. Write tests

**Pattern:**
```typescript
// 1. Define interface (src/types/market.ts)
export interface MarketOperations {
  getActiveMarkets(): Promise<Market[]>;
  getMarketById(id: string): Promise<Market>;
}

// 2. Implement business logic (src/business/core/market/market-operations.ts)
export class MarketOperationsImpl implements MarketOperations {
  constructor(private client: IndexerClient) {}

  async getActiveMarkets(): Promise<Market[]> {
    const response = await this.client.getMarkets({ status: 'Active' });
    return response.data;
  }

  async getMarketById(id: string): Promise<Market> {
    const response = await this.client.getMarket(id);
    if (!response.data) throw new Error('Market not found');
    return response.data;
  }
}

// 3. Create hook (src/business/hooks/useMarket.ts)
export function useMarket(marketId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [market, setMarket] = useState<Market | null>(null);

  // ... implementation
  return { market, loading, error };
}
```

### 2. Adding a New Hook

**Pattern:**
```typescript
import { useCallback, useState } from 'react';

export function useFeature(config: FeatureConfig) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FeatureData | null>(null);

  const execute = useCallback(async (param: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await performOperation(param);
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Operation failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  return { execute, data, isLoading, error, clearError: () => setError(null) };
}
```

### 3. Adding Utility Functions

**Pattern:**
```typescript
// src/utils/formatting.ts

/**
 * Format odds for display
 * @param odds - Raw odds value
 * @returns Formatted odds string
 */
export function formatOdds(odds: number): string {
  return `${(odds * 100).toFixed(1)}%`;
}

/**
 * Calculate potential payout
 * @param amount - Bet amount
 * @param odds - Current odds
 * @returns Potential payout
 */
export function calculatePayout(amount: bigint, odds: number): bigint {
  return BigInt(Math.floor(Number(amount) / odds));
}
```

## Code Patterns

### Error Handling
```typescript
try {
  const result = await apiCall();
  return result;
} catch (err) {
  const errorMessage = err instanceof Error
    ? err.message
    : 'Operation failed';
  setError(errorMessage);
  throw err;
}
```

### Type Safety
```typescript
// Always use explicit types
interface MarketData {
  id: string;
  title: string;
  status: MarketStatus;
  odds: number;
}

// Use type guards for runtime checks
function isMarket(obj: unknown): obj is MarketData {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'title' in obj
  );
}
```

### BigInt Handling
```typescript
// Convert BigInt for display
function formatAmount(amount: string): string {
  const value = BigInt(amount);
  return (Number(value) / 1e18).toFixed(4);
}

// Parse user input to BigInt
function parseAmount(input: string): string {
  const value = parseFloat(input);
  return (BigInt(Math.floor(value * 1e18))).toString();
}
```

## Testing

### Running Tests
```bash
bun test              # Watch mode
bun run test:run      # Single run
bun run test:coverage # With coverage
```

### Test Pattern
```typescript
import { describe, it, expect, vi } from 'vitest';
import { MarketOperations } from '../business/core/market';

describe('MarketOperations', () => {
  it('should fetch active markets', async () => {
    const mockClient = {
      getMarkets: vi.fn().mockResolvedValue({
        data: [{ id: '1', title: 'Test Market' }],
      }),
    };

    const operations = new MarketOperations(mockClient);
    const result = await operations.getActiveMarkets();

    expect(result).toHaveLength(1);
    expect(mockClient.getMarkets).toHaveBeenCalledWith({ status: 'Active' });
  });
});
```

## Dependencies

### Peer Dependencies
- `@heavymath/indexer_client` - API client for indexer
- `@tanstack/react-query` - Data fetching and caching
- `react` - React framework

### Dev Dependencies
- TypeScript, ESLint, Prettier, Vitest

## Related Projects

- **@heavymath/indexer_client** (`../heavymath_indexer_client`) - API client
- **heavymath_indexer** (`../heavymath_indexer`) - Backend indexer service

## Best Practices

### Do's
- Define interfaces before implementations
- Write tests for all business logic
- Use strict TypeScript types
- Keep business logic platform-agnostic
- Export from index.ts
- Run `bun run check-all` before committing

### Don'ts
- Don't import platform-specific modules (React Native, web APIs) in business logic
- Don't use `any` type without justification
- Don't skip error handling
- Don't hardcode configuration values
- Don't mix UI concerns with business logic

## Quick Reference

### Type Conventions
- IDs: Chain-prefixed strings (`"1-market-123"`)
- Addresses: Lowercase hex strings (`"0xabc..."`)
- BigInt values: Stored as strings (`"1000000000000000000"`)
- Dates: ISO 8601 strings (`"2024-01-15T12:00:00Z"`)

### Common Imports
```typescript
// From indexer client
import type { Market, Prediction, DealerNFT } from '@heavymath/indexer_client';
import { IndexerClient, useMarkets } from '@heavymath/indexer_client';

// From React Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// From React
import { useState, useCallback, useMemo, useEffect } from 'react';
```

---

**Remember**: Always run `bun run check-all` before committing!
