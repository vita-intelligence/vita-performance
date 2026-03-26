from rest_framework.views import APIView
from rest_framework.generics import ListCreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from ..models import DynamicForm
from ..serializers import DynamicFormSerializer


class DynamicFormListView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DynamicFormSerializer

    def get_queryset(self):
        return DynamicForm.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('all') == 'true':
            return None
        return super().paginate_queryset(queryset)


class DynamicFormDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        try:
            return DynamicForm.objects.get(pk=pk, user=user)
        except DynamicForm.DoesNotExist:
            return None

    def get(self, request, pk):
        form = self.get_object(pk, request.user)
        if not form:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = DynamicFormSerializer(form)
        return Response(serializer.data)

    def patch(self, request, pk):
        form = self.get_object(pk, request.user)
        if not form:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = DynamicFormSerializer(form, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        form = self.get_object(pk, request.user)
        if not form:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        form.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)