let currentSettings = null;

async function loadSettingsFromBackend() {
    if (!isLoggedIn()) return;

    let res = await fetch(API_BASE + "/settings", {
        credentials: "include"
    });
    currentSettings = await res.json();

    if (compactToggle) {
        compactToggle.checked = !!currentSettings.compactTable;
        if (compactToggle.checked) document.body.classList.add("compact-table");
    }
    if (emojiToggle) {
        emojiToggle.checked = !!currentSettings.statusEmojis;
        if (!emojiToggle.checked) document.body.classList.add("hide-status-dot");
    }

    let notifMap = { "notif-weekly": "notifWeekly", "notif-interview": "notifInterview", "notif-followup": "notifFollowup", "notif-tips": "notifTips", "notif-updates": "notifUpdates" };
    Object.keys(notifMap).forEach(function (domId) {
        let el = document.getElementById(domId);
        if (el) el.checked = !!currentSettings[notifMap[domId]];
    });
    let freqEl = document.getElementById("emailFrequency");
    if (freqEl) freqEl.value = currentSettings.notifFrequency || "Weekly";

    let setVal = function (id, val) { let el = document.getElementById(id); if (el && val !== null && val !== undefined) el.value = val; };
    setVal("goalRole", currentSettings.goalRole);
    setVal("goalIndustry", currentSettings.goalIndustry);
    setVal("goalSalary", currentSettings.goalSalary);
    setVal("goalLocations", currentSettings.goalLocations);
    setVal("goalDeadline", currentSettings.goalDeadline);
    if (appGoalSlider && appGoalVal) {
        appGoalSlider.value = currentSettings.goalWeeklyTarget || 8;
        appGoalVal.textContent = appGoalSlider.value;
    }
    let setChk = function (id, val) { let el = document.getElementById(id); if (el) el.checked = !!val; };
    setChk("jt-fulltime", currentSettings.goalFulltime);
    setChk("jt-remote", currentSettings.goalRemote);
    setChk("jt-contract", currentSettings.goalContract);
    setChk("jt-parttime", currentSettings.goalPartTime);

    setChk("privacy-visibility", currentSettings.privacyProfileVisibility);
    setChk("privacy-analytics", currentSettings.privacyAnonymousAnalytics);
    setChk("privacy-ai", currentSettings.privacyAiTrainingOptIn);
}

async function saveSettingsToBackend() {
    if (!requireLogin() || !currentSettings) return;

    try {
        let res = await fetch(API_BASE + "/settings", {
            method: "PUT",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(currentSettings)
        });

        if (!res.ok) {
            let err = await res.json().catch(() => ({}));
            console.error("Settings save failed:", res.status, err);
            showToast("Couldn't save settings: " + (err.detail || res.status), "error");
        }
    } catch (err) {
        console.error("Settings save failed:", err);
        showToast("Couldn't reach the server to save settings.", "error");
    }
}

function requireLogin() {
    if (!isLoggedIn()) {
        showToast("Sign In to save changes.", "error");
        return false;
    }
    return true;
}

function showTab(id, link) {
    document.querySelectorAll(".settings-tab").forEach(function (t) { t.classList.remove("active"); });
    document.querySelectorAll(".sn-link").forEach(function (l) { l.classList.remove("active"); });
    document.getElementById("tab-" + id).classList.add("active");
    link.classList.add("active");
}

const ROOT = document.documentElement;

function setTheme(theme, card) {
    localStorage.setItem("theme", theme);
    let applied = theme === "system"? (window.matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light"): theme;
    ROOT.setAttribute("data-theme", applied);
    document.querySelectorAll(".theme-card").forEach(function (c) { c.classList.remove("active"); });
    ["dark", "light", "system"].forEach(function (k) {
        let el = document.getElementById("chk-" + k);
        if (el) el.textContent = "";
    });
    card.classList.add("active");
    document.getElementById("chk-" + theme).textContent = "\u2713";
    if (currentSettings) {
        currentSettings.theme = theme;
        saveSettingsToBackend();
    }
}

let savedTheme = localStorage.getItem("theme") || "system";
let activeThemeCard = document.getElementById("thm-" + savedTheme);
if (activeThemeCard) setTheme(savedTheme, activeThemeCard);

const swatches = document.querySelectorAll(".accent-swatch");
swatches.forEach(function (grid) {
    grid.addEventListener("click", function () {
        swatches.forEach(function (el) { el.classList.remove("active"); el.innerHTML = ""; });
        let color = grid.getAttribute("data-color");
        ROOT.style.setProperty("--accent", color);
        localStorage.setItem("--accent", color);
        grid.classList.add("active");
        grid.innerHTML = `<span class="ac-check">\u2713</span>`;
        let hexInput = document.querySelector("#customAccentHex");
        let colorInput = document.querySelector("#customAccent");
        if (hexInput) hexInput.value = color;
        if (colorInput) colorInput.value = color;

        // add these two lines:
        if (currentSettings) {
            currentSettings.accentColor = color;
            saveSettingsToBackend();
        }
    });
});

let savedAccent = localStorage.getItem("--accent");
if (savedAccent) {
    swatches.forEach(function (grid) {
        if (grid.getAttribute("data-color") === savedAccent) {
            grid.classList.add("active");
            grid.innerHTML = `<span class="ac-check">\u2713</span>`;
        }
    });
    let hexInput = document.querySelector("#customAccentHex");
    let colorInput = document.querySelector("#customAccent");
    if (hexInput) hexInput.value = savedAccent;
    if (colorInput) colorInput.value = savedAccent;
}

let customAccentInput = document.querySelector("#customAccent");
let customHexInput = document.querySelector("#customAccentHex");
let applyAccentBtn = document.querySelector("#applyCustomAccent");

if (customAccentInput) {
    customAccentInput.addEventListener("input", function () {
        if (customHexInput) customHexInput.value = customAccentInput.value;
    });
}

if (customHexInput) {
    customHexInput.addEventListener("input", function () {
        let val = customHexInput.value.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(val) && customAccentInput) {
            customAccentInput.value = val;
        }
    });
}

if (applyAccentBtn) {
    applyAccentBtn.addEventListener("click", function () {
        let color = customAccentInput ? customAccentInput.value : "#4f8ef7";
        if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
            showToast("Enter a valid hex color (e.g. #4f8ef7)", "error");
            return;
        }
        ROOT.style.setProperty("--accent", color);
        localStorage.setItem("--accent", color);
        swatches.forEach(function (el) { el.classList.remove("active"); el.innerHTML = ""; });
        showToast("Custom accent color applied.");

        // add these two lines:
        if (currentSettings) {
            currentSettings.accentColor = color;
            saveSettingsToBackend();
        }
    });
}

let fontSizeMap = { Small: "12px", Medium: "14px", Large: "16px", "X-Large": "18px" };
let savedFontSize = localStorage.getItem("pursuit_fontSize") || "14px";
let savedFontLabel = Object.keys(fontSizeMap).find(function (k) { return fontSizeMap[k] === savedFontSize; }) || "Medium";

ROOT.style.fontSize = savedFontSize;

document.querySelectorAll(".fs-opt").forEach(function (btn) {
    if (btn.textContent.trim() === savedFontLabel) btn.classList.add("active");
    btn.addEventListener("click", function () {
        document.querySelectorAll(".fs-opt").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        let size = fontSizeMap[btn.textContent.trim()] || "14px";
        ROOT.style.fontSize = size;
        localStorage.setItem("pursuit_fontSize", size);

        // add these two lines:
        if (currentSettings) {
            currentSettings.fontSize = size;
            saveSettingsToBackend();
        }
    });
});


let compactToggle = document.querySelector("#compactToggle");
if (compactToggle) {
    if (compactToggle.checked) document.body.classList.add("compact-table");
    compactToggle.addEventListener("change", function () {
        if (compactToggle.checked) {
            document.body.classList.add("compact-table");
        } else {
            document.body.classList.remove("compact-table");
        }
        localStorage.setItem("pursuit_compactTable", compactToggle.checked ? "true" : "false");
        if (currentSettings) {
            currentSettings.compactTable = compactToggle.checked;
            saveSettingsToBackend();
        }
    });
}

let emojiToggle = document.querySelector("#emojiToggle");
if (emojiToggle) {
    if (!emojiToggle.checked) document.body.classList.add("hide-status-dot");
    emojiToggle.addEventListener("change", function () {
        if (emojiToggle.checked) {
            document.body.classList.remove("hide-status-dot");
        } else {
            document.body.classList.add("hide-status-dot");
        }
        if (currentSettings) {
            currentSettings.statusEmojis = emojiToggle.checked;
            saveSettingsToBackend();
        }
    });
}

function loadProfileIntoForm() {
    if (!isLoggedIn()) return Promise.resolve();

    return fetch(API_BASE + "/profile", {
        credentials: "include"
    })
    .then(function (res) { return res.json(); })
    .then(function (profile) {
        if (!profile) return;
        if (removePhotoBtn && profile.avatarFileName) removePhotoBtn.style.display = "inline-block";
        let set = function (id, val) { let el = document.getElementById(id); if (el && val !== undefined && val !== null) el.value = val; };
        set("profileFirstName", profile.firstName || "");
        set("profileLastName", profile.lastName || "");
        set("profileLocation", profile.location || "");
        set("profileExperience", profile.experienceLevel || "");
        set("profileBio", profile.bio || "");
        set("profileLinkedin", profile.linkedinUrl || "");
        set("profileGithub", profile.githubUrl || "");
        set("profilePortfolio", profile.website || "");
        set("currentEmail", profile.email || "");

        let avatarEl = document.getElementById("bigAvatar");
        let hasPhoto = avatarEl && avatarEl.style.backgroundImage && avatarEl.style.backgroundImage !== "none";
        if (avatarEl && !hasPhoto && (profile.firstName || profile.lastName)) {
            let initials = ((profile.firstName || " ")[0] + (profile.lastName || " ")[0]).toUpperCase();
            avatarEl.textContent = initials;
        }
    });
}
let profileLoadPromise = loadProfileIntoForm();

let saveProfileBtn = document.getElementById("saveProfileBtn");
if (saveProfileBtn) {
    saveProfileBtn.addEventListener("click", async function () {
        if (!requireLogin()) return;
        let get = function (id) { let el = document.getElementById(id); return el ? el.value.trim() : ""; };
        let profile = {
            firstName: get("profileFirstName"),
            lastName: get("profileLastName"),
            location: get("profileLocation"),
            experienceLevel: get("profileExperience"),
            bio: get("profileBio"),
            linkedinUrl: get("profileLinkedin"),
            githubUrl: get("profileGithub"),
            website: get("profilePortfolio")
        };

        setButtonLoading(saveProfileBtn, true);
        await fetch(API_BASE + "/profile", {
            method: "PUT",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(profile)
        });
        setButtonLoading(saveProfileBtn, false);

        let fullName = (profile.firstName + " " + profile.lastName).trim();
        let initials = fullName ? ((profile.firstName[0] || "") + (profile.lastName[0] || "")).toUpperCase() : "RS";
        let avatarEl = document.getElementById("bigAvatar");
        let hasPhoto = avatarEl && avatarEl.style.backgroundImage && avatarEl.style.backgroundImage !== "none";
        if (avatarEl && !hasPhoto) avatarEl.textContent = initials;
        let sidebarName = document.querySelector(".user-name");
        let sidebarAvatar = document.querySelector(".user-avatar");
        let headerName = document.querySelector(".h-name");
        let headerAvatar = document.querySelector(".header-avatar");
        if (sidebarName) sidebarName.textContent = fullName || "Ravit Srivastava";
        if (sidebarAvatar && !hasPhoto) sidebarAvatar.textContent = initials;
        if (headerName) headerName.textContent = fullName || "Ravit Srivastava";
        if (headerAvatar && !hasPhoto) headerAvatar.textContent = initials;
        showToast("Profile saved successfully.");
    });
}

let changePhotoBtn = document.getElementById("changePhotoBtn");
let removePhotoBtn = document.getElementById("removePhotoBtn");
let avatarFileInput = document.getElementById("avatarFileInput");

if (changePhotoBtn && avatarFileInput) {
    changePhotoBtn.addEventListener("click", function () {
        avatarFileInput.click();
    });

    avatarFileInput.addEventListener("change", async function () {
        let file = avatarFileInput.files[0];
        if (!file) return;

        if (file.size > 3 * 1024 * 1024) {
            showToast("Image must be under 3MB.");
            return;
        }

        let formData = new FormData();
        formData.append("file", file);

        setButtonLoading(changePhotoBtn, true);
        try {
            let res = await fetch(API_BASE + "/profile/photo", {
                method: "POST",
                credentials: "include",
                body: formData
            });
            if (!res.ok) {
                let err = await res.json().catch(function () { return {}; });
                showToast(err.detail || "Couldn't upload photo.");
                return;
            }

            let url = URL.createObjectURL(file);
            document.querySelectorAll(".user-avatar, .header-avatar, #bigAvatar").forEach(function (el) {
                el.textContent = "";
                el.style.backgroundImage = "url(" + url + ")";
                el.style.backgroundSize = "cover";
                el.style.backgroundPosition = "center";
            });
            if (removePhotoBtn) removePhotoBtn.style.display = "inline-block";
            showToast("Profile photo updated.");
        } catch (err) {
            showToast("Couldn't upload photo.");
        } finally {
            setButtonLoading(changePhotoBtn, false);
        }
    });
}

if (removePhotoBtn) {
    removePhotoBtn.addEventListener("click", async function () {
        setButtonLoading(removePhotoBtn, true);
        try {
            await fetch(API_BASE + "/profile/photo", {
                method: "DELETE",
                credentials: "include"
            });
            document.querySelectorAll(".user-avatar, .header-avatar, #bigAvatar").forEach(function (el) {
                el.style.backgroundImage = "";
                el.textContent = getInitials(userName);
            });
            localStorage.removeItem("pursuit_avatar_cache");
            setButtonLoading(removePhotoBtn, false);
            removePhotoBtn.style.display = "none";
            showToast("Profile photo removed.");
        } catch (err) {
            showToast("Couldn't remove photo.");
            setButtonLoading(removePhotoBtn, false);
        }
    });
}

let updatePasswordBtn = document.getElementById("updatePasswordBtn");
if (updatePasswordBtn) {
    updatePasswordBtn.addEventListener("click", async function () {
        if (!requireLogin()) return;
        let current = document.getElementById("currentPassword");
        let newPwd = document.getElementById("newPassword");
        let confirmPwd = document.getElementById("confirmPassword");
        if (!current || !newPwd || !confirmPwd) return;
        if (current.value.trim() === "") { showToast("Enter your current password.", "error"); return; }
        if (newPwd.value.length < 8) { showToast("New password must be at least 8 characters.", "error"); return; }
        if (newPwd.value !== confirmPwd.value) { showToast("New passwords do not match.", "error"); return; }

        setButtonLoading(updatePasswordBtn, true);
        try {
            let res = await fetch(API_BASE + "/profile/password", {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    currentPassword: current.value,
                    newPassword: newPwd.value
                })
            });

            if (!res.ok) {
                let err = await res.json().catch(() => ({}));
                showToast(err.detail || "Could not update password.", "error");
                return;
            }

            current.value = "";
            newPwd.value = "";
            confirmPwd.value = "";
            showToast("Password updated successfully.");
        } catch (err) {
            console.error("Update password failed:", err);
            showToast("Couldn't reach the server. Is the backend running?", "error");
        } finally {
            setButtonLoading(updatePasswordBtn, false);
        }
    });
}

let toggleTargetMap = {
    "current_password": "currentPassword",
    "new_password": "newPassword",
    "confirm_password": "confirmPassword"
};

document.querySelectorAll(".toggle-password").forEach(function (btn) {
    btn.addEventListener("click", function () {
        let inputId = toggleTargetMap[btn.dataset.target] || btn.dataset.target;
        let targetInput = document.getElementById(inputId);
        if (!targetInput) return;

        if (targetInput.type === "password") {
            targetInput.type = "text";
            btn.textContent = "🙈";
        } else {
            targetInput.type = "password";
            btn.textContent = "👁️";
        }
    });
});

let tfaToggles = document.querySelectorAll("#tab-account .toggle-switch input");
tfaToggles.forEach(function (toggle, i) {
    let key = "pursuit_tfa_" + i;
    let saved = localStorage.getItem(key);
    if (saved !== null) toggle.checked = saved === "true";
    toggle.addEventListener("change", function () {
        if (!requireLogin()) { toggle.checked = !toggle.checked; return; }
        localStorage.setItem(key, toggle.checked ? "true" : "false");
    });
});

let exportDataBtn = document.getElementById("exportDataBtn");
if (exportDataBtn) {
    exportDataBtn.addEventListener("click",async function () {
        if (!requireLogin()) return;
        setButtonLoading(exportDataBtn, true);
        let apps = await loadApplications();
        if (apps.length === 0) { showToast("No applications to export.", "error"); setButtonLoading(exportDataBtn, false); return; }
        let headers = ["ID","Company","Role","Location","Date Applied","Source","Status","Salary","Job URL","Contact","Contact Email","Notes","Tags"];
        let rows = apps.map(function (app) {
            return [
                app.id, app.company, app.role, app.location,
                app.dateApplied, app.source, app.status, app.salary || "",
                app.jobUrl || "", app.contact || "", app.contactEmail || "",
                (app.notes || "").replace(/\n/g, " "),
                (app.tags || []).join("; ")
            ].map(function (val) { return '"' + String(val).replace(/"/g, '""') + '"'; }).join(",");
        });
        let csv = [headers.join(",")].concat(rows).join("\n");
        let blob = new Blob([csv], { type: "text/csv" });
        let url = URL.createObjectURL(blob);
        let a = document.createElement("a");
        a.href = url;
        a.download = "pursuit_applications.csv";
        a.click();
        URL.revokeObjectURL(url);
        showToast("Export downloaded: pursuit_applications.csv");
        setButtonLoading(exportDataBtn, false);
    });
}

let deleteAccountBtn = document.getElementById("deleteAccountBtn");
if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener("click", async function () {
        if (!requireLogin()) return;
        let confirmed = await showConfirm("Permanently delete your account and all data? This cannot be undone.");
        if (!confirmed) return;

        let user = JSON.parse(localStorage.getItem(USER_KEY) || "null");
        if (!user || !user.id) return;

        setButtonLoading(deleteAccountBtn, true);
        await fetch(API_BASE + "/users/" + user.id, {
            method: "DELETE",
            credentials: "include"
        });

        logout();
        window.location.href = "signin.html";
    });
}

let saveNotifBtn = document.getElementById("saveNotifBtn");
if (saveNotifBtn) {
    saveNotifBtn.addEventListener("click", async function () {
        if (!requireLogin()) return;
        let notifData = {};
        let notifIds = ["notif-weekly", "notif-interview", "notif-followup", "notif-tips", "notif-updates"];
        notifIds.forEach(function (id) {
            let el = document.getElementById(id);
            if (el) notifData[id] = el.checked;
        });
        let freqEl = document.getElementById("emailFrequency");
        if (freqEl) notifData.frequency = freqEl.value;
        setButtonLoading(saveNotifBtn, true);
        if (currentSettings) {
            currentSettings.notifWeekly = notifData["notif-weekly"] || false;
            currentSettings.notifInterview = notifData["notif-interview"] || false;
            currentSettings.notifFollowup = notifData["notif-followup"] || false;
            currentSettings.notifTips = notifData["notif-tips"] || false;
            currentSettings.notifUpdates = notifData["notif-updates"] || false;
            currentSettings.notifFrequency = notifData.frequency || "Weekly";
            await saveSettingsToBackend();
        }
        setButtonLoading(saveNotifBtn, false);
        showToast("Notification preferences saved.");
    });
}

let appGoalSlider = document.getElementById("appGoal");
let appGoalVal = document.getElementById("appGoalVal");
if (appGoalSlider && appGoalVal) {
    let savedGoalVal = localStorage.getItem("pursuit_appGoal");
    if (savedGoalVal) { appGoalSlider.value = savedGoalVal; appGoalVal.textContent = savedGoalVal; }
    appGoalSlider.addEventListener("input", function () {
        appGoalVal.textContent = appGoalSlider.value;
    });
}

let saveGoalsBtn = document.getElementById("saveGoalsBtn");
if (saveGoalsBtn) {
    saveGoalsBtn.addEventListener("click", async function () {
        if (!requireLogin()) return;
        let get = function (id) { let el = document.getElementById(id); return el ? el.value.trim() : ""; };
        let goals = {
            targetRole: get("goalRole"),
            targetIndustry: get("goalIndustry"),
            minSalary: get("goalSalary"),
            targetLocations: get("goalLocations"),
            appGoal: appGoalSlider ? appGoalSlider.value : "8",
            deadline: get("goalDeadline"),
            jobTypes: {
                fulltime: document.getElementById("jt-fulltime") ? document.getElementById("jt-fulltime").checked : true,
                remote: document.getElementById("jt-remote") ? document.getElementById("jt-remote").checked : true,
                contract: document.getElementById("jt-contract") ? document.getElementById("jt-contract").checked : false,
                parttime: document.getElementById("jt-parttime") ? document.getElementById("jt-parttime").checked : false
            }
        };
        setButtonLoading(saveGoalsBtn, true);
        if (currentSettings) {
            currentSettings.goalRole = goals.targetRole;
            currentSettings.goalIndustry = goals.targetIndustry;
            currentSettings.goalSalary = goals.minSalary;
            currentSettings.goalLocations = goals.targetLocations;
            currentSettings.goalWeeklyTarget = parseInt(goals.appGoal, 10);
            currentSettings.goalDeadline = goals.deadline;
            currentSettings.goalFulltime = goals.jobTypes.fulltime;
            currentSettings.goalRemote = goals.jobTypes.remote;
            currentSettings.goalContract = goals.jobTypes.contract;
            currentSettings.goalPartTime = goals.jobTypes.parttime;
            await saveSettingsToBackend();
        }
        setButtonLoading(saveGoalsBtn, false);
        showToast("Job goals saved.");
    });
}

let integrationStates = {};

async function loadIntegrationStates() {
    if (!isLoggedIn()) return;
    let res = await fetch(API_BASE + "/integrations", {
        credentials: "include"
    });
    if (!res.ok) return;
    let rows = await res.json();
    rows.forEach(function (row) {
        integrationStates[row.serviceName] = row.connected;
    });
    applyIntegrationStates();
}

function applyIntegrationStates() {
    document.querySelectorAll(".integration-item").forEach(function (item) {
        let btn = item.querySelector("button");
        let badge = item.querySelector(".int-badge");
        let name = item.querySelector(".int-info strong");
        if (!btn || !badge || !name) return;
        let key = name.textContent.trim().toLowerCase().replace(/\s/g, "_");
        let connected = !!integrationStates[key];
        if (connected) {
            item.classList.add("connected");
            badge.textContent = "Connected";
            badge.classList.add("connected");
            btn.textContent = "Disconnect";
            btn.className = "btn btn-secondary btn-sm";
        } else {
            item.classList.remove("connected");
            badge.textContent = "Not Connected";
            badge.classList.remove("connected");
            btn.textContent = "Connect";
            btn.className = "btn btn-primary btn-sm";
        }
    });
}

document.querySelectorAll(".integration-item").forEach(function (item) {
    let btn = item.querySelector("button");
    let badge = item.querySelector(".int-badge");
    let name = item.querySelector(".int-info strong");
    if (!btn || !badge || !name) return;
    let key = name.textContent.trim().toLowerCase().replace(/\s/g, "_");

    btn.addEventListener("click", async function () {
        if (!requireLogin()) return;
        let isConnected = item.classList.contains("connected");
        let oauthService = btn.getAttribute("data-oauth");

        if (!isConnected && oauthService) {
            window.location.href = API_BASE + "/integrations/" + oauthService + "/connect";
            return;
        }

        let newState = !isConnected;
        setButtonLoading(btn, true);
        await fetch(API_BASE + "/integrations/" + key, {
            method: "PUT",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ connected: newState })
        });

        integrationStates[key] = newState;
        setButtonLoading(btn, false);
        applyIntegrationStates();
        showToast(name.textContent.trim() + (newState ? " connected successfully." : " disconnected."));
    });
});

loadIntegrationStates();

(function handleIntegrationRedirect() {
    let params = new URLSearchParams(window.location.search);
    let connected = params.get("connected");
    let error = params.get("error");
    if (connected) {
        showToast(connected.replace(/_/g, " ") + " connected successfully.");
    } else if (error) {
        showToast("Couldn't connect: " + error.replace(/_/g, " "));
    }
    if (connected || error) {
        window.history.replaceState({}, "", window.location.pathname);
    }
})();

let savePrivacyBtn = document.getElementById("savePrivacyBtn");
if (savePrivacyBtn) {
    savePrivacyBtn.addEventListener("click", async function () {
        if (!requireLogin()) return;
        let privacyData = {};
        ["privacy-visibility","privacy-analytics","privacy-ai"].forEach(function (id) {
            let el = document.getElementById(id);
            if (el) privacyData[id] = el.checked;
        });
        setButtonLoading(savePrivacyBtn, true);
        if (currentSettings) {
            currentSettings.privacyProfileVisibility = privacyData["privacy-visibility"] || false;
            currentSettings.privacyAnonymousAnalytics = privacyData["privacy-analytics"] || false;
            currentSettings.privacyAiTrainingOptIn = privacyData["privacy-ai"] || false;
            await saveSettingsToBackend();
        }
        setButtonLoading(savePrivacyBtn, false);
        showToast("Privacy settings saved.");
    });
}

let requestExportBtn = document.getElementById("requestExportBtn");
if (requestExportBtn) {
    requestExportBtn.addEventListener("click", function () {
        if (!requireLogin()) return;
        showToast("Data export request submitted. You'll receive an email shortly.");
    });
}

let viewLogBtn = document.getElementById("viewLogBtn");
if (viewLogBtn) {
    viewLogBtn.addEventListener("click", function () {
        let now = new Date().toLocaleString();
        showToast("Activity: " + now + " — Logged in");
    });
}

Promise.all([profileLoadPromise, loadSettingsFromBackend()]).finally(hidePageSkeleton);