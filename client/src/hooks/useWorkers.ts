import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addToast } from "@heroui/react";
import { workerService } from "@/services/worker.service";
import {
  CreateWorkerPayload,
  UpdateWorkerPayload,
  CreateWorkerGroupPayload,
  UpdateWorkerGroupPayload,
} from "@/types/worker";
import { getErrorMessage } from "@/lib/utils";

const WORKERS_KEY = ["workers"];
const GROUPS_KEY = ["workers", "groups"];

export const useWorkers = () => {
  const queryClient = useQueryClient();

  const { data: workers, isLoading: isWorkersLoading } = useQuery({
    queryKey: WORKERS_KEY,
    queryFn: workerService.getAll,
    retry: false,
  });

  const { data: groups, isLoading: isGroupsLoading } = useQuery({
    queryKey: GROUPS_KEY,
    queryFn: workerService.getAllGroups,
    retry: false,
  });

  const createWorkerMutation = useMutation({
    mutationFn: (payload: CreateWorkerPayload) => workerService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKERS_KEY });
      addToast({ title: "Worker created", color: "success", timeout: 3000 });
    },
    onError: (error) => {
      addToast({
        title: "Failed to create worker",
        description: getErrorMessage(error),
        color: "danger",
        timeout: 4000,
      });
    },
  });

  const updateWorkerMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateWorkerPayload }) =>
      workerService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKERS_KEY });
      addToast({ title: "Worker updated", color: "success", timeout: 3000 });
    },
    onError: (error) => {
      addToast({
        title: "Failed to update worker",
        description: getErrorMessage(error),
        color: "danger",
        timeout: 4000,
      });
    },
  });

  const deleteWorkerMutation = useMutation({
    mutationFn: (id: number) => workerService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKERS_KEY });
      addToast({ title: "Worker deleted", color: "success", timeout: 3000 });
    },
    onError: (error) => {
      addToast({
        title: "Failed to delete worker",
        description: getErrorMessage(error),
        color: "danger",
        timeout: 4000,
      });
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: (payload: CreateWorkerGroupPayload) => workerService.createGroup(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUPS_KEY });
      addToast({ title: "Group created", color: "success", timeout: 3000 });
    },
    onError: (error) => {
      addToast({
        title: "Failed to create group",
        description: getErrorMessage(error),
        color: "danger",
        timeout: 4000,
      });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateWorkerGroupPayload }) =>
      workerService.updateGroup(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUPS_KEY });
      addToast({ title: "Group updated", color: "success", timeout: 3000 });
    },
    onError: (error) => {
      addToast({
        title: "Failed to update group",
        description: getErrorMessage(error),
        color: "danger",
        timeout: 4000,
      });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id: number) => workerService.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUPS_KEY });
      addToast({ title: "Group deleted", color: "success", timeout: 3000 });
    },
    onError: (error) => {
      addToast({
        title: "Failed to delete group",
        description: getErrorMessage(error),
        color: "danger",
        timeout: 4000,
      });
    },
  });

  return {
    workers,
    groups,
    isWorkersLoading,
    isGroupsLoading,
    createWorker: createWorkerMutation.mutateAsync,
    updateWorker: updateWorkerMutation.mutateAsync,
    deleteWorker: deleteWorkerMutation.mutateAsync,
    createGroup: createGroupMutation.mutateAsync,
    updateGroup: updateGroupMutation.mutateAsync,
    deleteGroup: deleteGroupMutation.mutateAsync,
    isCreatingWorker: createWorkerMutation.isPending,
    isUpdatingWorker: updateWorkerMutation.isPending,
    isDeletingWorker: deleteWorkerMutation.isPending,
    isCreatingGroup: createGroupMutation.isPending,
    isUpdatingGroup: updateGroupMutation.isPending,
    isDeletingGroup: deleteGroupMutation.isPending,
  };
};