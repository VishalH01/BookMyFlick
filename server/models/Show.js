import mongoose from "mongoose";

const movieSchema = new mongoose.Schema({
    movie: { type: String, required: true, ref: "Movie" },
    showDateTime: { type: Date, required: true },
    showPrice: { type: Number, required: true },
    occupiedSeats: { type: Object, default: {} },
}, {minimize: false, timestamps: true});

const Show = mongoose.model("Show", movieSchema);
export default Show;

