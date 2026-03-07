from django.urls import path
from qc.views import (
    QCTokenView,
    QCWorkersView,
    QCVerifyPinView,
    QCWorkstationsView,
    QCSessionsView,
    QCVerifySessionView,
)

urlpatterns = [
    path('token/', QCTokenView.as_view()),
    path('<uuid:token>/workers/', QCWorkersView.as_view()),
    path('<uuid:token>/verify-pin/', QCVerifyPinView.as_view()),
    path('<uuid:token>/workstations/', QCWorkstationsView.as_view()),
    path('<uuid:token>/workstations/<int:workstation_id>/sessions/', QCSessionsView.as_view()),
    path('<uuid:token>/sessions/<int:session_id>/verify/', QCVerifySessionView.as_view()),
]