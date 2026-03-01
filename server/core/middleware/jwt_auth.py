from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.core.cache import cache
from django.contrib.auth import get_user_model

User = get_user_model()


@database_sync_to_async
def get_user_from_ws_token(token_string):
    cache_key = f"ws_token_{token_string}"
    user_id = cache.get(cache_key)
    if not user_id:
        return AnonymousUser()
    # Delete immediately — one time use
    cache.delete(cache_key)
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        token_list = params.get("token", [])

        if token_list:
            scope["user"] = await get_user_from_ws_token(token_list[0])
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)