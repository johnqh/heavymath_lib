# CLAUDE.md - @sudobility/heavymath_lib

> **Git policy — never auto-commit or auto-push.** Leave your work in the working tree.
> Run `git commit`, `git push`, `gh pr create`, or `scripts/push_all.sh` **only when the user
> explicitly asks in that turn**. Approval for an earlier change does not carry forward, and
> finishing a task is not permission to commit it.

## Project Overview

`@sudobility/heavymath_lib` is a React hooks library that wraps sports data fetching with user favorites management from `@sudobility/heavymath_indexer_client`. Every hook fetches sports data via the indexer proxy, fetches the user's favorites, then merges them so each item has a `favorited: boolean` flag and a `setFavorited()` method.

The library is platform-agnostic (works on both React web and React Native) and is part of the Heavymath prediction market ecosystem.

**Package**: `@sudobility/heavymath_lib` (v0.0.82, BUSL-1.1 license)
**Author**: John Huang

## Quick Commands

```bash
bun run build           # Compile TypeScript (uses tsconfig.build.json)
bun run build:watch     # Compile with watch mode
bun run clean           # Remove dist/
bun run test            # Run tests once (vitest run)
bun run test:watch      # Run tests in watch mode (vitest)
bun run lint            # ESLint check on src/
bun run lint:fix        # ESLint auto-fix
bun run format          # Prettier format src/
bun run format:check    # Prettier check src/
bun run typecheck       # TypeScript type validation (no emit)
bun run verify          # Run typecheck + lint + test (use before committing)
bun run prepublishOnly  # Clean + build (runs automatically on publish)
```

**Before committing**, run:
```bash
bun run verify
```

## Project Structure

```
heavymath_lib/
├── src/
│   ├── index.ts                          # Root exports (re-exports ./hooks)
│   ├── hooks/
│   │   ├── index.ts                      # Re-exports ./sports, ./useFavorites, ./useDiscussionForEntity
│   │   ├── useFavorites.ts                # Favorites with resolved display names
│   │   ├── useDiscussionForEntity.ts       # Discussion + auth state composition
│   │   └── sports/
│   │       ├── index.ts                  # Re-exports all 10 sport modules
│   │       ├── football/
│   │       │   ├── index.ts
│   │       │   ├── useFootballLeagues.ts
│   │       │   ├── useFootballTeams.ts
│   │       │   ├── useFootballMatches.ts
│   │       │   └── __tests__/            # Tests for all 3 football hooks
│   │       ├── basketball/               # useBasketballLeagues, Teams, Games
│   │       ├── nfl/                      # useNflLeagues, Teams, Games
│   │       ├── baseball/                 # useBaseballLeagues, Teams, Games
│   │       ├── hockey/                   # useHockeyLeagues, Teams, Games
│   │       ├── rugby/                    # useRugbyLeagues, Teams, Games
│   │       ├── handball/                 # useHandballLeagues, Teams, Games
│   │       ├── volleyball/               # useVolleyballLeagues, Teams, Games
│   │       ├── mma/                      # useMmaCategories, Fighters, Fights
│   │       ├── f1/                       # useF1Drivers, Teams, Races, Circuits
│   │       ├── utils/
│   │       │   └── seasons.ts             # Season lookup utilities
│   ├── __tests__/
│   │   └── index.test.ts                # Smoke tests for root exports
│   └── test/
│       └── setup.ts                      # Vitest setup (global afterEach cleanup)
├── package.json
├── tsconfig.json                         # Full strict TS config (ES2020, bundler resolution)
├── tsconfig.build.json                   # Extends tsconfig.json, excludes tests
├── eslint.config.js                      # ESLint flat config with TS + Prettier + react-hooks
├── vitest.config.ts                      # Vitest with happy-dom, coverage thresholds at 70%
├── .prettierrc                           # Single quotes, trailing commas, 80 width, 2-space indent
└── .gitignore
```

## The Core Pattern: Sports Hook + Favorites

Every hook in this library follows the same pattern. Understanding one means understanding all of them.

### How It Works

1. **Fetch sports data** using a proxy hook from `@sudobility/heavymath_indexer_client` (e.g., `useFootballLeagues`)
2. **Fetch user favorites** using `useFavorites` from `@sudobility/heavymath_indexer_client`, filtered by category/subcategory/type
3. **Build a `Set` of favorited IDs** from the favorites response for O(1) lookup
4. **Merge** the sports data with a `favorited: boolean` field on each item
5. **Expose `setFavorited(id, bool)`** that calls `addFavorite.mutateAsync()` or `removeFavorite.mutateAsync()`

### Signature Pattern

```typescript
function useXxxYyy(
  indexerClient: IndexerClient,           // For favorites API calls
  walletAddress: string | undefined,      // User's wallet (undefined = no favorites)
  options?: UseXxxYyyOptions              // { params?, enabled? }
): UseXxxYyyResult
```

### Return Type Pattern

```typescript
interface UseXxxYyyResult {
  items: XxxYyyWithFavorite[];     // Data with favorited flag
  isLoading: boolean;              // True if EITHER query is loading
  isError: boolean;                // Error from sports data query
  error: Error | null;             // Error from sports data query
  setFavorited: (id: number, favorited: boolean) => Promise<void>;
  favoritesLoading: boolean;       // Loading state of favorites specifically
  addFavoritePending: boolean;     // Mutation in progress
  removeFavoritePending: boolean;  // Mutation in progress
}
```

### Favorites Category Scheme

Favorites are stored with a three-level key: `category` / `subcategory` / `type`.

| Sport      | subcategory   | Types                          |
|------------|---------------|--------------------------------|
| Football   | `football`    | `league`, `team`, `match`      |
| Basketball | `basketball`  | `league`, `team`, `game`       |
| NFL        | `nfl`         | `league`, `team`, `game`       |
| Baseball   | `baseball`    | `league`, `team`, `game`       |
| Hockey     | `hockey`      | `league`, `team`, `game`       |
| Rugby      | `rugby`       | `league`, `team`, `game`       |
| Handball   | `handball`    | `league`, `team`, `game`       |
| Volleyball | `volleyball`  | `league`, `team`, `game`       |
| MMA        | `mma`         | `category`, `fighter`, `fight` |
| F1         | `f1`          | `driver`, `team`, `race`, `circuit` |

All use `category = 'sports'`.

## Available Hooks by Sport

### Standard team sports (Football, Basketball, NFL, Baseball, Hockey, Rugby, Handball, Volleyball)

Each has three hooks following the pattern `use{Sport}{Entity}`:
- **Leagues**: `useFootballLeagues`, `useBasketballLeagues`, `useNflLeagues`, etc.
- **Teams**: `useFootballTeams`, `useBasketballTeams`, `useNflTeams`, etc.
- **Games/Matches**: `useFootballMatches`, `useBasketballGames`, `useNflGames`, etc.

Note: Football uses "Matches" (wrapping the API's "Fixtures"); all other team sports use "Games".

### MMA (different entity structure)

- `useMmaCategories` - Weight classes (returns strings, not objects)
- `useMmaFighters` - Individual fighters
- `useMmaFights` - Fight events

### F1 (four entity types, unlike the standard three)

- `useF1Drivers` - F1 drivers
- `useF1Teams` - F1 teams/constructors
- `useF1Races` - F1 race events
- `useF1Circuits` - F1 circuits/tracks

### Non-Sport Hooks

- `useFavorites` (`src/hooks/useFavorites.ts`) - Wraps the raw indexer_client `useFavorites` hook and enriches favorites with resolved display names and images via `IndexerClient.getSportsData()`. Uses 24-hour cache for name resolution.
- `useDiscussionForEntity` (`src/hooks/useDiscussionForEntity.ts`) - Composition hook combining discussion metadata with auth state. Checks discussion locked status and determines if user can post comments.

## Testing

### Setup

- **Framework**: Vitest 4 with happy-dom environment
- **React Testing**: `@testing-library/react` with `renderHook` and `act`
- **Coverage**: v8 provider, 70% threshold for branches/functions/lines/statements
- **Mocking**: `vi.mock()` for `@sudobility/heavymath_indexer_client`

### Current Test Coverage

All 10 sports have full test coverage (32 test files, 187 tests total):

- **Football**: `useFootballLeagues.test.ts`, `useFootballTeams.test.ts`, `useFootballMatches.test.ts`
- **Basketball**: `useBasketballLeagues.test.ts`, `useBasketballTeams.test.ts`, `useBasketballGames.test.ts`
- **NFL**: `useNflLeagues.test.ts`, `useNflTeams.test.ts`, `useNflGames.test.ts`
- **Baseball**: `useBaseballLeagues.test.ts`, `useBaseballTeams.test.ts`, `useBaseballGames.test.ts`
- **Hockey**: `useHockeyLeagues.test.ts`, `useHockeyTeams.test.ts`, `useHockeyGames.test.ts`
- **Rugby**: `useRugbyLeagues.test.ts`, `useRugbyTeams.test.ts`, `useRugbyGames.test.ts`
- **Handball**: `useHandballLeagues.test.ts`, `useHandballTeams.test.ts`, `useHandballGames.test.ts`
- **Volleyball**: `useVolleyballLeagues.test.ts`, `useVolleyballTeams.test.ts`, `useVolleyballGames.test.ts`
- **MMA**: `useMmaCategories.test.ts`, `useMmaFighters.test.ts`, `useMmaFights.test.ts`
- **F1**: `useF1Drivers.test.ts`, `useF1Teams.test.ts`, `useF1Races.test.ts`, `useF1Circuits.test.ts`

Plus smoke tests in `src/__tests__/index.test.ts` (10 tests verifying all hooks are properly exported).

### Test Pattern

Every hook test follows this structure:

```typescript
// 1. Mock both dependencies before imports
vi.mock('@sudobility/heavymath_indexer_client', () => ({ useXxx: vi.fn(), useFavorites: vi.fn() }));

// 2. Import the mocked functions
import { useXxx } from '@sudobility/heavymath_indexer_client';
import { useFavorites } from '@sudobility/heavymath_indexer_client';

// 3. Create QueryClientProvider wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children);
};

// 4. Set up default mocks in beforeEach, test rendering with renderHook + wrapper
```

### Running Tests

```bash
bun run test              # Single run
bun run test:watch        # Watch mode
```

## Dependencies

### Peer Dependencies (must be provided by the consuming app)

| Package | Purpose |
|---------|---------|
| `@sudobility/heavymath_indexer_client` | `useFavorites`, `IndexerClient`, `WalletFavoriteData` |
| `@sudobility/heavymath_contracts` | Smart contract interactions |
| `@sudobility/heavymath_types` | Shared type definitions |
| `@sudobility/auctions_contracts` | Auction contract interactions |
| `@sudobility/types` | Core shared types |
| `@tanstack/react-query` | >=5.0.0 - Data fetching/caching layer |
| `react` | >=18.0.0 |

### Key Dev Dependencies

- TypeScript 5.9, Vitest 4, ESLint 9 (flat config), Prettier 3
- `@testing-library/react` for hook testing
- `happy-dom` as test DOM environment

## Code Patterns and Conventions

### TypeScript

- Strict mode with all strict flags enabled
- `noUnusedLocals` and `noUnusedParameters` enforced
- Prefix unused variables/params with `_` (enforced by ESLint rule)
- Target ES2020, module ESNext, bundler resolution
- JSX mode: `react`

### ESLint

- Flat config format (eslint.config.js)
- TypeScript + Prettier + react-hooks plugins
- `react-hooks/exhaustive-deps`: warn
- `@typescript-eslint/no-explicit-any`: off (allowed)
- `prefer-const`, `no-var`, `object-shorthand`, `prefer-template`: error
- Test files have relaxed rules (any allowed, console allowed)
- Test files are excluded from lint entirely via ignores

### Prettier

- Single quotes, semicolons, trailing commas (es5)
- 80 character line width, 2-space indent
- Arrow parens: avoid (`x => x` not `(x) => x`)
- LF line endings

### File Organization

- Each sport is a directory under `src/hooks/sports/`
- Each sport directory has an `index.ts` that re-exports its hooks
- Tests go in `__tests__/` subdirectory within the sport directory
- Interface types are co-located with the hook that uses them (not in a separate types/ directory)

### Naming Conventions

- Hook files: `use{Sport}{Entity}.ts` (e.g., `useFootballLeagues.ts`)
- WithFavorite types: `{Sport}{Entity}WithFavorite` (e.g., `FootballLeagueWithFavorite`)
- Options types: `Use{Sport}{Entity}Options`
- Result types: `Use{Sport}{Entity}Result`
- Favorites constants: `FAVORITES_CATEGORY`, `FAVORITES_SUBCATEGORY`, `FAVORITES_TYPE` (file-level const)

## Adding a New Sport

1. Create `src/hooks/sports/{sport}/` directory
2. Create hook files following the existing pattern (leagues, teams, games/matches)
3. Create `index.ts` re-exporting all hooks
4. Add `export * from './{sport}';` to `src/hooks/sports/index.ts`
5. Add tests in `__tests__/` subdirectory
6. Run `bun run verify`

## Common Pitfalls

- **Use `bun run verify`** to run all checks (typecheck + lint + test) before committing.
- **No `test:run` script.** The `test` script already does `vitest run` (single run). Use `test:watch` for watch mode.
- **No `test:coverage` script.** Run `bunx vitest run --coverage` directly.
- **Football uses "Matches" wrapping "Fixtures"** from the API. The hook is `useFootballMatches` but internally calls `useFootballFixtures` from the API client.
- **MMA has different entity names** than other sports: categories (not leagues), fighters (not teams), fights (not games).
- **F1 has four entity types** (drivers, teams, races, circuits) instead of the standard three.
- **Favorites ID conversion**: Sports API returns numeric IDs, but favorites stores string IDs. All hooks do `String(numericId)` when comparing or storing.
- **`isLoading` combines both queries**: A hook reports `isLoading: true` when either the sports data OR the favorites are still loading.
- **Error state only reflects sports data**: `isError` and `error` come from the sports API query, not from the favorites query.
- **Build uses `tsconfig.build.json`**, not `tsconfig.json`. The build config extends the base but excludes test files and `__tests__/` directories.
- **CI/CD** uses a reusable GitHub Actions workflow at `.github/workflows/ci-cd.yml`. Triggers on push/PR to `main` and `develop`. Calls `johnqh/workflows/.github/workflows/unified-cicd.yml@main` with npm-access "restricted".

## Build and Publish

```bash
bun run clean && bun run build    # Manual build
bun publish                       # Runs prepublishOnly automatically (clean + build)
```

Output goes to `dist/` with `.js`, `.d.ts`, and `.d.ts.map` files. Only `dist/**/*` is included in the published package. Access is restricted (`publishConfig.access: "restricted"`).

## Ecosystem Context

This library adds business logic on top of the indexer client:

```
heavymath_contracts  (equilibrium algorithm originates here in Solidity)
       ↓
heavymath_indexer    (REST API including /api/sports/* proxy)
       ↓
heavymath_indexer_client  (proxy hooks: useFootballLeagues, useFavorites, etc.)
       ↓ peer dependency
heavymath_lib        ← YOU ARE HERE (merges sports + favorites)
       ↓
heavymath_app        (consumes the merged hooks)
```

### What This Library Actually Does

1. **Sports + Favorites Merging**: Each hook (e.g., `useFootballLeagues`) calls the indexer_client proxy hook to fetch sports data AND `useFavorites` to fetch the user's favorites, then merges them so every item has a `favorited: boolean` field and optionally a `favoriteCount: number`.

2. **Market module** (`src/market/`): Previously contained off-chain equilibrium calculation code. The equilibrium source has been removed; `src/market/index.ts` is now an empty export (`export {}`). Stale build artifacts may remain in `dist/market/` from prior builds — these are not used and will be cleaned on the next `bun run clean && bun run build`.

### Dependency Chain

This library depends on `@sudobility/heavymath_indexer_client` as a **peer dependency**. The proxy hooks it wraps (e.g., `useFootballLeagues` from indexer_client) call the indexer's `/api/sports/:sport/*` endpoint, which proxies to api-sports.io with TTL caching.

When indexer_client adds new sports proxy hooks, corresponding wrapper hooks should be added here to include favorites support.

## Git Workflow

- Do not use feature branches for code changes. Always stay on the current branch.
