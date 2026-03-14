from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from accounts.utils.authentication import CookieJWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


EXEMPT_PATHS = [
    '/api/accounts/login',
    '/api/accounts/register',
    '/api/accounts/password-reset',
    '/api/accounts/refresh',
    '/api/accounts/logout',
    '/api/accounts/user',
    '/api/subscription/',
    '/api/kiosk/',
    '/api/qc/',
    '/admin/',
]


def is_exempt(path):
    for exempt in EXEMPT_PATHS:
        if path.startswith(exempt):
            return True
    return False


class SubscriptionMiddleware(MiddlewareMixin):
    def process_request(self, request):
        if not request.path.startswith('/api/'):
            return None

        if is_exempt(request.path):
            return None

        auth = CookieJWTAuthentication()
        try:
            result = auth.authenticate(request)
            if result is None:
                return None
            user, token = result
        except (InvalidToken, TokenError):
            return None

        try:
            subscription = user.subscription
        except Exception:
            return None

        if subscription.has_access:
            return None

        return JsonResponse({
            'detail': 'Subscription expired.',
            'code': 'subscription_expired',
            'status': subscription.status,
        }, status=402)