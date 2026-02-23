# Improvement Plans for @sudobility/heavymath_lib

## Priority 1 - High Impact

### 1. Add Test Coverage for Non-Football Sports (8 Sports Missing Tests)
- Tests exist only for the `football/` hooks (3 test files: `useFootballLeagues.test.ts`, `useFootballTeams.test.ts`, `useFootballMatches.test.ts`).
- The remaining 8 sports directories have zero test coverage: `basketball`, `nfl`, `baseball`, `hockey`, `rugby`, `handball`, `volleyball`, and `mma`.
- There is also a `f1` module exported from `src/hooks/sports/index.ts` that is not mentioned in CLAUDE.md at all, suggesting it was added without documentation.
- Since all sports hooks follow the same pattern, tests can be templated: mock the sports API hook, mock `useFavorites`, verify merging logic, verify `setFavorited` calls `addFavorite.mutateAsync` or `removeFavorite.mutateAsync`.
- The vitest.config.ts has a 70% coverage threshold, but this may be met only because football tests cover the shared pattern. Per-sport coverage should be verified.

### 2. Eliminate Boilerplate Duplication Across Sports Hooks
- Every sports hook file (e.g., `useFootballLeagues.ts`, `useBasketballLeagues.ts`, `useNflLeagues.ts`) repeats the same pattern: fetch sports data, fetch favorites, build a `Set` of favorited IDs, merge with `favorited: boolean`, expose `setFavorited`.
- This creates ~27 hook files (9 sports x 3 entities each) with nearly identical logic, differing only in: the sports API hook called, the favorites subcategory/type constants, and the entity's ID field path.
- Extracting a generic `createSportsHookWithFavorites` factory function that accepts a config object (API hook, subcategory, type, ID extractor) would reduce each sport-specific hook to ~10 lines of configuration.
- This would also make it trivial to add new sports in the future and ensure consistent behavior across all hooks.

### 3. Add JSDoc to All Exported Types and Interfaces
- While `useFootballLeagues` has good JSDoc with `@param`, `@returns`, and `@example`, the pattern is not consistently applied across all sports.
- Exported interfaces like `UseFootballLeaguesOptions`, `UseFootballLeaguesResult`, and `FootballLeagueWithFavorite` have minimal or no JSDoc.
- The same applies to every other sport's types. Since these are the primary API surface of the library, complete JSDoc would significantly improve the developer experience.

## Priority 2 - Medium Impact

### 3. Add Error Handling for Favorites Operations in setFavorited
- The `setFavorited` callback in each hook calls `addFavorite.mutateAsync()` or `removeFavorite.mutateAsync()` but does not catch or handle errors.
- If the favorites API is unavailable or returns an error, the promise rejection will propagate to the component without any library-level error handling.
- The `removeFavorite` path has a silent failure mode: if `favorites.find(f => f.itemId === itemId)` returns `undefined` (e.g., due to a stale favorites list), the function silently does nothing.
- Adding error boundary logic, retry behavior, or at minimum logging would improve robustness.

### 4. Remove Placeholder Exports from Root index.ts
- The root `src/index.ts` exports `VERSION = '0.0.1'` and a `placeholder` object with hardcoded metadata.
- The `VERSION` constant is not synchronized with `package.json` and will become stale.
- The `placeholder` object provides no functionality and is listed as "will be replaced with actual exports."
- These should be removed or replaced with actual utility exports now that the hooks layer is implemented.

### 5. Add the Missing `verify` Script and CI/CD Pipeline
- CLAUDE.md explicitly notes: "No CI/CD workflows exist (no `.github/workflows/` directory)."
- There is no `verify` or `check-all` script; instead, developers must run `typecheck`, `lint`, and `test` separately.
- Adding a `bun run verify` script (consistent with the ecosystem convention) and a CI/CD workflow using the shared `johnqh/workflows` pattern would ensure quality gates are enforced.

## Priority 3 - Nice to Have

### 6. Document and Test the F1 Module
- The `src/hooks/sports/index.ts` barrel file exports `./f1`, but F1 is not documented in CLAUDE.md's sport list, favorites category scheme table, or the "Available Hooks by Sport" section.
- This module should either be documented with its hooks, types, and favorites category/subcategory/type scheme, or removed if it is incomplete.

### 7. Add Stale-While-Revalidate or Background Refresh for Favorites
- Currently, the favorites data freshness depends entirely on the `useFavorites` hook from `@sudobility/heavymath_indexer_client`.
- If a user favorites an item on another device or in another tab, the library has no mechanism to detect the stale state and refresh.
- Adding optional `refetchInterval` or `staleTime` configuration to the favorites query within each hook would allow automatic background refresh without requiring manual intervention.

### 8. Add Performance Optimization for Large Favorites Sets
- The `favoritedIds` Set is rebuilt on every favorites change via `useMemo`, which is efficient for small lists.
- However, for users with hundreds of favorites, the `favorites.map(f => f.itemId)` and subsequent `favoritedIds.has()` calls during the merge step could become a bottleneck, especially if sports data also has hundreds of items.
- Profiling this with realistic data sizes and potentially memoizing at a more granular level (e.g., per-item favorite status) would ensure smooth performance at scale.
