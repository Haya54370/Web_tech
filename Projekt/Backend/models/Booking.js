const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    // المستخدم (مثل ما عندك)
    userId: {
      type: String,
      required: true
    },

    // بيانات الحجز
    date: {
      type: String,
      required: true
    },
    time: {
      type: String,
      required: true
    },
    service: {
      type: String,
      required: true
    },

    // ⭐ حالة الحجز (للأدمن)
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending"
    },

    // ⭐ ملاحظة الأدمن
    note: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true // ⭐ مفيد للترتيب والتاريخ
  }
);

module.exports = mongoose.model("Booking", bookingSchema);
