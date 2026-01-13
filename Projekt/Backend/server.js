const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");

require("./db");

const User = require("./models/user");
const Booking = require("./models/Booking");

const app = express();

/* ======================
   CORS
====================== */
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

/* ======================
   Test
====================== */
app.get("/", (req, res) => {
  res.send("Backend is working ✅");
});

/* ======================
   Admin middleware
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
   Register
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
  } catch {
    res.status(500).json({ message: "❌ Server error" });
  }
});

/* ======================
   Login
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
      role: user.role,
    });
  } catch {
    res.status(500).json({ message: "❌ Server error" });
  }
});

/* ======================
   Book appointment
====================== */
app.post("/api/book", async (req, res) => {
  try {
    const { userId, date, time, service } = req.body;
    if (!userId || !date || !time || !service) {
      return res.json({ message: "❌ Missing fields" });
    }

    // ✅ تأكد إن المستخدم موجود
    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.json({ message: "❌ User not found" });
    }

    const day = new Date(date + "T00:00:00").getDay();
    if (day === 0 || day === 6) {
      return res.json({ message: "❌ No bookings on weekends" });
    }

    const [h, m] = time.split(":").map(Number);
    const minutes = h * 60 + m;
    if (minutes < 540 || minutes > 1020) {
      return res.json({ message: "❌ Working hours 09:00–17:00" });
    }

    const conflict = await Booking.findOne({ date, time });
    if (conflict) {
      return res.json({ message: "❌ Time already booked" });
    }

    const booking = new Booking({
      userId: String(userId), // ✅ ضمان string
      date,
      time,
      service,
      status: "pending",
      note: "",
    });

    await booking.save();
    res.json({ message: "✅ Appointment booked successfully" });
  } catch {
    res.status(500).json({ message: "❌ Server error" });
  }
});

/* ======================
   User bookings
====================== */
app.get("/api/my-bookings/:userId", async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: String(req.params.userId) }).sort({
      date: 1,
      time: 1,
    });

    res.json(bookings);
  } catch {
    res.status(500).json({ message: "❌ Server error" });
  }
});

/* ======================
   User delete booking
====================== */
app.delete("/api/booking/:id", async (req, res) => {
  try {
    const { userId } = req.query;
    const booking = await Booking.findById(req.params.id);

    if (!booking) return res.json({ message: "❌ Booking not found" });
    if (booking.userId !== String(userId)) {
      return res.json({ message: "❌ Not allowed" });
    }

    await Booking.deleteOne({ _id: booking._id });
    res.json({ message: "✅ Booking deleted" });
  } catch {
    res.status(500).json({ message: "❌ Server error" });
  }
});

/* ======================
   Admin: get all bookings
====================== */
app.get("/api/admin/bookings", requireAdmin, async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ date: 1, time: 1 });

    const userIds = [
      ...new Set(
        bookings
          .map(b => String(b.userId))
          .filter(Boolean)
      )
    ];

    const users = await User.find(
      { _id: { $in: userIds } },
      "name email"
    ).lean();

    const usersMap = new Map(users.map(u => [String(u._id), u]));

    res.json(
      bookings.map(b => ({
        _id: b._id,
        date: b.date,
        time: b.time,
        service: b.service,
        status: b.status,
        note: b.note,
        user: usersMap.get(String(b.userId)) || { name: "-", email: "-" },
      }))
    );
  } catch {
    res.status(500).json({ message: "❌ Server error" });
  }
});

/* ======================
   Admin: accept / reject + note
====================== */
app.put("/api/admin/booking/:id/status", requireAdmin, async (req, res) => {
  try {
    const { status, note } = req.body;

    if (!["accepted", "rejected"].includes(status)) {
      return res.json({ message: "❌ Invalid status" });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.json({ message: "❌ Booking not found" });

    booking.status = status;
    booking.note = note || "";
    await booking.save();

    res.json({
      message: "✅ Booking updated",
      status: booking.status,
      note: booking.note
    });
  } catch {
    res.status(500).json({ message: "❌ Server error" });
  }
});

/* ======================
   Admin: edit booking
====================== */
app.put("/api/admin/booking/:id", requireAdmin, async (req, res) => {
  try {
    const { date, time, service } = req.body;

    if (!date || !time || !service) {
      return res.json({ message: "❌ Missing fields" });
    }

    const conflict = await Booking.findOne({
      _id: { $ne: req.params.id },
      date,
      time,
    });

    if (conflict) {
      return res.json({ message: "❌ Time already booked" });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.json({ message: "❌ Booking not found" });

    booking.date = date;
    booking.time = time;
    booking.service = service;
    await booking.save();

    res.json({ message: "✅ Booking edited successfully" });
  } catch {
    res.status(500).json({ message: "❌ Server error" });
  }
});

/* ======================
   Admin: update note only
====================== */
app.patch("/api/admin/booking/:id/note", requireAdmin, async (req, res) => {
  try {
    const { note } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.json({ message: "❌ Booking not found" });

    booking.note = note || "";
    await booking.save();

    res.json({ message: "✅ Note saved" });
  } catch {
    res.status(500).json({ message: "❌ Server error" });
  }
});

/* ======================
   Admin delete booking
====================== */
app.delete("/api/admin/booking/:id", requireAdmin, async (req, res) => {
  try {
    await Booking.deleteOne({ _id: req.params.id });
    res.json({ message: "✅ Booking deleted (admin)" });
  } catch {
    res.status(500).json({ message: "❌ Server error" });
  }
});

/* ======================
   Start server
====================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("✅ Server running on port", PORT);
});
