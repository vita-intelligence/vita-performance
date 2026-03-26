from rest_framework import status
from rest_framework.views import APIView
from rest_framework.generics import ListCreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from ..models import WorkerGroup
from ..serializers import WorkerGroupSerializer


class WorkerGroupListView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = WorkerGroupSerializer

    def get_queryset(self):
        return WorkerGroup.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('all') == 'true':
            return None
        return super().paginate_queryset(queryset)


class WorkerGroupDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        try:
            return WorkerGroup.objects.get(pk=pk, user=user)
        except WorkerGroup.DoesNotExist:
            return None

    def get(self, request, pk):
        group = self.get_object(pk, request.user)
        if not group:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = WorkerGroupSerializer(group)
        return Response(serializer.data)

    def patch(self, request, pk):
        group = self.get_object(pk, request.user)
        if not group:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = WorkerGroupSerializer(group, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        group = self.get_object(pk, request.user)
        if not group:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        group.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)