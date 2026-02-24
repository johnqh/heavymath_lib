import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useNflTeams } from '../useNflTeams';

vi.mock('@sudobility/sports_api_client', () => ({ useNflTeams: vi.fn() }));
vi.mock('@sudobility/heavymath_indexer_client', () => ({ useFavorites: vi.fn() }));

import { useNflTeams as useNflTeamsApi } from '@sudobility/sports_api_client';
import { useFavorites } from '@sudobility/heavymath_indexer_client';

const mockUseApi = vi.mocked(useNflTeamsApi);
const mockUseFavorites = vi.mocked(useFavorites);
const mockData = [{ id: 10, name: 'Patriots' }, { id: 20, name: 'Chiefs' }];
const mockFavorites = [{ id: 1, itemId: '10', category: 'sports', subcategory: 'nfl', type: 'team' }];
const mockIndexerClient = {} as any;
const mockWalletAddress = '0xabc';
const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => createElement(QueryClientProvider, { client: qc }, children);
};

describe('useNflTeams', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseApi.mockReturnValue({ data: { response: mockData, results: 2, paging: { current: 1, total: 1 } }, isLoading: false, isError: false, error: null } as any);
    mockUseFavorites.mockReturnValue({ favorites: mockFavorites, isLoading: false, isError: false, error: null, addFavorite: { mutateAsync: vi.fn(), isPending: false }, removeFavorite: { mutateAsync: vi.fn(), isPending: false }, refresh: vi.fn() } as any);
  });

  it('should return teams with favorited flag', () => {
    const { result } = renderHook(() => useNflTeams(mockIndexerClient, mockWalletAddress), { wrapper: createWrapper() });
    expect(result.current.teams).toHaveLength(2);
    expect(result.current.teams[0].favorited).toBe(true);
    expect(result.current.teams[1].favorited).toBe(false);
  });

  it('should call addFavorite', async () => {
    const mock = vi.fn().mockResolvedValue({});
    mockUseFavorites.mockReturnValue({ favorites: [], isLoading: false, isError: false, error: null, addFavorite: { mutateAsync: mock, isPending: false }, removeFavorite: { mutateAsync: vi.fn(), isPending: false }, refresh: vi.fn() } as any);
    const { result } = renderHook(() => useNflTeams(mockIndexerClient, mockWalletAddress), { wrapper: createWrapper() });
    await act(async () => { await result.current.setFavorited(10, true); });
    expect(mock).toHaveBeenCalledWith({ category: 'sports', subcategory: 'nfl', type: 'team', id: '10' });
  });

  it('should pass correct filters to useFavorites', () => {
    renderHook(() => useNflTeams(mockIndexerClient, mockWalletAddress), { wrapper: createWrapper() });
    expect(mockUseFavorites).toHaveBeenCalledWith(mockIndexerClient, mockWalletAddress, { category: 'sports', subcategory: 'nfl', type: 'team' });
  });

  it('should return empty when data undefined', () => {
    mockUseApi.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null } as any);
    const { result } = renderHook(() => useNflTeams(mockIndexerClient, mockWalletAddress), { wrapper: createWrapper() });
    expect(result.current.teams).toHaveLength(0);
  });
});
