if (!isLoggedIn()) {
    window.location.href = "applications.html";
}
let params = new URLSearchParams(window.location.search);
let editId = params.get("id");

let tags = [];
let resumeFileName = "";

let applications;
let editingApp = null;

(async function () {
    applications = await loadApplications();

    if(editId){
        editingApp = applications.find(function(app) {
            return app.id === parseInt(editId);
        })
        console.log(editingApp);
    }

    if(editingApp !== null){
        document.querySelector("#company").value = editingApp.company;
        document.querySelector("#prevLogo").textContent = editingApp.company[0].toUpperCase();
        document.querySelector("#prevCompany").textContent = editingApp.company;
        document.querySelector("#role").value = editingApp.role;
        document.querySelector("#prevRole").textContent = editingApp.role;
        document.querySelector("#location").value = editingApp.location;
        document.querySelector("#prevLoc").textContent = editingApp.location;
        document.querySelector("#jobType").value = editingApp.jobType;
        document.querySelector("#prevType").textContent = editingApp.jobType;
        let salaryParts = editingApp.salary.split("-");
        let minValue = parseInt(salaryParts[0],10) ? parseInt(salaryParts[0],10)*1000 : parseInt(salaryParts[0],10);
        let maxValue = parseInt(salaryParts[1],10) ? parseInt(salaryParts[1],10)*1000 : parseInt(salaryParts[1],10);
        document.querySelector("#salaryMin").value = minValue;
        document.querySelector("#salaryMax").value = maxValue;
        document.querySelector("#dateApplied").value = editingApp.dateApplied;
        document.querySelector("#prevDate").textContent = editingApp.dateApplied;
        document.querySelector("#status").value = editingApp.status.toLowerCase();
        document.querySelector("#prevStatus").textContent = editingApp.status;
        document.querySelector("#prevStatus").className = "badge badge-" + editingApp.status.toLowerCase();
        if (editingApp.rejectionReason) {
            let knownReasons = ["Skills mismatch", "Experience gap", "No cover letter", "Applied too late / Position filled", "Overqualified / Salary mismatch", "No response / Ghosted", "Culture fit", "Position cancelled"];
            if (knownReasons.includes(editingApp.rejectionReason)) {
                document.querySelector("#rejectionReason").value = editingApp.rejectionReason;
            } else {
                document.querySelector("#rejectionReason").value = "Other";
                document.querySelector("#rejectionReasonOther").style.display = "block";
                document.querySelector("#rejectionReasonOther").value = editingApp.rejectionReason;
            }
        }
        updateRejectionReasonVisibility(document.querySelector("#status").value);
        if (KNOWN_SOURCES.includes(editingApp.source)) {
            document.querySelector("#source").value = editingApp.source;
        } else {
            document.querySelector("#source").value = "Other";
            document.querySelector("#sourceOther").style.display = "block";
            document.querySelector("#sourceOther").value = editingApp.source;
        }
        document.querySelector("#prevSource").textContent = getDisplaySource(editingApp.source);


        document.querySelector("#contact").value = editingApp.contact || "";
        document.querySelector("#contactEmail").value = editingApp.contactEmail || "";
        document.querySelector("#notes").value = editingApp.notes || "";
        document.querySelector("#coverLetter").value = editingApp.coverLetter || "";
        document.querySelector("#interviewDate").value = editingApp.interviewDate ? editingApp.interviewDate.slice(0, 10) : "";
        document.querySelector("#followUp").value = editingApp.followUpDate ? editingApp.followUpDate.slice(0, 10) : "";

        if (editingApp.tags) {
            tags = editingApp.tags.split(",").concat(tags);
            renderTags();
        }

        if (editingApp.resumeFileName) {
            resumeFileName = editingApp.resumeFileName;
            let fileInfoEl = document.querySelector("#fileInfo");
            fileInfoEl.textContent = resumeFileName;
            fileInfoEl.style.display = "block";
        }
    }
    renderTags();
})();

let form = document.querySelector("form");

form.addEventListener("submit", async function(e){
    e.preventDefault();
    console.log("Form Submitted");

    let rawStatus = document.querySelector("#status").value;
    let newStatus = rawStatus[0].toUpperCase() + rawStatus.slice(1);

    let formData = {
        company: document.querySelector("#company").value,
        role: document.querySelector("#role").value,
        location: document.querySelector("#location").value,
        dateApplied: document.querySelector("#dateApplied").value,
        source: (function() {
            let selected = document.querySelector("#source").value;
            return selected === "Other" ? document.querySelector("#sourceOther").value.trim() : selected;
        })(),
        status: newStatus,
        jobType: document.querySelector("#jobType").value,
        salary: (function() {
            let min = formatSalary(document.querySelector("#salaryMin").value);
            let max = formatSalary(document.querySelector("#salaryMax").value);
            if (!min && !max) return "";
            return min + "-" + max;
        })(),
        contact: document.querySelector("#contact").value,
        contactEmail: document.querySelector("#contactEmail").value,
        notes: document.querySelector("#notes").value,
        coverLetter: document.querySelector("#coverLetter").value,
        interviewDate: document.querySelector("#interviewDate").value,
        followUp: document.querySelector("#followUp").value,
        tags: tags.join(","),
        resumeFileName: resumeFileName,
        rejectionReason: (function() {
            let statusVal = document.querySelector("#status").value;
            if (statusVal !== "rejected") return "";
            let selected = document.querySelector("#rejectionReason").value;
            return selected === "Other" ? document.querySelector("#rejectionReasonOther").value.trim() : selected;
        })()
    };
    let submitBtn = form.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true);
    try {
        if(editingApp){
            await fetch(API_BASE + "/applications/" + editingApp.id, {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData)
            });
        }else {
            await fetch(API_BASE + "/applications", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData)
            });
        }
        window.location.href = "applications.html";
    } catch (err) {
        console.error("Save application failed:", err);
        showToast("Couldn't save the application. Check your connection and try again.", "error");
        setButtonLoading(submitBtn, false);
    }
});
function formatSalary(amount) {
    let amount1 = parseInt(amount, 10);
    if (isNaN(amount1)) {
        return "";
    }
    if (amount1 < 1000) {
        return amount1 + "";
    }else if(amount1 < 100000) {
        return amount1 / 1000 + "K";
    }else if(amount1 < 10000000) {
        return amount1 / 1000 + "L";
    }
    return amount1 / 1000 + "Cr";
}
document.querySelector("#company").addEventListener("input", function (e) {
    let val = e.target.value;
    let display = val.length > 0 ? val[0].toUpperCase() + val.slice(1) : "";
    document.querySelector("#prevCompany").textContent = display || "Company Name";
    document.querySelector("#prevLogo").textContent = val.length > 0 ? val[0].toUpperCase() : "?";
});
document.querySelector("#role").addEventListener("input",function(e) {
    document.querySelector("#prevRole").textContent = e.target.value || "Job Title";
});
document.querySelector("#location").addEventListener("input", function(e) {
    document.querySelector("#prevLoc").textContent = e.target.value || "—"
});
document.querySelector("#jobType").addEventListener("change", function(e) {
    document.querySelector("#prevType").textContent = e.target.value;
});
document.querySelector("#dateApplied").addEventListener("input", function(e) {
    document.querySelector("#prevDate").textContent = e.target.value || "—";
});
document.querySelector("#status").addEventListener("change", function (e) {
    let val = e.target.value;
    let displayStatus = val.charAt(0).toUpperCase() + val.slice(1);
    let badgeEl = document.querySelector("#prevStatus");
    badgeEl.textContent = displayStatus;
    badgeEl.className = "badge badge-" + val.toLowerCase();
    updateRejectionReasonVisibility(val);
});
function updateRejectionReasonVisibility(statusVal) {
    let group = document.querySelector("#rejectionReasonGroup");
    if (!group) return;
    group.style.display = statusVal === "rejected" ? "block" : "none";
}
document.querySelector("#source").addEventListener("change", function(e) {
    let sourceOtherInput = document.querySelector("#sourceOther");
    if (e.target.value === "Other") {
        sourceOtherInput.style.display = "block";
    } else {
        sourceOtherInput.style.display = "none";
        sourceOtherInput.value = "";
    }
    document.querySelector("#prevSource").textContent = getDisplaySource(e.target.value);
});
document.querySelector("#rejectionReason").addEventListener("change", function(e) {
    let otherInput = document.querySelector("#rejectionReasonOther");
    if (e.target.value === "Other") {
        otherInput.style.display = "block";
    } else {
        otherInput.style.display = "none";
        otherInput.value = "";
    }
});
document.querySelector("#tagInput").addEventListener("keydown", function(e) {
    if(e.key === "Enter") {
        e.preventDefault();
        if(e.target.value !== "") {
            tags.push(e.target.value);
            e.target.value = "";
        }
    }
    console.log(tags);
    renderTags();
});

function renderTags() {
    let rowsHTML = "";
    for (let i = 0; i < tags.length; i++) {
        rowsHTML += `
            <span style="background: var(--accent); padding:4px 10px; border-radius:12px; margin:3px; display:inline-block;">
                ${escapeHtml(tags[i])}
                <span data-index="${i}" style="cursor:pointer; margin-left:6px;">×</span>
            </span>
        `;
    }
    document.querySelector("#tagsList").innerHTML = rowsHTML;

    document.querySelectorAll("#tagsList [data-index]").forEach(function (el) {
        el.addEventListener("click", function () {
            let i = parseInt(el.dataset.index);
            tags = tags.filter(function(tags,index) {
                return index !== i;
            })
            renderTags();
        });
    });
}

document.querySelector("#resumeDrop").addEventListener("click", function() {
    document.querySelector("#resumeFile").click();
});
document.querySelector("#resumeFile").addEventListener("change", function(e) {
    let filesInput = e.target.files[0];
    let fileInfoEl = document.querySelector("#fileInfo");
    fileInfoEl.textContent = filesInput.name ;
    fileInfoEl.style.display = "block";
    resumeFileName = filesInput.name;
});