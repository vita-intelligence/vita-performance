from django.urls import path
from accounts.views import (
    RegisterView, LoginView, LogoutView,
    UserView, RefreshTokenView,
    PasswordResetRequestView, PasswordResetConfirmView,
)

urlpatterns = [
    path('register', RegisterView.as_view()),
    path('login', LoginView.as_view()),
    path('logout', LogoutView.as_view()),
    path('user', UserView.as_view()),
    path('refresh', RefreshTokenView.as_view()),
    path('password-reset/', PasswordResetRequestView.as_view()),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view()),
]