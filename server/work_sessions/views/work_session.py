from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.generics import ListCreateAPIView
from django.utils import timezone

from ..models import WorkSession
from ..serializers import WorkSessionSerializer


class WorkSessionListView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = WorkSessionSerializer

    def get_queryset(self):
        return (
            WorkSession.objects
            .filter(user=self.request.user)
            .select_related('workstation')
            .prefetch_related('workers')
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class WorkSessionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        try:
            return (
                WorkSession.objects
                .select_related('workstation')
                .prefetch_related('workers')
                .get(pk=pk, user=user)
            )
        except WorkSession.DoesNotExist:
            return None

    def get(self, request, pk):
        session = self.get_object(pk, request.user)
        if not session:
            return Response(
                {'detail': 'Not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = WorkSessionSerializer(session)
        return Response(serializer.data)

    def patch(self, request, pk):
        session = self.get_object(pk, request.user)
        if not session:
            return Response(
                {'detail': 'Not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = WorkSessionSerializer(
            session,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)

    def delete(self, request, pk):
        session = self.get_object(pk, request.user)
        if not session:
            return Response(
                {'detail': 'Not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        session.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class WorkSessionStartView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        workstation_id = request.data.get('workstation')
        worker_ids = request.data.get('worker_ids')

        if not workstation_id or not worker_ids:
            return Response(
                {'detail': 'Workstation and worker_ids are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create session
        session = WorkSession.objects.create(
            user=request.user,
            workstation_id=workstation_id,
            status='active',
            start_time=timezone.now(),
        )

        # Assign workers (ManyToMany through)
        session.workers.set(worker_ids)

        serializer = WorkSessionSerializer(session)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class WorkSessionStopView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            session = WorkSession.objects.get(
                pk=pk,
                user=request.user,
                status='active'
            )
        except WorkSession.DoesNotExist:
            return Response(
                {'detail': 'Active session not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        quantity_produced = request.data.get('quantity_produced')
        notes = request.data.get('notes')

        if quantity_produced is None:
            return Response(
                {'detail': 'Quantity produced is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        session.end_time = timezone.now()
        session.status = 'completed'
        session.quantity_produced = quantity_produced
        if notes:
            session.notes = notes
        session.save()
        session.save_performance()  # compute after save so duration_hours is available

        serializer = WorkSessionSerializer(
            WorkSession.objects.prefetch_related('workers').get(pk=session.pk)
        )
        return Response(serializer.data)


class ActiveWorkSessionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = (
            WorkSession.objects
            .filter(user=request.user, status='active')
            .select_related('workstation')
            .prefetch_related('workers')
        )

        serializer = WorkSessionSerializer(sessions, many=True)
        return Response(serializer.data)