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

// ✨ Voice Recording Elements
const recordBtn = document.getElementById("record-btn");
const audioPreviewArea = document.getElementById("audioPreviewArea");
const audioPreview = document.getElementById("audioPreview");
const sendAudioBtn = document.getElementById("sendAudioBtn");
const cancelAudioBtn = document.getElementById("cancelAudioBtn");

let currentCode = null;
let mediaRecorder;
let audioChunks = [];
let recordedAudioBase64 = null;
let recordingTimer = null;

enterBtn.addEventListener("click", joinCode);

codeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        joinCode();
    }
});

codeInput.addEventListener("input", () => {
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
    // Check if the message came from this client or another
    addMessage(message, false);
});

function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentCode) {
        return;
    }
    socket.emit("sendMessage", {
        code: currentCode,
        text: text,
        audio: null
    });
    messageInput.value = "";
}

sendBtn.addEventListener("click", sendMessage);

messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        sendMessage();
    }
});

// ✨ Voice Recording Logic with 1-Min Auto Cut & Preview
let isRecording = false;

recordBtn.addEventListener("click", async () => {
    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    recordedAudioBase64 = reader.result;
                    audioPreview.src = recordedAudioBase64;
                    audioPreviewArea.classList.remove("hidden"); // Show preview box
                };
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            isRecording = true;
            recordBtn.classList.add("recording-blink");
            recordBtn.textContent = "🛑";

            // ⏱️ 1-Minute (60,000 ms) Auto Cutoff Timer
            recordingTimer = setTimeout(() => {
                if (isRecording) {
                    stopRecording();
                }
            }, 60000);

        } catch (err) {
            alert("Microphone permission required! 🎤");
        }
    } else {
        stopRecording();
    }
});

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        recordBtn.classList.remove("recording-blink");
        recordBtn.textContent = "🎤";
        clearTimeout(recordingTimer);
    }
}

// Send Audio Button
sendAudioBtn.addEventListener("click", () => {
    if (recordedAudioBase64 && currentCode) {
        socket.emit("sendMessage", {
            code: currentCode,
            text: "",
            audio: recordedAudioBase64
        });
        resetAudioPreview();
    }
});

// Cancel Audio Button
cancelAudioBtn.addEventListener("click", () => {
    resetAudioPreview();
});

function resetAudioPreview() {
    recordedAudioBase64 = null;
    audioPreview.src = "";
    audioPreviewArea.classList.add("hidden");
}

function addMessage(message, mine) {
    const div = document.createElement("div");
    div.className = "message";
    
    if (mine) {
        div.classList.add("mine");
    }
    
    // ✨ Handle Text or Audio Message display
    if (message.text) {
        const textP = document.createElement("p");
        textP.textContent = message.text;
        div.appendChild(textP);
    }

    if (message.audio) {
        const audioElement = document.createElement("audio");
        audioElement.src = message.audio;
        audioElement.controls = true;
        audioElement.className = "chat-audio";
        div.appendChild(audioElement);
    }

    div.dataset.id = message.id;

    // ✨ Animation - Initial state for smooth fade-in
    div.style.opacity = "0";
    div.style.transform = "translateY(15px)";
    div.style.transition = "all 0.4s ease";

    // Since we removed 'mine' check for click (both can tap to delete/seen)
    div.addEventListener("click", () => {
        socket.emit("messageSeen", {
            code: currentCode,
            messageId: message.id
        });
    });
        
    const hint = document.createElement("span");
    hint.className = "messageHint";
    hint.textContent = "Tap to delete";
    div.appendChild(hint);

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
        message.style.opacity = "0";
        message.style.transform = "scale(0.9)";
        
        setTimeout(() => {
            message.remove();
        }, 300);
    }
});

function openChat() {
    document.getElementById("mainContainer").classList.add("hidden");
    chat.classList.remove("hidden");
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
    currentCode = null;
    resetAudioPreview();
});

window.addEventListener("beforeunload", () => {
    socket.disconnect();
});
