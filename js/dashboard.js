let firstName = "";
if(isLoggedIn()) {
    firstName = userName.split(" ")[0];
}else {
    firstName = "Guest";
}
document.querySelector(".wb-content h2").textContent = "Welcome!! " + firstName + " 👋";

function startOfDay(d) {
    if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}/.test(d)) {
        let [y, m, day] = d.slice(0, 10).split("-").map(Number);
        return new Date(y, m - 1, day, 0, 0, 0, 0);
    }
    let x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}
function getWeekRange(refDate) {
    let d = startOfDay(refDate || new Date());
    let day = d.getDay();
    let diffToMonday = (day === 0) ? -6 : 1 - day;
    let monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);
    let sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
}
function isInRange(dateStr, start, end) {
    if (!dateStr) return false;
    let d = startOfDay(dateStr);
    return d >= start && d <= end;
}
function daysBetween(a, b) {
    return Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
}
function formatActionDate(dateStr) {
    let today = startOfDay(new Date());
    let target = startOfDay(dateStr);
    let diff = daysBetween(today, target);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    if (diff < 0) return formatDate(dateStr) + " (overdue)";
    return formatDate(dateStr);
}

let applications;

async function loadDashboardData() {
    if(isLoggedIn()) {
        applications = await loadApplications();
    }else {
        applications = [];
    }

    if (!isLoggedIn()) {
        document.querySelector("#wbSubtext").innerHTML =
            `<a href="signin.html"><strong>Sign In</strong></a> to see your progress`;
        document.querySelector(".stat-total .stat-number").textContent = 0;
        document.querySelector(".stat-progress .stat-number").textContent = 0;
        document.querySelector(".stat-offers .stat-number").textContent = 0;
        document.querySelector(".stat-rejected .stat-number").textContent = 0;
        renderRecentApplications();
        renderFunnel();
        renderUpcomingActions();
        renderSources();
        renderWeeklyActivity();
        await renderGoalProgress(); 
        return;
    }

    let totalCount = applications.length;
    let inProgressCount = applications.filter(function (app) {
        return app.status === "Applied" || app.status === "Interview";
    }).length;
    let offersCount = applications.filter(function (app) {
        return app.status === "Offer";
    }).length;
    let rejectedCount = applications.filter(function (app) {
        return app.status === "Rejected";
    }).length;

    document.querySelector(".stat-total .stat-number").textContent = totalCount;
    document.querySelector(".stat-progress .stat-number").textContent = inProgressCount;
    document.querySelector(".stat-offers .stat-number").textContent = offersCount;
    document.querySelector(".stat-rejected .stat-number").textContent = rejectedCount;

    renderWelcomeSubtext();
    renderTrends();
    renderRecentApplications();
    renderFunnel();
    renderUpcomingActions();
    renderSources();
    renderWeeklyActivity();
    loadAiInsights();
    await renderGoalProgress(); 
}

loadDashboardData().finally(hidePageSkeleton);

// Re-run whenever the page is restored from the browser's back/forward
// cache (bfcache) instead of freshly loaded — otherwise editing an
// application on another page and hitting Back shows stale numbers.
window.addEventListener("pageshow", function (e) {
    if (e.persisted) {
        loadDashboardData();
    }
});

function renderTrends() {
    let { start, end } = getWeekRange();
    let thisWeek = applications.filter(function (app) {
        return isInRange(app.dateApplied, start, end);
    });

    let totalNew = thisWeek.length;
    let progressNew = thisWeek.filter(function (a) { return a.status === "Applied" || a.status === "Interview"; }).length;
    let offersNew = thisWeek.filter(function (a) { return a.status === "Offer"; }).length;
    let rejectedNew = thisWeek.filter(function (a) { return a.status === "Rejected"; }).length;

    setTrend("#totalTrend", totalNew, totalNew + " this week", "up");
    setTrend("#progressTrend", progressNew, progressNew + " new", "up");
    setTrend("#offersTrend", offersNew, offersNew + " new", "up");
    setTrend("#rejectedTrend", rejectedNew, rejectedNew + " this week", "down");
}
function setTrend(selector, count, label, dir) {
    let el = document.querySelector(selector);
    if (!el) return;
    if (count === 0) {
        el.className = "stat-trend neutral";
        el.textContent = "No change this week";
        return;
    }
    let arrow = dir === "up" ? "↑" : "↓";
    el.className = "stat-trend " + dir;
    el.textContent = arrow + " " + label;
}

function renderWelcomeSubtext() {
    let el = document.querySelector("#wbSubtext");
    if (!el) return;

    let { start, end } = getWeekRange();
    let interviewsThisWeek = applications.filter(function (a) {
        return isInRange(a.interviewDate, start, end);
    }).length;

    let today = startOfDay(new Date());
    let awaitingFollowUp = applications.filter(function (a) {
        if (!a.followUpDate) return false;
        if (a.status === "Rejected" || a.status === "Offer") return false;
        return startOfDay(a.followUpDate) <= today;
    }).length;

    el.innerHTML = `You have <strong>${interviewsThisWeek} interview${interviewsThisWeek === 1 ? "" : "s"}</strong> this week and <strong>${awaitingFollowUp} application${awaitingFollowUp === 1 ? "" : "s"}</strong> awaiting follow-up.`;
}

async function renderGoalProgress() {
    let el = document.querySelector("#goalProgressBody");
    if (!el) return;

    if (!isLoggedIn()) {
        el.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:8px 0;">Sign in to track goals.</div>`;
        return;
    }

    try {
        let res = await fetch(API_BASE + "/settings", {
            credentials: "include"
        });
        let settings = await res.json();

        let target = parseInt(settings.goalWeeklyTarget, 10) || 0;
        let deadline = settings.goalDeadline;

        if (!target && !deadline) {
            el.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:8px 0;">Set a weekly goal or deadline in <a href="settings.html">Settings</a>.</div>`;
            return;
        }

        let { start, end } = getWeekRange();
        let thisWeekCount = applications.filter(function (a) {
            return isInRange(a.dateApplied, start, end);
        }).length;

        let pct = target > 0 ? Math.min(100, Math.round((thisWeekCount / target) * 100)) : 0;

        let deadlineHtml = "";
        if (deadline) {
            let daysLeft = daysBetween(new Date(), deadline);
            let daysLabel = daysLeft < 0 ? "Deadline passed" : (daysLeft === 0 ? "Deadline today" : daysLeft + " day" + (daysLeft === 1 ? "" : "s") + " left");
            deadlineHtml = `<div style="color:var(--text-muted);font-size:13px;margin-top:10px;">${daysLabel}</div>`;
        }

        el.innerHTML = `
            <div class="funnel-step">
                <div class="fs-label">
                    <span>Applications this week</span>
                    <span>${thisWeekCount}${target ? " / " + target : ""}</span>
                </div>
                ${target ? `<div class="fs-bar-wrap"><div class="fs-bar" style="width:${pct}%;background:var(--accent)"></div></div>` : ""}
            </div>
            ${deadlineHtml}
        `;
    } catch (err) {
        el.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:8px 0;">Couldn't load goal progress.</div>`;
    }
}

function renderFunnel() {
    let el = document.querySelector("#funnelContainer");
    if (!el) return;

    if (applications.length === 0) {
        el.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:8px 0;">No applications yet.</div>`;
        return;
    }

    let appliedCount = applications.length;
    let interviewCount = applications.filter(function (a) { return a.status === "Interview" || a.status === "Offer"; }).length;
    let offerCount = applications.filter(function (a) { return a.status === "Offer"; }).length;

    let stages = [
        { label: "Applied", count: appliedCount, color: "var(--accent)" },
        { label: "Interview", count: interviewCount, color: "#f59e0b" },
        { label: "Offer", count: offerCount, color: "#22c55e" }
    ];

    el.innerHTML = stages.map(function (s) {
        let pct = appliedCount > 0 ? Math.round((s.count / appliedCount) * 100) : 0;
        return `
            <div class="funnel-step">
                <div class="fs-label">
                    <span>${s.label}</span>
                    <span>${s.count}</span>
                </div>
                <div class="fs-bar-wrap">
                    <div class="fs-bar" style="width:${pct}%;background:${s.color}"></div>
                </div>
            </div>
        `;
    }).join("");
}

function renderUpcomingActions() {
    let el = document.querySelector("#upcomingActionsList");
    if (!el) return;

    let today = startOfDay(new Date());
    let actions = [];

    for (let app of applications) {
        if (app.interviewDate && startOfDay(app.interviewDate) >= today) {
            actions.push({
                title: (app.role ? escapeHtml(app.role) + " Interview — " : "Interview — ") + escapeHtml(app.company),
                date: app.interviewDate,
                badgeClass: "badge-interview",
                dotClass: "interview",
                label: "Interview"
            });
        }
        if (app.followUpDate && app.status !== "Rejected" && app.status !== "Offer") {
            actions.push({
                title: "Follow-up — " + escapeHtml(app.company),
                date: app.followUpDate,
                badgeClass: "badge-applied",
                dotClass: "applied",
                label: "Follow Up"
            });
        }
    }

    actions.sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
    actions = actions.slice(0, 6);

    if (actions.length === 0) {
        el.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:8px 0;">No upcoming interviews or follow-ups.</div>`;
        return;
    }

    el.innerHTML = actions.map(function (a) {
        return `
            <div class="action-item">
                <div class="action-dot ${a.dotClass}"></div>
                <div class="action-info">
                    <strong>${a.title}</strong>
                    <span>${formatActionDate(a.date)}</span>
                </div>
                <span class="badge ${a.badgeClass}">${a.label}</span>
            </div>
        `;
    }).join("");
}

function renderSources() {
    let el = document.querySelector("#sourceList");
    if (!el) return;

    if (applications.length === 0) {
        el.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:8px 0;">No applications yet.</div>`;
        return;
    }

    let counts = {};
    for (let app of applications) {
        let src = getDisplaySource(app.source);
        counts[src] = (counts[src] || 0) + 1;
    }

    let colors = ["#4285F4", "#8b5cf6", "#f59e0b", "#22c55e", "#ef4444", "#ec4899"];
    let entries = Object.keys(counts)
        .map(function (name) { return { name: name, count: counts[name] }; })
        .sort(function (a, b) { return b.count - a.count; });

    let total = applications.length;
    el.innerHTML = entries.map(function (e, i) {
        let pct = Math.round((e.count / total) * 100);
        return `
            <div class="source-item">
                <span class="source-name">${e.name}</span>
                <div class="source-bar-wrap">
                    <div class="source-bar" style="width:${pct}%;background:${colors[i % colors.length]}"></div>
                </div>
                <span class="source-pct">${pct}%</span>
            </div>
        `;
    }).join("");
}

function renderWeeklyActivity() {
    let barsEl = document.querySelector("#wcBars");
    let countEl = document.querySelector("#weeklyCount");
    if (!barsEl) return;

    let { start } = getWeekRange();
    let dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    let counts = [0, 0, 0, 0, 0, 0, 0];

    for (let app of applications) {
        if (!app.dateApplied) continue;
        let d = startOfDay(app.dateApplied);
        let diff = daysBetween(start, d);
        if (diff >= 0 && diff <= 6) {
            counts[diff]++;
        }
    }

    let max = Math.max(...counts, 1);
    let todayDiff = daysBetween(start, startOfDay(new Date()));

    barsEl.innerHTML = dayLabels.map(function (label, i) {
        let heightPct = Math.round((counts[i] / max) * 100);
        let isToday = i === todayDiff;
        return `
            <div class="wc-col">
                <div class="wc-bar ${isToday ? "wc-today" : ""}" style="height:${Math.max(heightPct, counts[i] > 0 ? 8 : 2)}%" title="${counts[i]} applied"></div>
                <span>${label}</span>
            </div>
        `;
    }).join("");

    if (countEl) countEl.textContent = counts.reduce(function (a, b) { return a + b; }, 0);
}

function renderRecentApplications() {
    let rowsHtml="";
    if(!isLoggedIn()) {
        rowsHtml = `
            <tr>
                <td colspan="8" style="text-align:center; padding:30px; color:var(--text-muted)">
                    <a href="signin.html" style="text-decoration: none; color: var(--accent); font-weight:bold; ">Sign In </a> to see your Applications.
                </td>
            </tr>
        `;
        document.querySelector("#recentAppsBody").innerHTML = rowsHtml;
        return;
    }

    if (applications.length === 0) {
        document.querySelector("#recentAppsBody").innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding:30px; color:var(--text-muted)">
                    No applications yet — <a href="add_application.html" style="color:var(--accent); font-weight:bold;">add one</a>.
                </td>
            </tr>
        `;
        return;
    }

    let sorted = applications.slice().sort(function (a, b) {
        return new Date(b.dateApplied) - new Date(a.dateApplied);
    });
    let recent = sorted.slice(0, 8);
    for (let app of recent) {
        let initial = app.company[0].toUpperCase();
        let color = getCompanyColor(app.company);
        let dateDisplay = formatDate(app.dateApplied);
        let badgeClass = "badge-" + app.status.toLowerCase();
        rowsHtml += `
            <tr>
                <td>
                    <div class="company-cell">
                        <div class="company-logo" style="background:${color}">${escapeHtml(initial)}</div>
                        ${escapeHtml(app.company)}
                    </div>
                </td>
                <td>${escapeHtml(app.role)}</td>
                <td>${dateDisplay}</td>
                <td>
                    <span class="badge ${badgeClass}">${escapeHtml(app.status)}</span>
                </td>
            </tr>
        `;
    }
    document.querySelector("#recentAppsBody").innerHTML = rowsHtml;
}

async function loadAiInsights() {
    let listEl = document.querySelector("#aiInsightList");
    if (!listEl) return;

    if (!isLoggedIn()) {
        listEl.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:8px 0;">Sign in to see AI insights.</div>`;
        return;
    }

    let res = await fetch(API_BASE + "/applications/insights", {
        credentials: "include"
    });
    if (!res.ok) {
        listEl.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:8px 0;">Couldn't load insights.</div>`;
        return;
    }
    let data = await res.json();
    if (!data.insights) {
        listEl.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:8px 0;">No insights yet — visit Analytics to generate.</div>`;
        return;
    }

    let iconFor = { danger: "⚠", warning: "💡", success: "✓" };
    listEl.innerHTML = data.insights.insights.map(function (item) {
        return `
            <div class="insight-item ${item.type}">
                <span class="ii-icon">${iconFor[item.type] || "•"}</span>
                <p>${escapeHtml(item.text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</p>
            </div>
        `;
    }).join("");
}