const Home = require("../models/home");
const User = require("../models/user");
const Booking = require("../models/booking");
const Review = require("../models/review");
const Notification = require("../models/notification");

// Helper: create notification
const createNotification = async (userId, type, title, message, link = '') => {
  try {
    const notification = new Notification({ userId, type, title, message, link });
    await notification.save();
  } catch (err) {
    console.log('Error creating notification:', err);
  }
};

exports.getIndex = async (req, res, next) => {
  try {
    const registeredHomes = await Home.find().limit(8);
    
    // Get average ratings for homes
    const homeIds = registeredHomes.map(h => h._id);
    const ratings = await Review.aggregate([
      { $match: { homeId: { $in: homeIds } } },
      { $group: { _id: '$homeId', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    const ratingMap = {};
    ratings.forEach(r => { ratingMap[r._id.toString()] = { avg: r.avgRating, count: r.count }; });

    // Get user favourites for heart icon state
    let userFavs = [];
    if (req.isLoggedIn && req.session.user) {
      const user = await User.findById(req.session.user._id);
      userFavs = user ? user.favourites.map(f => f.toString()) : [];
    }

    res.render("store/index", {
      registeredHomes,
      ratingMap,
      userFavs,
      pageTitle: "StayEG - Find Your Perfect Stay",
      currentPage: "index",
      isLoggedIn: req.isLoggedIn,
      user: req.session ? req.session.user : null,
    });
  } catch (err) {
    console.log(err);
    res.render("store/index", {
      registeredHomes: [],
      ratingMap: {},
      userFavs: [],
      pageTitle: "StayEG - Find Your Perfect Stay",
      currentPage: "index",
      isLoggedIn: req.isLoggedIn,
      user: req.session ? req.session.user : null,
    });
  }
};

exports.getHomes = async (req, res, next) => {
  try {
    const { search, location, minPrice, maxPrice, bedrooms, guests } = req.query;
    let query = {};
    
    if (search) {
      query.$or = [
        { houseName: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    } else if (location) {
      query.location = { $regex: location, $options: 'i' };
    }
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (bedrooms) query.bedrooms = { $gte: Number(bedrooms) };
    if (guests) query.guests = { $gte: Number(guests) };

    const registeredHomes = await Home.find(query);
    
    // Get average ratings
    const homeIds = registeredHomes.map(h => h._id);
    const ratings = await Review.aggregate([
      { $match: { homeId: { $in: homeIds } } },
      { $group: { _id: '$homeId', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    const ratingMap = {};
    ratings.forEach(r => { ratingMap[r._id.toString()] = { avg: r.avgRating, count: r.count }; });

    // Get user favourites
    let userFavs = [];
    if (req.isLoggedIn && req.session.user) {
      const user = await User.findById(req.session.user._id);
      userFavs = user ? user.favourites.map(f => f.toString()) : [];
    }

    res.render("store/home-list", {
      registeredHomes,
      ratingMap,
      userFavs,
      pageTitle: "Explore Stays",
      currentPage: "Home",
      isLoggedIn: req.isLoggedIn,
      user: req.session ? req.session.user : null,
      query: req.query
    });
  } catch (err) {
    console.log(err);
    res.redirect("/");
  }
};

exports.getHomeDetails = async (req, res, next) => {
  try {
    const homeId = req.params.homeId;
    const home = await Home.findById(homeId);
    
    if (!home) {
      return res.redirect("/homes");
    }

    // Get reviews for this home
    const reviews = await Review.find({ homeId }).populate('userId', 'firstName lastName avatar').sort({ createdAt: -1 });
    
    // Calculate average rating
    const avgRating = reviews.length > 0 
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) 
      : home.rating;

    // Check if user has already booked (for review eligibility)
    let hasBooked = false;
    let hasReviewed = false;
    let isFavourited = false;
    if (req.isLoggedIn && req.session.user) {
      const userId = req.session.user._id;
      const booking = await Booking.findOne({ homeId, userId, status: { $in: ['confirmed', 'completed'] } });
      hasBooked = !!booking;
      const review = await Review.findOne({ homeId, userId });
      hasReviewed = !!review;
      const user = await User.findById(userId);
      isFavourited = user ? user.favourites.includes(homeId) : false;
    }

    res.render("store/home-detail", {
      home,
      reviews,
      avgRating,
      hasBooked,
      hasReviewed,
      isFavourited,
      pageTitle: home.houseName,
      currentPage: "Home",
      isLoggedIn: req.isLoggedIn,
      user: req.session ? req.session.user : null,
    });
  } catch (err) {
    console.log(err);
    res.redirect("/homes");
  }
};

exports.postBooking = async (req, res, next) => {
  try {
    const { homeId, checkIn, checkOut, guests: guestCount } = req.body;
    const userId = req.session.user._id;
    const home = await Home.findById(homeId);

    if (!home) return res.redirect("/homes");

    // Calculate nights and total
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    
    if (nights < 1) {
      return res.redirect(`/homes/${homeId}?error=invalid_dates`);
    }

    const totalPrice = home.price * nights;

    const booking = new Booking({
      homeId,
      userId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests: guestCount || 1,
      totalPrice,
      status: 'confirmed',
    });

    await booking.save();

    // Create notification
    await createNotification(
      userId, 
      'booking_confirmed', 
      'Booking Confirmed!', 
      `Your booking for "${home.houseName}" from ${checkInDate.toLocaleDateString()} to ${checkOutDate.toLocaleDateString()} has been confirmed. Total: Rs ${totalPrice}`,
      '/bookings'
    );

    res.redirect("/bookings");
  } catch (err) {
    console.log(err);
    res.redirect("/homes");
  }
};

exports.getBookings = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const statusFilter = req.query.status || 'all';
    
    let query = { userId };
    if (statusFilter !== 'all') {
      query.status = statusFilter;
    }

    // Auto-complete past bookings
    await Booking.updateMany(
      { userId, status: 'confirmed', checkOut: { $lt: new Date() } },
      { $set: { status: 'completed' } }
    );
    
    const bookings = await Booking.find(query).populate("homeId").sort({ bookingDate: -1 });
    
    // Get counts for tabs
    const allCount = await Booking.countDocuments({ userId });
    const confirmedCount = await Booking.countDocuments({ userId, status: 'confirmed' });
    const completedCount = await Booking.countDocuments({ userId, status: 'completed' });
    const cancelledCount = await Booking.countDocuments({ userId, status: 'cancelled' });
    
    // Check which bookings have reviews
    const reviewedBookings = await Review.find({ userId }).select('homeId');
    const reviewedHomeIds = reviewedBookings.map(r => r.homeId.toString());

    res.render("store/bookings", {
      bookings,
      statusFilter,
      counts: { all: allCount, confirmed: confirmedCount, completed: completedCount, cancelled: cancelledCount },
      reviewedHomeIds,
      pageTitle: "My Bookings",
      currentPage: "bookings",
      isLoggedIn: req.isLoggedIn,
      user: req.session.user,
    });
  } catch (err) {
    console.log(err);
    res.redirect("/");
  }
};

exports.postCancelBooking = async (req, res, next) => {
  try {
    const { bookingId, reason } = req.body;
    const userId = req.session.user._id;

    const booking = await Booking.findOne({ _id: bookingId, userId, status: 'confirmed' }).populate('homeId');
    if (!booking) return res.redirect("/bookings");

    booking.status = 'cancelled';
    booking.cancellationReason = reason || 'No reason provided';
    booking.cancelledAt = new Date();
    await booking.save();

    // Create notification
    await createNotification(
      userId,
      'booking_cancelled',
      'Booking Cancelled',
      `Your booking for "${booking.homeId.houseName}" has been cancelled. ${reason ? 'Reason: ' + reason : ''}`,
      '/bookings?status=cancelled'
    );

    res.redirect("/bookings");
  } catch (err) {
    console.log(err);
    res.redirect("/bookings");
  }
};

exports.getFavouriteList = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const user = await User.findById(userId).populate('favourites');
    
    // Get ratings for favourited homes
    const homeIds = user.favourites.map(h => h._id);
    const ratings = await Review.aggregate([
      { $match: { homeId: { $in: homeIds } } },
      { $group: { _id: '$homeId', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    const ratingMap = {};
    ratings.forEach(r => { ratingMap[r._id.toString()] = { avg: r.avgRating, count: r.count }; });

    res.render("store/favourite-list", {
      favouriteHomes: user.favourites,
      ratingMap,
      pageTitle: "My Favourites",
      currentPage: "favourites",
      isLoggedIn: req.isLoggedIn,
      user: req.session.user,
    });
  } catch (err) {
    console.log(err);
    res.redirect("/");
  }
};

exports.postToggleFavourite = async (req, res, next) => {
  try {
    const homeId = req.body.id || req.body.homeId;
    const userId = req.session.user._id;
    const user = await User.findById(userId);
    
    let action;
    if (user.favourites.includes(homeId)) {
      user.favourites = user.favourites.filter(fav => fav.toString() !== homeId.toString());
      action = 'removed';
    } else {
      user.favourites.push(homeId);
      action = 'added';
    }
    await user.save();

    // If AJAX request
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({ success: true, action, favouriteCount: user.favourites.length });
    }
    
    // Redirect to referrer or favourites
    res.redirect(req.get('Referrer') || "/favourites");
  } catch (err) {
    console.log(err);
    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
      return res.status(500).json({ success: false });
    }
    res.redirect("/favourites");
  }
};

exports.postRemoveFromFavourite = async (req, res, next) => {
  try {
    const homeId = req.params.homeId;
    const userId = req.session.user._id;
    const user = await User.findById(userId);
    if (user.favourites.includes(homeId)) {
      user.favourites = user.favourites.filter(fav => fav.toString() !== homeId.toString());
      await user.save();
    }
    res.redirect("/favourites");
  } catch (err) {
    console.log(err);
    res.redirect("/favourites");
  }
};

// Reviews
exports.postReview = async (req, res, next) => {
  try {
    const { homeId, rating, comment } = req.body;
    const userId = req.session.user._id;

    // Check user has a completed/confirmed booking for this home
    const booking = await Booking.findOne({ homeId, userId, status: { $in: ['confirmed', 'completed'] } });
    if (!booking) {
      return res.redirect(`/homes/${homeId}?error=no_booking`);
    }

    // Check if already reviewed
    const existing = await Review.findOne({ homeId, userId });
    if (existing) {
      return res.redirect(`/homes/${homeId}?error=already_reviewed`);
    }

    const review = new Review({
      homeId,
      userId,
      rating: Number(rating),
      comment,
    });
    await review.save();

    // Update home's average rating
    const allReviews = await Review.find({ homeId });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await Home.findByIdAndUpdate(homeId, { rating: avgRating.toFixed(1) });

    res.redirect(`/homes/${homeId}`);
  } catch (err) {
    console.log(err);
    res.redirect("/homes");
  }
};

// Notifications
exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(50);
    
    // Mark all as read
    await Notification.updateMany({ userId, read: false }, { $set: { read: true } });

    res.render("store/notifications", {
      notifications,
      pageTitle: "Notifications",
      currentPage: "notifications",
      isLoggedIn: req.isLoggedIn,
      user: req.session.user,
    });
  } catch (err) {
    console.log(err);
    res.redirect("/");
  }
};

exports.getNotificationCount = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const count = await Notification.countDocuments({ userId, read: false });
    res.json({ count });
  } catch (err) {
    res.json({ count: 0 });
  }
};

exports.postMarkNotificationRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    await Notification.findByIdAndUpdate(notificationId, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
};

// Profile
exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const user = await User.findById(userId);
    const bookingCount = await Booking.countDocuments({ userId });
    const reviewCount = await Review.countDocuments({ userId });
    const favCount = user.favourites.length;

    res.render("store/profile", {
      profileUser: user,
      stats: { bookings: bookingCount, reviews: reviewCount, favourites: favCount },
      pageTitle: "My Profile",
      currentPage: "profile",
      isLoggedIn: req.isLoggedIn,
      user: req.session.user,
    });
  } catch (err) {
    console.log(err);
    res.redirect("/");
  }
};

exports.postUpdateProfile = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const { firstName, lastName, phone, bio } = req.body;
    
    const updateData = { firstName, lastName, phone, bio };
    if (req.file) {
      updateData.avatar = req.file.path.replace(/\\/g, '/');
    }

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true });
    req.session.user = user;
    await req.session.save();
    
    res.redirect("/profile");
  } catch (err) {
    console.log(err);
    res.redirect("/profile");
  }
};

// Settings
exports.getSettings = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const user = await User.findById(userId);

    res.render("store/settings", {
      profileUser: user,
      pageTitle: "Settings",
      currentPage: "settings",
      isLoggedIn: req.isLoggedIn,
      user: req.session.user,
      success: req.query.success || '',
      error: req.query.error || '',
    });
  } catch (err) {
    console.log(err);
    res.redirect("/");
  }
};

exports.postChangePassword = async (req, res, next) => {
  try {
    const bcrypt = require("bcryptjs");
    const userId = req.session.user._id;
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    
    if (newPassword !== confirmNewPassword) {
      return res.redirect("/settings?error=Passwords do not match");
    }
    if (newPassword.length < 8) {
      return res.redirect("/settings?error=Password must be at least 8 characters");
    }

    const user = await User.findById(userId);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.redirect("/settings?error=Current password is incorrect");
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    
    res.redirect("/settings?success=Password changed successfully");
  } catch (err) {
    console.log(err);
    res.redirect("/settings?error=Something went wrong");
  }
};

exports.postUpdateNotificationPrefs = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const { bookingUpdates, promotions, reviewReminders } = req.body;
    
    await User.findByIdAndUpdate(userId, {
      notificationPreferences: {
        bookingUpdates: bookingUpdates === 'on',
        promotions: promotions === 'on',
        reviewReminders: reviewReminders === 'on',
      }
    });
    
    res.redirect("/settings?success=Notification preferences updated");
  } catch (err) {
    console.log(err);
    res.redirect("/settings?error=Something went wrong");
  }
};
