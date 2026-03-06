import { useQuery } from "@tanstack/react-query";
import { workerService } from "@/services/worker.service";
import { RangeKey } from "@/constants/filters.constants";

export const useWorkerStats = (id: number, range: RangeKey) => {
    const { data, isLoading } = useQuery({
        queryKey: ['workers', 'stats', id, range],
        queryFn: () => workerService.getStats(id, range),
        retry: false,
        enabled: !!id,
    });

    return { stats: data, isLoading };
};