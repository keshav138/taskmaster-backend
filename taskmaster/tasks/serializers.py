
from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
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