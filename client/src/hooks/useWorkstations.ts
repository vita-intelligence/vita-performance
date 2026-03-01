import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addToast } from "@heroui/react";
import { workstationService } from "@/services/workstation.service";
import { CreateWorkstationPayload, UpdateWorkstationPayload } from "@/types/workstation";
import { getErrorMessage } from "@/lib/utils";

const WORKSTATIONS_KEY = ["workstations"];

export const useWorkstations = () => {
  const queryClient = useQueryClient();

  const { data: workstations, isLoading } = useQuery({
    queryKey: WORKSTATIONS_KEY,
    queryFn: workstationService.getAll,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateWorkstationPayload) => workstationService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKSTATIONS_KEY });
      addToast({ title: "Workstation created", color: "success", timeout: 3000 });
    },
    onError: (error) => {
      addToast({
        title: "Failed to create workstation",
        description: getErrorMessage(error),
        color: "danger",
        timeout: 4000,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateWorkstationPayload }) =>
      workstationService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKSTATIONS_KEY });
      addToast({ title: "Workstation updated", color: "success", timeout: 3000 });
    },
    onError: (error) => {
      addToast({
        title: "Failed to update workstation",
        description: getErrorMessage(error),
        color: "danger",
        timeout: 4000,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => workstationService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKSTATIONS_KEY });
      addToast({ title: "Workstation deleted", color: "success", timeout: 3000 });
    },
    onError: (error) => {
      addToast({
        title: "Failed to delete workstation",
        description: getErrorMessage(error),
        color: "danger",
        timeout: 4000,
      });
    },
  });

  return {
    workstations,
    isLoading,
    createWorkstation: createMutation.mutateAsync,
    updateWorkstation: updateMutation.mutateAsync,
    deleteWorkstation: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};