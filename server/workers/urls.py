from django.urls import path
from .views import (
    WorkerGroupListView,
    WorkerGroupDetailView,
    WorkerListView,
    WorkerDetailView,
    WorkerLeaderboardView,
    WorkerReputationEventListView,
    ActiveShiftView,
    StartShiftView,
    EndShiftView,
    TodaySummaryView,
    WorkerStationsView,
    DayOverviewView,
)

urlpatterns = [
    path('', WorkerListView.as_view(), name='worker-list'),
    path('<int:pk>/', WorkerDetailView.as_view(), name='worker-detail'),
    path('leaderboard/', WorkerLeaderboardView.as_view(), name='worker-leaderboard'),
    path('reputation/events/', WorkerReputationEventListView.as_view(), name='worker-reputation-events'),
    path('groups/', WorkerGroupListView.as_view(), name='worker-group-list'),
    path('groups/<int:pk>/', WorkerGroupDetailView.as_view(), name='worker-group-detail'),
    # Personal-kiosk clock-in / clock-out.
    path('shifts/active/', ActiveShiftView.as_view(), name='worker-shift-active'),
    path('shifts/start/', StartShiftView.as_view(), name='worker-shift-start'),
    path('shifts/<int:pk>/end/', EndShiftView.as_view(), name='worker-shift-end'),
    path('<int:worker_id>/today-summary/', TodaySummaryView.as_view(), name='worker-today-summary'),
    path('<int:worker_id>/stations/', WorkerStationsView.as_view(), name='worker-stations'),
    path('<int:worker_id>/day/<str:date>/', DayOverviewView.as_view(), name='worker-day-overview'),
]
