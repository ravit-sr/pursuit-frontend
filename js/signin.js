const GOOGLE_CLIENT_ID="893618603803-3bb3pckq753e1qkpu1gqiefbhf1bl3fc.apps.googleusercontent.com"
const GITHUB_CLIENT_ID = "Ov23lifpXalNBTfoCcRc";

async function handleGoogleCredentialResponse(response) {
    let containers = document.querySelectorAll('#g_id_signin, #g_id_signup');
    containers.forEach(function (c) { c.style.opacity = "0.5"; c.style.pointerEvents = "none"; });

    try {
        let res = await fetch(API_BASE + "/auth/google", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential: response.credential })
        });

        if (!res.ok) {
            let err = await res.json().catch(() => ({}));
            showToast(err.detail || "Google sign-in failed.", "error");
            return;
        }

        let userData = await res.json();
        saveSession(userData);
        await applyAccountAppearance();
        window.location.href = "dashboard.html";
    } catch (err) {
        console.error("Google sign-in failed:", err);
        showToast("Couldn't reach the server. Make sure the backend is running.");
    } finally {
        containers.forEach(function (c) { c.style.opacity = "1"; c.style.pointerEvents = "auto"; });
    }
}

window.addEventListener("load", function () {
    if (typeof google === "undefined") return;

    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredentialResponse
    });

    // Google's button is a fixed-pixel iframe that won't shrink to fit its
    // container, so measure the container first and cap the width to it
    // (Google's widget supports 40-400px) instead of a hardcoded value that
    // overflows the card on narrow/mobile screens.
    function gsiWidth(el) {
        let available = Math.floor(el.getBoundingClientRect().width) || 240;
        return Math.max(100, Math.min(400, available));
    }

    let signinDiv = document.getElementById("g_id_signin");
    if (signinDiv) {
        google.accounts.id.renderButton(signinDiv, { theme: "outline", size: "large", width: gsiWidth(signinDiv) });
    }
    let signupDiv = document.getElementById("g_id_signup");
    if (signupDiv) {
        google.accounts.id.renderButton(signupDiv, { theme: "outline", size: "large", width: gsiWidth(signupDiv) });
    }
});

async function applyAccountAppearance() {
    try {
        let res = await fetch(API_BASE + "/settings", {
            credentials: "include"
        });
        if (!res.ok) return;
        let settings = await res.json();
        if (settings.theme) localStorage.setItem("theme", settings.theme);
        if (settings.accentColor) localStorage.setItem("--accent", settings.accentColor);
        if (settings.fontSize) localStorage.setItem("pursuit_fontSize", settings.fontSize);
    } catch (err) {
        console.error("Could not load account appearance settings:", err);
    }
}

document.querySelector("#signupForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    let firstName = document.querySelector("#su_fname").value;
    let lastName = document.querySelector("#su_lname").value;
    let email = document.querySelector("#su_email").value;
    let password = document.querySelector("#su_password").value;
    let submitBtn = e.target.querySelector('button[type="submit"]');

    if (!document.querySelector("#su_terms").checked) {
        showToast("Please agree to the Terms of Service and Privacy Policy to continue.", "error");
        return;
    }

    setButtonLoading(submitBtn, true);

    try {
        let response = await fetch(API_BASE + "/signup", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({firstName, lastName, email, password})
        });

        if (!response.ok) {
            let error = await response.json().catch(() => ({}));
            showToast(error.detail || "Could not create account.");
            setButtonLoading(submitBtn, false);
            return;
        }

        let signinResponse = await fetch(API_BASE + "/signin", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        if (!signinResponse.ok) {
            showToast("Account created, but automatic sign-in failed. Please sign in manually.");
            setButtonLoading(submitBtn, false);
            return;
        }
        let userData = await signinResponse.json();
        saveSession(userData);
        await applyAccountAppearance();
        window.location.href = "dashboard.html";
    } catch (err) {
        console.error("Signup failed:", err);
        showToast("Couldn't reach the server. Make sure the backend is running at http://127.0.0.1:8000.");
        setButtonLoading(submitBtn, false);
    }
});

function clearSigninFieldErrors() {
    let emailError = document.querySelector("#si_email_error");
    let passwordError = document.querySelector("#si_password_error");
    emailError.textContent = "";
    emailError.classList.remove("visible");
    passwordError.textContent = "";
    passwordError.classList.remove("visible");
}

function showSigninFieldErrors(message) {
    let emailError = document.querySelector("#si_email_error");
    let passwordError = document.querySelector("#si_password_error");
    emailError.textContent = message;
    emailError.classList.add("visible");
    passwordError.textContent = message;
    passwordError.classList.add("visible");
}

document.querySelector("#si_email").addEventListener("input", clearSigninFieldErrors);
document.querySelector("#si_password").addEventListener("input", clearSigninFieldErrors);

document.querySelector("#signinForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    clearSigninFieldErrors();
    let email = document.querySelector("#si_email").value;
    let password = document.querySelector("#si_password").value;
    let submitBtn = e.target.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true);

    try {
        let response = await fetch(API_BASE + "/signin", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            let error = await response.json().catch(() => ({}));
            showSigninFieldErrors(error.detail || "Invalid email or password.");
            setButtonLoading(submitBtn, false);
            return;
        }

        let userData = await response.json();
        saveSession(userData);
        await applyAccountAppearance();
        window.location.href = "dashboard.html";
    } catch (err) {
        console.error("Signin failed:", err);
        showToast("Couldn't reach the server. Make sure the backend is running at http://127.0.0.1:8000.", "error");
        setButtonLoading(submitBtn, false);
    }
});

if (window.location.hash === "#signup") {
    document.querySelector("#authWrapper").classList.add("signup-mode");
}

document.querySelector("#toSignUp").addEventListener("click", function(e) {
    document.querySelector("#authWrapper").classList.add("signup-mode");
});
document.querySelector("#toSignIn").addEventListener("click", function(e) {
    document.querySelector("#authWrapper").classList.remove("signup-mode");
});

document.querySelectorAll('.social-btn[data-provider="github"]').forEach(function (btn) {
    btn.addEventListener("click", function () {
        setButtonLoading(btn, true);
        window.location.href =
            "https://github.com/login/oauth/authorize?client_id=" + GITHUB_CLIENT_ID + "&scope=user:email";
    });
});

document.querySelectorAll(".input-toggle-eye").forEach(function(btn) {
    btn.addEventListener("click", function() {
        let targetInput = document.querySelector("#"+btn.dataset.target);
        if(targetInput.type === "password") {
            targetInput.type = "text";
            btn.textContent = "🙈";
        }else {
            targetInput.type = "password";
            btn.textContent = "👁";
        }
    })
});

function getPassword(password) {
    let score = 0;
    if(password.length >= 8) score += 1;
    if(/[A-Z]/.test(password)) score += 1;
    if(/[0-9]/.test(password)) score += 1;
    if(/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
}

let strengthColors = ["#ef4444", "#ef4444", "#f59e0b", "#eab308", "#22c55e"];
let strengthLabels = ["Enter a password", "Weak", "Fair", "Good", "Strong"];
let strengthBars = [
    document.querySelector("#sb1"),
    document.querySelector("#sb2"),
    document.querySelector("#sb3"),
    document.querySelector("#sb4")
];

document.querySelector("#su_password").addEventListener("input", function(e) {
    let password = e.target.value;
    let score = getPassword(password);
    for(let i=0 ; i<=3 ; i++) {
        if(i<score) {
            strengthBars[i].style.background = strengthColors[score];
        }else {
            strengthBars[i].style.background = "var(--border)"
        }
    }
    document.querySelector("#strengthLabel").textContent = strengthLabels[score] ;
});

(function handleGithubRedirect() {
    if (!window.location.hash.includes("id=")) return;

    let params = new URLSearchParams(window.location.hash.substring(1));
    let userData = {
        id: params.get("id"),
        firstName: params.get("firstName"),
        lastName: params.get("lastName"),
        email: params.get("email")
    };

    saveSession(userData);
    applyAccountAppearance().then(function () {
        window.location.href = "dashboard.html";
    });
})();