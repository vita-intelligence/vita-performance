import { useQuery } from "@tanstack/react-query";
import { workstationService } from "@/services/workstation.service";
import { RangeKey } from "@/constants/filters.constants";

export const useWorkstationStats = (id: number, range: RangeKey) => {
    const { data, isLoading } = useQuery({
        queryKey: ['workstations', 'stats', id, range],
        queryFn: () => workstationService.getStats(id, range),
        retry: false,
        enabled: !!id,
    });

    return { stats: data, isLoading };
};
