//api controller function to get user booking

import { clerkClient } from "@clerk/express";
import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";

export const getUserBookings = async (req, res) => {
  try {
    const user = req.auth().userId;
    const bookings = await Booking.find({ user })
      .populate({
        path: "show",
        populate: {
          path: "movie",
        },
      })
      .sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    res.json({ success: false, message: error.message });
  }
};

// api controller function to update fav movie in clerk user metadata

export const updateFavourite = async (req, res) => {
  try {
    const { movieId } = req.body;
    const userId = req.auth().userId;
    const user = await clerkClient.users.getUser(userId);
    if (!user.privateMetadata.favourites) {
      user.privateMetadata.favourites = [];
    }
    if (!user.privateMetadata.favourites.includes(movieId)) {
      user.privateMetadata.favourites.push(movieId);
    } else {
      user.privateMetadata.favourites = user.privateMetadata.favourites.filter(
        (item) => item !== movieId
      );
    }
    await clerkClient.users.updateUser(userId, {
      privateMetadata: user.privateMetadata,
    });
    res.json({ success: true, message: "Favourite updated successfully" });
  } catch (error) {
    console.log(error.message);
    return res.json({ success: false, message: error.message });
  }
};

// get favourite movies

export const getFavourites = async (req, res) => {
  try {
    const user = await clerkClient.users.getUser(req.auth().userId);
    const favourites = user.privateMetadata.favourites;

    //getting movies from db

    const movies = await Movie.find({ _id: { $in: favourites } });
    res.json({ success: true, movies });
  } catch (error) {
    console.log(error.message);
    return res.json({ success: false, message: error.message });
  }
};
