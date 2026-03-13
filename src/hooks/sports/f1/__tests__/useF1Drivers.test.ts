import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useF1Drivers } from '../useF1Drivers';
vi.mock('@sudobility/heavymath_indexer_client', () => ({
  useFavorites: vi.fn(),
  useF1Drivers: vi.fn(),
}));
import {
  useFavorites,
  useF1Drivers as useApi,
} from '@sudobility/heavymath_indexer_client';
const mockUseApi = vi.mocked(useApi);
const mockUseFavorites = vi.mocked(useFavorites);
const mockData = [
  { id: 1, name: 'Max Verstappen' },
  { id: 2, name: 'Lewis Hamilton' },
];
const mockFavs = [
  { id: 1, itemId: '1', category: 'sports', subcategory: 'f1', type: 'driver' },
];
const ic = {} as any;
const wa = '0xabc';
const cw = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
};
describe('useF1Drivers', () => {
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
  it('should return drivers with favorited flag', () => {
    const { result } = renderHook(() => useF1Drivers(ic, wa), {
      wrapper: cw(),
    });
    expect(result.current.drivers).toHaveLength(2);
    expect(result.current.drivers[0].favorited).toBe(true);
    expect(result.current.drivers[1].favorited).toBe(false);
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
    const { result } = renderHook(() => useF1Drivers(ic, wa), {
      wrapper: cw(),
    });
    await act(async () => {
      await result.current.setFavorited(1, true);
    });
    expect(m).toHaveBeenCalledWith({
      category: 'sports',
      subcategory: 'f1',
      type: 'driver',
      id: '1',
    });
  });
  it('should pass correct filters', () => {
    renderHook(() => useF1Drivers(ic, wa), { wrapper: cw() });
    expect(mockUseFavorites).toHaveBeenCalledWith(ic, wa, {
      category: 'sports',
      subcategory: 'f1',
      type: 'driver',
    });
  });
  it('should return empty when undefined', () => {
    mockUseApi.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as any);
    const { result } = renderHook(() => useF1Drivers(ic, wa), {
      wrapper: cw(),
    });
    expect(result.current.drivers).toHaveLength(0);
  });
});
