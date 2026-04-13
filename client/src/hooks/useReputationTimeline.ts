import { useInfiniteQuery } from "@tanstack/react-query";
import { workerService } from "@/services/worker.service";
import {
    ReputationTimelineFilters,
    ReputationTimelinePage,
} from "@/types/worker";

export const REPUTATION_TIMELINE_KEY = ["reputation", "events"];

export const useReputationTimeline = (filters: ReputationTimelineFilters) => {
    const query = useInfiniteQuery({
        queryKey: [...REPUTATION_TIMELINE_KEY, filters],
        queryFn: ({ pageParam = 1 }) =>
            workerService.getReputationEvents(pageParam, filters),
        getNextPageParam: (lastPage: ReputationTimelinePage) =>
            lastPage.has_more ? lastPage.page + 1 : undefined,
        initialPageParam: 1,
        retry: false,
    });

    const events = query.data?.pages.flatMap((p) => p.results) ?? [];
    const totalCount = query.data?.pages[0]?.count ?? 0;

    return {
        events,
        totalCount,
        isLoading: query.isLoading,
        isFetchingNextPage: query.isFetchingNextPage,
        hasNextPage: query.hasNextPage ?? false,
        fetchNextPage: query.fetchNextPage,
        refetch: query.refetch,
    };
};
