// js/auth.js
import { api } from './api.js';

// --- POSTER TYPING EFFECT ---
const phrases = ["VISION.", "STRUCTURE.", "COMMANDS.", "THE MISSION."];
let phraseIndex = 0;
let charIndex = 0;
let isDeleting = false;

function typeEffect() {
    const element = document.getElementById('typing-element');
    if (!element) return; 

    const currentPhrase = phrases[phraseIndex];
    
    if (isDeleting) {
        element.textContent = currentPhrase.substring(0, charIndex - 1);
        charIndex--;
    } else {
        element.textContent = currentPhrase.substring(0, charIndex + 1);
        charIndex++;
    }

    let typeSpeed = isDeleting ? 40 : 120;

    if (!isDeleting && charIndex === currentPhrase.length) {
        typeSpeed = 2500; // Pause longer on full word
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        typeSpeed = 400;
    }

    setTimeout(typeEffect, typeSpeed);
}

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Initialize Graphic Typing Effect
    typeEffect();

    // Password Visibility Toggle Logic
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            if (input.type === 'password') {
                input.type = 'text';
                // Eye Slash Icon
                this.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>`;
            } else {
                input.type = 'password';
                // Standard Eye Icon
                this.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>`;
            }
        });
    });


    // 2. Form UI Toggling Logic
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const errorBox = document.getElementById('auth-error');

    // Attach click listeners to all buttons that toggle the view
    document.querySelectorAll('[data-action="toggle-auth"]').forEach(btn => {
        btn.addEventListener('click', () => {
            errorBox.classList.add('hidden'); // Clear errors on swap
            
            if (formLogin.classList.contains('hidden')) {
                formRegister.classList.add('hidden');
                formLogin.classList.remove('hidden');
            } else {
                formLogin.classList.add('hidden');
                formRegister.classList.remove('hidden');
            }
        });
    });

    // 3. LOGIN LOGIC
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            
            const usernameInput = document.getElementById('login-username').value;
            const passwordInput = document.getElementById('login-password').value;
            const submitBtn = document.getElementById('btn-login-submit');

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = "AUTHENTICATING...";
                errorBox.classList.add('hidden'); 

                await api.login(usernameInput, passwordInput);
                window.location.href = 'index.html';
            } catch (error) {
                errorBox.innerHTML = `[ERROR] ACCESS DENIED. <br> <span class="text-tm-muted text-[10px]">VERIFY CREDENTIALS.</span>`;
                errorBox.classList.remove('hidden');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = "INITIALIZE";
            }
        });
    }

    // 4. REGISTER LOGIC
    if (formRegister) {
        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Gather all 6 fields
            const username = document.getElementById('reg-username').value.trim();
            const first_name = document.getElementById('reg-first_name').value.trim();
            const last_name = document.getElementById('reg-last_name').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;
            const password2 = document.getElementById('reg-password2').value;

            const submitBtn = document.getElementById('btn-reg-submit');

            if (password !== password2) {
                errorBox.innerHTML = `[ERROR] INTEGRITY COMPROMISED. <br> <span class="text-tm-muted text-[10px]">PASSWORDS DO NOT MATCH.</span>`;
                errorBox.classList.remove('hidden');
                return;
            }

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = "BUILDING ENTITY...";
                errorBox.classList.add('hidden');

                // Pass the exact structure to the API
                await api.register({
                    username,
                    first_name,
                    last_name,
                    email,
                    password,
                    password2
                });

                // Auto-login after successful registration
                await api.login(username, password);
                window.location.href = 'index.html';
                
            } catch (error) {
                let displayMsg = "USERNAME OR EMAIL MAY ALREADY EXIST IN SYSTEM.";
                
                try {
                    // api.js throws new Error(JSON.stringify(errorData)), we parse it back
                    const parsedError = JSON.parse(error.message);
                    
                    // Django REST Framework usually returns arrays of error strings keyed by the field name
                    if (parsedError.password) {
                        displayMsg = Array.isArray(parsedError.password) ? parsedError.password[0] : parsedError.password;
                    } else if (parsedError.username) {
                        displayMsg = `USERNAME: ${Array.isArray(parsedError.username) ? parsedError.username[0] : parsedError.username}`;
                    } else if (parsedError.email) {
                        displayMsg = `EMAIL: ${Array.isArray(parsedError.email) ? parsedError.email[0] : parsedError.email}`;
                    } else if (parsedError.non_field_errors) {
                        displayMsg = parsedError.non_field_errors[0];
                    } else if (parsedError.detail) {
                        displayMsg = parsedError.detail;
                    }
                } catch (parseEx) {
                    // Fallback if the error wasn't JSON formatted
                    if (error.message && error.message.trim() !== "") {
                        displayMsg = error.message;
                    }
                }

                errorBox.innerHTML = `[ERROR] CREATION FAILED. <br> <span class="text-tm-muted text-[10px] uppercase break-words">${displayMsg}</span>`;
                errorBox.classList.remove('hidden');
            }
             finally {
                submitBtn.disabled = false;
                submitBtn.textContent = "CREATE ENTITY";
            }
        });
    }
});