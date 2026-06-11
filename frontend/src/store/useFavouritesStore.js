import { create } from "zustand";
import { apiPost } from "../utils/api";
import { useWorkspaceStore } from "./useWorkspaceStore";

export const useFavouritesStore = create((set, get) => ({
  favouriteIds: new Set(),
  pending: new Set(),

  hydrate: (favorites = []) => {
    const ids = new Set(
      favorites.map((f) => f.track_id || f.track_data?.id).filter(Boolean)
    );
    set({ favouriteIds: ids });
  },

  isFavourite: (trackId) => get().favouriteIds.has(trackId),

  toggle: async (track) => {
    if (!track?.id) return;
    const id = track.id;
    const { pending, favouriteIds } = get();

    if (pending.has(id)) return;

    const wasLiked = favouriteIds.has(id);
    const next = new Set(favouriteIds);
    if (wasLiked) next.delete(id);
    else next.add(id);
    set({ favouriteIds: next, pending: new Set([...pending, id]) });

    try {
      await apiPost("/workspace/favorites", { track_id: id, track_data: track });
      const newBootstrap = await useWorkspaceStore.getState().refresh();
      if (newBootstrap?.favorites) {
        get().hydrate(newBootstrap.favorites);
      }
    } catch (err) {
      const rollback = new Set(get().favouriteIds);
      if (wasLiked) rollback.add(id);
      else rollback.delete(id);
      set({ favouriteIds: rollback });
      console.error("[Favourites] toggle failed", err);
    } finally {
      const p = new Set(get().pending);
      p.delete(id);
      set({ pending: p });
    }
  },
}));
