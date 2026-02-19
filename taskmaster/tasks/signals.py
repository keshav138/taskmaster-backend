from django.db.models.signals import m2m_changed
from django.dispatch import receiver
from .models import Project

'''
m2m_changed - everytime a many to many field is edited or changed
receiver - decorator to join function to the signal


Project.team_members.throgh -> It is Project.team_members.through. Because Many-to-Many fields use a hidden intermediate database table, 
the .through attribute tells Django to listen for changes on that specific hidden table, rather than the main Project table.

instance -> the actual project object being sent into db.

action ->This is a string provided by Django that tells you exactly what is happening to the Many-to-Many list.
Common actions include "pre_add", "post_add", "pre_remove", "post_remove", and "post_clear"

'''



@receiver(m2m_changed, sender=Project.team_members.through)
def add_creator_to_team(sender, instance, action, **kwargs):
    '''
    Ensure project creator is always saved in the team_members
    Runs after the many to many field is saved
    '''

    if action == 'post_save' or action == 'post_clear':
        if instance.created_by not in instance.team_members.all():
            instance.team_members.add(instance.created_by)

