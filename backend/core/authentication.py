"""
Custom authentication for Django REST Framework
"""
from rest_framework.authentication import BaseAuthentication


class MockAuthentication(BaseAuthentication):
    """
    Authentication class pro DRF, která použije uživatele nastaveného MockAuthMiddleware.
    Tato třída NEAUTENTIZUJE - pouze předá uživatele z middleware do DRF.
    """
    def authenticate(self, request):
        """
        Vrátí uživatele z request (nastaveného middleware)
        """
        # Získat Django request z DRF wrapperu
        django_request = request._request
        user = getattr(django_request, 'user', None)
        
        # Pokud máme uživatele a není to AnonymousUser
        if user and hasattr(user, 'is_authenticated') and user.is_authenticated:
            return (user, None)
        
        # Jinak None (DRF použije AnonymousUser)
        return None
