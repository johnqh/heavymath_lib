import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useVolleyballGames } from '../useVolleyballGames';
vi.mock('@sudobility/heavymath_indexer_client', () => ({
  useFavorites: vi.fn(),
  useVolleyballGames: vi.fn(),
}));
import {
  useFavorites,
  useVolleyballGames as useApi,
} from '@sudobility/heavymath_indexer_client';
const mockUseApi = vi.mocked(useApi);
const mockUseFavorites = vi.mocked(useFavorites);
const mockData = [{ id: 101 }, { id: 102 }];
const mockFavs = [
  {
    id: 1,
    itemId: '101',
    category: 'sports',
    subcategory: 'volleyball',
    type: 'game',
  },
];
const ic = {} as any;
const wa = '0xabc';
const cw = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
};
describe('useVolleyballGames', () => {
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
  it('should return games with favorited flag', () => {
    const { result } = renderHook(() => useVolleyballGames(ic, wa), {
      wrapper: cw(),
    });
    expect(result.current.games).toHaveLength(2);
    expect(result.current.games[0].favorited).toBe(true);
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
    const { result } = renderHook(() => useVolleyballGames(ic, wa), {
      wrapper: cw(),
    });
    await act(async () => {
      await result.current.setFavorited(101, true);
    });
    expect(m).toHaveBeenCalledWith({
      category: 'sports',
      subcategory: 'volleyball',
      type: 'game',
      id: '101',
    });
  });
  it('should pass correct filters', () => {
    renderHook(() => useVolleyballGames(ic, wa), { wrapper: cw() });
    expect(mockUseFavorites).toHaveBeenCalledWith(ic, wa, {
      category: 'sports',
      subcategory: 'volleyball',
      type: 'game',
    });
  });
  it('should return empty when undefined', () => {
    mockUseApi.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as any);
    const { result } = renderHook(() => useVolleyballGames(ic, wa), {
      wrapper: cw(),
    });
    expect(result.current.games).toHaveLength(0);
  });
});
