from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.utils import timezone
from datetime import datetime
from workstations.models import Workstation
from workers.models import Worker
from work_sessions.models import WorkSession
from items.models import Item
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from workstations.models import SOP
from dynamic_forms.models import DynamicForm
from django.db.models import Q


def check_kiosk_access(workstation):
    try:
        return workstation.user.subscription.has_kiosk
    except Exception:
        return False

def parse_requested_at(value):
    """Parse an optional ISO timestamp from the client, falling back to now()."""
    if not value:
        return timezone.now()
    try:
        dt = datetime.fromisoformat(value)
        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt)
        if dt > timezone.now():
            return timezone.now()
        return dt
    except (ValueError, TypeError):
        return timezone.now()


def get_workstation_by_token(token):
    try:
        return Workstation.objects.select_related('user').get(
            kiosk_token=token,
            is_active=True,
        )
    except Workstation.DoesNotExist:
        return None


class KioskWorkstationView(APIView):
    """GET /api/kiosk/<token>/ — load workstation info + active session"""
    permission_classes = [AllowAny]

    def get(self, request, token):
        workstation = get_workstation_by_token(token)
        if not workstation:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)
        if not check_kiosk_access(workstation):
            return Response({
                'detail': 'Kiosk access is not available on this plan.',
                'code': 'kiosk_not_available',
            }, status=status.HTTP_403_FORBIDDEN)

        # For general workstations, active_session is not returned here —
        # the worker must check in first, then we find their session.
        active_session = None
        if not workstation.is_general:
            active_session = WorkSession.objects.filter(
                workstation=workstation,
                status='active',
            ).prefetch_related('workers').first()

        return Response({
            'workstation': {
                'id': workstation.id,
                'name': workstation.name,
                'is_general': workstation.is_general,
                'uom': workstation.uom or None,
            },
            'active_session': {
                'id': active_session.id,
                'start_time': active_session.start_time.isoformat(),
                'item_name': active_session.item.name if active_session.item else None,
                'workers': [
                    {'id': w.id, 'name': w.full_name}
                    for w in active_session.workers.all()
                ],
            } if active_session else None,
        })


class KioskWorkersView(APIView):
    """GET /api/kiosk/<token>/workers/ — list active workers for this account"""
    permission_classes = [AllowAny]

    def get(self, request, token):
        workstation = get_workstation_by_token(token)
        if not workstation:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)

        workers = Worker.objects.filter(
            user=workstation.user,
            is_active=True,
        ).order_by('full_name')

        return Response([
            {'id': w.id, 'name': w.full_name, 'has_pin': bool(w.pin)}
            for w in workers
        ])


@method_decorator(ratelimit(key='ip', rate='10/m', method='POST', block=True), name='post')
class KioskVerifyPinView(APIView):
    """POST /api/kiosk/<token>/verify-pin/ — verify worker PIN"""
    permission_classes = [AllowAny]

    def post(self, request, token):
        workstation = get_workstation_by_token(token)
        if not workstation:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)

        worker_id = request.data.get('worker_id')
        pin = request.data.get('pin')

        if not worker_id or not pin:
            return Response({'detail': 'worker_id and pin are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            worker = Worker.objects.get(pk=worker_id, user=workstation.user, is_active=True)
        except Worker.DoesNotExist:
            return Response({'detail': 'Worker not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not worker.check_pin(str(pin)):
            return Response({'detail': 'Incorrect PIN.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'id': worker.id, 'name': worker.full_name})


class KioskStartSessionView(APIView):
    """POST /api/kiosk/<token>/start/ — start a session"""
    permission_classes = [AllowAny]

    def post(self, request, token):
        workstation = get_workstation_by_token(token)
        if not workstation:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)

        worker_ids = request.data.get('worker_ids', [])
        item_id = request.data.get('item_id', None)

        if not worker_ids:
            return Response({'detail': 'At least one worker is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if workstation.is_general:
            # General workstation: allow multiple sessions, but block if any
            # of the selected workers already have an active session here
            busy_workers = WorkSession.objects.filter(
                workstation=workstation,
                status='active',
                workers__pk__in=worker_ids,
            ).values_list('workers__full_name', flat=True).distinct()
            if busy_workers:
                names = ', '.join(busy_workers)
                return Response(
                    {'detail': f'{names} already in an active session on this workstation.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            # Normal workstation: only one active session at a time
            if WorkSession.objects.filter(workstation=workstation, status='active').exists():
                return Response({'detail': 'A session is already active on this workstation.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            session = WorkSession.objects.create(
                user=workstation.user,
                workstation=workstation,
                item_id=item_id,
                status='active',
                start_time=parse_requested_at(request.data.get('requested_at')),
            )
            session.workers.set(worker_ids)

        return Response({
            'id': session.id,
            'start_time': session.start_time.isoformat(),
            'workers': [
                {'id': w.id, 'name': w.full_name}
                for w in session.workers.all()
            ],
        }, status=status.HTTP_201_CREATED)


class KioskActiveSessionView(APIView):
    """GET /api/kiosk/<token>/active/?worker_id=N — get current active session"""
    permission_classes = [AllowAny]

    def get(self, request, token):
        workstation = get_workstation_by_token(token)
        if not workstation:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)

        qs = WorkSession.objects.filter(
            workstation=workstation,
            status='active',
        ).prefetch_related('workers')

        # For general workstations, find the session for a specific worker
        worker_id = request.query_params.get('worker_id')
        if worker_id:
            qs = qs.filter(workers__pk=worker_id)

        session = qs.first()

        if not session:
            return Response(None)

        return Response({
            'id': session.id,
            'start_time': session.start_time.isoformat(),
            'item_name': session.item.name if session.item else None,
            'workers': [
                {'id': w.id, 'name': w.full_name}
                for w in session.workers.all()
            ],
        })


class KioskStopSessionView(APIView):
    """POST /api/kiosk/<token>/stop/ — stop active session"""
    permission_classes = [AllowAny]

    def post(self, request, token):
        workstation = get_workstation_by_token(token)
        if not workstation:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)

        worker_id = request.data.get('worker_id')
        pin = request.data.get('pin')
        quantity = request.data.get('quantity_produced')
        notes = request.data.get('notes', '')

        if not all([worker_id, pin, quantity]):
            return Response({'detail': 'worker_id, pin and quantity_produced are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Verify PIN
        try:
            worker = Worker.objects.get(pk=worker_id, user=workstation.user, is_active=True)
        except Worker.DoesNotExist:
            return Response({'detail': 'Worker not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not worker.check_pin(str(pin)):
            return Response({'detail': 'Incorrect PIN.'}, status=status.HTTP_400_BAD_REQUEST)

        # Get active session — for general workstations find by worker, otherwise single session
        session = WorkSession.objects.filter(
            workstation=workstation,
            status='active',
            workers__pk=worker_id,
        ).first()

        if not session:
            return Response({'detail': 'No active session found for this worker.'}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            session.end_time = parse_requested_at(request.data.get('requested_at'))
            session.status = 'completed'
            session.quantity_produced = quantity
            if notes:
                session.notes = notes
            session.save()
            session.save_performance()
        session.refresh_from_db()

        return Response({
            'detail': 'Session completed.',
            'session': {
                'id': session.id,
                'performance_percentage': session.performance_percentage,
                'duration_hours': session.duration_hours,
                'quantity_produced': session.quantity_produced,
                'item_name': session.item.name if session.item else None,
                'worker_name': worker.full_name,
                'uom': workstation.uom or None,
            },
        })


class KioskItemSearchView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        workstation = get_workstation_by_token(token)
        if not workstation:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)

        q = request.query_params.get('q', '').strip()
        items = Item.objects.filter(user=workstation.user, name__icontains=q)[:10]
        return Response([{'id': i.id, 'name': i.name} for i in items])
    

class KioskSOPView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        workstation = get_workstation_by_token(token)
        if not workstation:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            sop = SOP.objects.get(workstation=workstation)
            return Response({'content': sop.content, 'updated_at': sop.updated_at.isoformat()})
        except SOP.DoesNotExist:
            return Response({'content': '', 'updated_at': None})
        

class KioskFormsView(APIView):
    """GET /api/kiosk/<token>/forms/?trigger=start|end"""
    permission_classes = [AllowAny]

    def get(self, request, token):
        workstation = get_workstation_by_token(token)
        if not workstation:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)

        trigger = request.query_params.get('trigger', 'start')

        forms = DynamicForm.objects.filter(
            Q(workstation=workstation) | Q(workstation__isnull=True),
            user=workstation.user,
            is_active=True,
            trigger__in=[trigger, 'both'],
        )

        return Response([
            {'id': f.id, 'name': f.name, 'schema': f.schema}
            for f in forms
        ])


class KioskQCWorkersView(APIView):
    """GET /api/kiosk/<token>/qc-workers/ — list active QC workers"""
    permission_classes = [AllowAny]

    def get(self, request, token):
        workstation = get_workstation_by_token(token)
        if not workstation:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)

        workers = Worker.objects.filter(
            user=workstation.user,
            is_active=True,
            is_qa=True,
        ).order_by('full_name')

        return Response([
            {'id': w.id, 'name': w.full_name, 'has_pin': bool(w.pin)}
            for w in workers
        ])