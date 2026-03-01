from django.urls import path, include

api_patterns = [
    path('accounts/', include('accounts.urls')),
    path('settings/', include('settings.urls')),
    path('meta/', include('meta.urls')),
    path('workstations/', include('workstations.urls')),
    path('workers/', include('workers.urls')),
    path('sessions/', include('work_sessions.urls')),
    path('dashboard/', include('dashboard.urls')),
]

urlpatterns = [
    path('api/', include(api_patterns)),
]