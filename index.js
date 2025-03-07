const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

const API_KEY = process.env.API_KEY || "your-secret-api-key";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || apiKey !== API_KEY) {
    return res
      .status(401)
      .json({ message: "Unauthorized: Invalid or missing API key" });
  }

  next();
};

const previousMonthNotHave31Days = () => {
  const today = new Date();
  // Get previous month (0-indexed, so subtract 1 and handle January)
  const previousMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
  const previousMonthYear =
    today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();

  // Get the last day of the previous month
  const lastDayOfPreviousMonth = new Date(
    previousMonthYear,
    previousMonth + 1,
    0
  ).getDate();

  return lastDayOfPreviousMonth !== 31;
};

app.get("/send-email", authenticateApiKey, async (req, res) => {
  try {
    if (!previousMonthNotHave31Days()) {
      return res.status(403).json({
        message: "Email sending not allowed: Previous month had 31 days",
        previousMonth: new Date().getMonth() === 0 ? 12 : new Date().getMonth(),
        days: 31,
      });
    }

    // const { to, subject, text } = req.body;
    const to = process.env.TO;
    const subject = process.env.SUBJECT;
    const text = process.env.TEXT;

    if (!to || !subject || !text) {
      return res
        .status(400)
        .json({ message: "To, subject, and text are required" });
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    };

    await transporter.sendMail(mailOptions);

    console.log(`Email sent to ${to} at ${new Date().toISOString()}`);

    res.json({
      message: "Email sent successfully",
      previousMonth: new Date().getMonth() === 0 ? 12 : new Date().getMonth(),
      daysInPreviousMonth: new Date(
        new Date().getMonth() === 0
          ? new Date().getFullYear() - 1
          : new Date().getFullYear(),
        new Date().getMonth() === 0 ? 12 : new Date().getMonth(),
        0
      ).getDate(),
    });
  } catch (error) {
    console.error("Email sending error:", error);
    res
      .status(500)
      .json({ message: "Failed to send email", error: error.message });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
