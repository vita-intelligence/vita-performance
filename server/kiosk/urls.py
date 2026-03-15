from django.urls import path
from kiosk.views import (
    KioskWorkstationView,
    KioskWorkersView,
    KioskVerifyPinView,
    KioskStartSessionView,
    KioskActiveSessionView,
    KioskStopSessionView,
    KioskItemSearchView,
    KioskSOPView
)

urlpatterns = [
    path('<uuid:token>/', KioskWorkstationView.as_view()),
    path('<uuid:token>/workers/', KioskWorkersView.as_view()),
    path('<uuid:token>/verify-pin/', KioskVerifyPinView.as_view()),
    path('<uuid:token>/start/', KioskStartSessionView.as_view()),
    path('<uuid:token>/active/', KioskActiveSessionView.as_view()),
    path('<uuid:token>/stop/', KioskStopSessionView.as_view()),
    path('<uuid:token>/items/', KioskItemSearchView.as_view()),
    path('<uuid:token>/sop/', KioskSOPView.as_view()),
]