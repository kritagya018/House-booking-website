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
  checkIn: {
    type: Date,
    required: true,
  },
  checkOut: {
    type: Date,
    required: true,
  },
  guests: {
    type: Number,
    default: 1,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['confirmed', 'cancelled', 'completed'],
    default: 'confirmed',
  },
  cancellationReason: {
    type: String,
    default: '',
  },
  cancelledAt: {
    type: Date,
  },
  bookingDate: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model("Booking", bookingSchema);
