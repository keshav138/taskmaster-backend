This is a brilliant question. Understanding the philosophical difference between Cookies and JWTs is the exact moment you graduate from building "websites" to building modern "web applications."

Traditional Django uses Cookies (Session Authentication) out of the box. Django REST Framework uses JWTs (Token Authentication). Here is the complete breakdown of how they both work and why they are so fundamentally different.

### 1. The Cookie Approach: The "VIP List"

Think of Session-based Cookie authentication like a bouncer holding a **VIP Guest List** at a nightclub.

1. **The Login:** You approach the bouncer (the server), show your ID (username/password), and prove who you are.
    
2. **The Record:** The bouncer writes your name down on their clipboard (the Server Database) and assigns you a random ticket number: `#9876`.
    
3. **The Cookie:** The bouncer hands you a tiny piece of paper with `#9876` written on it. Your browser puts this in its pocket (the Cookie).
    
4. **The Next Request:** When you want to buy a drink, you hand the bartender the piece of paper. The bartender has to go back to the front door, look at the bouncer's clipboard, find `#9876`, and confirm it belongs to you before serving you.
    

**The Key Takeaway:** The Cookie itself is meaningless. It is just a random string. The _server_ has to do the heavy lifting of remembering who that string belongs to by checking the database every single time you click a link. This is called being **Stateful**.

---

### 2. The JWT Approach: The "VIP Wristband"

As we discussed, JWT is like a **cryptographically sealed wristband** (or hotel keycard).

1. **The Login:** You show your ID (username/password).
    
2. **The Wristband:** The bouncer checks your ID, but instead of writing your name on a clipboard, they strap a secure, tamper-proof wristband onto you (the JWT). The wristband literally says: _"This is Alice. She is an Admin. This expires at midnight."_
    
3. **The Next Request:** When you go to the bartender, they just look at the wristband, see the bouncer's official signature, and serve you immediately. They _never_ have to check a clipboard.
    

**The Key Takeaway:** The server does not remember you. It doesn't keep a list. It simply uses math to verify the signature on your token. This is called being **Stateless**.

---

### 3. Side-by-Side Comparison

|**Feature**|**Session Cookies (The VIP List)**|**JWT (The VIP Wristband)**|
|---|---|---|
|**Where is the data stored?**|In the Server's Database (or memory).|Inside the Token itself (saved on the user's device).|
|**Database Lookups**|**High.** The server queries the DB on _every_ request to verify the session.|**Zero.** The server just verifies the cryptographic math.|
|**State**|**Stateful:** The server must "remember" active sessions.|**Stateless:** The server forgets you the second the request ends.|
|**Scalability**|**Harder.** If you have 5 servers, they must all share the same "clipboard" (database) to know who is logged in.|**Easier.** Any server can instantly verify a JWT without talking to the other servers.|
|**Cross-Domain (CORS)**|Browsers strictly block cookies from being sent to different domains (e.g., `app.com` to `api.com`).|Easy. You just attach it as a string in the HTTP Header (`Authorization: Bearer <token>`).|
|**Security Vulnerability**|**CSRF** (Cross-Site Request Forgery) because browsers send cookies automatically.|**XSS** (Cross-Site Scripting) if a hacker injects malicious JavaScript to steal the token.|

---

### Why APIs strictly prefer JWT

When you are building a standard website where Django renders the HTML directly, Cookies are perfect, secure, and easy.

However, because you are building an API, your frontend might eventually be a React application running on a totally different server, or a mobile app running on an iPhone. Mobile apps don't handle "browser cookies" very well.

JWT allows your Django backend to say: _"I don't care if you are an iPhone, a React app, or a smart fridge. If you send me a valid math-verified string in your HTTP header, I will give you the data."_

Now that you understand the "why" behind stateless authentication, would you like me to show you how to write the `urls.py` code so your API can actually issue these tokens to users when they log in?