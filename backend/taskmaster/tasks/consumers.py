'''
WebSocket View, technically
Handles connecting users, dropping them into a personal Redis Room and also pushing in JSON notifications to their browser
'''

import json
from channels.generic.websocket import AsyncWebsocketConsumer

class NotificationConsumer(AsyncWebsocketConsumer):

    # ---- CONNECT HANDLER ---- #
    
    async def connect(self):
        # grab the user, our middleware verified
        self.user = self.scope['user']
        
        if self.user.is_anonymous:
            await self.close()
            return

        # name the redis group name for user
        self.group_name = f'user_{self.user.id}_notifications'
        
        # self.channer_layer -> redis, self.channel_name -> browser_tab_id    
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        
        ## connection is now open
        await self.accept()
    
    
    #---- DISCONNECT HANDLER ---- #
    
    async def disconnect(self, close_code):
        # safety check whether self has a group_name attribute
        if hasattr(self, 'group_name'):
            # remove them from the redis channel so we dont send messages there anymore
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
    
    
    #----BROADCAST HANDLER-----#
    '''
    when django yells into redis, **redis calls this fnc, not the user
    django signal/view does a channel_layer.group_send('user42notifications', {'type': 'send_notifications', 'message': 'you have a noti'})
    given the type, send_notification, django checks the consumers.py for a send_notifications function, that comes here
    '''
    
    async def send_notification(self, event):
        message = event['message']
        
        # this takes the message and pushed it down the websocket into the vanilla js in the browser
        await self.send(text_data=json.dumps({
            'type' : 'notification',
            'message' : message
        }))
        




