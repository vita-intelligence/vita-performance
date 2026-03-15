from django.contrib.auth import get_user_model
from django.conf import settings

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.core.mail import EmailMessage
from django.contrib.auth.tokens import default_token_generator

from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator

import base64
import json

from ..serializers import RegisterSerializer, LoginSerializer, UserSerializer
from ..utils import set_jwt_cookies, clear_jwt_cookies

User = get_user_model()


@method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True), name='post')
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        response = Response(
            {'user': UserSerializer(user).data, 'message': 'Registration successful'},
            status=status.HTTP_201_CREATED
        )
        set_jwt_cookies(response, refresh.access_token, refresh)
        return response


@method_decorator(ratelimit(key='ip', rate='10/m', method='POST', block=True), name='post')
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Invalid email or password'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.check_password(password):
            return Response(
                {'detail': 'Invalid email or password'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {'detail': 'User account is disabled'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        refresh = RefreshToken.for_user(user)
        response = Response(
            {'user': UserSerializer(user).data, 'message': 'Login successful'},
            status=status.HTTP_200_OK
        )
        set_jwt_cookies(response, refresh.access_token, refresh)
        return response


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        response = Response(
            {'message': 'Logout successful'},
            status=status.HTTP_200_OK
        )
        clear_jwt_cookies(response)
        return response


class UserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class RefreshTokenView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get(settings.JWT_AUTH_REFRESH_COOKIE)

        if not refresh_token:
            return Response(
                {'detail': 'Refresh token not found'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            refresh = RefreshToken(refresh_token)
            access_token = refresh.access_token

            response = Response({'message': 'Token refreshed'})
            response.set_cookie(
                key=settings.JWT_AUTH_COOKIE,
                value=str(access_token),
                max_age=settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds(),
                secure=settings.JWT_AUTH_COOKIE_SECURE,
                httponly=settings.JWT_AUTH_COOKIE_HTTP_ONLY,
                samesite=settings.JWT_AUTH_COOKIE_SAMESITE,
                path=settings.JWT_AUTH_COOKIE_PATH,
            )
            return response

        except Exception:
            return Response(
                {'detail': 'Invalid refresh token'},
                status=status.HTTP_401_UNAUTHORIZED
            )


@method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True), name='post')
class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').lower().strip()
        if not email:
            return Response({'detail': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk)).rstrip('=')

            # Encode uid + token into a single URL-safe string with no special chars
            payload_data = json.dumps({'uid': uid, 'token': token}, separators=(',', ':'))
            payload = base64.urlsafe_b64encode(payload_data.encode()).decode().rstrip('=')

            reset_url = f"{settings.FRONTEND_URL}/reset-password/{payload}"
            print(f"\n\nRESET URL: {reset_url}\n\n")

            body = (
                "Reset your Vita Performance password.\n\n"
                "Copy and paste this link into your browser:\n\n"
                f"{reset_url}\n\n"
                "This link expires in 24 hours.\n"
            )

            email_msg = EmailMessage(
                subject='Reset your Vita Performance password',
                body=body,
                from_email=settings.EMAIL_FROM,
                to=[user.email],
            )
            email_msg.content_subtype = 'plain'
            email_msg.encoding = 'ascii'
        except User.DoesNotExist:
            pass

        return Response({'detail': 'If that email exists, a reset link has been sent.'})


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        payload = request.data.get('payload')
        password = request.data.get('password')

        if not all([payload, password]):
            return Response({'detail': 'payload and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            padded = payload + '=' * (-len(payload) % 4)
            decoded = json.loads(base64.urlsafe_b64decode(padded).decode())
            uid = decoded['uid']
            token = decoded['token']
            padded_uid = uid + '=' * (-len(uid) % 4)
            user_id = force_str(urlsafe_base64_decode(padded_uid))
            user = User.objects.get(pk=user_id)
        except Exception:
            return Response({'detail': 'Invalid reset link.'}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({'detail': 'Reset link is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(password) < 8:
            return Response({'detail': 'Password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save()

        return Response({'detail': 'Password reset successful.'})