from django.urls import path
from .views import DynamicFormListView, DynamicFormDetailView, SessionFormResponsesView

urlpatterns = [
    path('', DynamicFormListView.as_view()),
    path('<int:pk>/', DynamicFormDetailView.as_view()),
    path('sessions/<int:session_id>/responses/', SessionFormResponsesView.as_view()),
]