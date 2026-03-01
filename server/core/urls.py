from django.urls import path, include

api_patterns = [
    path('accounts/', include('accounts.urls')),
    path('settings/', include('settings.urls')),
    path('meta/', include('meta.urls')),
    path('workstations/', include('workstations.urls')),
    path('workers/', include('workers.urls')),
]

urlpatterns = [
    path('api/', include(api_patterns)),
]