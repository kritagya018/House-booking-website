const mongoose = require("mongoose");

const homeSchema = mongoose.Schema({
  houseName: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
  },
  bedrooms: {
    type: Number,
    default: 1,
  },
  guests: {
    type: Number,
    default: 2,
  },
  hoursOfStay: {
    type: Number,
    default: 24,
  },
  photo: String,
  description: String,
});

// homeSchema.pre('findOneAndDelete', async function(next) {
//   console.log('Came to pre hook while deleting a home');
//   const homeId = this.getQuery()._id;
//   await favourite.deleteMany({houseId: homeId});
//   next();
// });

module.exports = mongoose.model("Home", homeSchema);
