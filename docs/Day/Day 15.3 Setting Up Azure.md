Set up a free azure student account to deploy the project. Pretty simple actually.

Here is your end-to-end master plan to get the Taskmaster app live on Azure. We will take it from your local machine all the way to a live, public IP address.

### Phase 1: Prep Your Code (On Your Laptop) 💻

Before touching Azure, we need your GitHub repository to be perfectly ready for production.

1. **Update `docker-compose.yml`:** * Change the frontend port to `- '80:80'`.
    
    - Delete the two local bind mounts (`volumes:` sections) under your `backend` and `frontend` services so they use the baked-in code.
        
2. **Commit and Push:** ```bash
    
    git add .
    
    git commit -m "Prepare docker-compose for Azure production"
    
    git push origin main
    

---

### Phase 2: Create the Cloud Server (Azure Portal) ☁️

This is where we claim your free student hardware.

1. Log into the **Azure Portal** and search for **Virtual Machines**. Click **Create** -> **Azure Virtual Machine**.
    
2. **Basics Tab:**
    
    - **Resource Group:** Click "Create new" and name it something like `taskmaster-rg`.
        
    - **Virtual machine name:** `taskmaster-vm`
        
    - **Image:** Select **Ubuntu Server 24.04 LTS** (or 22.04 LTS).
        
    - **Size:** Select **Standard_B1s** (this is the free tier size).
        
    - **Authentication:** Choose **Password** (easiest for right now) or **SSH public key** (more secure). Create a username (e.g., `azureuser`) and a strong password.
        
3. **Networking Tab (Crucial Step):**
    
    - Under "Public inbound ports", select **Allow selected ports**.
        
    - Check the boxes for **HTTP (80)**, **HTTPS (443)**, and **SSH (22)**. If you don't do this, Nginx will be blocked from the outside world!
        
4. Click **Review + create**, then **Create**. Wait a minute or two for Azure to deploy it.
    
5. Once done, click **Go to resource** and copy your brand new **Public IP Address** (it will look like `13.55.xxx.xxx`).
    

---

### Phase 3: Server Setup (In Your Terminal) 🛠️

Now we log into your new Azure machine and install the required tools.

1. **SSH into the server** from your laptop's terminal:
    
    Bash
    
    ```
    ssh azureuser@<your-azure-public-ip>
    ```
    
    _(Type `yes` when it asks about the fingerprint, then enter your password)._
    
2. **Update the server and install Git + Docker:** Run these commands one by one to get everything installed:
    
    Bash
    
    ```
    sudo apt update
    sudo apt install git docker.io docker-compose-v2 -y
    ```
    
3. **Give yourself Docker permissions:** This stops you from having to type `sudo` before every Docker command:
    
    Bash
    
    ```
    sudo usermod -aG docker $USER
    newgrp docker
    ```
    

---

### Phase 4: Deploy Taskmaster 🚀

The server is ready. Time to bring your code over and spin it up.

1. **Clone your repository:**
    
    Bash
    
    ```
    git clone <your-github-repo-url>
    cd <your-repo-name>
    ```
    
2. **Set up your Environment Variables:** You need to create a production `.env` file on the server.
    
    Bash
    
    ```
    nano .env
    ```
    
    _Paste your variables in here. **Crucially**, update these two lines to include your new Azure IP:_
    
    `ALLOWED_HOSTS=<your-azure-public-ip>,localhost,127.0.0.1`
    
    `CORS_ALLOWED_ORIGINS=http://<your-azure-public-ip>`
    
    _(Press `Ctrl+O`, `Enter`, then `Ctrl+X` to save and exit)._
    
3. **Launch the Application:**
    
    Bash
    
    ```
    docker compose up -d --build
    ```
    

Docker will pull Postgres and Redis, build your Django backend, run the migrations, spin up Daphne, and build your Nginx frontend.

Once the terminal gives you back control, open a web browser on your laptop and type in your Azure Public IP address.

Would you like me to write out a quick template for your production `frontend.Dockerfile` just to ensure your static HTML/JS files get copied over correctly during that final build command?