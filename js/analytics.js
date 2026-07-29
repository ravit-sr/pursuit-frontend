let allApplications;

function getFilteredByDays(numDays) {
    if (numDays === 0) return allApplications.slice();
    let cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - numDays);
    return allApplications.filter(function (app) {
        return new Date(app.dateApplied + "T00:00:00") >= cutoff;
    });
}

function getDaysFromFilter(val) {
    let n = parseInt(val, 10);
    return isNaN(n) ? 0 : n;
}

function renderAnalytics(applications) {
    let totalCount = applications.length;

    let respondedCount = applications.filter(function (app) {
        return app.status !== "Applied";
    }).length;
    let resRate = totalCount === 0 ? "0%" : Math.round((respondedCount / totalCount) * 100) + "%";

    let offerCount = applications.filter(function (app) {
        return app.status === "Offer";
    }).length;
    let offerRate = totalCount === 0 ? "0%" : Math.round((offerCount / totalCount) * 100) + "%";

    let rejectedCount = applications.filter(function (app) {
        return app.status === "Rejected";
    }).length;
    let rejectRate = totalCount === 0 ? "0%" : Math.round((rejectedCount / totalCount) * 100) + "%";

    if(isLoggedIn()){
        document.querySelector("#kpiTotal").textContent = totalCount;
        document.querySelector("#kpiResponseRate").textContent = resRate;
        document.querySelector("#kpiOffer").textContent = offerRate;
        document.querySelector("#kpiRejection").textContent = rejectRate;
    }else {
        document.querySelector("#kpiTotal").textContent = 0;
        document.querySelector("#kpiResponseRate").textContent = 0;
        document.querySelector("#kpiOffer").textContent = 0;
        document.querySelector("#kpiRejection").textContent = 0;
    }

    let avgResponseEl = document.querySelector("#kpiAvgResponse");
    if (avgResponseEl) {
        let respondedApps = applications.filter(function (app) {
            return app.status !== "Applied";
        });
        if (respondedApps.length === 0) {
            avgResponseEl.textContent = "—";
        } else {
            let today = new Date();
            let totalDays = respondedApps.reduce(function (sum, app) {
                let applied = new Date(app.dateApplied + "T00:00:00");
                let diff = Math.max(0, Math.round((today - applied) / (1000 * 60 * 60 * 24)));
                return sum + diff;
            }, 0);
            avgResponseEl.textContent = Math.round(totalDays / respondedApps.length) + "d";
        }
    }

    let sourceOrder = ["Referral", "Company Site", "LinkedIn", "Indeed", "Glassdoor", "Other"];
    let colorArray = {
        referral: "#22c55e",
        companysite: "#4f8ef7",
        linkedin: "#8b5cf6",
        indeed: "#f59e0b",
        glassdoor: "#ef4444"
    };

    let allSources = applications.map(function (app) { return getDisplaySource(app.source); });
    let uniqueSourcesArray = Array.from(new Set(allSources));
    uniqueSourcesArray.sort(function (a, b) {
        let indexA = sourceOrder.indexOf(a);
        let indexB = sourceOrder.indexOf(b);
        if (indexA === -1) indexA = sourceOrder.length;
        if (indexB === -1) indexB = sourceOrder.length;
        return indexA - indexB;
    });

    let barsHtml = "";
    for (let thisSource of uniqueSourcesArray) {
        let appsSource = applications.filter(function (app) { return getDisplaySource(app.source) === thisSource; });
        let totalSource = appsSource.length;
        let respondedSource = appsSource.filter(function (app) { return app.status !== "Applied"; }).length;
        let ratePercent = totalSource === 0 ? 0 : Math.round((respondedSource / totalSource) * 100);
        let rateText = ratePercent + "%";
        let sourceKey = thisSource.replace(/\s/g, "").toLowerCase();
        let barColor = colorArray[sourceKey] || "var(--accent)";
        barsHtml += `
            <div class="hbc-row">
                <span class="hbc-label">${thisSource}</span>
                <div class="hbc-track">
                    <div class="hbc-fill" style="width:${rateText};background:${barColor}"></div>
                </div>
                <span class="hbc-pct">${rateText}</span>
            </div>
        `;
    }
    if (barsHtml === "") barsHtml = `<div style="color:var(--text-muted);font-size:13px;padding:20px 0">No data for this period.</div>`;
    document.querySelector(".h-bar-chart").innerHTML = barsHtml;

    let statusList = [
        { name: "Applied",   color: "#2563eb" },
        { name: "Interview", color: "#f59e0b" },
        { name: "Offer",     color: "#22c55e" },
        { name: "Rejected",  color: "#ef4444" }
    ];

    let donutRadius = 60;
    let circumference = 2 * Math.PI * donutRadius;
    let cumulativeOffset = 0;
    let donutCirclesHtml = `<circle cx="80" cy="80" r="${donutRadius}" fill="none" stroke="var(--bg-primary)" stroke-width="20"/>`;
    let legendHtml = "";

    for (let statusInfo of statusList) {
        let countForStatus = applications.filter(function (app) { return app.status === statusInfo.name; }).length;
        let statusPercent = totalCount === 0 ? 0 : Math.round((countForStatus / totalCount) * 100);
        let segmentLength = (statusPercent / 100) * circumference;
        donutCirclesHtml += `
            <circle cx="80" cy="80" r="${donutRadius}" fill="none" stroke="${statusInfo.color}" stroke-width="20"
                stroke-dasharray="${segmentLength} ${circumference}" stroke-dashoffset="${-cumulativeOffset}" transform="rotate(-90 80 80)"/>
        `;
        legendHtml += `
            <div class="dl-item"><span class="dl-dot" style="background:${statusInfo.color}"></span>${statusInfo.name} <strong>${statusPercent}%</strong></div>
        `;
        cumulativeOffset += segmentLength;
    }

    document.querySelector(".donut-wrap").innerHTML = `
        <svg viewBox="0 0 160 160" class="donut-svg">
            ${donutCirclesHtml}
            <text x="80" y="76" text-anchor="middle" fill="var(--text-primary)" font-size="18" font-weight="700" font-family="Inter">${totalCount}</text>
            <text x="80" y="92" text-anchor="middle" fill="var(--text-muted)" font-size="9" font-family="Inter">Total</text>
        </svg>
        <div class="donut-legend">${legendHtml}</div>
    `;

    let today = new Date();
    today.setHours(0, 0, 0, 0);
    let numDays = 30;
    let dayDates = [];
    let dayCounts = [];

    for (let i = numDays - 1; i >= 0; i--) {
        let day = new Date(today);
        day.setDate(today.getDate() - i);
        let yr = day.getFullYear();
        let mo = String(day.getMonth() + 1).padStart(2, "0");
        let dt = String(day.getDate()).padStart(2, "0");
        let dayString = yr + "-" + mo + "-" + dt;
        let countForDay = applications.filter(function (app) { return app.dateApplied === dayString; }).length;
        dayDates.push(day);
        dayCounts.push(countForDay);
    }

    let maxCount = Math.max.apply(null, dayCounts);
    if (maxCount === 0) maxCount = 1;

    let chartWidth = 700;
    let chartHeight = 140;
    let stepX = chartWidth / (numDays - 1);

    let points = dayCounts.map(function (count, index) {
        let x = index * stepX;
        let y = chartHeight - (count / maxCount) * chartHeight;
        return { x: x, y: y };
    });

    let linePathD = points.map(function (point, index) {
        return (index === 0 ? "M" : "L") + point.x + "," + point.y;
    }).join(" ");
    let areaPathD = linePathD + ` L${chartWidth},${chartHeight} L0,${chartHeight} Z`;

    function fmtShort(dateObj) {
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        return months[dateObj.getMonth()] + " " + dateObj.getDate();
    }

    document.querySelector(".lc-inner").innerHTML = `
        <svg viewBox="0 0 ${chartWidth} ${chartHeight}" preserveAspectRatio="none" class="lc-svg">
            <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="rgba(79,142,247,0.3)"/>
                    <stop offset="100%" stop-color="rgba(79,142,247,0)"/>
                </linearGradient>
            </defs>
            <path d="${areaPathD}" fill="url(#lineGrad)" />
            <path d="${linePathD}" fill="none" stroke="#2563eb" stroke-width="2" />
        </svg>
        <div class="lc-x-labels">
            <span>${fmtShort(dayDates[0])}</span>
            <span>${fmtShort(dayDates[Math.round((numDays-1)*0.25)])}</span>
            <span>${fmtShort(dayDates[Math.round((numDays-1)*0.5)])}</span>
            <span>${fmtShort(dayDates[Math.round((numDays-1)*0.75)])}</span>
            <span>${fmtShort(dayDates[numDays-1])}</span>
        </div>
    `;

    document.querySelector(".lc-y-labels").innerHTML = `
        <span>${maxCount}</span>
        <span>${Math.round(maxCount * 0.75)}</span>
        <span>${Math.round(maxCount * 0.5)}</span>
        <span>${Math.round(maxCount * 0.25)}</span>
        <span>0</span>
    `;

    let roleSuccessEl = document.querySelector("#roleSuccessList");
    if (roleSuccessEl) {
        let roleCounts = {};
        let roleSuccess = {};
        for (let app of applications) {
            let role = app.role || "Other";
            roleCounts[role] = (roleCounts[role] || 0) + 1;
            if (app.status === "Offer" || app.status === "Interview") {
                roleSuccess[role] = (roleSuccess[role] || 0) + 1;
            }
        }
        let roleEntries = Object.entries(roleCounts).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 5);
        let rHtml = "";
        for (let entry of roleEntries) {
            let r = entry[0];
            let total = entry[1];
            let success = roleSuccess[r] || 0;
            let pct = total === 0 ? 0 : Math.round((success / total) * 100);
            rHtml += `
                <div>
                    <div class="rs-role">${escapeHtml(r)}</div>
                    <div class="rs-bar-wrap">
                        <div class="rs-bar" style="width:${pct}%">${pct > 10 ? pct + "%" : ""}</div>
                    </div>
                </div>
            `;
        }
        if (rHtml === "") rHtml = `<div style="color:var(--text-muted);font-size:13px;padding:10px 0">No data yet.</div>`;
        roleSuccessEl.innerHTML = rHtml;
    }
    let rejectionListEl = document.querySelector("#rejectionList");
    if (rejectionListEl) {
        let rejectedApps = applications.filter(function (app) { return app.status === "Rejected"; });
        let reasonCounts = {};
        for (let app of rejectedApps) {
            if (app.rejectionReason) {
                reasonCounts[app.rejectionReason] = (reasonCounts[app.rejectionReason] || 0) + 1;
            }
        }
        let entries = Object.entries(reasonCounts).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 5);

        if (entries.length === 0) {
            rejectionListEl.innerHTML = rejectedApps.length === 0
                ? `<div style="color:var(--text-muted);font-size:13px;padding:10px 0">No rejections in this period.</div>`
                : `<div style="color:var(--text-muted);font-size:13px;padding:10px 0">No rejection reasons logged yet — add one next time you mark an application Rejected.</div>`;
        } else {
            rejectionListEl.innerHTML = entries.map(function (entry, i) {
                let reason = entry[0];
                let count = entry[1];
                return `
                    <div class="rj-item">
                        <div class="rj-rank">${i + 1}</div>
                        <div class="rj-info"><strong>${escapeHtml(reason)}</strong></div>
                        <span class="rj-count">${count} time${count === 1 ? "" : "s"}</span>
                    </div>
                `;
            }).join("");
        }
    }
}

function renderAiSummaryGrid(insightsData) {
    let el = document.querySelector("#aiSummaryGrid");
    if (!el) return;

    if (!insightsData) {
        el.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:10px 0;grid-column:1/-1;">No AI summary yet — click "Regenerate" to analyze your applications.</div>`;
        return;
    }

    function bold(text) {
        return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    }

    function listItems(arr) {
        return (arr || []).map(function (t) { return `<li>${bold(t)}</li>`; }).join("");
    }

    el.innerHTML = `
        <div class="ais-block strength">
            <div class="ais-header"><span class="ais-icon">💪</span> Strengths</div>
            <ul>${listItems(insightsData.strengths)}</ul>
        </div>
        <div class="ais-block weakness">
            <div class="ais-header"><span class="ais-icon">⚠</span> Gaps to Address</div>
            <ul>${listItems(insightsData.gaps)}</ul>
        </div>
        <div class="ais-block action">
            <div class="ais-header"><span class="ais-icon">🎯</span> Recommended Actions</div>
            <ul>${listItems(insightsData.actions)}</ul>
        </div>
    `;
}

async function loadAiSummary() {
    if (!isLoggedIn()) {
        renderAiSummaryGrid(null);
        return;
    }
    let res = await fetch(API_BASE + "/applications/insights", {
        credentials: "include"
    });
    if (!res.ok) {
        renderAiSummaryGrid(null);
        return;
    }
    let data = await res.json();
    renderAiSummaryGrid(data.insights);
}

let generateInsightsBtn = document.querySelector("#generateInsightsBtn");
if (generateInsightsBtn) {
    generateInsightsBtn.addEventListener("click", async function () {
        if (!isLoggedIn()) {
            showToast("Sign In to generate AI insights.", "error");
            return;
        }
        setButtonLoading(generateInsightsBtn, true);
        try {
            let res = await fetch(API_BASE + "/applications/insights/generate", {
                method: "POST",
                credentials: "include"
            });
            if (!res.ok) {
                let err = await res.json().catch(function () { return {}; });
                showToast(err.detail || "Failed to generate insights.", "error");
            } else {
                let data = await res.json();
                renderAiSummaryGrid(data);
            }
        } catch (e) {
            showToast("Failed to generate insights — check your connection.", "error");
        }
        setButtonLoading(generateInsightsBtn, false);
        generateInsightsBtn.textContent = "Regenerate";
    });
}


let currentFilterDays = 30;

(async function() {
    if (isLoggedIn()) {
        allApplications = await loadApplications();
    } else {
        allApplications = [];
    }

    renderAnalytics(getFilteredByDays(currentFilterDays));
    loadAiSummary();
    hidePageSkeleton();
    let timeFilter = document.querySelector("#timeFilter");
    if (timeFilter) {
        timeFilter.addEventListener("change", function (e) {
            currentFilterDays = getDaysFromFilter(e.target.value);
            renderAnalytics(getFilteredByDays(currentFilterDays));
        });
    }
})();