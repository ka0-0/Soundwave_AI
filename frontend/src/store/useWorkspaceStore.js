import { create } from "zustand";
import { apiGet } from "../utils/api";

export const useWorkspaceStore = create((set) => ({
  bootstrap: null,
  loading: false,
  loaded: false,
  loadBootstrap: async () => {
    set({ loading: true });
    try {
      const data = await apiGet("/workspace/bootstrap");
      set({ bootstrap: data, loading: false, loaded: true });
      return data;
    } catch {
      set({ bootstrap: null, loading: false, loaded: true });
      return null;
    }
  },
  clear: () => set({ bootstrap: null, loaded: false }),
  refresh: async () => useWorkspaceStore.getState().loadBootstrap(),
}));
