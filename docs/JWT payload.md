A JSON Web Token (JWT) is essentially a compact, URL-safe way of representing claims between two parties. It is composed of three distinct parts separated by dots (`.`).

When you see a JWT, it looks like a long string of random characters: `xxxxx.yyyyy.zzzzz`. Here is the breakdown of what is happening inside those three sections.

---

### 1. The Header

The header typically consists of two parts: the type of the token (JWT) and the signing algorithm being used, such as HMAC SHA256 or RSA.

- **Example JSON:**
    
    JSON
    
    ```
    {
      "alg": "HS256",
      "typ": "JWT"
    }
    ```
    
- **Encoding:** This JSON is **Base64Url encoded** to form the first part of the JWT.
    

### 2. The Payload

The payload contains the **claims**. Claims are statements about an entity (typically, the user) and additional data. There are three types of claims: registered, public, and private claims.

- **Registered claims:** Predefined claims like `iss` (issuer), `exp` (expiration time), and `sub` (subject).
    
- **Public/Private claims:** Custom data you want to share, like `userId` or `role`.
    
- **Example JSON:**
    
    JSON
    
    ```
    {
      "sub": "1234567890",
      "name": "John Doe",
      "admin": true
    }
    ```
    
- **Encoding:** Like the header, this is **Base64Url encoded** to form the second part.
    

> **Important:** This data is readable by anyone who has the token. Never put sensitive info like passwords in the payload.

### 3. The Signature

The signature is used to verify that the sender of the JWT is who it says it is and to ensure that the message wasn't changed along the way.

To create the signature, the server takes the encoded header, the encoded payload, a **secret**, and the algorithm specified in the header.

The mathematical representation of the signature process (using HMAC SHA256) looks like this:

$$\text{HMACSHA256}( \text{base64UrlEncode(header)} + "." + \text{base64UrlEncode(payload)}, \text{secret} )$$

---

### Summary Table

|**Section**|**Purpose**|**Security Level**|
|---|---|---|
|**Header**|Defines algorithm & token type|Publicly Readable|
|**Payload**|Contains user data & claims|Publicly Readable|
|**Signature**|Prevents tampering|**Secure** (Requires Secret)|

Would you like me to generate a sample encoded JWT for you to practice decoding, or perhaps show you how to verify one using a specific programming language like Python or JavaScript?