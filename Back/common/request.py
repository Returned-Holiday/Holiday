from django.http import HttpRequest
from rest_framework.request import Request
from rest_framework.throttling import BaseThrottle


# XFF는 NUM_PROXIES 설정만큼만 신뢰 (DRF throttle과 같은 기준)
def client_ip(request: HttpRequest | Request) -> str:
    return BaseThrottle().get_ident(request)
