from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.exceptions import PermissionDenied

from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from django.contrib.auth.models import User

from .models import Project, Task, Comment, Activity
from .serializers import (
    RegistrationSerializer,
    UserSerializer,
    ProjectListSerializers,
    ProjectDetailSerializer,
    ProjectCreateUpdateSerializer,
    TaskListSerializer,
    TaskDetailSerializer,
    TaskCreateUpdateSerializer,
    TaskAssignSerializer,
    TaskStatusSerializer,
    CommentSerializer,
    CommentCreateSerializer,
    ActivitySerializer
    )
from .permissions import (
    IsProjectCreator,
    IsProjectMember,
    IsTaskProjectMember,
    CanModifyTask,
    IsCommentOwner
)

from .pagination import StandardResultsSetPagination, LargeResultsSetPagination
from .filters import ProjectFilter, TaskFilter

# ======================================================CODEBASE================================================================ #

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
    pagination_class = StandardResultsSetPagination
    filterset_class = ProjectFilter
    search_fields = ['project_name', 'description']
    ordering_fields = ['created_at', 'updated_at', 'project_name']
    ordering = ['-created_at']

    def get_queryset(self):
        ''' Returns only projects where the user is a team member'''
        """ Optimised using select_related and prefetch_related"""

        return Project.objects.filter(
            team_members=self.request.user
        ).select_related(
            'created_by' # fetch creator in every query
        ).prefetch_related(
            'team_members', # prefetech all team members
            'tasks' # prefetch tasks for counts
        ).distinct().order_by('-created_by')
    
    
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
    
    @action(detail=True, methods=['GET'])
    def activities(self, request, pk=None):
        """
        Get recent activities for this project.
        GET /api/projects/{id}/activities/ 

        Optional -
        -limit : number of activities to return (default 50)
        """

        project = self.get_object()
        activities = project.activities.all() ## doesnt actually fetch all , more like prepares the SQL query

        # using paginator 
        paginator = LargeResultsSetPagination
        page = paginator.paginate_queryset(activites, request) 

        if page is not None:
           serialzier = ActivitySerializer(page, many=True) 
           return paginator.get_paginated_response(serializer.data) ## this calls the custom paginated response function

        """
        This is a fallback code section, if by any chance the pagination fails, it return the entire activity query set.
        """
        serializer = ActivitySerializer(activities, many=True)

        return Response({
            'project_id' : project.id,
            'project_name' : project.project_name,
            'count' : activities.count(),
            'activities' : serializer.data
        })


## Task Viewset

class TaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Task CRUD operations with filtering 

    list : Get all tasks with filters
    create : Create new task
    retrieve : Get single task details
    update/partial_update : Update task
    destroy : delete task

    """

    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]

    """ we no longer need this, this was a drf shortcut for filtering, we now have a more advanced one """
    # filterset_fields = ['project', 'status', 'priority', 'assigned_to']

    pagination_class = StandardResultsSetPagination
    filterset_class = TaskFilter


    # Search & Ordering options
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'due_date', 'priority', 'status']
    ordering = ['-created_at'] # default ordering

    def get_queryset(self):
        '''
        Return tasks from projects where user is a team members.
        Support additional query for filtering
        '''

        user = self.request.user

        # Base QuerySET: tasks from user's projects
        queryset = Task.objects.filter(
            project__team_members = user
        ).select_related(
            'project', 'created_by', 'assigned_to'
        ).prefetch_related('comments').distinct()

        #---------------------------------------------------------------------#
        
        ## additional filtering via query parameters
        
        #---------------------------------------------------------------------#
        # Filter by project (already handled by filterset_fields)
        # ?project=1
        #---------------------------------------------------------------------#
        
        # Filter : my_assigned_tasks
        # ?assigned_to_me=true

        if self.request.query_params.get('assigned_to_me') == True:
            queryset = queryset.filter(assigned_to=user)
        
        
        # Filter : overdue tasks
        # ?overdue = true

        if self.request.query_params.get('overdue') == True:
            queryset = queryset.filter(
                due_date__lt=timezone.now(),
                status__in = ['TODO', 'IN_PROGRESS', 'IN_REVIEW']
            )
        
        # Filter : due this week
        # ?due_this_week=true
        
        if self.request.query_params.get('due_this_week') == True:
            today = timezone.now()
            week_end = today + timezone.timedelta(days=7)
            queryset = queryset.filter(
               due_date__gt = today,
               due_date__lt = week_end 
            )
        
        return queryset
    

    def get_serializer_class(self):
        """ Use different serializer class for different actions""" 

        if self.action == 'list':
            return TaskListSerializer

        elif self.action == 'retrieve':
            return TaskDetailSerializer
        
        else :
            return TaskCreateUpdateSerializer
    
    def get_permissions(self):
        """ Different permissions for different actions""" 

        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), CanModifyTask()]
        return [IsAuthenticated(), IsTaskProjectMember()]

#===============================================ACTIVITY LOGGING================================================#

    # overiding to track activity 
    def perform_update(self, serializer):
        """ Override to track who updated the task """
        old_instance = self.get_object()
        new_instance = serializer.save()

        # Log changes with the actual user
        self._log_task_changes(old_instance, new_instance, self.request.user)
    
    
    def _log_task_changes(self, old_task, new_task, user):
        """ Helper method to log task changes"""

        # Status changes
        if old_task.status != new_task.status:
            Activity.objects.create(
                project = new_task.project,
                user = user,
                action = 'changed task status',
                details = f'Task {new_task.title} status changed from {old_task.status} to {new_task.status}'
            )
        
        # Assignment change
        if old_task.assigned_to != new_task.assigned_to:
            if new_task.assigned_to:
                Activity.objects.create(
                    project = new_task.project,
                    user = user,
                    action = 'assigned task',
                    details = f'Task {new_task.title} assigned to {new_task.assigned_to.username}'
                )
            elif old_task.assigned_to:
                Activity.objects.create(
                    project = new_task.project,
                    user = user,
                    action = 'unassigned task',
                    details = f'Task {new_task.title} was unassigned'
                )
        
        # Priority Changed
        if old_task.priority != new_task.priority:
            Activity.objects.create(
                project = new_task.project,
                user = user,
                action = 'changed task priority',
                details = f'Task {new_task.title} priority changed from {old_task.priority} to {new_task.priority}'
            )
#===============================================ACTIVITY LOGGING END================================================#
    
    
    @action(detail=False, methods=['GET'])
    def my_tasks(self, request):
        '''
        Get all tasks assigned to the user
        GET /api/tasks/my_tasks 
        '''

        tasks = self.get_queryset().filter(assigned_to = request.user)
        serializer = TaskListSerializer(tasks, many=True)

        return Response({
            'count' : tasks.count(),
            'tasks' : serializer.data
        })
    
    
    @action(detail=False, methods=['GET'])
    def overdue(self, request):
        '''
        Get all overdue tasks 
        GET /api/tasks/overdue
        '''

        tasks = self.get_queryset().filter(
            due_date__lt = timezone.now(),
            status__in = ['TODO', 'IN_PROGRESS', 'IN_REVIEW']
        )

        serializer = TaskListSerializer(tasks, many=True)

        return Response({
            'count' : tasks.count(),
            'tasks' : serializer.data
        })
    
    
    
    @action(detail=True, methods=['POST'])
    def change_status(self, request, pk=None):
        """
        Change task status with validation 
        POST /api/tasks/{id}/change_status/
        Body : {'status' : 'IN_PROGRESS'}
        """

        task = self.get_object() ## grabbing task obj from url
        
        serializer = TaskStatusSerializer(
            data = request.data, # the incoming change status json
            context = {'task' : task}
        )

        if serializer.is_valid():
            old_status = task.status
            task.status = serializer.validated_data['status']
            task.save()

            # Log with user
            Activity.objects.create(
                project = task.project,
                user = request.user,
                action = 'changed task status',
                details = f'Task {task.title} change from {old_status} to {task.status}'
            )

            return Response({
                'message' : 'Status updated successfully',
                'old_status' : old_status,
                'new_status' : task.status,
                'task' : TaskDetailSerializer(task).data
            })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    
    
    @action(detail=True, methods=['POST'])
    def assign(self, request, pk=None):
        """
        Asssign task to a user.
        POST /api/tasks/{id}/assign/ 
        Body : {"user_id" : 3}
        """

        task = self.get_object()
        serializer = TaskAssignSerializer(
            data = request.data,
            context = {'task' : task}
        )

        if serializer.is_valid():
            user_id = serializer.validated_data['user_id']
            user = User.objects.get(id = user_id)

            old_assigned = task.assigned_to
            task.assigned_to = user
            task.save()
        
            ## Log with user
            Activity.objects.create(
                project = task.project,
                user = request.user,
                action = 'assigned task',
                details = f'Task {task.title} assigned to {user.username}'
            )

            return Response({
                'message' : f'Task assigned to {user.username}',
                'old_assinee' : old_assigned if old_assigned else None,
                'new_assinee' : user.username,
                'task' : TaskDetailSerializer(task).data
            })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    
    @action(detail=True, methods=['POST'])
    def unassign(self, request, pk=None):
        '''
        Unassign task (remove assigned) 
        POST /api/task/{id}/unassign
        '''

        task = self.get_object()
        old_assignee = task.assigned_to
        task.assigned_to = None
        task.save()

        Activity.objects.create(
            project = task.project,
            user = request.user,
            action = 'unassigned task',
            details = f'Task {task.title} unassigned from {old_assignee} to None'
        )

        return Response({
            'message' : 'Task Unassigned',
            'old_assignee' : old_assignee if old_assignee else None,
            'new_assignee' : task.assigned_to,
            'task' : TaskDetailSerializer(task).data
        })
    
    @action(detail=True, methods=['GET', 'POST'])
    def comments(self, request, pk=None):
        """
        Get all comments for this task.
        GET /api/tasks/{id}/comments/ -> List Comments
        POST /api/tasks/{id}/comments/ -> Create Comments

        Alternate to nested route if you prefer simpler URLS
        """

        ## grabs the task obj from the id in the url
        task = self.get_object()
        
        if request.method == 'GET':
            comments = task.comments.all().order_by('created_at') 
            serializer = CommentSerializer(comments, many=True)

            return Response({
                'task_id' : task.id,
                'task_title' : task.title,
                'count' : comments.count(),
                'comments:' : serializer.data
            })
        
        elif request.method == "POST":
            
            data = request.data.copy()
            data['task'] = task.id
            
            ## we're sending a context seperately because we're calling the serializer manually unlike how viewsets do automatically
            serializer = CommentCreateSerializer(
                data = data,
                context = {'request' : request}
            )

            if serializer.is_valid():
                serializer.save(user = request.user)
                return Response(
                    CommentSerializer(serializer.instance).data, ## serializer.instance is the comment object, just created
                    status = status.HTTP_201_CREATED
                )
            return Response(serializer.errors, status = status.HTTP_400_BAD_REQUEST )


## Comment Viewset

class CommentViewSet(viewsets.ModelViewSet):
    """
    ViewSet strictly for full CRUD operations on COMMENTS. 
    URLS ; /api/comments/
    """

    permission_classes=[IsAuthenticated]

    
    def get_queryset(self):
        """ Get comments user has access to """
        return Comment.objects.filter(
            task__project__team_members = self.request.user,
        ).select_related('user', 'task','task__project').distinct()
    
    def get_serializer_class(self):
        # route to create comment serializer
        if self.action == 'create':
            return CommentCreateSerializer
        return CommentSerializer
    
    def perform_create(self, serializer):
        """
            Create comment with user.
            We dont pass task because serializer handles the text and task
        """
        serializer.save(user = self.request.user)


    def get_permissions(self):
        """ Only comment creator can edit/delete comments"""
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsCommentOwner()]
        return [IsAuthenticated()]