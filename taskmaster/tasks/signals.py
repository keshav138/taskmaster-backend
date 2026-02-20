from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Project


'''
post_save -> fires when any model instance is saved
reciever -> decorator that connects signal to function

created -> boolean flag that tells us if this is a new object (True) or an update(False)
'''

@receiver(post_save, sender=Project)
def add_creator_to_team(sender, instance, created, **kwargs):
    '''
        Automatically  add project creator to the team_members when project is created. 
        This runs after project is saved to database
    '''

    print('I entered this part during team creation')

    # checking if new object and if created by is set
    if created and instance.created_by:
        instance.team_members.add(instance.created_by)