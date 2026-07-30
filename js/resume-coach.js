let currentResumeId = null;
let currentChatId = null;
let previewLoadedForResume = null;

function requireLogin() {
    if (!isLoggedIn()) {
        showToast("Sign In to use Resume Coach.", "error");
        return false;
    }
    return true;
}

function formatMessage(text) {
    return escapeHtml(text).replace(/\n/g, "<br>");
}

async function loadResumesList() {
    let res = await fetch(API_BASE + "/resumes", { credentials: "include" });
    if (!res.ok) return [];
    return await res.json();
}

function renderChatMessages(messages) {
    let el = document.querySelector("#chatMessages");
    if (!el) return;

    if (messages.length === 0) {
        el.innerHTML = `
            <div class="coach-empty">Ask me anything about this resume — improving bullet points, tailoring it to a role, ATS formatting, whatever you need.</div>
            <div class="starter-chips">
                <button class="starter-chip">How can I improve this resume?</button>
                <button class="starter-chip">Am I missing any key skills?</button>
                <button class="starter-chip">Make my summary more impactful</button>
                <button class="starter-chip">Is this resume ATS-friendly?</button>
            </div>
        `;
        el.querySelectorAll(".starter-chip").forEach(function (chip) {
            chip.addEventListener("click", function () {
                sendMessage(chip.textContent);
            });
        });
        return;
    }

    el.innerHTML = messages.map(function (m) {
        return `<div class="chat-bubble ${m.role}">${formatMessage(m.message)}</div>`;
    }).join("");
    el.scrollTop = el.scrollHeight;
}

async function selectChat(chatId) {
    currentChatId = chatId;
    document.querySelectorAll(".chat-list-item").forEach(function (item) {
        item.classList.toggle("active", Number(item.dataset.id) === chatId);
    });

    let el = document.querySelector("#chatMessages");
    if (el) el.innerHTML = `<div class="coach-empty">Loading…</div>`;

    let res = await fetch(API_BASE + "/resume-chats/" + chatId + "/messages", { credentials: "include" });
    if (!res.ok) {
        if (el) el.innerHTML = `<div class="coach-empty">Couldn't load this chat.</div>`;
        return;
    }
    let messages = await res.json();
    renderChatMessages(messages);
}

function renderChatList(chats) {
    let listEl = document.querySelector("#chatList");
    if (!listEl) return;

    if (chats.length === 0) {
        listEl.innerHTML = `<div class="chat-list-empty">No chats yet. Start a new one.</div>`;
        return;
    }

    listEl.innerHTML = chats.map(function (c) {
        return `
            <div class="chat-list-item${c.id === currentChatId ? " active" : ""}" data-id="${c.id}">
                <span class="cli-title">${escapeHtml(c.title)}</span>
                <button class="cli-delete" data-id="${c.id}" data-tooltip="Delete">🗑</button>
            </div>
        `;
    }).join("");

    listEl.querySelectorAll(".chat-list-item").forEach(function (item) {
        item.addEventListener("click", function (e) {
            if (e.target.closest(".cli-delete")) return;
            selectChat(Number(item.dataset.id));
        });
    });

    listEl.querySelectorAll(".cli-delete").forEach(function (btn) {
        btn.addEventListener("click", async function (e) {
            e.stopPropagation();
            let confirmed = await showConfirm("Delete this chat? This cannot be undone.");
            if (!confirmed) return;
            let chatId = Number(btn.dataset.id);
            await fetch(API_BASE + "/resume-chats/" + chatId, { method: "DELETE", credentials: "include" });
            await loadChats(chatId === currentChatId);
        });
    });
}

async function loadChats(selectFirstIfCurrentGone) {
    let res = await fetch(API_BASE + "/resumes/" + currentResumeId + "/chats", { credentials: "include" });
    let chats = res.ok ? await res.json() : [];

    let stillExists = chats.some(function (c) { return c.id === currentChatId; });
    if (!currentChatId || (selectFirstIfCurrentGone && !stillExists)) {
        currentChatId = chats.length > 0 ? chats[0].id : null;
    }

    renderChatList(chats);

    if (currentChatId) {
        await selectChat(currentChatId);
    } else {
        renderChatMessages([]);
    }
}

async function createNewChat() {
    if (!requireLogin()) return;
    let res = await fetch(API_BASE + "/resumes/" + currentResumeId + "/chats", { method: "POST", credentials: "include" });
    if (!res.ok) {
        showToast("Couldn't start a new chat.", "error");
        return;
    }
    let chat = await res.json();
    currentChatId = chat.id;
    await loadChats(false);
}

async function sendMessage(text) {
    text = (text || "").trim();
    if (!text) return;
    if (!requireLogin()) return;

    if (!currentChatId) {
        let res = await fetch(API_BASE + "/resumes/" + currentResumeId + "/chats", { method: "POST", credentials: "include" });
        if (!res.ok) {
            showToast("Couldn't start a new chat.", "error");
            return;
        }
        let chat = await res.json();
        currentChatId = chat.id;
        await loadChats(false);
    }

    let input = document.querySelector("#chatInput");
    let sendBtn = document.querySelector("#chatSendBtn");
    let messagesEl = document.querySelector("#chatMessages");

    if (messagesEl.querySelector(".coach-empty")) messagesEl.innerHTML = "";

    messagesEl.insertAdjacentHTML("beforeend", `<div class="chat-bubble user">${formatMessage(text)}</div>`);
    messagesEl.insertAdjacentHTML("beforeend", `<div class="chat-bubble assistant typing" id="typingBubble">Thinking…</div>`);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    if (input) { input.value = ""; input.style.height = "auto"; }
    setButtonLoading(sendBtn, true);

    try {
        let res = await fetch(API_BASE + "/resume-chats/" + currentChatId + "/messages", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text })
        });

        let typingBubble = document.querySelector("#typingBubble");
        let data = await res.json().catch(function () { return {}; });

        if (!res.ok) {
            if (typingBubble) {
                typingBubble.className = "chat-bubble assistant error";
                typingBubble.textContent = data.detail || "Something went wrong.";
                typingBubble.removeAttribute("id");
            }
        } else {
            if (typingBubble) {
                typingBubble.className = "chat-bubble assistant";
                typingBubble.innerHTML = formatMessage(data.reply);
                typingBubble.removeAttribute("id");
            }
            await loadChats(false);
        }
    } catch (e) {
        let typingBubble = document.querySelector("#typingBubble");
        if (typingBubble) {
            typingBubble.className = "chat-bubble assistant error";
            typingBubble.textContent = "Network error — check your connection.";
        }
    }

    setButtonLoading(sendBtn, false);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function loadPreview() {
    let previewPane = document.querySelector("#previewPane");
    if (!previewPane || previewLoadedForResume === currentResumeId) return;

    previewPane.innerHTML = `<div class="coach-empty">Loading preview…</div>`;
    try {
        let res = await fetch(API_BASE + "/resumes/" + currentResumeId + "/preview", { credentials: "include" });
        let contentType = res.headers.get("content-type") || "";

        if (contentType.includes("application/pdf")) {
            const blob = await res.blob();
            const pdfData = await blob.arrayBuffer();

            previewPane.innerHTML = `
                <canvas id="pdfCanvas"></canvas>
            `;

            const pdf = await pdfjsLib.getDocument({
                data: pdfData
            }).promise;

            const page = await pdf.getPage(1);

            const scale = 1.5;
            const viewport = page.getViewport({ scale });

            const canvas = document.getElementById("pdfCanvas");
            const context = canvas.getContext("2d");

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
        } else {
            let data = await res.json();
            if (!res.ok) {
                previewPane.innerHTML = `<div class="coach-empty">${escapeHtml(data.detail || "Preview not available.")}</div>`;
            } else if (data.type === "txt") {
                previewPane.innerHTML = `<div class="resume-txt-preview">${escapeHtml(data.text)}</div>`;
            } else if (data.type === "docx") {
                previewPane.innerHTML = `<div class="resume-doc-preview">${data.html}</div>`;
            }
        }
        previewLoadedForResume = currentResumeId;
    } catch (e) {
        previewPane.innerHTML = `<div class="coach-empty">Couldn't load preview.</div>`;
    }
}

async function initCoach() {
    let resumes = await loadResumesList();
    let active = resumes.find(function (r) { return r.active; });

    let nameEl = document.querySelector("#activeResumeName");

    if (!active) {
        if (nameEl) nameEl.textContent = "No active resume";
        let el = document.querySelector("#chatMessages");
        if (el) el.innerHTML = `<div class="coach-empty">Upload and set an active resume on the Resume page first.</div>`;
        let listEl = document.querySelector("#chatList");
        if (listEl) listEl.innerHTML = `<div class="chat-list-empty">No active resume.</div>`;
        hidePageSkeleton();
        return;
    }

    currentResumeId = active.id;
    if (nameEl) nameEl.textContent = active.fileName;

    await loadChats(false);
    hidePageSkeleton();
}

let newChatBtn = document.querySelector("#newChatBtn");
if (newChatBtn) {
    newChatBtn.addEventListener("click", createNewChat);
}

let chatSendBtn = document.querySelector("#chatSendBtn");
let chatInputEl = document.querySelector("#chatInput");

if (chatSendBtn && chatInputEl) {
    chatSendBtn.addEventListener("click", function () {
        sendMessage(chatInputEl.value);
    });

    chatInputEl.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage(chatInputEl.value);
        }
    });

    chatInputEl.addEventListener("input", function () {
        chatInputEl.style.height = "auto";
        chatInputEl.style.height = Math.min(chatInputEl.scrollHeight, 100) + "px";
    });
}

document.querySelectorAll(".ptb-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
        document.querySelectorAll(".ptb-btn").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");

        let view = btn.dataset.view;
        document.querySelector("#chatPanelView").style.display = view === "chat" ? "flex" : "none";
        document.querySelector("#previewPanelView").style.display = view === "preview" ? "flex" : "none";

        if (view === "preview") loadPreview();
    });
});

initCoach();