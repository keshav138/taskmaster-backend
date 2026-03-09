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
                errorBox.innerHTML = `[ERROR] CREATION FAILED. <br> <span class="text-tm-muted text-[10px]">USERNAME OR EMAIL MAY ALREADY EXIST IN SYSTEM.</span>`;
                errorBox.classList.remove('hidden');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = "CREATE ENTITY";
            }
        });
    }
});