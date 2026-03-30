import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useF1Races } from '../useF1Races';
vi.mock('@sudobility/heavymath_indexer_client', () => ({
  useFavorites: vi.fn(),
  useFavoriteCounts: vi.fn().mockReturnValue({ counts: {}, isLoading: false }),
  useF1Races: vi.fn(),
}));
import {
  useFavorites,
  useF1Races as useApi,
} from '@sudobility/heavymath_indexer_client';
const mockUseApi = vi.mocked(useApi);
const mockUseFavorites = vi.mocked(useFavorites);
const mockData = [
  { id: 50, name: 'Monaco Grand Prix' },
  { id: 51, name: 'British Grand Prix' },
];
const mockFavs = [
  { id: 1, itemId: '50', category: 'sports', subcategory: 'f1', type: 'race' },
];
const ic = {} as any;
const wa = '0xabc';
const cw = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
};
describe('useF1Races', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseApi.mockReturnValue({
      data: {
        response: mockData,
        results: 2,
        paging: { current: 1, total: 1 },
      },
      isLoading: false,
      isError: false,
      error: null,
    } as any);
    mockUseFavorites.mockReturnValue({
      favorites: mockFavs,
      isLoading: false,
      isError: false,
      error: null,
      addFavorite: { mutateAsync: vi.fn(), isPending: false },
      removeFavorite: { mutateAsync: vi.fn(), isPending: false },
      refresh: vi.fn(),
    } as any);
  });
  it('should return races with favorited flag', () => {
    const { result } = renderHook(() => useF1Races(ic, wa), { wrapper: cw() });
    expect(result.current.races).toHaveLength(2);
    expect(result.current.races[0].favorited).toBe(true);
    expect(result.current.races[1].favorited).toBe(false);
  });
  it('should call addFavorite', async () => {
    const m = vi.fn().mockResolvedValue({});
    mockUseFavorites.mockReturnValue({
      favorites: [],
      isLoading: false,
      isError: false,
      error: null,
      addFavorite: { mutateAsync: m, isPending: false },
      removeFavorite: { mutateAsync: vi.fn(), isPending: false },
      refresh: vi.fn(),
    } as any);
    const { result } = renderHook(() => useF1Races(ic, wa), { wrapper: cw() });
    await act(async () => {
      await result.current.setFavorited(50, true);
    });
    expect(m).toHaveBeenCalledWith({
      category: 'sports',
      subcategory: 'f1',
      type: 'race',
      id: '50',
    });
  });
  it('should pass correct filters', () => {
    renderHook(() => useF1Races(ic, wa), { wrapper: cw() });
    expect(mockUseFavorites).toHaveBeenCalledWith(ic, wa, {
      category: 'sports',
      subcategory: 'f1',
      type: 'race',
    });
  });
  it('should return empty when undefined', () => {
    mockUseApi.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as any);
    const { result } = renderHook(() => useF1Races(ic, wa), { wrapper: cw() });
    expect(result.current.races).toHaveLength(0);
  });
});
