import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
    user: { type: String, required: true, ref: "User" },
    show: { type: String, required: true, ref: "Show" },
    amount: { type: Number, required: true, default: 0 },
    bookedSeats: { type: Array, required: true, default: [] },
    isPaid: { type: Boolean, default: false },
    paymentLink: { type: String }
}, {timestamps: true});

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;