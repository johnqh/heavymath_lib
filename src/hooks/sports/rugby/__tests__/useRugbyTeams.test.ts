import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useRugbyTeams } from '../useRugbyTeams';
vi.mock('@sudobility/heavymath_indexer_client', () => ({
  useFavorites: vi.fn(),
  useFavoriteCounts: vi.fn().mockReturnValue({ counts: {}, isLoading: false }),
  useRugbyTeams: vi.fn(),
}));
import {
  useFavorites,
  useRugbyTeams as useApi,
} from '@sudobility/heavymath_indexer_client';
const mockUseApi = vi.mocked(useApi);
const mockUseFavorites = vi.mocked(useFavorites);
const mockData = [
  { id: 10, name: 'All Blacks' },
  { id: 20, name: 'Springboks' },
];
const mockFavs = [
  {
    id: 1,
    itemId: '10',
    category: 'sports',
    subcategory: 'rugby',
    type: 'team',
  },
];
const ic = {} as any;
const wa = '0xabc';
const cw = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
};
describe('useRugbyTeams', () => {
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
  it('should return teams with favorited flag', () => {
    const { result } = renderHook(() => useRugbyTeams(ic, wa), {
      wrapper: cw(),
    });
    expect(result.current.teams).toHaveLength(2);
    expect(result.current.teams[0].favorited).toBe(true);
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
    const { result } = renderHook(() => useRugbyTeams(ic, wa), {
      wrapper: cw(),
    });
    await act(async () => {
      await result.current.setFavorited(10, true);
    });
    expect(m).toHaveBeenCalledWith({
      category: 'sports',
      subcategory: 'rugby',
      type: 'team',
      id: '10',
    });
  });
  it('should pass correct filters', () => {
    renderHook(() => useRugbyTeams(ic, wa), { wrapper: cw() });
    expect(mockUseFavorites).toHaveBeenCalledWith(ic, wa, {
      category: 'sports',
      subcategory: 'rugby',
      type: 'team',
    });
  });
  it('should return empty when undefined', () => {
    mockUseApi.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as any);
    const { result } = renderHook(() => useRugbyTeams(ic, wa), {
      wrapper: cw(),
    });
    expect(result.current.teams).toHaveLength(0);
  });
});
