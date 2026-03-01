import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addToast } from "@heroui/react";
import { sessionService } from "@/services/session.service";
import {
  StartSessionPayload,
  StopSessionPayload,
  CreateSessionPayload,
  UpdateSessionPayload,
} from "@/types/session";
import { getErrorMessage } from "@/lib/utils";

const SESSIONS_KEY = ["sessions"];
const ACTIVE_SESSIONS_KEY = ["sessions", "active"];

export const useSessions = () => {
  const queryClient = useQueryClient();

  const { data: sessions, isLoading: isSessionsLoading } = useQuery({
    queryKey: SESSIONS_KEY,
    queryFn: sessionService.getAll,
    retry: false,
  });

  const { data: activeSessions, isLoading: isActiveSessionsLoading } = useQuery({
    queryKey: ACTIVE_SESSIONS_KEY,
    queryFn: sessionService.getActive,
    retry: false,
    refetchInterval: 30000, // refetch every 30 seconds to keep active sessions fresh
  });

  const startMutation = useMutation({
    mutationFn: (payload: StartSessionPayload) => sessionService.start(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ACTIVE_SESSIONS_KEY });
      addToast({ title: "Session started", color: "success", timeout: 3000 });
    },
    onError: (error) => {
      addToast({
        title: "Failed to start session",
        description: getErrorMessage(error),
        color: "danger",
        timeout: 4000,
      });
    },
  });

  const stopMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: StopSessionPayload }) =>
      sessionService.stop(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ACTIVE_SESSIONS_KEY });
      addToast({ title: "Session completed", color: "success", timeout: 3000 });
    },
    onError: (error) => {
      addToast({
        title: "Failed to stop session",
        description: getErrorMessage(error),
        color: "danger",
        timeout: 4000,
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateSessionPayload) => sessionService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
      addToast({ title: "Session created", color: "success", timeout: 3000 });
    },
    onError: (error) => {
      addToast({
        title: "Failed to create session",
        description: getErrorMessage(error),
        color: "danger",
        timeout: 4000,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateSessionPayload }) =>
      sessionService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
      addToast({ title: "Session updated", color: "success", timeout: 3000 });
    },
    onError: (error) => {
      addToast({
        title: "Failed to update session",
        description: getErrorMessage(error),
        color: "danger",
        timeout: 4000,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => sessionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
      addToast({ title: "Session deleted", color: "success", timeout: 3000 });
    },
    onError: (error) => {
      addToast({
        title: "Failed to delete session",
        description: getErrorMessage(error),
        color: "danger",
        timeout: 4000,
      });
    },
  });

  return {
    sessions,
    activeSessions,
    isSessionsLoading,
    isActiveSessionsLoading,
    startSession: startMutation.mutateAsync,
    stopSession: stopMutation.mutateAsync,
    createSession: createMutation.mutateAsync,
    updateSession: updateMutation.mutateAsync,
    deleteSession: deleteMutation.mutateAsync,
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};