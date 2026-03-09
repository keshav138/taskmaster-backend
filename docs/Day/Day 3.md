	Aim is to set up api endpoints, using jwt authentication.
1. Installed djangorestframework-simplejwt , updated settings.py then after -> [[JWT Authentication]]
2.  JWT vs Cookies -> [[JWT vs Cookies]]
3. Access and Refresh Tokens -> [[Access and Refresh Tokens]]
4. Set up serializers.py -> [[serializers.py]]
5. There was confusion with setting up serializers.py such as using two passwords, use of definitions and their contribution to attrs(attributes coming in) -> [[password & password2 & attrs]]
6. Worked views.py, functions for post and get ->[[views.py auth n login]] , a few confusions with understanding the serializer class into views -> [[Flow for implementation of serializer classes into views.py]]
7. Advantages of using generics.CreateApiView from rest -> [[generics.CreateApiView]]
8. Handling incoming and outgoing data in the views brought up some confusions: [[Incoming and outgoing serialization]]
9. Set up the URL's -> [[urls.py Tasks]] 
10. Had doubts about the login, since we didn't create one explicitly, learned about TokenObtainPairView -> [[TokenObtainPairView]] , this also clarified how to change user table, if we were to make a custom one.
11. If ever get a "list object is not callable" I've mistakenly put a field into square brackets
12. Faced a problem in CurrentUserView as to how we're fetching the user's data -> [[CurrentUserView flow explained]]