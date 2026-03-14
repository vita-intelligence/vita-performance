from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Subscription
from .serializers import SubscriptionSerializer


class SubscriptionStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            subscription = request.user.subscription
        except Subscription.DoesNotExist:
            subscription = Subscription.create_for_user(request.user)

        serializer = SubscriptionSerializer(subscription)
        return Response(serializer.data)