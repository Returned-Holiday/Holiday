from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.guides.services import get_progress
from apps.mypage.serializers import MyIncidentProgressSerializer


# 내 것만 (URL·쿼리에 사용자 X → request.user)
class MypageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        progress = MyIncidentProgressSerializer(get_progress(request.user), many=True)
        return Response({"incidents": progress.data})
