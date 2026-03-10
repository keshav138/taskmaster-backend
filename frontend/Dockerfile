# 1. Base Image
FROM nginx:alpine

# Remove the default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom config file into Nginx
COPY nginx.conf /etc/nginx/conf.d/

# 2. Copy the static files to Nginx server directory
COPY . /usr/share/nginx/html

# 3. Expose Port
EXPOSE 80