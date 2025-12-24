const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  userId: String,
  date: String,
  time: String,
  service: String
});

module.exports = mongoose.model("Booking", bookingSchema);
