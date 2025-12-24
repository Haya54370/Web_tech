const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");

require("./db");

const User = require("./models/user");
const Booking = require("./models/Booking");

const app = express();

/* ======================
   CORS (LAN ready)
====================== */
app.use(
  cors({
    origin: "*", // ✅ يسمح لأي جهاز على الشبكة
    methods: ["GET", "POST", "DELETE", "PUT", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

/* ======================
   Test Route
====================== */
app.get("/", (req, res) => {
  res.send("Backend is working ✅");
});

/* ======================
   Helpers
====================== */
async function requireAdmin(req, res, next) {
  try {
    const adminId = req.query.adminId;
    if (!adminId) return res.status(401).json({ message: "❌ Missing adminId" });

    const adminUser = await User.findById(adminId);
    if (!adminUser) return res.status(401).json({ message: "❌ Admin not found" });

    if (adminUser.role !== "admin") {
      return res.status(403).json({ message: "❌ Admin access only" });
    }

    next();
  } catch (err) {
    res.status(500).json({ message: "❌ Server error" });
  }
}

/* ======================
   Register (default role = user)
====================== */
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.json({ message: "❌ Missing fields" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.json({ message: "❌ Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: "user",
    });

    await newUser.save();
    res.json({ message: "✅ User registered successfully" });
  } catch (err) {
    res.status(500).json({ message: "❌ Server error" });
  }
});

/* ======================
   Login (return role)
====================== */
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.json({ message: "❌ User not found" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.json({ message: "❌ Wrong password" });

    res.json({
      message: "✅ Login successful",
      userId: user._id,
      role: user.role || "user",
    });
  } catch (err) {
    res.status(500).json({ message: "❌ Server error" });
  }
});

/* ======================
   Book Appointment
   ✅ Working hours 09:00-17:00
   ✅ No bookings on Saturday/Sunday
   ✅ Prevent duplicates by date + time
====================== */
app.post("/api/book", async (req, res) => {
  try {
    const { userId, date, time, service } = req.body;

    if (!userId || !date || !time || !service) {
      return res.json({ message: "❌ Missing fields" });
    }

    const dayIndex = new Date(date + "T00:00:00").getDay();
    if (dayIndex === 0 || dayIndex === 6) {
      return res.json({ message: "❌ No bookings on weekends (Saturday/Sunday)." });
    }

    const [h, m] = time.split(":").map(Number);
    const minutes = h * 60 + m;
    const start = 9 * 60;
    const end = 17 * 60;

    if (minutes < start || minutes > end) {
      return res.json({ message: "❌ Working hours are 09:00 to 17:00." });
    }

    const conflict = await Booking.findOne({ date, time });
    if (conflict) {
      return res.json({
        message: "❌ This time slot is already booked. Please choose another time.",
      });
    }

    const booking = new Booking({ userId, date, time, service });
    await booking.save();

    res.json({ message: "✅ Appointment booked successfully" });
  } catch (err) {
    res.status(500).json({ message: "❌ Server error" });
  }
});

/* ======================
   Get User Bookings
====================== */
app.get("/api/my-bookings/:userId", async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.params.userId }).sort({
      date: 1,
      time: 1,
    });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "❌ Server error" });
  }
});

/* ======================
   Delete Booking (user owns it)
====================== */
app.delete("/api/booking/:id", async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.query.userId;

    if (!userId) return res.status(400).json({ message: "❌ Missing userId" });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "❌ Booking not found" });

    if (booking.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "❌ Not allowed" });
    }

    await Booking.deleteOne({ _id: bookingId });
    res.json({ message: "✅ Booking deleted" });
  } catch (err) {
    res.status(500).json({ message: "❌ Server error" });
  }
});

/* ======================
   Admin: Get ALL bookings + Search + Filter by date
====================== */
app.get("/api/admin/bookings", requireAdmin, async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const date = (req.query.date || "").trim();

    const bookingFilter = {};
    if (date) bookingFilter.date = date;

    const bookings = await Booking.find(bookingFilter)
      .sort({ date: 1, time: 1 })
      .populate("userId", "name email role");

    let mapped = bookings.map((b) => ({
      _id: b._id,
      date: b.date,
      time: b.time,
      service: b.service,
      user: b.userId,
    }));

    if (q) {
      const qq = q.toLowerCase();
      mapped = mapped.filter((b) => {
        const name = (b.user?.name || "").toLowerCase();
        const email = (b.user?.email || "").toLowerCase();
        const service = (b.service || "").toLowerCase();
        return name.includes(qq) || email.includes(qq) || service.includes(qq);
      });
    }

    res.json(mapped);
  } catch (err) {
    res.status(500).json({ message: "❌ Server error" });
  }
});

/* ======================
   Admin: Delete ANY booking
====================== */
app.delete("/api/admin/booking/:id", requireAdmin, async (req, res) => {
  try {
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "❌ Booking not found" });

    await Booking.deleteOne({ _id: bookingId });
    res.json({ message: "✅ Booking deleted (admin)" });
  } catch (err) {
    res.status(500).json({ message: "❌ Server error" });
  }
});

/* ======================
   Start Server (LAN ready)
====================== */
const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("✅ Server running on:");
  console.log(`   http://localhost:${PORT}`);
  console.log(`   http://127.0.0.1:${PORT}`);
  console.log(`   http://<YOUR-PC-IP>:${PORT}  (for others on same Wi-Fi)`);
});
