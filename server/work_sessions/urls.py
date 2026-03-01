from django.urls import path
from .views import (
    WorkSessionListView,
    WorkSessionDetailView,
    WorkSessionStartView,
    WorkSessionStopView,
    ActiveWorkSessionsView,
)

urlpatterns = [
    path('', WorkSessionListView.as_view(), name='work-session-list'),
    path('<int:pk>/', WorkSessionDetailView.as_view(), name='work-session-detail'),
    path('start/', WorkSessionStartView.as_view(), name='work-session-start'),
    path('<int:pk>/stop/', WorkSessionStopView.as_view(), name='work-session-stop'),
    path('active/', ActiveWorkSessionsView.as_view(), name='work-session-active'),
]