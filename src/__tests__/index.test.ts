/**
 * Basic smoke tests for @heavymath/lib
 */

import { describe, it, expect } from 'vitest';
import { VERSION, placeholder } from '../index';

describe('@heavymath/lib', () => {
  it('should export VERSION', () => {
    expect(VERSION).toBeDefined();
    expect(typeof VERSION).toBe('string');
  });

  it('should export placeholder with correct structure', () => {
    expect(placeholder).toBeDefined();
    expect(placeholder.name).toBe('@heavymath/lib');
    expect(placeholder.version).toBe(VERSION);
  });

  it('should have a valid version format', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
