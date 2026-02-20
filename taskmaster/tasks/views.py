from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from django.contrib.auth.models import User
from .serializers import RegistrationSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    '''
    User Registration Endpoint
    POST /api/auth/register
    Deserialization
    '''

    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data = request.data)
        serializer.is_valid(raise_exception = True)
        user = serializer.save()

        #generate tokens for the user
        refresh = RefreshToken.for_user(user)

        return Response({
            'user' : UserSerializer(user).data,
            'tokens' : {
                'refresh' : str(refresh),
                'access' : str(refresh.access_token),
            },
            'message' : 'User Successfully Registered',
        }, status = status.HTTP_201_CREATED)



class LogoutView(APIView):
    '''
    User Logout Endpoint
    POST api/auth/logout
    '''

    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(token = refresh_token)
                token.blacklist()
            
            return Response({
                'message' : 'Logout Successful'
            }, status = status.HTTP_200_OK)
        
        except Exception as e:
            return Response({
                'message' : 'Invalid Token',
            }, status = status.HTTP_400_BAD_REQUEST)


class CurrentUserView(APIView):
    '''
    Get current user's info
    GET api/auth/user
    Serialization
    '''

    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
        