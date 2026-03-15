from django.urls import path
from .views import WorkstationListView, WorkstationDetailView, WorkstationSOPView

urlpatterns = [
    path('', WorkstationListView.as_view(), name='workstation-list'),
    path('<int:pk>/', WorkstationDetailView.as_view(), name='workstation-detail'),
    path('<int:pk>/sop/', WorkstationSOPView.as_view()),
]