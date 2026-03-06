from django.urls import path
from .views import WorkerGroupListView, WorkerGroupDetailView, WorkerListView, WorkerDetailView, WorkerLeaderboardView

urlpatterns = [
    path('', WorkerListView.as_view(), name='worker-list'),
    path('<int:pk>/', WorkerDetailView.as_view(), name='worker-detail'),
    path('leaderboard/', WorkerLeaderboardView.as_view(), name='worker-leaderboard'),
    path('groups/', WorkerGroupListView.as_view(), name='worker-group-list'),
    path('groups/<int:pk>/', WorkerGroupDetailView.as_view(), name='worker-group-detail'),
]