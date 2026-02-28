from django.conf import settings

def set_jwt_cookies(response, access_token, refresh_token):
    """
    Helper function to set JWT tokens in HTTP-only cookies
    """
    # Access token cookie
    response.set_cookie(
        key=settings.JWT_AUTH_COOKIE,
        value=str(access_token),
        max_age=settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds(),
        secure=settings.JWT_AUTH_COOKIE_SECURE,
        httponly=settings.JWT_AUTH_COOKIE_HTTP_ONLY,
        samesite=settings.JWT_AUTH_COOKIE_SAMESITE,
        path=settings.JWT_AUTH_COOKIE_PATH,
    )
    
    # Refresh token cookie
    response.set_cookie(
        key=settings.JWT_AUTH_REFRESH_COOKIE,
        value=str(refresh_token),
        max_age=settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds(),
        secure=settings.JWT_AUTH_COOKIE_SECURE,
        httponly=settings.JWT_AUTH_COOKIE_HTTP_ONLY,
        samesite=settings.JWT_AUTH_COOKIE_SAMESITE,
        path=settings.JWT_AUTH_COOKIE_PATH,
    )
    
    return response


def clear_jwt_cookies(response):
    """
    Helper function to clear JWT cookies (for logout)
    """
    response.delete_cookie(
        key=settings.JWT_AUTH_COOKIE,
        path=settings.JWT_AUTH_COOKIE_PATH,
        samesite=settings.JWT_AUTH_COOKIE_SAMESITE,
    )
    response.delete_cookie(
        key=settings.JWT_AUTH_REFRESH_COOKIE,
        path=settings.JWT_AUTH_COOKIE_PATH,
        samesite=settings.JWT_AUTH_COOKIE_SAMESITE,
    )
    return response