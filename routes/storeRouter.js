// External Module
const express = require("express");
const storeRouter = express.Router();

// Local Module
const storeController = require("../controllers/storeController");

// Public routes
storeRouter.get("/", storeController.getIndex);
storeRouter.get("/homes", storeController.getHomes);
storeRouter.get("/homes/:homeId", storeController.getHomeDetails);

// Auth-required routes (middleware applied in app.js or inline)
storeRouter.get("/bookings", storeController.getBookings);
storeRouter.post("/bookings", storeController.postBooking);
storeRouter.post("/bookings/cancel", storeController.postCancelBooking);

storeRouter.get("/favourites", storeController.getFavouriteList);
storeRouter.post("/favourites", storeController.postToggleFavourite);
storeRouter.post("/favourites/delete/:homeId", storeController.postRemoveFromFavourite);

// Reviews
storeRouter.post("/reviews", storeController.postReview);

// Notifications
storeRouter.get("/notifications", storeController.getNotifications);
storeRouter.get("/api/notifications/count", storeController.getNotificationCount);
storeRouter.post("/api/notifications/:notificationId/read", storeController.postMarkNotificationRead);

// Profile & Settings
storeRouter.get("/profile", storeController.getProfile);
storeRouter.post("/profile", storeController.postUpdateProfile);
storeRouter.get("/settings", storeController.getSettings);
storeRouter.post("/settings/password", storeController.postChangePassword);
storeRouter.post("/settings/notifications", storeController.postUpdateNotificationPrefs);

module.exports = storeRouter;
