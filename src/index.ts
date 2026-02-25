/**
 * @sudobility/heavymath_lib - Business logic library for Heavymath prediction market platform
 *
 * This library provides platform-agnostic React hooks that combine sports data
 * from `@sudobility/sports_api_client` with user favorites management from
 * `@sudobility/heavymath_indexer_client`. Each hook fetches sports data, fetches
 * the user's favorites, and merges them so every item has a `favorited` flag
 * and a `setFavorited()` method.
 *
 * Works with both React web and React Native applications.
 *
 * @packageDocumentation
 */

// ============================================================================
// EXPORTS
// ============================================================================

// React hooks for all sports with favorites support
export * from './hooks';

// Market equilibrium calculation utilities
export * from './market';
