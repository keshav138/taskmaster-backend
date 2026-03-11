So after deploying, we've set up nginx as the reverse proxy at port 80.
So give our url, api/docs/ the redirect is working, but since inorder to view the docs you need to be logged in, we need to make some changes. This is the flow that currently give the flawed output (white page with django login link).

## Read In Order for it to make SENSE
----
#### IMP Volumes format NGINX
`[HOST_PATH]:[CONTAINER_PATH]:[OPTIONS]`

- **`[HOST_PATH]`**: An absolute path on your machine (e.g., `/home/user/html`) or a named volume.
- **`[CONTAINER_PATH]`**: The absolute path inside the Nginx container where the data is mounted (e.g., `/usr/share/nginx/html`).
- **`[OPTIONS]` (Optional)**: Such as `ro` (read-only) or `rw` (read-write).
---
[[Swagger issue]]
[[Nginx Loading Django static files]] - discusses the need for loading all static files into nginx, so that the browser requests know where to go.
[[Static root and collectstatic commands importance]] - is a more in-depth explanation to the flow that is required to fix this
[[Use for alias in NGINX]] - why we need to use alias for volumes, the relation between nginx static folder and and django volumes.
[[Folder File Map for NGINX DOCKER LOCAL]] -  a mind map for where does everything lie
[[Mental Model for Volume Linking Docker]]  - Volume documentation, the English toned down explanation
