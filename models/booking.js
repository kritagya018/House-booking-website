const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  homeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Home",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  bookingDate: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model("Booking", bookingSchema);
