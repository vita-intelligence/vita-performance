from django.urls import path
from qc.views import (
    QCTokenView,
    QCWorkersView,
    QCAllWorkersView,
    QCVerifyPinView,
    QCWorkstationsView,
    QCSessionsView,
    QCVerifySessionView,
    QCGeneralFeedbackView,
)

urlpatterns = [
    path('token/', QCTokenView.as_view()),
    path('<uuid:token>/workers/', QCWorkersView.as_view()),
    path('<uuid:token>/all-workers/', QCAllWorkersView.as_view()),
    path('<uuid:token>/verify-pin/', QCVerifyPinView.as_view()),
    path('<uuid:token>/workstations/', QCWorkstationsView.as_view()),
    path('<uuid:token>/sessions/', QCSessionsView.as_view()),
    path('<uuid:token>/sessions/<int:session_id>/verify/', QCVerifySessionView.as_view()),
    path('<uuid:token>/feedback/', QCGeneralFeedbackView.as_view()),
]