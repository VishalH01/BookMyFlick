import Stripe from "stripe";
import Booking from "../models/Booking.js";
export const stripeWebhook = async (req, res) => {
  const stripeInstance = new Stripe(process.env.STRIPE_SECRETE_KEY);
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripeInstance.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRETE
    );
  } catch (error) {
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
  try {
    switch (event.type) {
      case "payment_intent_succeeded": {
        const paymentIntent = event.data.object;
        // Then define and call a function to handle the event payment_intent.succeeded
        const sessionList = await stripeInstance.checkout.sessions.list({
          payment_intent: paymentIntent.id,
        });
        const session = sessionList.data[0];
        const { bookingId } = session.metadata;
        await Booking.findByIdAndUpdate(bookingId, {
          isPaid: true,
          paymentLink: "",
        });
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.log("webhook process error", error);
    res.status(400).json({ received: false });
  }
};
