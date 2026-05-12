const transporter = require("../util/mailTransport");

const sendBookingConfirmation = async (userEmail, booking) => {
  const {
    date,
    time,
    startTime,
    endTime,
    cartItems,
    totalAmount
  } = booking;

  const servicesHtml = cartItems
    ?.map(
      (item) =>
        `<li>${item.name} x${item.quantity} (${item.durationMinutes} mins)</li>`
    )
    .join("");

  await transporter.sendMail({
    from: `"FlawSkin" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: "Your Booking is Confirmed 🎉",
    html: `
      <h2>Booking Confirmed</h2>

      <p><b>Date:</b> ${date}</p>
      <p><b>Time:</b> ${time}</p>

      <p><b>Start:</b> ${new Date(startTime).toLocaleTimeString()}</p>
      <p><b>End:</b> ${new Date(endTime).toLocaleTimeString()}</p>

      <h3>Services:</h3>
      <ul>
        ${servicesHtml}
      </ul>

      <p><b>Total Amount:</b> ₹${totalAmount || "-"}</p>

      <br/>
      <p>Thank you for booking with FlawSkin 💜</p>
    `,
  });
};

module.exports = sendBookingConfirmation;