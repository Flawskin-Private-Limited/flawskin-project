const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

router.post("/", async (req, res) => {
  try {
    const { paymentId, amount } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment ID required",
      });
    }

    // 🔥 Fetch payment
    const payment = await razorpay.payments.fetch(paymentId);

    console.log("PAYMENT STATUS:", payment.status);

    // 🔥 If authorized → capture first
    if (payment.status === "authorized") {
      await razorpay.payments.capture(
        paymentId,
        payment.amount,
        payment.currency
      );

      console.log("Payment captured successfully");
    }

    // 🔥 Refund payment
    const refund = await razorpay.payments.refund(paymentId, {
      amount: amount || undefined,
    });

    return res.status(200).json({
      success: true,
      refund,
    });
  } catch (error) {
    console.error("Refund error:", error);

    return res.status(500).json({
      success: false,
      message:
        error?.error?.description || error.message || "Refund failed",
    });
  }
});

module.exports = router;