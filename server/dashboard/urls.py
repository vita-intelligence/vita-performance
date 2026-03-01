from django.urls import path
from .views import DashboardOverviewView, WebSocketTokenView

urlpatterns = [
    path('overview/', DashboardOverviewView.as_view(), name='dashboard-overview'),
    path('ws-token/', WebSocketTokenView.as_view(), name='dashboard-ws-token'),
]