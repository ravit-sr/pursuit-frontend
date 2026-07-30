async function loadApplications() {
    let res = await fetch(API_BASE + "/applications", {
        credentials: "include"
    });
    if (!res.ok) {
        let err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to load applications.");
    }
    let data = await res.json();
    return Array.isArray(data) ? data : [];
}

function getCompanyColor(company) {
    const colors = ["#4285F4", "#8b5cf6", "#635bff", "#ff5a5f", "#e50914", "#f59e0b", "#22c55e", "#ef4444", "#3b82f6", "#ec4899"];
    let index = company.charCodeAt(0) % colors.length;
    return colors[index];
}

function formatDate(dateStr) {
    let d = new Date(dateStr);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return months[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
}