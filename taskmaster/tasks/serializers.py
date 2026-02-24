
from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from .models import Project, Task, Comment, Activity


class UserSerializer(serializers.ModelSerializer):
    '''
    Serializers for User Model 
    '''

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined']
        read_only_fields = ['id', 'date_joined']
    

class RegistrationSerializer(serializers.ModelSerializer):
    ''' Serializer for user registration'''

    password = serializers.CharField(
        write_only = True,
        required = True,
        validators = [validate_password]
    )

    password2 = serializers.CharField(write_only = True, required = True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'first_name', 'last_name']
    
    def validate(self, attrs):
        ''' Check if the passwords match''' 
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError(
                {
                    'password' : 'Password fields dont match'
                }
            )
        return attrs
    
    def create(self, validated_data):
        ''' Create user with hashed password'''

        validated_data.pop('password2')

        user = User.objects.create_user(
            username = validated_data['username'],
            email = validated_data['email'],
            first_name = validated_data['first_name'],
            last_name = validated_data['last_name'],
        )
        
        user.set_password(validated_data['password'])
        user.save()
        return user




## Project Serializers

class ProjectListSerializers(serializers.ModelSerializer):
    '''
    Lightweight serializer for listing project.
    Show basic info + counts
    '''

    created_by = UserSerializer(read_only = True)
    team_members_count = serializers.SerializerMethodField()
    tasks_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id',
            'project_name',
            'description',
            'created_by',
            'team_members_count',
            'tasks_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_team_members_count(self, obj):
        return obj.team_members.count()
    
    def get_tasks_count(self, obj):
        return obj.tasks.count()
    

class ProjectDetailSerializer(serializers.ModelSerializer):
    '''
        Detailed serializer for single project view
        Include full member details
    '''

    created_by = UserSerializer(read_only = True)
    team_members = UserSerializer(many = True, read_only = True)
    tasks_count = serializers.SerializerMethodField()

    
    class Meta:
        model = Project
        fields = [
            'id',
            'project_name',
            'description',
            'created_by',
            'team_members',
            'tasks_count',
            'created_by',
            'updated_at'
        ]

        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_tasks_count(self, obj):
        return obj.tasks.count()


class ProjectCreateUpdateSerializer(serializers.ModelSerializer):
    '''
        Serializers for creating / updating
    '''

    team_member_ids = serializers.ListField(
        child = serializers.IntegerField(),
        write_only = True,
        required = False,
        help_text = "List of user ID's to add as team members"
    )

    class Meta:
        model = Project
        fields = ['id', 'project_name', 'description', 'team_member_ids' ]
        read_only_fields = ['id']

    def create(self, validated_data):
        '''
            Create Project and Add Team Members
        '''

        team_member_ids = validated_data.pop('team_member_ids', [])

        # get current users from context
        request = self.context.get('request')
        validated_data['created_by'] = request.user

        
        ## create Project
        project = Project.objects.create(**validated_data)

        if team_member_ids:
            team_members = User.objects.filter(id__in = team_member_ids)
            project.team_members.add(*team_members)

        return project

    def update(self, instance, validated_data):
        '''
        update project and team members
        '''

        team_member_ids = validated_data.pop('team_member_ids', None) 

        #update basic field
        instance.project_name = validated_data.get('project_name', instance.project_name)
        instance.description = validated_data.get('description', instance.description)
        instance.save()

        # update team_members if present

        if team_member_ids is not None:
            team_members = User.objects.filter(id__in = team_member_ids)
            instance.team_members.set(team_members)
            # ensure creator is always created
            instance.team_members.add(instance.created_by)
        
        return instance
    
    
    
    ## Task Serializers
    
class TaskListSerializer(serializers.ModelSerializer):
    """
    Light weight serializer for listing tasks. 
    """

    project = serializers.StringRelatedField() ## fetches project name from __str__
    created_by = UserSerializer(read_only = True)
    assigned_to = UserSerializer(read_only = True)
    is_overdue = serializers.BooleanField(read_only = True) ## property in task model
    comments_count = serializers.SerializerMethodField()

        
    class Meta:
        model = Task

        fields = [
            'id',
            'title',
            'project',
            'status',
            'priority',
            'created_by',
            'assigned_to',
            'due_date',
            'is_overdue',
            'comments_count',
            'created_at',
            'updated_at'
        ]
        
    def get_comments_count(self, obj):
        return obj.comments.count()
        

class TaskDetailSerializer(serializers.ModelSerializer):
    """
        Detailed serializer for single task view
        Includes full related objects details
    """

    project = ProjectListSerializers()
    created_by = UserSerializer(read_only=True)
    assigned_to = UserSerializer(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True) ## property -> Task Model

    class Meta:
        model = Task
        fields = [
            'id',
            'title',
            'description',
            'project',
            'created_by',
            'assigned_to',
            'status',
            'priority',
            'due_date',
            'is_overdue',
            'created_at',
            'updated_at'
        ]


class TaskCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating tasks
    """

    project_id = serializers.IntegerField(write_only=True)
    assigned_to_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Task
        fields = [
            'id',
            'title',
            'description',
            'project_id',
            'assigned_to_id',
            'status',
            'priority',
            'due_date'
        ]

        read_only_fields = ['id']
    
    
    def validate_project_id(self, value):
        ''' Ensure project exists and user who sent the request is a member'''
        request = self.context.get('request')

        try:
            project = Project.objects.get(id=value)
        except:
            raise serializers.ValidationError('Project not found')
        
        if request.user not in project.team_members.all():
            raise serializers.ValidationError('You are not a member of this project')
        
        return value
    
    def validate_assigned_to_id(self, value):
        '''Ensure assigned user exists'''

        if value is None:
            return value
        
        try:
            user = User.objects.get(id = value)
        except:
            raise serializers.ValidationError("User not found")
        
        return value
    
    def validate(self, attrs):
        '''Cross field validation'''
        project_id = attrs.get('project_id')
        assigned_to_id = attrs.get('assigned_to_id')

        if assigned_to_id:
            project = Project.objects.get(id = project_id)
            assigned_user = User.objects.get(id = assigned_to_id)

            ## check if assigned user is in the project team

            if assigned_user not in project.team_members.all():
                raise serializers.ValidationError({
                    'assigned_to_id' : "Assigned user must be a member of this project"
                })
            
        ## validate due date is in the future
        
        due_date = attrs.get('due_date')
        if due_date and due_date < timezone.now():
            raise serializers.ValidationError({
                'due_date' : "Due date must be in the future"
            })
        
        return attrs
    
    
    def create(self, validated_data):
        """ Create Task """
        
        project_id = validated_data.pop('project_id')
        assigned_to_id = validated_data.pop('assigned_to_id', None)

        request = self.context.get('request')

        task = Task.objects.create(
            project_id = project_id, ## this is a suffix, project and suffix _id
            created_by = request.user,
            assigned_to_id = assigned_to_id,
            **validated_data
        )

        return task
    
    def update(self, instance, validated_data):
        ''' Update task '''
        project_id = validated_data.pop('project_id', None)
        assigned_to_id = validated_data.pop('assigned_to_id', None)

        ## Update basic fields

        instance.title = validated_data.get('title', instance.title)
        instance.description = validated_data.get('description', instance.description)
        instance.status = validated_data.get('status', instance.status)
        instance.priority = validated_data.get('priority', instance.priority)
        instance.due_date = validated_data.get('due_date', instance.due_date)

        
        # update project if required

        if project_id:
            instance.project_id = project_id
        
        ## update assigned to
        if assigned_to_id is not None:
            instance.assigned_to_id = assigned_to_id
        
        
        instance.save()
        return instance
    

class TaskStatusSerializer(serializers.Serializer):
    ''' Serializer for changing task status'''
    status = serializers.ChoiceField(choices=Task.STATUS_CHOICES)

    def validate_status(self,value):
        ''' Valid status transition'''
        task = self.context.get('task')
        current_status = task.status

        # Define allowed transition

        allowed_transition = {
            'TODO' : ['IN_PROGRESS'],
            'IN_PROGRESS' : ['IN_REVIEW', 'TODO'],
            'IN_REVIEW' : ['DONE', 'IN_PROGRESS'],
            'DONE' : ['IN_PROGRESS'] ## allowing reopening tasks
        }

        if value not in allowed_transition.get(current_status , []):
            raise serializers.ValidationError(
                f'Cannot transition from {current_status} to {value}'
            )
        
        return value
    

class TaskAssignSerializer(serializers.Serializer):
    ''' Serializer for assigning task to user'''
    user_id = serializers.IntegerField()

    def validate_user_id(self, value):
        """ Ensure user exists and is in project"""
        try:
            user = User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError('User does not exist')
        
        task = self.context.get('task')
        if user not in task.project.team_members.all():
            raise serializers.ValidationError('User must be a part of the project to assign a task')

        return value



## Comments Serializer

class CommentSerializer(serializers.ModelSerializer):
    '''
    Serializer for comments on a task 
    '''

    user = UserSerializer(read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)

    class Meta:
        model = Comment
        fields = [
            'id',
            'task',
            'task_title',
            'user',
            'text',
            'created_at'
        ]

        read_only_fields = ['id', 'created_at', 'user', 'task']
    
    
    # this is a required function, since put/patch requests all end up here
    def validate_text(self, value):
        """ Ensure comment is not empty"""

        if not value or not value.strip():
            raise serializers.ValidationError("Comment cannot be empty")
        return value.strip()
    


class CommentCreateSerializer(serializers.ModelSerializer):
    '''
    Serializer for creating comments 
    '''
    
    # the user and task are handled in the views
    class Meta:
        model = Comment
        fields = ['text', 'task']
    
    def validate_text(self, value):
        ''' Ensure text not emtpy'''
        if not value or not value.strip():
            raise serializers.ValidationError("Comment cannot be empty")
        return value.strip()
    
    
    def validate_task(self, value):
        """
        Security Check : The user sent a task id, 
        Check if it exits
        """

        request = self.context.get('request')

        if request.user not in value.project.team_members.all():
            raise serializers.ValidationError('You do not have permission to comment on this task')
        
        return value
    
    
class ActivitySerializer(serializers.ModelSerializer):
    '''
    Serializer for activity logs 
    '''

    user = UserSerializer(read_only=True)
    project_name = serializers.CharField(source='project.project_name', read_only=True)

    class Meta:
        model = Activity
        fields = [
            'id',
            'project',
            'project_name',
            'user',
            'action',
            'details',
            'timestamp'
        ]

        read_only_fields = ['id', 'user', 'project', 'timestamp']
    

class PaginatedActivitySerializer(serializers.Serializer):
    """
    Dummy serializer stricty for Swagger documentation
    Maps exactly to CustomPaginationResponse format.
    """

    count = serializers.IntegerField(help_text='Total number of activities')
    total_pages = serializers.IntegerField(help_text='Total number of pages')
    current_page = serializers.IntegerField(help_text='Current active page')
    next = serializers.URLField(allow_null=True)
    previous = serializers.URLField(allow_null=True)
    results=ActivitySerializer(many=True) ## activity serializer data plug in