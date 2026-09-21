const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// ✨ MongoDB Atlas Connection with Password added! (Note the %40 instead of @)
const mongoURI = "mongodb+srv://ajhacker:ajhacker%402006@adsparkdb.ug1d1z2.mongodb.net/secretchat?appName=AdSparkDB";

mongoose.connect(mongoURI)
.then(() => {
    console.log("✅ MongoDB Atlas Connected successfully");
}).catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
});

// ✨ MongoDB Schema for Messages
const messageSchema = new mongoose.Schema({
    code: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model("Message", messageSchema);

function isValidCode(code) {
    return /^\d{4}$/.test(code);
}

io.on("connection", (socket) => {

    socket.on("joinCode", async (code) => {
        if (!isValidCode(code)) {
            socket.emit("codeError", "Please enter a valid 4-digit code");
            return;
        }

        socket.join(code);
        socket.code = code;

        try {
            // ✨ Fetch messages from MongoDB
            const savedMessages = await Message.find({ code }).sort({ createdAt: 1 });
            
            // Format to match frontend
            const formattedMessages = savedMessages.map(msg => ({
                id: msg._id.toString(),
                text: msg.text,
                createdAt: msg.createdAt
            }));

            socket.emit("previousMessages", formattedMessages);
        } catch (error) {
            console.error("Error fetching messages:", error);
        }
    });

    socket.on("sendMessage", async ({ code, text }) => {
        if (!isValidCode(code)) return;
        if (!text || !text.trim()) return;

        try {
            // ✨ Save new message to MongoDB
            const newMsg = await Message.create({
                code: code,
                text: text.trim()
            });

            const message = {
                id: newMsg._id.toString(),
                text: newMsg.text,
                createdAt: newMsg.createdAt
            };

            io.to(code).emit("newMessage", message);
        } catch (error) {
            console.error("Error saving message:", error);
        }
    });

    socket.on("messageSeen", async ({ code, messageId }) => {
        if (!isValidCode(code)) return;

        try {
            // ✨ Delete seen message from MongoDB
            await Message.findByIdAndDelete(messageId);
            
            io.to(code).emit("messageDeleted", messageId);
        } catch (error) {
            console.error("Error deleting message:", error);
        }
    });

    socket.on("disconnect", () => {
        if (socket.code) {
            socket.leave(socket.code);
        }
    });

});

// ✨ Updated for Render Hosting
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});