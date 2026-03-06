import { useQuery } from "@tanstack/react-query";
import { workerService } from "@/services/worker.service";
import { RangeKey } from "@/constants/filters.constants";

export const useWorkerLeaderboard = (range: RangeKey) => {
    const { data, isLoading } = useQuery({
        queryKey: ['workers', 'leaderboard', range],
        queryFn: () => workerService.getLeaderboard(range),
        retry: false,
    });

    return { leaderboard: data, isLoading };
};