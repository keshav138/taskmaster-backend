
from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password


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
