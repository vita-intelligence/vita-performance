import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addToast } from "@heroui/react";
import { settingsService } from "@/services/settings.service";
import { useSettingsStore } from "@/lib/stores";
import { UpdateSettingsPayload } from "@/types/settings";
import { getErrorMessage } from "@/lib/utils";
import { usePathname } from "next/navigation";

const SETTINGS_KEY = ["settings"];
const PUBLIC_PATHS = ["/login", "/register"];

export const useSettings = () => {
  const queryClient = useQueryClient();
  const { settings, setSettings, clearSettings } = useSettingsStore();
  const pathname = usePathname();
  const isPublicPage = PUBLIC_PATHS.includes(pathname);

  const { isLoading } = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: async () => {
      const data = await settingsService.getSettings();
      setSettings(data);
      return data;
    },
    enabled: !isPublicPage,
    retry: false,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateSettingsPayload) => settingsService.updateSettings(payload),
    onSuccess: (data) => {
      setSettings(data);
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
      addToast({
        title: "Settings saved",
        color: "success",
        timeout: 3000,
      });
    },
    onError: (error) => {
      addToast({
        title: "Failed to save settings",
        description: getErrorMessage(error),
        color: "danger",
        timeout: 4000,
      });
    },
  });

  return {
    settings,
    isLoading: isPublicPage ? false : isLoading,
    updateSettings: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
};