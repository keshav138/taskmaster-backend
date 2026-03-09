'''
Unlike http headers where authentication headers are automatically inserted in the Authorization : Bearer <TOKEN>. Browsers does not allow us to
set custom headers on websockets. So we pass the token in a URL itself.

This aim of this middleware is to extract and verify this url.
'''

import jwt
from django.conf import settings
from django.contrib.auth.models import AnonymousUser, User
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from urllib.parse import parse_qs

@database_sync_to_async
def get_user(user_id):
    try:
        return User.objects.get(id = user_id)
    except User.DoesNotExist:
        return AnonymousUser()
    
class JWTAuthMiddleware(BaseMiddleware):
    
    async def __call__(self, scope, receive, send):
        '''
        scope.get(), get the bytecode query string, b'' is the defualt bytecode expected,
        parse_qs converts bytecode to python string
        query_params converts query params to a dict
        '''
        
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]
        
        scope['user'] = AnonymousUser()
        
        if token:
            try:
                ## checks for signature payload, if anyones hampered with the content
                decoded_data = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
                ## fetching user from a sync to async func
                scope['user'] = await get_user(decoded_data['user_id'])
            except (jwt.ExpiredSignatureError, jwt.DecodeError, KeyError):
                pass # invalid user, stays anonymous users
        
        return await super().__call__(scope, receive, send)

