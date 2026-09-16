from django.urls import path
from .views import (
    DynamicFormDetailView,
    DynamicFormListView,
    DynamicFormPublishView,
    SessionFormResponsesView,
)

urlpatterns = [
    path('', DynamicFormListView.as_view()),
    # Publish endpoint sits above /<int:pk>/ so its path doesn't
    # collide with a numeric id. Service-token authed, called by PSP.
    path('publish/', DynamicFormPublishView.as_view()),
    path('<int:pk>/', DynamicFormDetailView.as_view()),
    path('sessions/<int:session_id>/responses/', SessionFormResponsesView.as_view()),
]