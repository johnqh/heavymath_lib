/**
 * Basic smoke tests for @sudobility/heavymath_lib
 * Verifies that all expected hooks are exported from the root module.
 */

import { describe, it, expect } from 'vitest';
import * as lib from '../index';

describe('@sudobility/heavymath_lib', () => {
  it('should export football hooks', () => {
    expect(lib.useFootballLeagues).toBeDefined();
    expect(lib.useFootballTeams).toBeDefined();
    expect(lib.useFootballMatches).toBeDefined();
  });

  it('should export basketball hooks', () => {
    expect(lib.useBasketballLeagues).toBeDefined();
    expect(lib.useBasketballTeams).toBeDefined();
    expect(lib.useBasketballGames).toBeDefined();
  });

  it('should export nfl hooks', () => {
    expect(lib.useNflLeagues).toBeDefined();
    expect(lib.useNflTeams).toBeDefined();
    expect(lib.useNflGames).toBeDefined();
  });

  it('should export baseball hooks', () => {
    expect(lib.useBaseballLeagues).toBeDefined();
    expect(lib.useBaseballTeams).toBeDefined();
    expect(lib.useBaseballGames).toBeDefined();
  });

  it('should export hockey hooks', () => {
    expect(lib.useHockeyLeagues).toBeDefined();
    expect(lib.useHockeyTeams).toBeDefined();
    expect(lib.useHockeyGames).toBeDefined();
  });

  it('should export rugby hooks', () => {
    expect(lib.useRugbyLeagues).toBeDefined();
    expect(lib.useRugbyTeams).toBeDefined();
    expect(lib.useRugbyGames).toBeDefined();
  });

  it('should export handball hooks', () => {
    expect(lib.useHandballLeagues).toBeDefined();
    expect(lib.useHandballTeams).toBeDefined();
    expect(lib.useHandballGames).toBeDefined();
  });

  it('should export volleyball hooks', () => {
    expect(lib.useVolleyballLeagues).toBeDefined();
    expect(lib.useVolleyballTeams).toBeDefined();
    expect(lib.useVolleyballGames).toBeDefined();
  });

  it('should export mma hooks', () => {
    expect(lib.useMmaCategories).toBeDefined();
    expect(lib.useMmaFighters).toBeDefined();
    expect(lib.useMmaFights).toBeDefined();
  });

  it('should export f1 hooks', () => {
    expect(lib.useF1Drivers).toBeDefined();
    expect(lib.useF1Teams).toBeDefined();
    expect(lib.useF1Races).toBeDefined();
    expect(lib.useF1Circuits).toBeDefined();
  });
});
