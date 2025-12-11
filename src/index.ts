/**
 * @heavymath/lib - Business logic library for Heavymath prediction market platform
 *
 * This library provides platform-agnostic business logic for the Heavymath ecosystem.
 * It is designed to work with both React web and React Native applications.
 *
 * Architecture:
 * - business/   : Core business logic and React hooks
 * - types/      : TypeScript type definitions
 * - utils/      : Utility functions and helpers
 */

// ============================================================================
// EXPORTS
// ============================================================================

// React hooks
export * from './hooks';

/**
 * Library version
 */
export const VERSION = '0.0.1';

/**
 * Placeholder export to ensure the module is valid
 * This will be replaced with actual exports as business logic is added
 */
export const placeholder = {
  name: '@heavymath/lib',
  version: VERSION,
  description:
    'Business logic library for Heavymath prediction market platform',
};
