(function () {
    var theme = localStorage.getItem("theme") || "system";
    var resolved = theme === "system"
        ? (window.matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light")
        : theme;
    document.documentElement.setAttribute("data-theme", resolved);

    var accent = localStorage.getItem("--accent");
    if (accent) document.documentElement.style.setProperty("--accent", accent);

    var fontSize = localStorage.getItem("pursuit_fontSize");
    if (fontSize) document.documentElement.style.fontSize = fontSize;

    var sidebarCompact = localStorage.getItem("pursuit_sidebarCompact");
    if (sidebarCompact === "true") document.documentElement.setAttribute("data-sidebar-compact", "1");

    document.addEventListener("DOMContentLoaded", function () {
        if (localStorage.getItem("pursuit_noAnimations") === "true" && document.body) {
            document.body.classList.add("no-animations");
        }
        if (localStorage.getItem("pursuit_compactTable") === "true" && document.body) {
            document.body.classList.add("compact-table");
        }
        if (localStorage.getItem("pursuit_statusEmojis") === "false" && document.body) {
            document.body.classList.add("hide-status-dot");
        }
    });
})();
