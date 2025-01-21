const https = require("https");
const fs = require("fs");
const { Server } = require("socket.io");
const axios = require("axios");

// SSL sertifikatlari
const options = {
  key: fs.readFileSync("./certs/private-key.pem"), // Sertifikatning maxfiy kaliti
  cert: fs.readFileSync("./certs/cert.pem"), // Sertifikat
  ca: fs.readFileSync("./certs/cert.pem"), // Sertifikatlar zanjiri (agar mavjud bo'lsa)
};

// HTTPS serverni yaratish
const server = https.createServer(options, (req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Socket.IO SSL server ishlayapti!");
});

// Socket.IO serverini yaratish va CORS sozlamalari
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://localhost:5173",
      "https://localhost:5174",
      "https://planner.system-imv.uz",
    ],
    methods: ["*"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

// Axios instance sozlamalari
const instance = axios.create({
  baseURL: "https://planner-back.system-imv.uz/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
});

// Foydalanuvchini autentifikatsiya qilish funksiyasi
async function authenticateSocket(token) {
  try {
    const response = await instance.get("/auth/check-user", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data || null;
  } catch (error) {
    console.error("Foydalanuvchini tekshirishda xatolik:", error.message);
    return null;
  }
}

// Socket.IO ulanishlarni boshqarish
io.on("connection", (socket) => {
  console.log("Yangi foydalanuvchi ulandi:", socket.id);

  socket.on("RegisterUser", async (token) => {
    const user = await authenticateSocket(token);
    if (user) {
      console.log("Foydalanuvchi autentifikatsiya qilindi:", user);
      socket.user = user;
      socket.join(`user.${user.id}`); // Foydalanuvchining private kanali
      socket.emit("message", "Siz muvaffaqiyatli ulandingiz!");
    } else {
      socket.emit("error", "Foydalanuvchi autentifikatsiya qilinmadi!");
    }
  });

  // Private xabar yuborish
  socket.on("private-message", (data) => {
    const { userId, message } = data;
    if (userId && message) {
      io.to(`user.${userId}`).emit("privateMessage", message);
      console.log(`Xabar foydalanuvchi ${userId} ga yuborildi:`, message);
    }
  });

  socket.on("admittance-create", (data) => {
    const { userId, message } = data;
    if (userId && message) {
      io.to(`user.${userId}`).emit("admittance:created", message);
    }
  });

  socket.on("admittance-update", (data) => {
    const { userId, message } = data;
    if (userId && message) {
      io.to(`user.${userId}`).emit("admittance:updated", message);
    }
  });

  socket.on("admittance-request-create", (data) => {
    const { userId, message } = data;
    if (userId && message) {
      io.to(`user.${userId}`).emit("admittance:request-created", message);
    }
  });

  
  socket.on("admittance-request-update", (data) => {
    const { userId, message } = data;
    if (userId && message) {
      io.to(`user.${userId}`).emit("admittance:request-updated", message);
    }
  });

  socket.on("admittance-add-recipient", (data) => {
    const { userId, message } = data;
    if (userId && message) {
      io.to(`user.${userId}`).emit("admittance:add-recipient", message);
    }
  });

  socket.on("disconnect", () => {
    console.log("Foydalanuvchi ulanishdan chiqdi:", socket.id);
  });
});

// HTTPS serverni ishga tushirish
const PORT = 4000;

try {
  server.listen(PORT, () => {
    console.log(`HTTPS server ishlayapti: https://localhost:${PORT}`);
  });
} catch (error) {
  console.error("Serverni ishga tushirishda xato:", error.message);
}
// server.listen(PORT, () => {
//   console.log(
//     `Socket.IO serveri HTTPS orqali https://localhost:${PORT} manzilida ishlamoqda`
//   );
// });
