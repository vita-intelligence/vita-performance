from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from django.utils.dateparse import parse_date
from workers.models import Worker
from workstations.models import Workstation
from work_sessions.models import WorkSession
from ..models import QCToken
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator


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


@method_decorator(ratelimit(key='ip', rate='10/m', method='POST', block=True), name='post')
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
    """Paginated, filterable list of pending QC sessions across all workstations."""
    permission_classes = [AllowAny]

    def get(self, request, token):
        qc = get_qc_token(token)
        if not qc:
            return Response({'detail': 'Invalid QC link.'}, status=status.HTTP_404_NOT_FOUND)

        qs = (
            WorkSession.objects
            .filter(user=qc.user, status='completed')
            .select_related('workstation', 'item')
            .prefetch_related('workers')
            .order_by('-start_time')
        )

        workstation_id = request.query_params.get('workstation')
        if workstation_id:
            qs = qs.filter(workstation_id=workstation_id)

        worker_id = request.query_params.get('worker')
        if worker_id:
            qs = qs.filter(workers__pk=worker_id)

        search = (request.query_params.get('search') or '').strip()
        if search:
            qs = qs.filter(
                Q(workstation__name__icontains=search)
                | Q(workers__full_name__icontains=search)
                | Q(item__name__icontains=search)
            )

        date_from = parse_date(request.query_params.get('date_from') or '')
        if date_from:
            qs = qs.filter(start_time__date__gte=date_from)

        date_to = parse_date(request.query_params.get('date_to') or '')
        if date_to:
            qs = qs.filter(start_time__date__lte=date_to)

        qs = qs.distinct()

        try:
            page = max(1, int(request.query_params.get('page') or 1))
        except (TypeError, ValueError):
            page = 1
        try:
            page_size = min(100, max(1, int(request.query_params.get('page_size') or 25)))
        except (TypeError, ValueError):
            page_size = 25

        total = qs.count()
        offset = (page - 1) * page_size
        sessions = qs[offset:offset + page_size]

        results = [
            {
                'id': s.id,
                'workstation_id': s.workstation_id,
                'workstation_name': s.workstation.name if s.workstation else None,
                'start_time': s.start_time.isoformat(),
                'end_time': s.end_time.isoformat() if s.end_time else None,
                'duration_hours': s.duration_hours,
                'quantity_produced': float(s.quantity_produced) if s.quantity_produced else None,
                'item_name': s.item.name if s.item else None,
                'workers': [{'id': w.id, 'name': w.full_name} for w in s.workers.all()],
            }
            for s in sessions
        ]

        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size if total else 0,
            'results': results,
        })


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