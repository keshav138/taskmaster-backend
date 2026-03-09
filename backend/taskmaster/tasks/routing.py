'''
Maps the websockets url to the consumer
Similar to urls.py and views
'''

from django.urls import re_path
from . import consumers

# as_asgi is similar to as_view(), since its a asynchronous class

websocket_urlpatterns = [
    re_path(r'ws/notifications/$', consumers.NotificationConsumer.as_asgi()), 
]