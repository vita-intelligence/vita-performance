from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from workers.models import Worker
from workstations.models import Workstation
from work_sessions.models import WorkSession
from ..models import QCToken


def check_qc_access(qc_token):
    try:
        return qc_token.user.subscription.has_qc
    except Exception:
        return False

def get_qc_token(token):
    try:
        return QCToken.objects.select_related('user').get(token=token)
    except QCToken.DoesNotExist:
        return None


# Owner endpoint — get or create QC token
class QCTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qc_token, _ = QCToken.objects.get_or_create(user=request.user)
        return Response({'token': str(qc_token.token)})

    def post(self, request):
        # Regenerate token
        qc_token, _ = QCToken.objects.get_or_create(user=request.user)
        qc_token.token = __import__('uuid').uuid4()
        qc_token.save()
        return Response({'token': str(qc_token.token)})


# Public endpoints — authenticated by QC token
class QCWorkersView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        qc = get_qc_token(token)
        if not qc:
            return Response({'detail': 'Invalid QC link.'}, status=status.HTTP_404_NOT_FOUND)
        if not check_qc_access(qc):
            return Response({
                'detail': 'QC access is not available on this plan.',
                'code': 'qc_not_available',
            }, status=status.HTTP_403_FORBIDDEN)

        workers = Worker.objects.filter(
            user=qc.user,
            is_active=True,
            is_qa=True,
        ).order_by('full_name')

        return Response([
            {'id': w.id, 'name': w.full_name, 'has_pin': bool(w.pin)}
            for w in workers
        ])


class QCVerifyPinView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, token):
        qc = get_qc_token(token)
        if not qc:
            return Response({'detail': 'Invalid QC link.'}, status=status.HTTP_404_NOT_FOUND)

        worker_id = request.data.get('worker_id')
        pin = request.data.get('pin')

        if not worker_id or not pin:
            return Response({'detail': 'worker_id and pin are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            worker = Worker.objects.get(pk=worker_id, user=qc.user, is_active=True, is_qa=True)
        except Worker.DoesNotExist:
            return Response({'detail': 'Worker not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not worker.check_pin(str(pin)):
            return Response({'detail': 'Incorrect PIN.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'id': worker.id, 'name': worker.full_name})


class QCWorkstationsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        qc = get_qc_token(token)
        if not qc:
            return Response({'detail': 'Invalid QC link.'}, status=status.HTTP_404_NOT_FOUND)

        # Only workstations that have pending QC sessions
        workstation_ids = WorkSession.objects.filter(
            user=qc.user,
            status='completed',
        ).values_list('workstation_id', flat=True).distinct()

        workstations = Workstation.objects.filter(
            id__in=workstation_ids,
            user=qc.user,
        ).order_by('name')

        return Response([
            {'id': w.id, 'name': w.name}
            for w in workstations
        ])


class QCSessionsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token, workstation_id):
        qc = get_qc_token(token)
        if not qc:
            return Response({'detail': 'Invalid QC link.'}, status=status.HTTP_404_NOT_FOUND)

        sessions = WorkSession.objects.filter(
            user=qc.user,
            workstation_id=workstation_id,
            status='completed',
        ).prefetch_related('workers').select_related('item').order_by('-start_time')

        return Response([
            {
                'id': s.id,
                'start_time': s.start_time.isoformat(),
                'end_time': s.end_time.isoformat() if s.end_time else None,
                'duration_hours': s.duration_hours,
                'quantity_produced': float(s.quantity_produced) if s.quantity_produced else None,
                'item_name': s.item.name if s.item else None,
                'workers': [{'id': w.id, 'name': w.full_name} for w in s.workers.all()],
            }
            for s in sessions
        ])


class QCVerifySessionView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, token, session_id):
        qc = get_qc_token(token)
        if not qc:
            return Response({'detail': 'Invalid QC link.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            session = WorkSession.objects.get(pk=session_id, user=qc.user, status='completed')
        except WorkSession.DoesNotExist:
            return Response({'detail': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)

        quantity_rejected = request.data.get('quantity_rejected', 0)

        session.quantity_rejected = quantity_rejected
        session.status = 'verified'
        session.save()
        session.save_performance()

        return Response({'detail': 'Session verified.'})