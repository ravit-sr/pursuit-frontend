function requireLogin() {
    if (!isLoggedIn()) {
        showToast("Sign In to manage your resumes.", "error");
        return false;
    }
    return true;
}

async function loadResumes() {
    if (!isLoggedIn()) return [];
    let res = await fetch(API_BASE + "/resumes", {
        credentials: "include"
    });
    if (!res.ok) return [];
    return await res.json();
}

function getActiveResume(resumes) {
    return resumes.find(function (r) { return r.active; }) || null;
}

function getAnalysis(resume) {
    if (!resume || !resume.analysisJson) return null;
    try {
        return JSON.parse(resume.analysisJson);
    } catch (e) {
        return null;
    }
}

function renderScoreRing(analysis) {
    let wrap = document.querySelector(".score-circle-wrap");
    if (!wrap) return;

    if (!analysis) {
        wrap.innerHTML = `
            <div style="width:120px;height:120px;border-radius:50%;border:2px dashed var(--bg-primary);display:flex;align-items:center;justify-content:center;text-align:center;padding:10px;box-sizing:border-box;">
                <span style="font-size:13px;color:var(--text-muted);line-height:1.3;">Not analyzed yet</span>
            </div>
        `;
        return;
    }

    let score = analysis.score;
    let radius = 52;
    let circ = 2 * Math.PI * radius;
    let fill = (score / 100) * circ;
    let color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";

    wrap.innerHTML = `
        <svg class="score-ring" viewBox="0 0 120 120" style="width:120px;height:120px;">
            <circle cx="60" cy="60" r="${radius}" fill="none" stroke="var(--bg-primary)" stroke-width="12"/>
            <circle cx="60" cy="60" r="${radius}" fill="none" stroke="${color}" stroke-width="12"
                stroke-dasharray="${circ} ${circ}" stroke-dashoffset="${circ - fill}"
                transform="rotate(-90 60 60)" style="transition:stroke-dashoffset 0.8s ease"/>
        </svg>
        <span class="score-num">${score}</span>
        <span class="score-label">/ 100</span>
    `;
}

function renderScoreBreakdown(analysis) {
    let el = document.querySelector("#scoreBreakdown");
    if (!el) return;

    if (!analysis) {
        el.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:8px 0;">Click "Re-analyze" to score your active resume.</div>`;
        return;
    }

    let rows = [
        { label: "ATS Compatibility", value: analysis.ats, color: "var(--accent)" },
        { label: "Keyword Match", value: analysis.keyword, color: "#8b5cf6" },
        { label: "Formatting", value: analysis.formatting, color: "#22c55e" },
        { label: "Quantified Impact", value: analysis.impact, color: "#f59e0b" },
        { label: "Completeness", value: analysis.completeness, color: "#ef4444" }
    ];

    el.innerHTML = rows.map(function (r) {
        return `
            <div class="sb-item">
                <span>${r.label}</span>
                <div class="sb-bar-wrap">
                    <div class="sb-bar" style="width:${r.value}%;background:${r.color}"></div>
                </div>
                <span class="sb-pct">${r.value}%</span>
            </div>
        `;
    }).join("");
}

function renderKeywordChips(analysis) {
    let missingEl = document.querySelector("#missingKeywordChips");
    let presentEl = document.querySelector("#presentKeywordChips");
    let subtitleEl = document.querySelector("#keywordSubtitle");
    if (!missingEl || !presentEl) return;

    if (!analysis) {
        missingEl.innerHTML = `<span style="color:var(--text-muted);font-size:13px;">No analysis yet.</span>`;
        presentEl.innerHTML = "";
        if (subtitleEl) subtitleEl.textContent = "Found in job descriptions you applied to";
        return;
    }

    missingEl.innerHTML = (analysis.missingKeywords || []).map(function (k) {
        return `<span class="kw-chip missing">${escapeHtml(k)}</span>`;
    }).join("");

    presentEl.innerHTML = (analysis.presentKeywords || []).map(function (k) {
        return `<span class="kw-chip present">${escapeHtml(k)}</span>`;
    }).join("");

    if (subtitleEl) {
        let roles = analysis.targetRoles || [];
        subtitleEl.textContent = roles.length > 0
            ? "Based on roles you've applied to: " + roles.join(", ")
            : "General keywords — log applications for personalized matching";
    }
}

function renderSuggestions(analysis) {
    let el = document.querySelector("#suggestionList");
    if (!el) return;

    if (!analysis) {
        el.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:8px 0;">No suggestions yet — analyze your resume first.</div>`;
        return;
    }

    el.innerHTML = (analysis.suggestions || []).map(function (s) {
        return `
            <div class="sug-item ${s.priority}">
                <div class="sug-priority ${s.priority}">${s.priority.charAt(0).toUpperCase() + s.priority.slice(1)}</div>
                <div class="sug-text">
                    <strong>${escapeHtml(s.title)}</strong>
                    <p>${escapeHtml(s.text)}</p>
                </div>
            </div>
        `;
    }).join("");
}

function renderLoadingState() {
    let wrap = document.querySelector(".score-circle-wrap");
    if (wrap) {
        wrap.innerHTML = `
            <div style="width:120px;height:120px;border-radius:50%;border:3px solid var(--bg-primary);border-top-color:var(--accent);animation:pursuit-spin 0.8s linear infinite;"></div>
        `;
    }

    let breakdownEl = document.querySelector("#scoreBreakdown");
    if (breakdownEl) {
        breakdownEl.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:8px 0;">Analyzing resume…</div>`;
    }

    let missingEl = document.querySelector("#missingKeywordChips");
    let presentEl = document.querySelector("#presentKeywordChips");
    if (missingEl) missingEl.innerHTML = `<span style="color:var(--text-muted);font-size:13px;">Analyzing…</span>`;
    if (presentEl) presentEl.innerHTML = "";

    let sugEl = document.querySelector("#suggestionList");
    if (sugEl) sugEl.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:8px 0;">Analyzing…</div>`;

    if (!document.querySelector("#pursuitSpinKeyframes")) {
        let style = document.createElement("style");
        style.id = "pursuitSpinKeyframes";
        style.textContent = `@keyframes pursuit-spin { to { transform: rotate(360deg); } }`;
        document.head.appendChild(style);
    }
}

function renderAllAnalysis(resumes) {
    let active = getActiveResume(resumes);
    let analysis = getAnalysis(active);
    renderScoreRing(analysis);
    renderScoreBreakdown(analysis);
    renderKeywordChips(analysis);
    renderSuggestions(analysis);
    return active;
}

function formatSize(bytes) {
    let mb = bytes / (1024 * 1024);
    return bytes > 1024 * 1024 ? mb.toFixed(1) + " MB" : Math.round(bytes / 1024) + " KB";
}

function formatDate(dateStr) {
    let d = new Date(dateStr);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return months[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
}

async function renderResumeList() {
    let resumes = await loadResumes();
    let listEl = document.querySelector(".resume-list");
    if (listEl) {
        let html = "";
        for (let r of resumes) {
            html += `
                <div class="resume-item${r.active ? " active-resume" : ""}" data-id="${r.id}">
                    <span class="ri-icon">📄</span>
                    <div class="ri-info">
                        <strong>${r.fileName}</strong>
                        <span>Uploaded ${formatDate(r.uploadedAt)} · ${formatSize(r.fileSize)}</span>
                    </div>
                    <div class="ri-actions">
                        ${r.active ? '<span class="ri-active-badge">Active</span>' : `<button class="btn btn-secondary btn-sm set-active-btn" data-id="${r.id}">Set Active</button>`}
                        <button class="act-btn danger delete-resume-btn" data-id="${r.id}" data-tooltip="Delete">🗑</button>
                    </div>
                </div>
            `;
        }

        if (html === "") {
            html = `<div style="color:var(--text-muted);font-size:13px;padding:16px 0;text-align:center">No saved resumes. Upload one above.</div>`;
        }

        listEl.innerHTML = html;

        listEl.querySelectorAll(".set-active-btn").forEach(function (btn) {
            btn.addEventListener("click", async function () {
                if (!requireLogin()) return;
                setButtonLoading(btn, true);
                try {
                    let res = await fetch(API_BASE + "/resumes/" + btn.dataset.id + "/activate", {
                        method: "PUT",
                        credentials: "include"
                    });
                    if (!res.ok) { showResumeToast("Failed to set active."); return; }
                    await renderResumeList();
                    showResumeToast("Resume set as active.");
                } catch (e) {
                    showResumeToast("Network error.");
                } finally {
                    setButtonLoading(btn, false);
                }
            });
        });

        listEl.querySelectorAll(".delete-resume-btn").forEach(function (btn) {
            btn.addEventListener("click", async function () {
                if (!requireLogin()) return;
                let confirmed = await showConfirm("Delete this resume? This cannot be undone.");
                if (!confirmed) return;
                setButtonLoading(btn, true);
                try {
                    let res = await fetch(API_BASE + "/resumes/" + btn.dataset.id, {
                        method: "DELETE",
                        credentials: "include"
                    });
                    if (!res.ok) { showResumeToast("Failed to delete."); return; }
                    await renderResumeList();
                    showResumeToast("Resume deleted.");
                } catch (e) {
                    showResumeToast("Network error.");
                } finally {
                    setButtonLoading(btn, false);
                }
            });
        });
    }

    return renderAllAnalysis(resumes);
}

function showResumeToast(message) {
    let existing = document.querySelector(".pursuit-toast");
    if (existing) existing.remove();
    let toast = document.createElement("div");
    toast.className = "pursuit-toast";
    toast.style.cssText = "position:fixed;bottom:24px;right:24px;background:var(--bg-card);border:1px solid rgba(34,197,94,0.4);border-radius:var(--radius);padding:12px 18px;font-size:13px;color:var(--text-primary);z-index:9999;box-shadow:var(--shadow-lg);";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function () { if (toast.parentNode) toast.remove(); }, 3000);
}

let resumeDropEl = document.querySelector("#resumeDrop");
let resumeFileEl = document.querySelector("#resumeFile");

if (resumeDropEl && resumeFileEl) {
    resumeDropEl.addEventListener("click", function () {
        resumeFileEl.click();
    });

    resumeFileEl.addEventListener("change", async function (e) {
        if (!requireLogin()) { resumeFileEl.value = ""; return; }
        let file = e.target.files[0];
        if (!file) return;

        let formData = new FormData();
        formData.append("file", file);

        let browseBtn = resumeDropEl.querySelector(".btn");
        setButtonLoading(browseBtn, true);

        try {
            await fetch(API_BASE + "/resumes", {
                method: "POST",
                credentials: "include",
                body: formData
            });

            await renderResumeList();
            showResumeToast("Resume uploaded: " + file.name);
        } finally {
            setButtonLoading(browseBtn, false);
            resumeFileEl.value = "";
        }
    });
}

let reanalyzeBtn = document.querySelector("#reanalyzeBtn");
if (reanalyzeBtn) {
    reanalyzeBtn.addEventListener("click", async function () {
        if (!requireLogin()) return;

        setButtonLoading(reanalyzeBtn, true, "Checking…");

        let resumes = await loadResumes();
        let active = getActiveResume(resumes);
        if (!active) {
            setButtonLoading(reanalyzeBtn, false);
            showResumeToast(resumes.length ? "No active resume — click \"Set Active\" on one below first." : "Upload a resume first.");
            return;
        }

        setButtonLoading(reanalyzeBtn, true, "Analyzing…");
        renderLoadingState();

        try {
            let res = await fetch(API_BASE + "/resumes/" + active.id + "/analyze", {
                method: "POST",
                credentials: "include"
            });

            if (!res.ok) {
                let err = await res.json().catch(function () { return {}; });
                showResumeToast(err.detail || "Analysis failed.");
                let freshResumes = await loadResumes();
                renderAllAnalysis(freshResumes);
            } else {
                let analysis = await res.json();
                renderScoreRing(analysis);
                renderScoreBreakdown(analysis);
                renderKeywordChips(analysis);
                renderSuggestions(analysis);
                showResumeToast("Analysis complete. Score updated.");
            }
        } catch (e) {
            showResumeToast("Analysis failed — check your connection.");
        }

        setButtonLoading(reanalyzeBtn, false);
    });
}

let newBtn = document.querySelector("#newResumeBtn");
if (newBtn) {
    newBtn.addEventListener("click", function () {
        resumeFileEl && resumeFileEl.click();
    });
}

renderResumeList().finally(hidePageSkeleton);