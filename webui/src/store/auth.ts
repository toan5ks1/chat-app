import { create } from "zustand";
import type { User } from "../types/chat";
import { api } from "../lib/api";
import { tokenStorage } from "../lib/token";
import { useChatStore } from "./chat";

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  user: User | null;
  status: AuthStatus;
  fetchUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "idle",
  fetchUser: async () => {
    set({ status: "loading" });
    try {
      const user = await api.getCurrentUser();
      if (user) {
        set({ user, status: "authenticated" });
      } else {
        set({ user: null, status: "unauthenticated" });
      }
    } catch (error) {
      console.error("Failed to fetch user", error);
      set({ user: null, status: "unauthenticated" });
    }
  },
  setUser: (user) => {
    set({ user, status: user ? "authenticated" : "unauthenticated" });
  },
  setToken: async (token: string) => {
    tokenStorage.set(token);
    set({ status: "loading" });
    try {
      const user = await api.getCurrentUser();
      if (user) {
        set({ user, status: "authenticated" });
      } else {
        tokenStorage.remove();
        set({ user: null, status: "unauthenticated" });
      }
    } catch (error) {
      console.error("Failed to fetch user after setting token", error);
      tokenStorage.remove();
      set({ user: null, status: "unauthenticated" });
    }
  },
  logout: async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error("Failed to logout", error);
    } finally {
      tokenStorage.remove();
      useChatStore.getState().reset();
      set({ user: null, status: "unauthenticated" });
    }
  },
}));
