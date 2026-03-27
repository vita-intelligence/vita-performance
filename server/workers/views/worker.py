from rest_framework import status
from rest_framework.views import APIView
from rest_framework.generics import ListCreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from ..models import Worker
from ..serializers import WorkerSerializer
from django.db.models import Avg, Count, Sum, Q
from core.utils.date_utils import get_date_range
from subscription.permissions import WithinWorkerLimit


class WorkerLeaderboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        range_param = request.query_params.get('range', 'today')
        since = get_date_range(range_param)

        session_filter = Q(
            work_sessions__user=request.user,
            work_sessions__status__in=['completed', 'verified'],
        )
        if since:
            session_filter &= Q(work_sessions__start_time__gte=since)

        workers = (
            Worker.objects
            .filter(user=request.user, is_active=True)
            .filter(session_filter)
            .annotate(
                sessions_count=Count('work_sessions', filter=session_filter),
                avg_performance=Avg('work_sessions__performance_percentage', filter=session_filter),
                total_quantity=Sum('work_sessions__quantity_produced', filter=session_filter),
            )
            .filter(sessions_count__gt=0)
            .order_by('-avg_performance')
        )

        data = [
            {
                'id': w.id,
                'name': w.full_name,
                'hourly_rate': float(w.hourly_rate),
                'sessions_count': w.sessions_count,
                'avg_performance': round(float(w.avg_performance), 2) if w.avg_performance else None,
                'total_quantity': float(w.total_quantity) if w.total_quantity else None,
            }
            for w in workers
        ]

        return Response({
            'range': range_param,
            'results': data,
        })


class WorkerListView(ListCreateAPIView):
    permission_classes = [IsAuthenticated, WithinWorkerLimit]
    serializer_class = WorkerSerializer

    def get_queryset(self):
        return Worker.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('all') == 'true':
            return None
        return super().paginate_queryset(queryset)


class WorkerDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        try:
            return Worker.objects.get(pk=pk, user=user)
        except Worker.DoesNotExist:
            return None

    def get(self, request, pk):
        worker = self.get_object(pk, request.user)
        if not worker:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = WorkerSerializer(worker)
        return Response(serializer.data)

    def patch(self, request, pk):
        worker = self.get_object(pk, request.user)
        if not worker:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = WorkerSerializer(worker, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        worker = self.get_object(pk, request.user)
        if not worker:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        worker.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)