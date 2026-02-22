from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from django.contrib.auth.models import User

from .models import Project , Task
from .serializers import (
    RegistrationSerializer,
    UserSerializer,
    ProjectListSerializers,
    ProjectDetailSerializer,
    ProjectCreateUpdateSerializer,
    )
from .permissions import IsProjectCreator, IsProjectMember


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
        
    
    
## Project Viewset

class ProjectViewSet(viewsets.ModelViewSet):
    '''
    Viewset for Project CRUD operations.
    
    list : Get all projects user is a member of
    create : Create new project
    retrieve : Get new project details
    update/partial_update = Update Project
    destroy : Delete project (creator only)
    '''

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        ''' Returns only projects where the user is a team member'''

        return Project.objects.filter(
            team_members=self.request.user
        ).distinct().order_by('-created_at')
    
    
    def get_serializer_class(self):
        '''Different serializers for difference objects'''    

        if self.action == 'list':
            return ProjectListSerializers
        elif self.action == 'retrieve':
            return ProjectDetailSerializer
        else: ## create, update, paritial_update
            return ProjectCreateUpdateSerializer
    
    def get_permissions(self):
        '''
        Different permission for different actions
        Only creator can destroy or manage team members
        '''

        creator_actions = [
            'update',
            'partial_update',
            'destroy',
            'add_member',
            'remove_member'
        ]


        if self.action in creator_actions:
            return [IsAuthenticated(), IsProjectCreator()]
        else : return [IsAuthenticated(), IsProjectMember()]

    
    def perform_create(self, serializer):
        ''' Set the creator when creating projects but we've done it in the serializer itself, so just do serailizer save'''
        serializer.save()
    
    
    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        """
            Add a team member to the project.
            POST /api/auth/{id}/add_member/
            Body : {"user_id" : 5}
        """

        project = self.get_object()

        # only creator can add members
        if project.created_by != request.user:
            return Response({
                'error' : 'Only project creator can add members'
            }, status=status.HTTP_403_FORBIDDEN)
        
        user_id = request.data.get('user_id')

        ## if user_id not present in input
        if not user_id:
            return Response({
                'error' : 'user_id is required'
            }, status = status.HTTP_400_BAD_REQUEST)
        
        
        try:
            user = User.objects.get(id = user_id)
            project.team_members.add(user)
        
            return Response({
                'message' : f'{user.username} added to project',
                'project' : ProjectDetailSerializer(project).data
            }, status = status.HTTP_200_OK)

        except User.DoesNotExist:
            return Response({
                'error' : "User not found"
            }, status = status.HTTP_404_NOT_FOUND) 
        
    
    @action(detail=True, methods=['post'])
    def remove_member(self, request, pk=None):
        """
        Remove a team member from project.
        POST /api/auth/{id}/remove_member/
        BODY : {'user_id' : 5}
        """

        project = self.get_object()

        # Only creator can remove members

        if project.created_by != request.user:
            return Response({
                'error' : "Only project creator can remove members"
            }, status=status.HTTP_403_FORBIDDEN)
        
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({
                'error' : 'user_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        
        ## preventing removing the creator
        
        if int(user_id) == project.created_by.id:
            return Response({
                'error' : "Cannot remove project creator"
            }, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = User.objects.get(id = user_id)
            project.team_members.remove(user)

            return Response({
                'message' : f'{user.username} removed from project',
                'project' : ProjectDetailSerializer(project).data
            }, status=status.HTTP_200_OK)
        
        except User.DoesNotExist:
            return Response({
                'error' : 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)

    
    @action(detail=True, methods=['get'] )
    def tasks(self, request, pk=None):
        '''
        Get all tasks in this project,
        GET /api/projects/{id}/tasks/
        '''

        project = self.get_object()
        tasks = project.tasks.all()

        task_data = [{
            'id': task.id,
            'title': task.title,
            'status' : task.status,
            'priority' : task.priority,
            'assigned_to' : task.assigned_to.username if task.assigned_to else None
        } for task in tasks]

        return Response({
            'project' : project.project_name,
            'tasks': task_data
        })