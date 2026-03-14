from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied


class HasRealtimeAccess(BasePermission):
    def has_permission(self, request, view):
        try:
            if not request.user.subscription.has_realtime:
                raise PermissionDenied({
                    'detail': 'Realtime dashboard is not available on your plan.',
                    'code': 'realtime_not_available',
                })
            return True
        except PermissionDenied:
            raise
        except Exception:
            return False


class HasKioskAccess(BasePermission):
    def has_permission(self, request, view):
        try:
            if not request.user.subscription.has_kiosk:
                raise PermissionDenied({
                    'detail': 'Kiosk access is not available on your plan.',
                    'code': 'kiosk_not_available',
                })
            return True
        except PermissionDenied:
            raise
        except Exception:
            return False


class HasQCAccess(BasePermission):
    def has_permission(self, request, view):
        try:
            if not request.user.subscription.has_qc:
                raise PermissionDenied({
                    'detail': 'QC access is not available on your plan.',
                    'code': 'qc_not_available',
                })
            return True
        except PermissionDenied:
            raise
        except Exception:
            return False


class WithinWorkerLimit(BasePermission):
    def has_permission(self, request, view):
        if request.method != 'POST':
            return True
        try:
            from workers.models import Worker
            subscription = request.user.subscription
            limit = subscription.worker_limit
            if limit is None:
                return True
            current = Worker.objects.filter(user=request.user).count()
            if current >= limit:
                raise PermissionDenied({
                    'detail': f'You have reached the worker limit for your plan ({limit}).',
                    'code': 'worker_limit_reached',
                    'limit': limit,
                    'current': current,
                })
            return True
        except PermissionDenied:
            raise
        except Exception:
            return False


class WithinWorkstationLimit(BasePermission):
    def has_permission(self, request, view):
        if request.method != 'POST':
            return True
        try:
            from workstations.models import Workstation
            subscription = request.user.subscription
            limit = subscription.workstation_limit
            if limit is None:
                return True
            current = Workstation.objects.filter(user=request.user).count()
            if current >= limit:
                raise PermissionDenied({
                    'detail': f'You have reached the workstation limit for your plan ({limit}).',
                    'code': 'workstation_limit_reached',
                    'limit': limit,
                    'current': current,
                })
            return True
        except PermissionDenied:
            raise
        except Exception:
            return False