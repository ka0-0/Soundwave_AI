import { create } from "zustand";
import { apiPost } from "../utils/api";
import { useWorkspaceStore } from "./useWorkspaceStore";

function loadStoredFavorites() {
  if (typeof window === "undefined") return { ids: new Set(), tracks: [] };
  try {
    const raw = localStorage.getItem("soundwave_liked_tracks");
    if (raw) {
      const tracks = JSON.parse(raw);
      if (Array.isArray(tracks) && tracks.length > 0) {
        const ids = new Set(tracks.map((t) => t.id || t.track_id || t._id).filter(Boolean));
        return { ids, tracks };
      }
    }
  } catch (e) {
    console.error("[FavouritesStore] Failed to load stored favorites", e);
  }
  return { ids: new Set(), tracks: [] };
}

function saveStoredFavorites(tracks) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("soundwave_liked_tracks", JSON.stringify(tracks));
  } catch (e) {
    console.error("[FavouritesStore] Failed to save favorites to localStorage", e);
  }
}

const initialData = loadStoredFavorites();

export const useFavouritesStore = create((set, get) => ({
  favouriteIds: initialData.ids,
  favouriteTracks: initialData.tracks,
  pending: new Set(),

  hydrate: (favorites = []) => {
    if (!Array.isArray(favorites)) return;
    const tracksMap = new Map();

    // Retain existing local liked tracks first
    (get().favouriteTracks || []).forEach((t) => {
      if (t?.id) tracksMap.set(t.id, t);
    });

    // Merge backend favorites
    favorites.forEach((f) => {
      const trackObj = f.track_data || f;
      const tid = f.track_id || trackObj?.id || f.id;
      if (tid) {
        tracksMap.set(tid, { ...trackObj, id: tid });
      }
    });

    const updatedTracks = Array.from(tracksMap.values());
    const updatedIds = new Set(updatedTracks.map((t) => t.id));

    saveStoredFavorites(updatedTracks);
    set({ favouriteIds: updatedIds, favouriteTracks: updatedTracks });
  },

  isFavourite: (trackId) => get().favouriteIds.has(trackId),

  toggle: async (track) => {
    if (!track?.id) return;
    const id = track.id;
    const { pending, favouriteIds, favouriteTracks } = get();

    if (pending.has(id)) return;

    const wasLiked = favouriteIds.has(id);
    const nextIds = new Set(favouriteIds);
    let nextTracks = [...favouriteTracks];

    if (wasLiked) {
      nextIds.delete(id);
      nextTracks = nextTracks.filter((t) => t.id !== id && t.track_id !== id);
    } else {
      nextIds.add(id);
      if (!nextTracks.some((t) => t.id === id || t.track_id === id)) {
        nextTracks.push(track);
      }
    }

    saveStoredFavorites(nextTracks);
    set({ favouriteIds: nextIds, favouriteTracks: nextTracks, pending: new Set([...pending, id]) });

    try {
      await apiPost("/workspace/favorites", { track_id: id, track_data: track });
      const newBootstrap = await useWorkspaceStore.getState().refresh();
      if (newBootstrap?.favorites) {
        get().hydrate(newBootstrap.favorites);
      }
    } catch (err) {
      console.warn("[Favourites] Backend sync deferred, saved locally to localStorage", err);
    } finally {
      const p = new Set(get().pending);
      p.delete(id);
      set({ pending: p });
    }
  },
}));
