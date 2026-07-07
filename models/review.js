const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
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
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    required: true,
    maxlength: 500,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

// One review per user per home
reviewSchema.index({ homeId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);
