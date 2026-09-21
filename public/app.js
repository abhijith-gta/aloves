const socket = io();

const codeInput = document.getElementById("codeInput");
const enterBtn = document.getElementById("enterBtn");
const codeArea = document.getElementById("codeArea");
const chat = document.getElementById("chat");
const messages = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const status = document.getElementById("status");
const error = document.getElementById("error");
const backBtn = document.getElementById("backBtn");

let currentCode = null;

enterBtn.addEventListener("click", joinCode);

codeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        joinCode();
    }
});

codeInput.addEventListener("input", () => {
    // Only allow numbers
    codeInput.value = codeInput.value.replace(/\D/g, "");
    error.textContent = "";
});

function joinCode() {
    const code = codeInput.value.trim();
    if (!/^\d{4}$/.test(code)) {
        error.textContent = "Please enter exactly 4 digits.";
        return;
    }
    currentCode = code;
    socket.emit("joinCode", code);
}

socket.on("codeError", (message) => {
    error.textContent = message;
});

socket.on("previousMessages", (savedMessages) => {
    messages.innerHTML = "";
    savedMessages.forEach((message) => {
        addMessage(message, false);
    });
    openChat();
});

socket.on("newMessage", (message) => {
    addMessage(message, false);
});

function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentCode) {
        return;
    }
    socket.emit("sendMessage", {
        code: currentCode,
        text: text
    });
    messageInput.value = "";
}

sendBtn.addEventListener("click", sendMessage);

messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        sendMessage();
    }
});

function addMessage(message, mine) {
    const div = document.createElement("div");
    div.className = "message";
    
    if (mine) {
        div.classList.add("mine");
    }
    
    div.textContent = message.text;
    div.dataset.id = message.id;

    // ✨ Animation - Initial state for smooth fade-in
    div.style.opacity = "0";
    div.style.transform = "translateY(15px)";
    div.style.transition = "all 0.4s ease";

    if (!mine) {
        div.addEventListener("click", () => {
            socket.emit("messageSeen", {
                code: currentCode,
                messageId: message.id
            });
        });
        
        const hint = document.createElement("span");
        hint.className = "messageHint";
        hint.textContent = "Tap to mark as seen";
        div.appendChild(hint);
    }

    messages.appendChild(div);

    // ✨ Animation - Trigger fade-in
    setTimeout(() => {
        div.style.opacity = "1";
        div.style.transform = "translateY(0)";
    }, 10);

    messages.scrollTop = messages.scrollHeight;
}

socket.on("messageDeleted", (messageId) => {
    const message = document.querySelector(`[data-id="${messageId}"]`);
    if (message) {
        // ✨ Animation - Smooth fade-out before removing
        message.style.opacity = "0";
        message.style.transform = "scale(0.9)";
        
        setTimeout(() => {
            message.remove();
        }, 300); // Waits for animation to complete
    }
});

function openChat() {
    document.getElementById("mainContainer").classList.add("hidden");
    
    chat.classList.remove("hidden");
    // Little trick to animate chat opening
    chat.style.opacity = "0";
    setTimeout(() => {
        chat.style.transition = "opacity 0.4s ease";
        chat.style.opacity = "1";
    }, 10);
    
    messageInput.focus();
}

backBtn.addEventListener("click", () => {
    chat.classList.add("hidden");
    document.getElementById("mainContainer").classList.remove("hidden");
    
    messageInput.value = "";
    messages.innerHTML = "";
    currentCode = null; // Reset code on back
});

window.addEventListener("beforeunload", () => {
    socket.disconnect();
});