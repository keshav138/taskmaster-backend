
from rest_framework import permissions

'''
permissions.py only return True or False, indicating if any user has permission or not
'''
class IsProjectCreator(permissions.BasePermission):
    '''
    Only project creator can delete or modify certain aspects
    '''
    def has_object_permission(self, request, view, obj):
        
        ## Read permissions allowed to team members
        if request.method in permissions.SAFE_METHODS:
            return request.user in obj.team_members.all()
        
        ## Write permission granted only to project creator
        return obj.created_by == request.user
    

class IsProjectMember(permissions.BasePermission):
    
    def has_object_permission(self, request, view, obj):
        '''
            Only project team_members have access the view/access the project
        '''
        
        if request.method in permissions.SAFE_METHODS:
            return request.user in obj.team_members.all()
    
        ## for safe keeping incase a update,destroy, patch update falls here, so we dont return a None but a False instead.
        return False