const Home = require("../models/home");
const User = require("../models/user");
const Booking = require("../models/booking");

exports.getIndex = (req, res, next) => {
  console.log("Session Value: ", req.session);
  Home.find().then((registeredHomes) => {
    res.render("store/index", {
      registeredHomes: registeredHomes,
      pageTitle: "airbnb Home",
      currentPage: "index",
      isLoggedIn: req.isLoggedIn, 
      user: req.session.user,
    });
  });
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
    
    if (bedrooms) {
      query.bedrooms = { $gte: Number(bedrooms) };
    }
    
    if (guests) {
      query.guests = { $gte: Number(guests) };
    }

    const registeredHomes = await Home.find(query);
    
    res.render("store/home-list", {
      registeredHomes: registeredHomes,
      pageTitle: "Homes List",
      currentPage: "Home",
      isLoggedIn: req.isLoggedIn, 
      user: req.session.user,
      query: req.query
    });
  } catch (err) {
    console.log(err);
    res.redirect("/");
  }
};

exports.getBookings = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const bookings = await Booking.find({ userId: userId }).populate("homeId");
    
    res.render("store/bookings", {
      bookings: bookings,
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

exports.postBooking = async (req, res, next) => {
  try {
    const homeId = req.body.homeId;
    const userId = req.session.user._id;

    const booking = new Booking({
      homeId: homeId,
      userId: userId,
    });

    await booking.save();
    res.redirect("/bookings");
  } catch (err) {
    console.log(err);
    res.redirect("/homes");
  }
};

exports.getFavouriteList = async (req, res, next) => {
  const userId = req.session.user._id;
  const user = await User.findById(userId).populate('favourites');
  res.render("store/favourite-list", {
    favouriteHomes: user.favourites,
    pageTitle: "My Favourites",
    currentPage: "favourites",
    isLoggedIn: req.isLoggedIn, 
    user: req.session.user,
  });
};

exports.postAddToFavourite = async (req, res, next) => {
  const homeId = req.body.id;
  const userId = req.session.user._id;
  const user = await User.findById(userId);
  if (!user.favourites.includes(homeId)) {
    user.favourites.push(homeId);
    await user.save();
  }
  res.redirect("/favourites");
};

exports.postRemoveFromFavourite = async (req, res, next) => {
  const homeId = req.params.homeId;
  const userId = req.session.user._id;
  const user = await User.findById(userId);
  if (user.favourites.includes(homeId)) {
    user.favourites = user.favourites.filter(fav => fav != homeId);
    await user.save();
  }
  res.redirect("/favourites");
};

exports.getHomeDetails = (req, res, next) => {
  const homeId = req.params.homeId;
  Home.findById(homeId).then((home) => {
    if (!home) {
      console.log("Home not found");
      res.redirect("/homes");
    } else {
      res.render("store/home-detail", {
        home: home,
        pageTitle: "Home Detail",
        currentPage: "Home",
        isLoggedIn: req.isLoggedIn, 
        user: req.session.user,
      });
    }
  });
};
