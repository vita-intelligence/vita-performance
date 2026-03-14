import uuid
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from subscription.permissions import HasRealtimeAccess


class WebSocketTokenView(APIView):
    permission_classes = [IsAuthenticated, HasRealtimeAccess]

    def post(self, request):
        token = str(uuid.uuid4())
        cache_key = f"ws_token_{token}"
        # Store user_id against token, expires in 30 seconds
        cache.set(cache_key, request.user.id, timeout=30)
        return Response({"token": token})