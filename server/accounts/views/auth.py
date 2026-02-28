from django.contrib.auth import get_user_model
from django.conf import settings

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from ..serializers import RegisterSerializer, LoginSerializer, UserSerializer
from ..utils import set_jwt_cookies, clear_jwt_cookies

User = get_user_model()


class RegisterView(APIView):
    """
    POST /api/auth/register
    """
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


class LoginView(APIView):
    """
    POST /api/auth/login
    """
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
    """
    POST /api/auth/logout
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        response = Response(
            {'message': 'Logout successful'},
            status=status.HTTP_200_OK
        )
        clear_jwt_cookies(response)
        return response


class UserView(APIView):
    """
    GET /api/auth/user
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class RefreshTokenView(APIView):
    """
    POST /api/auth/refresh
    """
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