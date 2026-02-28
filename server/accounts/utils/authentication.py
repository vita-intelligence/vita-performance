from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from django.conf import settings


class CookieJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that reads the access token from cookies
    instead of the Authorization header.
    
    This allows for more secure, httpOnly cookies that JavaScript can't access.
    """
    
    def authenticate(self, request):
        # Try to get token from cookie first
        cookie_name = getattr(settings, 'JWT_AUTH_COOKIE', 'access_token')
        raw_token = request.COOKIES.get(cookie_name)
        
        # Fallback to Authorization header if no cookie
        if raw_token is None:
            header = self.get_header(request)
            if header is None:
                return None
            
            raw_token = self.get_raw_token(header)
        
        if raw_token is None:
            return None
        
        # Validate the token
        validated_token = self.get_validated_token(raw_token)
        
        # Return user and token
        return self.get_user(validated_token), validated_token