from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from ..models import DynamicForm, FormResponse
from ..serializers import FormResponseSerializer
from workstations.models import Workstation
from work_sessions.models import WorkSession


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

        # Apply task_select overrides to the session
        for field in form.schema:
            if field.get('type') == 'task_select':
                answer = answers.get(field.get('id'))
                if answer and isinstance(answer, dict):
                    try:
                        session = WorkSession.objects.get(pk=session_id)
                        if answer.get('target_quantity') is not None:
                            session.override_target_quantity = answer['target_quantity']
                        if answer.get('target_duration') is not None:
                            session.override_target_duration = answer['target_duration']
                        if answer.get('label'):
                            session.override_task_name = answer['label']
                        session.save(update_fields=['override_target_quantity', 'override_target_duration', 'override_task_name'])
                    except WorkSession.DoesNotExist:
                        pass
                break  # Only one task_select per form

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