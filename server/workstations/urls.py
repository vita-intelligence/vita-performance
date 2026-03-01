from django.urls import path
from .views import WorkstationListView, WorkstationDetailView

urlpatterns = [
    path('', WorkstationListView.as_view(), name='workstation-list'),
    path('<int:pk>/', WorkstationDetailView.as_view(), name='workstation-detail'),
]