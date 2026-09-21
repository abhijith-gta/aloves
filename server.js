const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

// UptimeRobot Ping Route (To keep the server awake)
app.get('/ping', (req, res) => {
    res.status(200).send("Server is alive 🤍");
});

// RAM Storage (No Database)
const messages = new Map();

function isValidCode(code) {
    return /^\d{4}$/.test(code);
}

io.on("connection", (socket) => {

    socket.on("joinCode", (code) => {
        if (!isValidCode(code)) {
            socket.emit("codeError", "Please enter a valid 4-digit code");
            return;
        }

        socket.join(code);
        socket.code = code;

        const savedMessages = messages.get(code) || [];
        socket.emit("previousMessages", savedMessages);
    });

    socket.on("sendMessage", ({ code, text }) => {
        if (!isValidCode(code)) return;
        if (!text || !text.trim()) return;

        const message = {
            id: Date.now().toString(),
            text: text.trim(),
            createdAt: Date.now()
        };

        if (!messages.has(code)) {
            messages.set(code, []);
        }

        messages.get(code).push(message);

        io.to(code).emit("newMessage", message);
    });

    socket.on("messageSeen", ({ code, messageId }) => {
        if (!isValidCode(code)) return;

        const codeMessages = messages.get(code);
        if (!codeMessages) return;

        const updatedMessages = codeMessages.filter(
            message => message.id !== messageId
        );

        if (updatedMessages.length === 0) {
            messages.delete(code);
        } else {
            messages.set(code, updatedMessages);
        }

        io.to(code).emit("messageDeleted", messageId);
    });

    socket.on("disconnect", () => {
        if (socket.code) {
            socket.leave(socket.code);
        }
    });

});

// Render Port Setup
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} (RAM Storage Mode)`);
});
