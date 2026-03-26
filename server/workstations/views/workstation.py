from rest_framework import status
from rest_framework.views import APIView
from rest_framework.generics import ListCreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from ..models import Workstation
from ..serializers import WorkstationSerializer
from subscription.permissions import WithinWorkstationLimit


class WorkstationListView(ListCreateAPIView):
    permission_classes = [IsAuthenticated, WithinWorkstationLimit]
    serializer_class = WorkstationSerializer

    def get_queryset(self):
        return Workstation.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('all') == 'true':
            return None
        return super().paginate_queryset(queryset)


class WorkstationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        try:
            return Workstation.objects.get(pk=pk, user=user)
        except Workstation.DoesNotExist:
            return None

    def get(self, request, pk):
        workstation = self.get_object(pk, request.user)
        if not workstation:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = WorkstationSerializer(workstation)
        return Response(serializer.data)

    def patch(self, request, pk):
        workstation = self.get_object(pk, request.user)
        if not workstation:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = WorkstationSerializer(workstation, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        workstation = self.get_object(pk, request.user)
        if not workstation:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        workstation.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)