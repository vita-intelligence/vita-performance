from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from ..models import DynamicForm, FormResponse
from ..serializers import FormResponseSerializer
from workstations.models import Workstation


def get_workstation_by_token(token):
    try:
        return Workstation.objects.select_related('user').get(
            kiosk_token=token,
            is_active=True,
        )
    except Workstation.DoesNotExist:
        return None


class FormResponseCreateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, token, form_id):
        workstation = get_workstation_by_token(token)
        if not workstation:
            return Response({'detail': 'Invalid kiosk link.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            form = DynamicForm.objects.get(
                pk=form_id,
                user=workstation.user,
                is_active=True,
            )
        except DynamicForm.DoesNotExist:
            return Response({'detail': 'Form not found.'}, status=status.HTTP_404_NOT_FOUND)

        session_id = request.data.get('session_id')
        answers = request.data.get('answers', {})

        if not session_id:
            return Response({'detail': 'session_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        response = FormResponse.objects.create(
            session_id=session_id,
            form=form,
            answers=answers,
        )
        serializer = FormResponseSerializer(response)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SessionFormResponsesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        responses = FormResponse.objects.filter(
            session_id=session_id,
            session__user=request.user,
        ).select_related('form').order_by('submitted_at')

        return Response([
            {
                'id': r.id,
                'form_id': r.form.id,
                'form_name': r.form.name,
                'trigger': r.form.trigger,
                'submitted_at': r.submitted_at.isoformat(),
                'answers': r.answers,
                'schema': r.form.schema,
            }
            for r in responses
        ])