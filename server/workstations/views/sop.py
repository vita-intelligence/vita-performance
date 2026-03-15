from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from ..models import Workstation, SOP
from ..serializers import SOPSerializer


class WorkstationSOPView(APIView):
    permission_classes = [IsAuthenticated]

    def get_workstation(self, pk, user):
        try:
            return Workstation.objects.get(pk=pk, user=user)
        except Workstation.DoesNotExist:
            return None

    def get(self, request, pk):
        workstation = self.get_workstation(pk, request.user)
        if not workstation:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        sop, _ = SOP.objects.get_or_create(workstation=workstation)
        serializer = SOPSerializer(sop)
        return Response(serializer.data)

    def put(self, request, pk):
        workstation = self.get_workstation(pk, request.user)
        if not workstation:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        sop, _ = SOP.objects.get_or_create(workstation=workstation)
        serializer = SOPSerializer(sop, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)