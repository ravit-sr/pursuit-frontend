const TOKEN_KEY = "pursuit_token";
const USER_KEY = "pursuit_user";
const API_BASE = "https://pursuit-backend-um6g.onrender.com";

let userName = "Guest";
let userEmail = "";

function isLoggedIn() {
    // The real credential lives in an httpOnly cookie the browser sends
    // automatically; this flag is just a non-sensitive UI marker.
    return localStorage.getItem(TOKEN_KEY) === "1";
}

function saveSession(user) {
    localStorage.setItem(TOKEN_KEY, "1");
    localStorage.setItem(USER_KEY,JSON.stringify(user));
    localStorage.removeItem("pursuit_avatar_cache");
}

function loadStoredUser() {
    let stored = localStorage.getItem(USER_KEY);
    if(stored) {
        let user = JSON.parse(stored);
        userName = user.firstName + " " + user.lastName;
        userEmail = user.email;
    }
}

loadStoredUser();

async function logout() {
    let confirmed = await showConfirm("Are you sure you want to logout?", { danger: false, confirmLabel: "Logout" });
    if(confirmed){
        try {
            await fetch(API_BASE + "/logout", { method: "POST", credentials: "include" });
        } catch (err) {
            // network error, still clear local state below
        }
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem("theme");
        localStorage.removeItem("--accent");
        localStorage.removeItem("pursuit_avatar_cache");
        window.location.href = "dashboard.html";
    }
}

function getInitials(fullName) {
    let parts = fullName.split(" ");
    let first = parts[0][0];
    let last = parts[parts.length - 1][0];
    if(parts.length === 1){
        return first.toUpperCase();
    }
    return (first + last).toUpperCase();
}

const AVATAR_CACHE_KEY = "pursuit_avatar_cache";

function showToast(message, type) {
    let existing = document.querySelector(".pursuit-toast");
    if (existing) existing.remove();
    let toast = document.createElement("div");
    toast.className = "pursuit-toast";
    let isError = type === "error";
    let borderColor = isError ? "rgba(239,68,68,0.7)" : "rgba(34,197,94,0.4)";
    let borderWidth = isError ? "2px" : "1px";
    toast.style.cssText = "position:fixed;top:24px;left:50%;transform:translateX(-50%);background:var(--bg-card);border:" + borderWidth + " solid " + borderColor + ";border-radius:var(--radius);padding:12px 20px;font-size:13px;font-weight:" + (isError ? "600" : "400") + ";color:var(--text-primary);z-index:9999;box-shadow:var(--shadow-lg);display:flex;align-items:center;gap:10px;min-width:220px;max-width:340px;";
    toast.textContent = (isError ? "⚠ " : "") + message;
    document.body.appendChild(toast);
    setTimeout(function () { if (toast.parentNode) toast.remove(); }, 3000);
}

function showConfirm(message, options) {
    options = options || {};
    let confirmLabel = options.confirmLabel || "Confirm";
    let cancelLabel = options.cancelLabel || "Cancel";
    let danger = options.danger !== false;

    return new Promise(function (resolve) {
        let existing = document.querySelector(".pursuit-confirm-overlay");
        if (existing) existing.remove();

        let overlay = document.createElement("div");
        overlay.className = "pursuit-confirm-overlay";
        overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:10000;";

        let box = document.createElement("div");
        box.style.cssText = "background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;max-width:360px;width:90%;box-shadow:var(--shadow-lg);";

        let text = document.createElement("div");
        text.style.cssText = "color:var(--text-primary);font-size:14px;margin-bottom:20px;line-height:1.5;white-space:pre-line;";
        text.textContent = message;

        let btnRow = document.createElement("div");
        btnRow.style.cssText = "display:flex;gap:10px;justify-content:flex-end;";

        let cancelBtn = document.createElement("button");
        cancelBtn.textContent = cancelLabel;
        cancelBtn.className = "btn btn-secondary btn-sm";

        let confirmBtn = document.createElement("button");
        confirmBtn.textContent = confirmLabel;
        confirmBtn.className = danger ? "btn btn-sm" : "btn btn-primary btn-sm";
        if (danger) confirmBtn.style.cssText = "background:#ef4444;color:#fff;border:none;";

        function close(result) {
            overlay.remove();
            resolve(result);
        }

        cancelBtn.addEventListener("click", function () { close(false); });
        confirmBtn.addEventListener("click", function () { close(true); });
        overlay.addEventListener("click", function (e) { if (e.target === overlay) close(false); });

        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(confirmBtn);
        box.appendChild(text);
        box.appendChild(btnRow);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
    });
}

function applyAvatarFromDataUrl(dataUrl) {
    document.querySelectorAll(".user-avatar, .header-avatar, #bigAvatar").forEach(function (el) {
        el.textContent = "";
        el.style.backgroundImage = "url(" + dataUrl + ")";
        el.style.backgroundSize = "cover";
        el.style.backgroundPosition = "center";
    });
}

function applyUserInfo() {
    let sidebarName = document.querySelector(".user-name");
    let sidebarAvatar = document.querySelector(".user-avatar");
    let headerName = document.querySelector(".h-name");
    let headerEmail = document.querySelector(".h-email");
    let headerAvatar = document.querySelector(".header-avatar");

    if (sidebarName) sidebarName.textContent = userName;
    if (headerName) headerName.textContent = userName;
    if (headerEmail) headerEmail.textContent = userEmail;

    // If we have a cached photo from last time, show it immediately instead of
    // initials — avoids the initials->photo flash on every page load/navigation.
    let cachedAvatar = isLoggedIn() ? localStorage.getItem(AVATAR_CACHE_KEY) : null;
    if (cachedAvatar) {
        applyAvatarFromDataUrl(cachedAvatar);
    } else {
        if (sidebarAvatar) sidebarAvatar.textContent = getInitials(userName);
        if (headerAvatar) headerAvatar.textContent = getInitials(userName);
    }
}

async function applyAvatarPhoto() {
    if (!isLoggedIn()) return;
    try {
        let res = await fetch(API_BASE + "/profile/photo", {
            credentials: "include",
            cache: "no-store"
        });
        if (!res.ok) {
            // no photo set (any more) — clear cache and fall back to initials
            if (localStorage.getItem(AVATAR_CACHE_KEY)) {
                localStorage.removeItem(AVATAR_CACHE_KEY);
                document.querySelectorAll(".user-avatar, .header-avatar, #bigAvatar").forEach(function (el) {
                    el.style.backgroundImage = "";
                    el.textContent = getInitials(userName);
                });
            }
            return;
        }

        let blob = await res.blob();
        let reader = new FileReader();
        reader.onloadend = function () {
            let dataUrl = reader.result;
            // Only touch the DOM again if it actually changed since the cached version
            if (dataUrl !== localStorage.getItem(AVATAR_CACHE_KEY)) {
                applyAvatarFromDataUrl(dataUrl);
                try { localStorage.setItem(AVATAR_CACHE_KEY, dataUrl); } catch (e) { /* storage full, ignore */ }
            }
        };
        reader.readAsDataURL(blob);
    } catch (err) {
        // network error, keep whatever's already shown (cached photo or initials)
    }
}

applyUserInfo();
applyAvatarPhoto();

let authedBox = document.querySelector("#authedBox");
let guestBox = document.querySelector("#guestBox");

if (authedBox && guestBox) {
    if (isLoggedIn()) {
        authedBox.style.display = "flex";
        guestBox.style.display = "none";
    } else {
        authedBox.style.display = "none";
        guestBox.style.display = "flex";
        document.querySelector(".user-avatar").textContent = "G";
        document.querySelector(".user-name").textContent = "Guest";
        document.querySelector(".user-role").textContent = "Job Role";
    }
}

let logoutBtn = document.querySelector("#logoutBtn");
if(logoutBtn) {
    logoutBtn.addEventListener("click",function(e) {
        logout();
    })
}

let addAppBtn = document.querySelector(".add-application");
if (addAppBtn) {
    addAppBtn.addEventListener("click", function (e) {
        if (!isLoggedIn()) {
            e.preventDefault();
            showToast("Sign In to add an Application", "error");
        }
    });
}
let appToolbar = document.querySelector(".app-toolbar");
if (appToolbar) {
    appToolbar.addEventListener("click", function (e) {
        if (!isLoggedIn()) {
            e.preventDefault();
            showToast("Sign In to add an Application", "error");
        }
    });
}
function setButtonLoading(btn, isLoading) {
    if (!btn) return;
    if (isLoading) {
        if (btn.dataset.loading === "1") return;
        btn.dataset.loading = "1";
        btn.dataset.originalContent = btn.innerHTML;
        btn.style.minWidth = btn.offsetWidth + "px";
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-spinner"></span>';
    } else {
        if (btn.dataset.loading !== "1") return;
        btn.disabled = false;
        btn.innerHTML = btn.dataset.originalContent || "";
        btn.style.minWidth = "";
        delete btn.dataset.loading;
        delete btn.dataset.originalContent;
    }
}

function hidePageSkeleton() {
    let skeleton = document.querySelector("[data-page-skeleton]");
    let content = document.querySelector("[data-page-content]");
    if (skeleton) skeleton.style.display = "none";
    if (content) content.style.display = "";
}

function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
}

const KNOWN_SOURCES = ["LinkedIn", "Company Site", "Indeed", "Referral", "Glassdoor", "AngelList"];

function getDisplaySource(rawSource) {
    return KNOWN_SOURCES.includes(rawSource) ? rawSource : "Other";
}
/* ---- Mobile sidebar drawer toggle ---- */
(function () {
    let sidebarEl = document.querySelector(".sidebar");
    let toggleBtn = document.querySelector(".sidebar-toggle");
    let overlay = document.querySelector(".sidebar-overlay");
    if (!sidebarEl || !toggleBtn) return;

    function openSidebar() {
        sidebarEl.classList.add("open");
        if (overlay) overlay.classList.add("show");
        document.body.classList.add("sidebar-open");
    }

    function closeSidebar() {
        sidebarEl.classList.remove("open");
        if (overlay) overlay.classList.remove("show");
        document.body.classList.remove("sidebar-open");
    }

    toggleBtn.addEventListener("click", function () {
        if (sidebarEl.classList.contains("open")) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    if (overlay) {
        overlay.addEventListener("click", closeSidebar);
    }

    // Close the drawer whenever a nav link is tapped (mobile)
    document.querySelectorAll(".sidebar-nav a, .sidebar-user").forEach(function (el) {
        el.addEventListener("click", closeSidebar);
    });

    // If the viewport grows back past the drawer breakpoint, reset state
    window.addEventListener("resize", function () {
        if (window.innerWidth > 1024) closeSidebar();
    });
})();
