const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

router.post("/", async (req, res) => {
  const { paymentId, amount } = req.body;

  try {
    const payment = await razorpay.payments.capture(
      paymentId,
      amount,
      "INR"
    );

    res.json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error("Capture failed:", error);

    res.status(500).json({
      success: false,
      message: "Payment capture failed",
    });
  }
});

module.exports = router;