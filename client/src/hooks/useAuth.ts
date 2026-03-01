import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addToast } from "@heroui/react";
import { authService } from "@/services/auth.service";
import { useAuthStore, useMetaStore, useSettingsStore } from "@/lib/stores";
import { LoginPayload, RegisterPayload } from "@/types/auth";
import { usePathname } from "next/navigation";
import { getErrorMessage } from "@/lib/utils";

const AUTH_KEY = ["auth", "user"];
const PUBLIC_PATHS = ["/login", "/register"];

export const useAuth = () => {
  const queryClient = useQueryClient();
  const { user, setUser, clearUser } = useAuthStore();
  const pathname = usePathname();
  const isPublicPage = PUBLIC_PATHS.includes(pathname);
  const { clearSettings } = useSettingsStore();
  const { clearMeta } = useMetaStore();

  const { isLoading } = useQuery({
    queryKey: AUTH_KEY,
    queryFn: async () => {
      const data = await authService.getUser();
      setUser(data);
      return data;
    },
    enabled: !isPublicPage,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: ({ user }) => setUser(user),
    onError: (error) => {
      addToast({
        title: "Login failed",
        description: getErrorMessage(error),
        color: "danger",
        timeout: 4000,
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (payload: RegisterPayload) => authService.register(payload),
    onSuccess: ({ user }) => setUser(user),
    onError: (error) => {
      addToast({
        title: "Registration failed",
        description: getErrorMessage(error),
        color: "danger",
        timeout: 4000,
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      clearUser();
      clearSettings();
      clearMeta();
      queryClient.removeQueries({ queryKey: AUTH_KEY });
    },
    onError: (error) => {
      addToast({
        title: "Logout failed",
        description: getErrorMessage(error),
        color: "danger",
        timeout: 4000,
      });
    },
  });

  return {
    user,
    isLoading: isPublicPage ? false : isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
  };
};