You are spot on! The reason the login fails on the new domain is a built-in security feature from Django called `ALLOWED_HOSTS` (and CORS). Django currently only recognizes your Azure IP. When a request suddenly comes in from `duckdns.org`, Django panics and blocks it to prevent spoofing. We will update that in your `.env` file when we restart the containers!

For now, let's get you that green padlock. 🔒

To get the official SSL certificate, we need to prove to Let's Encrypt that you actually own the server that `duckdns.org` is pointing to. Let's Encrypt will try to visit Port 80 to verify, but right now, your Nginx container is hogging Port 80.

Here is the 3-step process to step out of the way, grab the certificate, and get ready for the final configuration.

### Step 1: Pause the Server 🛑

SSH into your Azure VM, navigate to your project folder, and gracefully shut down the running containers so Port 80 is temporarily free.

Bash

```
cd ~/taskmaster-main
docker compose down
```

### Step 2: Install Certbot 🤖

Certbot is the official tool that automatically talks to Let's Encrypt to generate and renew your certificates. Run these two commands on your Azure VM:

Bash

```
sudo apt update
sudo apt install certbot -y
```

### Step 3: Fetch the Certificates 📜

Now we ask Certbot to spin up its own temporary mini-server on Port 80, catch the verification ping from Let's Encrypt, download your secure keys, and shut down.

Run this command, replacing `your-domain` with the exact DuckDNS name you just registered:

Bash

```
sudo certbot certonly --standalone -d your-domain.duckdns.org
```

**What to expect:**

1. It will ask for your email address (this is just for urgent renewal notices if your cert is about to expire).
    
2. It will ask you to agree to the Terms of Service (type `Y`).
    
3. It will ask if you want to share your email with the EFF (type `N`).
    

If it works, you will get a beautiful "Congratulations!" message.

**Crucial:** In that success message, it will tell you exactly where it saved your two new keys. It usually looks like this:

- Certificate: `/etc/letsencrypt/live/your-domain.duckdns.org/fullchain.pem`
    
- Private Key: `/etc/letsencrypt/live/your-domain.duckdns.org/privkey.pem`
    

Once you get that "Congratulations" message, drop those two file paths here. That is the exact ammo we need to update your `docker-compose.yml` and `nginx.conf` files to encrypt the entire application!