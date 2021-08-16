from django.urls import re_path
from .consumers import videochat

websocket_urlpatterns=[
    re_path(r"ws/",videochat.as_asgi())
]