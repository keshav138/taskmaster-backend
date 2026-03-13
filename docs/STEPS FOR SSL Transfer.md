Getting HTTPS is the ultimate final polish. It gives you that satisfying little padlock icon in the browser, removes the "Not Secure" warnings, and encrypts all your JWT tokens and passwords while they travel across the internet.

However, before we touch any Nginx code, we have to address one unbreakable rule of the internet: **You cannot get a free SSL certificate for a raw IP address (like `4.240.96.118`).** Certificate Authorities (like Let's Encrypt) will only issue certificates for registered **Domain Names**.

Here is the exact 4-step blueprint to take this from `http://4.240.96.118` to a fully secure `https://your-domain.com`.

### Step 1: Claim a Domain Name 🏷️

You need a name for your IP to hide behind. You have two routes here:

- **The Professional Route ($10/year):** Buy a cheap domain from Namecheap, Cloudflare, or GoDaddy (e.g., `keshav-taskmaster.com`).
    
- **The Free Route ($0):** If this is just for your portfolio, you can use a free dynamic DNS provider like **DuckDNS** (e.g., `taskmaster-keshav.duckdns.org`).
    

### Step 2: Point the Domain to Azure (DNS) 🗺️

Once you have the domain, you log into the registrar's dashboard and create an **"A Record"**.

- **Host:** `@` (or `www`)
    
- **Value:** `4.240.96.118`
    
    This tells the internet: _"Whenever someone types my domain name, secretly send them to this Azure server."_
    

### Step 3: Fetch the Free SSL Certificate 📜

Once the domain is hooked up, you SSH into your Azure server and run a fantastic, free tool called **Certbot** (provided by Let's Encrypt).

Certbot reaches out to the authority, proves you own the domain, and downloads your encrypted `.pem` key files directly to your Azure hard drive.

### Step 4: The Nginx & JS Upgrade 🛠️

This is where we tie it all together:

1. **Update Nginx:** We rewrite your `nginx.conf` so it listens on **Port 443** (the official port for HTTPS). We also tell it exactly where Certbot saved your new SSL keys. Finally, we tell Port 80 to permanently redirect any HTTP traffic to HTTPS.
    
2. **Update JavaScript:** Remember that dead-simple WebSocket fix we did earlier (`ws://${window.location.host}...`)? We will swap that back to the dynamic one-liner that checks for secure WebSockets (`wss://`) so your real-time notifications don't break under encryption!
    

Would you like to go ahead and grab a free DuckDNS domain right now so we can walk through setting up the SSL certificates and the new Nginx configuration?