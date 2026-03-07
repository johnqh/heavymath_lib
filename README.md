# @sudobility/heavymath_lib

React hooks library for the Heavymath prediction market platform. Wraps sports data hooks from `@sudobility/sports_api_client` and merges them with user favorites from `@sudobility/heavymath_indexer_client`.

## Installation

```bash
bun add @sudobility/heavymath_lib
```

## Usage

Every hook fetches sports data, fetches the user's favorites, then merges them so each item has a `favorited` flag and a `setFavorited()` method.

```typescript
import { useFootballLeagues, useBasketballGames, useF1Drivers } from '@sudobility/heavymath_lib';

function Leagues() {
  const { items, isLoading, setFavorited } = useFootballLeagues(indexerClient, walletAddress);

  return items.map(league => (
    <div key={league.id}>
      {league.name} {league.favorited ? '(fav)' : ''}
      <button onClick={() => setFavorited(league.id, !league.favorited)}>Toggle</button>
    </div>
  ));
}
```

## Available Hooks

### Standard Team Sports (8 sports x 3 hooks each)

Football, Basketball, NFL, Baseball, Hockey, Rugby, Handball, Volleyball:

- `use{Sport}Leagues` / `use{Sport}Teams` / `use{Sport}Games`
- Football uses `useFootballMatches` (not Games)

### MMA

- `useMmaCategories`, `useMmaFighters`, `useMmaFights`

### Formula 1

- `useF1Drivers`, `useF1Teams`, `useF1Races`, `useF1Circuits`

## Hook Signature

```typescript
function useXxxYyy(
  indexerClient: IndexerClient,
  walletAddress: string | undefined,
  options?: { params?; enabled? }
): {
  items: XxxYyyWithFavorite[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  setFavorited: (id: number, favorited: boolean) => Promise<void>;
  favoritesLoading: boolean;
  addFavoritePending: boolean;
  removeFavoritePending: boolean;
}
```

## Development

```bash
bun run build        # Compile TypeScript
bun run test         # Run Vitest (187 tests across 32 files)
bun run typecheck    # TypeScript validation
bun run lint         # ESLint check
bun run verify       # Typecheck + lint + test
```

## Peer Dependencies

- `@sudobility/sports_api_client` -- raw sports data hooks
- `@sudobility/heavymath_indexer_client` -- favorites API
- `@sudobility/heavymath_types`, `@sudobility/types`
- `@tanstack/react-query` >= 5.0.0, `react` >= 18.0.0

## Related Packages

- `@sudobility/heavymath_types` -- shared type definitions
- `@sudobility/heavymath_indexer_client` -- indexer API client
- `@sudobility/sports_api_client` -- sports data fetching
- `heavymath_app` -- frontend web application

## License

BUSL-1.1
