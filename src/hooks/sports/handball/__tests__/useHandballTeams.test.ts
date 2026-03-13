import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useHandballTeams } from '../useHandballTeams';
vi.mock('@sudobility/heavymath_indexer_client', () => ({
  useFavorites: vi.fn(),
  useHandballTeams: vi.fn(),
}));
import {
  useFavorites,
  useHandballTeams as useApi,
} from '@sudobility/heavymath_indexer_client';
const mockUseApi = vi.mocked(useApi);
const mockUseFavorites = vi.mocked(useFavorites);
const mockData = [
  { id: 10, name: 'THW Kiel' },
  { id: 20, name: 'Barcelona' },
];
const mockFavs = [
  {
    id: 1,
    itemId: '10',
    category: 'sports',
    subcategory: 'handball',
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
describe('useHandballTeams', () => {
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
    const { result } = renderHook(() => useHandballTeams(ic, wa), {
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
    const { result } = renderHook(() => useHandballTeams(ic, wa), {
      wrapper: cw(),
    });
    await act(async () => {
      await result.current.setFavorited(10, true);
    });
    expect(m).toHaveBeenCalledWith({
      category: 'sports',
      subcategory: 'handball',
      type: 'team',
      id: '10',
    });
  });
  it('should pass correct filters', () => {
    renderHook(() => useHandballTeams(ic, wa), { wrapper: cw() });
    expect(mockUseFavorites).toHaveBeenCalledWith(ic, wa, {
      category: 'sports',
      subcategory: 'handball',
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
    const { result } = renderHook(() => useHandballTeams(ic, wa), {
      wrapper: cw(),
    });
    expect(result.current.teams).toHaveLength(0);
  });
});
