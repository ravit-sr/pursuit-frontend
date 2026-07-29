let applications;
let currentStatus = "All";
let currentSource = "";
let currentSort = "Newest";
let searchTerm = "";
let currentPage = 1;
const PAGE_SIZE = 6;

function getFilteredApplications() {
    let result = applications.slice();
    if(currentStatus !== "All"){
        result = result.filter(function(app){
            return app.status === currentStatus;
        })
    }
    if(currentSource !== ""){
        result = result.filter(function(app){
            return getDisplaySource(app.source) === currentSource;
        })
    }
    if(searchTerm !== ""){
        let term = searchTerm.toLowerCase();
        result = result.filter(function(app){
            return app.company.toLowerCase().includes(term) || app.source.toLowerCase().includes(term);
        })
    }
    if(currentSort === "Newest"){
        result.sort(function(a, b){
            return new Date(b.dateApplied) - new Date(a.dateApplied) ;
        })
    }else if(currentSort === "Oldest"){
        result.sort(function(a, b){
            return new Date(a.dateApplied) - new Date(b.dateApplied);
        })
    }else if(currentSort === "az"){
        result.sort(function(a, b){
            return a.company.localeCompare(b.company);
        })
    }

    return result;
}

function renderStatCards() {
    let total = applications.length;
    let inProgress = applications.filter(function (a) {
        return a.status === "Applied" || a.status === "Interview";
    }).length;
    let offers = applications.filter(function (a) {
        return a.status === "Offer";
    }).length;
    let rejected = applications.filter(function (a) {
        return a.status === "Rejected";
    }).length;

    if(isLoggedIn()) {
        document.querySelector(".sc-total .sc-num").textContent = total;
        document.querySelector(".sc-progress .sc-num").textContent = inProgress;
        document.querySelector(".sc-offers .sc-num").textContent = offers;
        document.querySelector(".sc-rejected .sc-num").textContent = rejected;
    }else {
        document.querySelector(".sc-total .sc-num").textContent = 0;
        document.querySelector(".sc-progress .sc-num").textContent = 0;
        document.querySelector(".sc-offers .sc-num").textContent = 0;
        document.querySelector(".sc-rejected .sc-num").textContent = 0;
    }
}

function renderTabCounts() {
    let counts = {All: applications.length, Applied: 0, Interview: 0, Offer: 0, Rejected: 0};
    for(let app of applications){
        counts[app.status] = (counts[app.status] || 0) + 1 ;
    }
    document.querySelectorAll(".filter-tab").forEach(function(tab){
        if(isLoggedIn()) {
            let status = tab.dataset.status;
            let countSpan = tab.querySelector(".tab-count");
            countSpan.textContent = counts[status] || 0;
        }else {
            let countSpan = tab.querySelector(".tab-count");
            countSpan.textContent = 0;
        }
    })
}
function renderTable() {
    let filtered = getFilteredApplications();
    let totalItems = filtered.length;
    let totalPages = Math.max(1,Math.ceil(totalItems/PAGE_SIZE));

    if(currentPage > totalPages) currentPage = totalPages;

    let startIndex = (currentPage - 1)*PAGE_SIZE;
    let pageItems = filtered.slice(startIndex, startIndex + PAGE_SIZE);

    let rowsHtml = "";
    if(isLoggedIn()) {
        for (let app of pageItems) {
            let initial = app.company[0].toUpperCase();
            let color = getCompanyColor(app.company);
            let dateDisplay = formatDate(app.dateApplied);
            let badgeClass = "badge-" + app.status.toLowerCase();

            rowsHtml += `
                <tr>
                    <td><div class="company-cell"><div class="cl" style="background:${color}">${escapeHtml(initial)}</div>${escapeHtml(app.company)}</div></td>
                    <td>${escapeHtml(app.role)}</td>
                    <td>${escapeHtml(app.location)}</td>
                    <td>${dateDisplay}</td>
                    <td><span class="source-tag">${escapeHtml(getDisplaySource(app.source))}</span></td>
                    <td><span class="badge ${badgeClass}">${escapeHtml(app.status)}</span></td>
                    <td>${app.salary && !app.salary.includes("NaN") ? escapeHtml(app.salary) : "No Salary"}</td>
                    <td>
                        <div class="row-actions">
                            <a href="add_application.html?id=${app.id}" class="act-btn">✏</a>
                            <button class="act-btn danger" data-id="${app.id}">🗑</button>
                        </div>
                    </td>
                </tr>
            `;
        }
        if(pageItems.length === 0){
            rowsHtml = `
                <tr>
                    <td colspan="8" style="text-align:center; padding:30px; color:var(--text-muted)">
                        No applications match your filters.
                    </td>
                </tr>
            `;
        }
    } else {
        rowsHtml = `
                <tr>
                    <td colspan="8" style="text-align:center; padding:30px; color:var(--text-muted)">
                        <a href="signin.html" style="text-decoration: none; color: var(--accent); font-weight:bold; ">Sign In </a> to see your Applications.
                    </td>
                </tr>
            `;
    }
    document.querySelector("#appsTableBody").innerHTML = rowsHtml;

    let startDisplay = totalItems === 0 ? 0 : startIndex + 1;
    let endDisplay = Math.min(startIndex + PAGE_SIZE, totalItems);
    document.querySelector("#pgInfo").textContent =
        "Showing " + startDisplay + " \u2013 " + endDisplay + " of " + totalItems + " applications";
    renderPaginationButtons(totalPages);
    attachDeleteHandlers();
}

function renderPaginationButtons(totalPages) {
    let controls = document.querySelector("#pgControls");

    let html = '<button class="pg-btn" id="prevBtn"' + (currentPage === 1 ? " disabled" : "") + '>\u2039 Prev</button>';
    for (let i = 1; i <= totalPages; i++) {
        html += '<button class="pg-btn' + (i === currentPage ? " active" : "") + '" data-page="' + i + '">' + i + '</button>';
    }
    html += '<button class="pg-btn" id="nextBtn"' + (currentPage === totalPages ? " disabled" : "") + '>Next \u203a</button>';

    controls.innerHTML = html;

    document.querySelector("#prevBtn").addEventListener("click",function() {
        if(currentPage > 1) {
            currentPage-- ;
            renderTable();
        }
    });
    document.querySelector("#nextBtn").addEventListener("click", function () {
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });
    controls.querySelectorAll("[data-page]").forEach(function(btn) {
        btn.addEventListener("click",function() {
            currentPage = parseInt(btn.dataset.page);
            renderTable();
        })
    });
}

function attachDeleteHandlers() {
    document.querySelectorAll("#appsTableBody .act-btn.danger").forEach(function (btn) {
        btn.addEventListener("click", async function () {
            let id = parseInt(btn.dataset.id);
            let confirmed = await showConfirm("Delete this application? This cannot be undone.");
            if (confirmed) {
                setButtonLoading(btn, true);
                await fetch(API_BASE + "/applications/" + id, {
                    method: "DELETE",
                    credentials: "include"
                });
                applications = applications.filter(function (app) {
                    return app.id !== id;
                });
                renderStatCards();
                renderTabCounts();
                renderTable();
            }
        });
    });
}

document.querySelectorAll(".filter-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
        document.querySelectorAll(".filter-tab").forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        currentStatus = tab.dataset.status;
        currentPage = 1;
        renderTable();
    });
});

document.querySelector("#sourceFilter").addEventListener("change", function (e) {
    currentSource = e.target.value;
    currentPage = 1;
    renderTable();
});

document.querySelector("#sortFilter").addEventListener("change", function (e) {
    currentSort = e.target.value;
    currentPage = 1;
    renderTable();
});

document.querySelector("#searchInput").addEventListener("input", function (e) {
    searchTerm = e.target.value;
    currentPage = 1;
    renderTable();
});

(async function () {
    if(isLoggedIn()) {
        applications = await loadApplications();
    }else {
        applications = [];
    }
    renderStatCards();
    renderTabCounts();
    renderTable();
    hidePageSkeleton();
})();