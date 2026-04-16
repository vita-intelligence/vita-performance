from django.urls import path
from .views import DashboardOverviewView, WebSocketTokenView, WorkerStatsView, WorkstationStatsView

urlpatterns = [
    path('overview/', DashboardOverviewView.as_view(), name='dashboard-overview'),
    path('ws-token/', WebSocketTokenView.as_view(), name='dashboard-ws-token'),
    path('workers/<int:pk>/stats/', WorkerStatsView.as_view(), name='worker-stats'),
    path('workstations/<int:pk>/stats/', WorkstationStatsView.as_view(), name='workstation-stats'),
]