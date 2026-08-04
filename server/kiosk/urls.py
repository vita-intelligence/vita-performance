from django.urls import path
from kiosk.views import (
    KioskWorkstationView,
    KioskWorkersView,
    KioskVerifyPinView,
    KioskStartSessionView,
    KioskActiveSessionView,
    KioskStopSessionView,
    KioskItemSearchView,
    KioskSOPView,
    KioskFormsView,
    KioskQCWorkersView
)
from kiosk.views.psp_bridge import KioskMOsView, KioskNonMOActivitiesView
from dynamic_forms.views import FormResponseCreateView
# Personal kiosk (tenant-paired tablet) — lives under /api/kiosk/personal
# so the URL family stays consistent with /kiosk/<workstation-token>.
from workers.views import (
    PersonalKioskTokenView,
    PublicPersonalKioskRosterView,
    PublicPersonalKioskActiveShiftView,
    PublicPersonalKioskStartShiftView,
    PublicPersonalKioskEndShiftView,
    PublicPersonalKioskTodaySummaryView,
    PublicPersonalKioskStationsView,
    PublicPersonalKioskPerformanceView,
    PublicPersonalKioskReputationView,
    PublicPersonalKioskSessionView,
    PublicPersonalKioskLiveStatusView,
    PublicPersonalKioskVerifyPinView,
    PublicPersonalKioskHistoryView,
    PublicPersonalKioskWorkstationContextView,
    PublicPersonalKioskWorkstationItemsView,
    PublicPersonalKioskWorkstationMOsView,
    PublicPersonalKioskStartWorkstationSessionView,
    PublicPersonalKioskStopWorkstationSessionView,
    PublicPersonalKioskQCSessionsView,
    PublicPersonalKioskQCVerifySessionView,
    PublicPersonalKioskQCRosterView,
    PublicPersonalKioskQCGeneralFeedbackView,
)

urlpatterns = [
    # Personal-kiosk owner endpoint (auth) — get / regenerate the
    # tablet-pairing token.
    path('personal/token/', PersonalKioskTokenView.as_view(), name='personal-kiosk-token'),

    # Personal-kiosk public endpoints (AllowAny). The `personal/`
    # prefix comes BEFORE the generic `<uuid:token>/` catch below so
    # the router doesn't misroute /personal to KioskWorkstationView.
    path('personal/<uuid:token>/workers/', PublicPersonalKioskRosterView.as_view()),
    path('personal/<uuid:token>/workers/<int:worker_id>/shifts/active/', PublicPersonalKioskActiveShiftView.as_view()),
    path('personal/<uuid:token>/workers/<int:worker_id>/today-summary/', PublicPersonalKioskTodaySummaryView.as_view()),
    path('personal/<uuid:token>/workers/<int:worker_id>/stations/', PublicPersonalKioskStationsView.as_view()),
    path('personal/<uuid:token>/workers/<int:worker_id>/performance/', PublicPersonalKioskPerformanceView.as_view()),
    path('personal/<uuid:token>/workers/<int:worker_id>/reputation/', PublicPersonalKioskReputationView.as_view()),
    path('personal/<uuid:token>/workers/<int:worker_id>/verify-pin/', PublicPersonalKioskVerifyPinView.as_view()),
    path('personal/<uuid:token>/workers/<int:worker_id>/history/', PublicPersonalKioskHistoryView.as_view()),
    path('personal/<uuid:token>/workers/<int:worker_id>/live-status/', PublicPersonalKioskLiveStatusView.as_view()),
    # Session hydrate (GET) / logout (DELETE) — the tablet GETs the
    # URL on page load to restore the worker after a refresh, DELETEs
    # it on Log out to revoke the session server-side.
    path('personal/<uuid:token>/sessions/<uuid:session_token>/', PublicPersonalKioskSessionView.as_view()),
    path('personal/<uuid:token>/shifts/start/', PublicPersonalKioskStartShiftView.as_view()),
    path('personal/<uuid:token>/shifts/<int:shift_id>/end/', PublicPersonalKioskEndShiftView.as_view()),

    # Embedded workstation panel — session-authenticated so a worker
    # never re-enters a PIN just to start a session on a station.
    path('personal/<uuid:token>/workstations/<int:ws_id>/context/', PublicPersonalKioskWorkstationContextView.as_view()),
    path('personal/<uuid:token>/workstations/<int:ws_id>/items/', PublicPersonalKioskWorkstationItemsView.as_view()),
    path('personal/<uuid:token>/workstations/<int:ws_id>/mos/', PublicPersonalKioskWorkstationMOsView.as_view()),
    path('personal/<uuid:token>/workstations/<int:ws_id>/sessions/start/', PublicPersonalKioskStartWorkstationSessionView.as_view()),
    path('personal/<uuid:token>/work-sessions/<int:sess_id>/stop/', PublicPersonalKioskStopWorkstationSessionView.as_view()),

    # Embedded QC — is_qa workers verify sessions inside the personal kiosk.
    path('personal/<uuid:token>/qc/sessions/', PublicPersonalKioskQCSessionsView.as_view()),
    path('personal/<uuid:token>/qc/sessions/<int:session_id>/verify/', PublicPersonalKioskQCVerifySessionView.as_view()),
    # General (session-less) feedback — pick any worker + leave a mark.
    path('personal/<uuid:token>/qc/workers/', PublicPersonalKioskQCRosterView.as_view()),
    path('personal/<uuid:token>/qc/feedback/', PublicPersonalKioskQCGeneralFeedbackView.as_view()),

    # Existing per-workstation kiosk (untouched)
    path('<uuid:token>/', KioskWorkstationView.as_view()),
    path('<uuid:token>/workers/', KioskWorkersView.as_view()),
    path('<uuid:token>/verify-pin/', KioskVerifyPinView.as_view()),
    path('<uuid:token>/start/', KioskStartSessionView.as_view()),
    path('<uuid:token>/active/', KioskActiveSessionView.as_view()),
    path('<uuid:token>/stop/', KioskStopSessionView.as_view()),
    path('<uuid:token>/items/', KioskItemSearchView.as_view()),
    path('<uuid:token>/mos/', KioskMOsView.as_view()),
    path('<uuid:token>/non-mo-activities/', KioskNonMOActivitiesView.as_view()),
    path('<uuid:token>/sop/', KioskSOPView.as_view()),
    path('<uuid:token>/forms/<int:form_id>/respond/', FormResponseCreateView.as_view()),
    path('<uuid:token>/forms/', KioskFormsView.as_view()),
    path('<str:token>/qc-workers/', KioskQCWorkersView.as_view()),
]