require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const contactRoutes = require("./src/routes/getInTouch");
const authRoutes = require("./src/routes/auth");
const adminRoutes = require("./src/routes/admin");
const feedbackRoutes = require("./src/routes/feedback");
const refundRoutes = require("./src/routes/refund");
const bookingRoutes = require("./src/routes/booking");
const capturePaymentRoutes = require("./src/routes/capturePayment");
const ipRestriction = require("./src/middlewares/ipRestriction");

const app = express();
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGO_URI;
const mongoRetryDelayMs = 10000;
let serverStarted = false;
let mongoRetryTimer = null;

app.use(express.json());

const allowedOrigins = process.env.CORS_ORIGIN.split(",");

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.set("trust proxy", true);

app.use((req, res, next) => {
  console.log("Client IP:", req.ip);
  next();
});

app.use("/contact", contactRoutes);
app.use("/auth", authRoutes);
app.use("/", feedbackRoutes);
app.use("/admin", adminRoutes);
app.use("/refund", refundRoutes);
app.use("/booking", bookingRoutes);
app.use("/payment/capture", capturePaymentRoutes);

function startServer() {
  if (serverStarted) {
    return;
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
  });

  serverStarted = true;
}

async function connectToMongo() {
  if (!mongoUri) {
    console.error("MONGO_URI is not set. Starting API without database connection.");
    return;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    if (mongoRetryTimer) {
      clearTimeout(mongoRetryTimer);
      mongoRetryTimer = null;
    }
  } catch (err) {
    console.error("Could not connect to MongoDB. Retrying in 10 seconds.", err.message);

    if (!mongoRetryTimer) {
      mongoRetryTimer = setTimeout(() => {
        mongoRetryTimer = null;
        connectToMongo();
      }, mongoRetryDelayMs);
    }
  }
}

startServer();
connectToMongo();

module.exports = app;
