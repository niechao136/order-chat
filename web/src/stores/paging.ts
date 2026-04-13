import { create } from 'zustand';
import { devtools } from 'zustand/middleware';


type PagingKey = string;

interface PagingItem {
  page: number;
  size: number;
}

interface PagingStore {
  paging: Record<PagingKey, PagingItem>;
  getPaging: (key: PagingKey) => PagingItem;
  setPage: (key: PagingKey, page: number) => void;
  setSize: (key: PagingKey, size: number) => void;
}

const initialItem: PagingItem = {
  page: 1,
  size: 10,
};

export const usePagingStore = create<PagingStore>()(
  devtools((setState, getState) => ({
    paging: {},
    getPaging: (key) => {
      const { paging } = getState();
      if (!paging[key]) {
        const newItem = { ...initialItem };
        setState((state) => ({
          paging: {
            ...state.paging,
            [key]: newItem,
          },
        }));
        return newItem;
      }
      return paging[key]
    },
    setPage: (key, page) => {
      setState((state) => ({
        paging: {
          ...state.paging,
          [key]: {
            ...(state.paging[key] ?? initialItem),
            page,
          },
        },
      }))
    },
    setSize: (key, size) => {
      setState((state) => ({
        paging: {
          ...state.paging,
          [key]: {
            ...(state.paging[key] ?? initialItem),
            size,
            page: 1,
          },
        },
      }))
    },
  }))
)
