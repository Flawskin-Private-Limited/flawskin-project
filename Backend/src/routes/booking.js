const router = require("express").Router();
const transporter = require("../util/mailTransport");

// Send booking confirmation email
router.post("/send-booking-email", async (req, res) => {
  try {
    const { email, name, booking } = req.body;

    await transporter.sendMail({
      from: `"FlawSkin Pvt Ltd" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Booking Confirmation",
      html: `
  <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:20px;">
    <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">

      <!-- Header -->
      <div style="background:#8dcae4; padding:20px; text-align:center; color:#fff;">
        <h1 style="margin:0; font-size:22px;">Flaw Skin Laser Clinic</h1>
        <p style="margin:5px 0 0; font-size:14px;">Booking Confirmation</p>
      </div>

      <!-- Body -->
      <div style="padding:25px;">
        <h2 style="color:#1a2538; margin-bottom:10px;">Hi ${name || "Customer"},</h2>

        <p style="color:#555; font-size:14px;">
          Your appointment has been successfully confirmed. We’re excited to serve you!
        </p>

        <!-- Booking Details -->
        <div style="margin-top:20px; border:1px solid #e6edf3; border-radius:8px; padding:15px;">
          <h3 style="margin-top:0; color:#1a2538;">📅 Booking Details</h3>
          <p style="margin:6px 0;"><strong>Date:</strong> ${booking.date}</p>
          <p style="margin:6px 0;"><strong>Time:</strong> ${booking.time}</p>
          <p style="margin:6px 0;"><strong>Address:</strong> ${booking.address}</p>
          <p style="margin:6px 0;"><strong>Payment:</strong> ${booking.paymentMethod}</p>
          <p style="margin:6px 0;"><strong>Total Paid:</strong> ₹${booking.total}</p>
        </div>

        <!-- Services -->
        <div style="margin-top:20px;">
          <h3 style="color:#1a2538;">💆 Services Booked</h3>
          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            <thead>
              <tr style="background:#f0f7fb;">
                <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">Service</th>
                <th style="text-align:center; padding:8px; border-bottom:1px solid #ddd;">Qty</th>
              </tr>
            </thead>
            <tbody>
              ${booking.services
                .map(
                  (s) => `
                <tr>
                  <td style="padding:8px; border-bottom:1px solid #eee;">${s.name}</td>
                  <td style="padding:8px; text-align:center; border-bottom:1px solid #eee;">${s.quantity}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <!-- CTA -->
        <div style="margin-top:25px; text-align:center;">
          <a href="http://localhost:5173/sign-in"
             style="background:#8dcae4; color:#fff; padding:12px 20px; border-radius:6px; text-decoration:none; font-weight:bold;">
             View My Booking
          </a>
        </div>

        <p style="margin-top:25px; font-size:13px; color:#777;">
          If you have any questions, feel free to contact us.
        </p>
      </div>
<!-- Contact Section -->
<div style="margin-top:25px; padding:15px; border-top:1px solid #eee;">
  <h3 style="margin:0 0 10px; color:#1a2538;"> Need Help?</h3>

  <p style="margin:6px 0; font-size:14px; color:#555;">
    <strong>Phone:</strong> +91 78926 44030
  </p>

  <p style="margin:6px 0; font-size:14px; color:#555;">
    <strong>Email:</strong> contact@flawskin.com
  </p>

  <p style="margin:6px 0; font-size:14px; color:#555;">
    <strong>Address:</strong> Flaw Skin Laser Clinic, Bangalore
  </p>

  <p style="margin:10px 0 0; font-size:13px; color:#777;">
    Our team is here to assist you with any questions or changes to your booking.
  </p>
    </div>
      <!-- Footer -->
      <div style="background:#f8fafc; text-align:center; padding:15px; font-size:12px; color:#888;">
        © ${new Date().getFullYear()} Flaw Skin Laser Clinic<br/>
        All rights reserved
      </div>

    </div>
  </div>
`,
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Email failed" });
  }
});

module.exports = router;
