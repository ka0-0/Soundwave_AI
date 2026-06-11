import { create } from "zustand";
import { apiGet, ApiError, checkBackendHealth, clearAuthTokens, storeAuthTokens } from "../utils/api";

function loadCachedUser() {
  try {
    const raw = localStorage.getItem("soundwave_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function hydrateSecondary(data) {
  try {
    const { usePreferencesStore } = await import("./usePreferencesStore");
    const { useFavouritesStore } = await import("./useFavouritesStore");
    if (data?.preferences) usePreferencesStore.getState().syncFromServer(data.preferences);
    if (data?.favorites) useFavouritesStore.getState().hydrate(data.favorites);
  } catch (err) {
    console.warn("[AUTH] Secondary hydration failed", err);
  }
}

const savedToken = localStorage.getItem("soundwave_token");

export const useAuthStore = create((set) => ({
  token: savedToken || "",
  user: loadCachedUser(),
  isAuthenticated: Boolean(savedToken),
  isCheckingAuth: Boolean(savedToken),
  isOffline: false,
  serverOnline: true,

  login: async ({ token, refresh_token, user }) => {
    storeAuthTokens({ access_token: token, refresh_token });
    if (user) localStorage.setItem("soundwave_user", JSON.stringify(user));
    
    set({
      token,
      user: user || null,
      isAuthenticated: true,
      isCheckingAuth: false,
      isOffline: false,
      serverOnline: true,
    });

    (async () => {
      try {
        const { useWorkspaceStore } = await import("./useWorkspaceStore");
        const data = await useWorkspaceStore.getState().loadBootstrap();
        await hydrateSecondary(data);
      } catch (err) {
        console.warn("[AUTH] Background workspace load failed", err);
      } finally {
        set({ isCheckingAuth: false });
      }
    })();
  },

  updateUser: (user) => {
    if (user) localStorage.setItem("soundwave_user", JSON.stringify(user));
    set({ user });
  },

  logout: () => {
    clearAuthTokens();
    import("./useWorkspaceStore").then(({ useWorkspaceStore }) => useWorkspaceStore.getState().clear());
    import("./useFavouritesStore").then(({ useFavouritesStore }) =>
      useFavouritesStore.getState().hydrate([])
    );
    set({
      token: "",
      user: null,
      isAuthenticated: false,
      isCheckingAuth: false,
      isOffline: false,
    });
  },

  refreshSession: async () => {
    const token = localStorage.getItem("soundwave_token");
    if (!token) {
      set({ token: "", user: null, isAuthenticated: false, isCheckingAuth: false, isOffline: false });
      return null;
    }

    set({ isCheckingAuth: true });
    const health = await checkBackendHealth();
    set({ serverOnline: health.online });

    try {
      const user = await apiGet("/auth/me");
      localStorage.setItem("soundwave_user", JSON.stringify(user));
      set({
        token,
        user,
        isAuthenticated: true,
        isOffline: false,
        serverOnline: health.online,
      });

      (async () => {
        try {
          const { useWorkspaceStore } = await import("./useWorkspaceStore");
          const data = await useWorkspaceStore.getState().loadBootstrap();
          await hydrateSecondary(data);
        } catch (err) {
          console.warn("[AUTH] Background workspace restore failed", err);
        } finally {
          set({ isCheckingAuth: false });
        }
      })();

      return user;
    } catch (error) {
      const cached = loadCachedUser();
      const isNetwork = error instanceof ApiError && error.code === "NETWORK";
      const isServer = error instanceof ApiError && (error.code === "SERVER_ERROR" || !health.online);

      if (isNetwork || isServer) {
        set({
          token,
          user: cached,
          isAuthenticated: true,
          isCheckingAuth: false,
          isOffline: true,
          serverOnline: false,
        });
        return cached;
      }

      if (error instanceof ApiError && (error.code === "SESSION_EXPIRED" || error.code === "UNAUTHORIZED")) {
        clearAuthTokens();
        set({ token: "", user: null, isAuthenticated: false, isCheckingAuth: false, isOffline: false });
        return null;
      }

      if (cached) {
        set({
          token,
          user: cached,
          isAuthenticated: true,
          isCheckingAuth: false,
          isOffline: true,
        });
        return cached;
      }

      clearAuthTokens();
      set({ token: "", user: null, isAuthenticated: false, isCheckingAuth: false, isOffline: false });
      return null;
    }
  },
}));
