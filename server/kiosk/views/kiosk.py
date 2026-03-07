from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from workstations.models import Workstation
from workers.models import Worker
from work_sessions.models import WorkSession
from items.models import Item


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

        active_session = WorkSession.objects.filter(
            workstation=workstation,
            status='active',
        ).prefetch_related('workers').first()

        return Response({
            'workstation': {
                'id': workstation.id,
                'name': workstation.name,
            },
            'active_session': {
                'id': active_session.id,
                'start_time': active_session.start_time.isoformat(),
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

        # Check no active session already running on this workstation
        if WorkSession.objects.filter(workstation=workstation, status='active').exists():
            return Response({'detail': 'A session is already active on this workstation.'}, status=status.HTTP_400_BAD_REQUEST)

        session = WorkSession.objects.create(
            user=workstation.user,
            workstation=workstation,
            item_id=item_id,
            status='active',
            start_time=timezone.now(),
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
    """GET /api/kiosk/<token>/active/ — get current active session"""
    permission_classes = [AllowAny]

    def get(self, request, token):
        workstation = get_workstation_by_token(token)
        if not workstation:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)

        session = WorkSession.objects.filter(
            workstation=workstation,
            status='active',
        ).prefetch_related('workers').first()

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

        # Get active session
        try:
            session = WorkSession.objects.get(workstation=workstation, status='active')
        except WorkSession.DoesNotExist:
            return Response({'detail': 'No active session found.'}, status=status.HTTP_404_NOT_FOUND)

        # Verify worker is part of this session
        if not session.workers.filter(pk=worker_id).exists():
            return Response({'detail': 'You are not part of this session.'}, status=status.HTTP_403_FORBIDDEN)

        session.end_time = timezone.now()
        session.status = 'completed'
        session.quantity_produced = quantity
        if notes:
            session.notes = notes
        session.save()
        session.save_performance()

        return Response({'detail': 'Session completed.'})


class KioskItemSearchView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        workstation = get_workstation_by_token(token)
        if not workstation:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)

        q = request.query_params.get('q', '').strip()
        items = Item.objects.filter(user=workstation.user, name__icontains=q)[:10]
        return Response([{'id': i.id, 'name': i.name} for i in items])