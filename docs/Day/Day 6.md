1. Creating the comment and activity serializer -> [[Serializer.py comments & activity]]
2. Comment and activity views -> [[views.py activity and comments]]
3. The comment serializers and views are different from earlier projects and tasks, since we're using the creating in the views unlike the create and update in serializers, here we've created perform-create ,in the views to add the user and task and only two serializers, one for grabbing data (where we can update or patch), and another for doing a basic create with a check for text.
4. We've let the viewset handle the update(we did this manually earlier) and delete. [[views.py 2 activity and comment]]


5. The activity part is very confusing, divided into a activity serializer, simple, only serializes, next is signal.py, multiple activity loggers, mainly project creation, task creation, log comments, team member changes and task deletion. There's one more part, which is logging updates to tasks, since in order to maintain updates we need old values, we do the activity loggin in the actions functions in the Task Viewset class and for updates only we overload the perform-update function.[[signals.py activity]]
6. select_related -> [[select_related 2]]
7. For the comments, we already have a one instance in task, to get comments for tasks, we also have a independent CRUD viewset, to do all the standard operations.
8. While testing , found out we were calling the CreateCommentsSerializer manually from the action function in tasks-View, if we do this manually the context hidden packet is nt sent with it therefore, we need to send a context packet with a request object for the serializer to get user object.
	`serializer = CommentCreateSerialize (data = data,context = {'request' : request})`
9.  A very important quick revision : [[IMP QUICK REVISION AFTER COMMENT N ACTIVITY CRUD]]
`