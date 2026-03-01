from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from ..models import WorkerGroup
from ..serializers import WorkerGroupSerializer


class WorkerGroupListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        groups = WorkerGroup.objects.filter(user=request.user)
        serializer = WorkerGroupSerializer(groups, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = WorkerGroupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


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