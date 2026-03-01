import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from dashboard.serializers.realtime import build_dashboard_payload


class DashboardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")
        self.group_name = None

        if not self.user or not self.user.is_authenticated:
            await self.close()
            return

        # Each user gets their own dashboard group
        # so data is isolated between different companies
        self.group_name = f"dashboard_{self.user.id}"

        # Join the group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

        # Send initial data immediately on connect
        await self.send_dashboard_update()

    async def disconnect(self, close_code):
        if self.group_name:
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        # Client can send "ping" to request a fresh update
        try:
            data = json.loads(text_data)
            if data.get("type") == "ping":
                await self.send_dashboard_update()
        except json.JSONDecodeError:
            pass

    # Called by channel layer when group receives a message
    async def dashboard_update(self, event):
        await self.send(text_data=json.dumps(event["data"]))

    async def send_dashboard_update(self):
        payload = await database_sync_to_async(build_dashboard_payload)(self.user)
        await self.send(text_data=json.dumps(payload))