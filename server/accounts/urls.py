from django.urls import path
from accounts.views import RegisterView, LoginView, LogoutView, UserView, RefreshTokenView

urlpatterns = [
    path('register', RegisterView.as_view(), name='register'),
    path('login', LoginView.as_view(), name='login'),
    path('logout', LogoutView.as_view(), name='logout'),
    path('user', UserView.as_view(), name='user'),
    path('refresh', RefreshTokenView.as_view(), name='token-refresh'),
]