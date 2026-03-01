from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from ..models import Worker
from ..serializers import WorkerSerializer


class WorkerListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        workers = Worker.objects.filter(user=request.user)
        serializer = WorkerSerializer(workers, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = WorkerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


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