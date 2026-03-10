Our frontend code was hardcoded to fetch API endpoints from port 8000, which in a local setting was fine, but on a server, we only allowed for https, http and ssh ports.
Therefore the 8000 port was not allowed to enter.
There were two fixes: either add a 8000 port in azure, or do a nginx conf that would reroute based on the configuration.

[[Nginx config 1]]
[[Nginx config 2]]
