we1. Made the admin panel, used classes instead of a single line, did customization.  [[admin.py documentation]]
1. Got an error during migration due to lazy reference in ManyToMany fields, [[make migrations error]]

2. Passwords for all dragon users is houseofthedragons.

3. The python manage.py shell, was a interactive command panel to work on queries , this was new, ran into some problems - [[manage.py shell queries]]
4. All possible queries - [[Possible Queries]] and join queries [[Joins through python underscores]]


5. Problem - When I created the project through the admin panel, I am not being added as the team member, but was added when add a new project through the shell. Soln - [[model_admin m2m save override]], [[Receivers]], this also did not solve the issue the solution finally was overriding the save and save_related function in the admin.py file under projects. -> [[save_related]]
6. Additionally, the apps.py was newly used as a part of the previous problem [[apps.py working]]
7. In addition to using apps.py , and its default_auto_field for primary key id's -> [[Primary Key Indexing]]
8. Made a mistake by writing post_save instead of post_add , working failed , why -> [[why post_add or post_clear]] 