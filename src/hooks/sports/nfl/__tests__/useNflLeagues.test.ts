import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useNflLeagues } from '../useNflLeagues';

vi.mock('@sudobility/heavymath_indexer_client', () => ({
  useFavorites: vi.fn(),
  useNflLeagues: vi.fn(),
}));

import {
  useFavorites,
  useNflLeagues as useNflLeaguesApi,
} from '@sudobility/heavymath_indexer_client';

const mockUseApi = vi.mocked(useNflLeaguesApi);
const mockUseFavorites = vi.mocked(useFavorites);
const mockData = [
  { league: { id: 1, name: 'NFL' }, country: { name: 'USA' }, seasons: [] },
  { league: { id: 2, name: 'CFL' }, country: { name: 'Canada' }, seasons: [] },
];
const mockFavorites = [
  {
    id: 1,
    itemId: '1',
    category: 'sports',
    subcategory: 'nfl',
    type: 'league',
  },
];
const mockIndexerClient = {} as any;
const mockWalletAddress = '0xabc';
const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
};

describe('useNflLeagues', () => {
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
      favorites: mockFavorites,
      isLoading: false,
      isError: false,
      error: null,
      addFavorite: { mutateAsync: vi.fn(), isPending: false },
      removeFavorite: { mutateAsync: vi.fn(), isPending: false },
      refresh: vi.fn(),
    } as any);
  });

  it('should return leagues with favorited flag', () => {
    const { result } = renderHook(
      () => useNflLeagues(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );
    expect(result.current.leagues).toHaveLength(2);
    expect(result.current.leagues[0].favorited).toBe(true);
    expect(result.current.leagues[1].favorited).toBe(false);
  });

  it('should return isLoading true when loading', () => {
    mockUseApi.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as any);
    const { result } = renderHook(
      () => useNflLeagues(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );
    expect(result.current.isLoading).toBe(true);
  });

  it('should call addFavorite', async () => {
    const mock = vi.fn().mockResolvedValue({});
    mockUseFavorites.mockReturnValue({
      favorites: [],
      isLoading: false,
      isError: false,
      error: null,
      addFavorite: { mutateAsync: mock, isPending: false },
      removeFavorite: { mutateAsync: vi.fn(), isPending: false },
      refresh: vi.fn(),
    } as any);
    const { result } = renderHook(
      () => useNflLeagues(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );
    await act(async () => {
      await result.current.setFavorited(1, true);
    });
    expect(mock).toHaveBeenCalledWith({
      category: 'sports',
      subcategory: 'nfl',
      type: 'league',
      id: '1',
    });
  });

  it('should call removeFavorite', async () => {
    const mock = vi.fn().mockResolvedValue({});
    mockUseFavorites.mockReturnValue({
      favorites: mockFavorites,
      isLoading: false,
      isError: false,
      error: null,
      addFavorite: { mutateAsync: vi.fn(), isPending: false },
      removeFavorite: { mutateAsync: mock, isPending: false },
      refresh: vi.fn(),
    } as any);
    const { result } = renderHook(
      () => useNflLeagues(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );
    await act(async () => {
      await result.current.setFavorited(1, false);
    });
    expect(mock).toHaveBeenCalledWith(1);
  });

  it('should pass correct filters to useFavorites', () => {
    renderHook(() => useNflLeagues(mockIndexerClient, mockWalletAddress), {
      wrapper: createWrapper(),
    });
    expect(mockUseFavorites).toHaveBeenCalledWith(
      mockIndexerClient,
      mockWalletAddress,
      { category: 'sports', subcategory: 'nfl', type: 'league' }
    );
  });

  it('should return empty when data undefined', () => {
    mockUseApi.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as any);
    const { result } = renderHook(
      () => useNflLeagues(mockIndexerClient, mockWalletAddress),
      { wrapper: createWrapper() }
    );
    expect(result.current.leagues).toHaveLength(0);
  });
});
