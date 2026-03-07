from django.urls import path
from .views import ItemListCreateView, ItemDetailView, ItemSearchView

urlpatterns = [
    path('', ItemListCreateView.as_view(), name='item-list'),
    path('search/', ItemSearchView.as_view(), name='item-search'),
    path('<int:pk>/', ItemDetailView.as_view(), name='item-detail'),
]