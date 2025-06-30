import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import sendEmail from "../config/nodemailer.js";

export const inngest = new Inngest({ id: "movie-ticket-booking" });

//inngest functions to save user data to db
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;
    const userData = {
      _id: id,
      name: `${first_name} ${last_name}`,
      email: email_addresses[0].email_address,
      image: image_url,
    };
    await User.create(userData);
  }
);

// inngest function to delete user data from db
const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-with-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const { id } = event.data;
    await User.findByIdAndDelete(id);
  }
);

// inngest function to update user data in db
const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;
    const userData = {
      name: `${first_name} ${last_name}`,
      email: email_addresses[0].email_address,
      image: image_url,
    };
    await User.findByIdAndUpdate(id, userData);
  }
);

// ingest function to cancell booking

const releaseSeatsAndDeleteBooking = inngest.createFunction(
  { id: "release-seats-delete-booking" },
  { event: "app/checkpayment" },
  async ({ event, step }) => {
    const tenMinutesLater = new Date(Date.now() + 10 * 60 * 1000);
    await step.sleepUntil("wait-for-10-minutes", tenMinutesLater);
    await step.run("check-payment-status", async () => {
      const bookingId = event.data.bookingId;
      const booking = await Booking.findById(bookingId);
      // if payment is not successful, release the seats and delete the booking
      if (!booking.isPaid) {
        const show = await Show.findById(booking.show);
        booking.bookedSeats.forEach((seat) => {
          delete show.occupiedSeats[seat];
        });
        show.markModified("occupiedSeats");
        await show.save();
        await Booking.findByIdAndDelete(bookingId._id);
      }
    });
  }
);

const sendBookingConfirmationEmail = inngest.createFunction(
  { id: "send-booking-confirmation-email" },
  { event: "app/show.booked" },
  async ({ event, step }) => {
    const { bookingId } = event.data;
    const booking = await Booking.findById(bookingId)
      .populate({
        path: "show",
        populate: { path: "movie", model: "Movie" },
      })
      .populate("user");

    await sendEmail({
      to: booking.user.email,
      subject: "Booking Confirmation",
      body: `Your booking for ${booking.show.movie.title} has been confirmed. Your booking ID is ${booking._id}.`,
    });
  }
);

const sendShowReminders = inngest.createFunction(
  {
    id: "send-show-reminders",
  },
  { cron: "0 */8 * * *" },
  async ({ step }) => {
    const now = new Date();
    const in8Hours = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const windowStart = new Date(in8Hours.getTime() - 10 * 60 * 1000);

    const reminderTasks = await step.run(
      "prepare-remindeer-tasks",
      async () => {
        const shows = await Show.find({
          showTime: { $gte: windowStart, $lte: in8Hours },
        }).populate("movie");
        const tasks = [];
        for (const show of shows) {
          if (!show.movie || !show.occupiedSeats) continue;
          const userIds = [...new Set(Object.values(show.occupiedSeats))];
          if (userIds.length === 0) continue;
          const users = await User.find({ _id: { $in: userIds } }).select(
            "name email"
          );
          for (const user of users) {
            tasks.push({
              userEmail: user.email,
              userName: user.name,
              movieTitle: show.movie.title,
              showTime: show.showTime,
            });
          }
        }
        return tasks;
      }
    );
    if (reminderTasks.length === 0) {
      return { sent: 0, message: "No reminders to send" };
    }
    const results = await step.run("send-all-reminders", async () => {
      return await Promise.allSettled(
        reminderTasks.map((task) =>
          sendEmail({
            to: task.userEmail,
            subject: `Reminder: Your show for ${task.movieTitle} is in 8 hours`,
            body: `Hello ${task.userName},\n\nThis is a reminder that your show for ${task.movieTitle} is in 8 hours. Please arrive on time to avoid any inconvenience.\n\nBest regards,\nCinema Booking App`,
          })
        )
      );
    });
    const sent = results.filter((result) => result.status === "fulfilled").length;
    const failed = results.length - sent;
    return { sent, failed, message: `Sent ${sent} reminders, ${failed} failed` };
  }
);

export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  releaseSeatsAndDeleteBooking,
  sendBookingConfirmationEmail,
  sendShowReminders,
];
