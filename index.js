const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
// const twilio = require("twilio"); // Commented out for production testing
require('dotenv').config(); // Added for environment variables

const app = express();
const port = process.env.PORT || 3000;

// Initialize Twilio client with environment variables
/* Commented out for production testing
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
*/

// Middleware setup
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "assets")));

// Security best practice - remove header revealing express
app.disable('x-powered-by');

// In-memory storage for users (replace with database in production)
const users = new Map();

// Serve static files from public directory
const serveStatic = (fileName) => (req, res) => {
  try {
    res.sendFile(path.join(__dirname, "public", fileName));
  } catch (err) {
    console.error(`Error serving ${fileName}:`, err);
    res.status(500).send('Internal Server Error');
  }
};

// Route definitions
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/rooms", serveStatic("rooms.html"));
app.get("/list", serveStatic("list.html"));
app.get("/how-it-works", serveStatic("how-it-works.html"));
app.get("/help", serveStatic("help.html"));
app.get("/login", serveStatic("login.html"));
app.get("/about", serveStatic("aboutus.html"));
app.get("/privacy-policy", serveStatic("privacy-policy.html"));
app.get("/dashboard", serveStatic("dashboard.html"));
app.get("/profile", serveStatic("profile.html"));
app.get("/add", serveStatic("add.html"));

// Helper function for mobile number validation - FIXED
const validateMobileNumber = (mobile) => {
  if (!mobile) return false;

  // Convert to string if it's a number
  let mobileStr = String(mobile);

  // Remove any non-digit characters (spaces, dashes, etc.)
  mobileStr = mobileStr.replace(/\D/g, '');

  // Check if it's exactly 10 digits
  return mobileStr.length === 10;
};

// Send OTP endpoint
app.post('/api/send-otp', async (req, res) => {
  try {
    const { mobile, type, firstName, lastName } = req.body;

    // Clean the mobile number before validation
    const cleanedMobile = mobile ? String(mobile).replace(/\D/g, '') : '';

    if (!validateMobileNumber(cleanedMobile)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit mobile number'
      });
    }

    // User existence checks
    if (type === 'login' && !users.has(cleanedMobile)) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please register first.'
      });
    }

    if (type === 'register' && users.has(cleanedMobile)) {
      return res.status(409).json({
        success: false,
        message: 'Mobile number already registered. Please login.'
      });
    }

    /* Commented out for production testing
    // Send verification code
    const verification = await client.verify.v2.services(serviceSid)
      .verifications
      .create({ to: `+91${cleanedMobile}`, channel: 'sms' });

    console.log(`OTP sent to ${cleanedMobile}: ${verification.status}`);
    */

    // For testing: Mock successful OTP sending
    console.log(`Mock OTP sent to ${cleanedMobile}`);
    return res.json({ success: true, message: 'OTP sent successfully' });

  } catch (error) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send OTP. Please try again.'
    });
  }
});

// Verify OTP endpoint
app.post('/api/verify-otp', async (req, res) => {
  try {
    const { otp, mobile, type, firstName, lastName } = req.body;

    // Clean the mobile number before validation
    const cleanedMobile = mobile ? String(mobile).replace(/\D/g, '') : '';

    if (!validateMobileNumber(cleanedMobile) || !otp || otp.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mobile number or OTP'
      });
    }

    /* Commented out for production testing
    // Verify the code
    const verification_check = await client.verify.v2.services(serviceSid)
      .verificationChecks
      .create({ to: `+91${cleanedMobile}`, code: otp });

    if (verification_check.status !== 'approved') {
      return res.status(401).json({
        success: false,
        message: 'Invalid OTP. Please try again.'
      });
    }
    */

    // For testing: Mock OTP verification (accept any OTP)
    console.log(`Mock OTP verification for ${cleanedMobile}: ${otp}`);

    // Handle registration or login
    if (type === 'register') {
      if (!firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: 'First name and last name are required for registration'
        });
      }

      users.set(cleanedMobile, {
        firstName,
        lastName,
        mobile: cleanedMobile,
        createdAt: new Date().toISOString()
      });
      console.log(`User registered: ${firstName} ${lastName} (${cleanedMobile})`);
    } else {
      console.log(`User logged in: ${cleanedMobile}`);
    }

    // Create session token
    const token = crypto.randomBytes(32).toString('hex');

    return res.json({
      success: true,
      message: type === 'login' ? 'Login successful' : 'Registration successful',
      token,
      user: users.get(cleanedMobile)
    });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify OTP. Please try again.'
    });
  }
});

// Traditional form handlers
app.post("/login", async (req, res) => {
  try {
    const { mobile } = req.body;
    const cleanedMobile = mobile ? String(mobile).replace(/\D/g, '') : '';
    res.redirect(users.has(cleanedMobile) ? "/dashboard" : "/login?msg=invalid");
  } catch (err) {
    console.error("Login error:", err);
    res.redirect("/login?msg=error");
  }
});

app.post("/register", async (req, res) => {
  try {
    const { first_name, last_name, phone } = req.body;
    const cleanedPhone = phone ? String(phone).replace(/\D/g, '') : '';

    if (!first_name || !last_name || !validateMobileNumber(cleanedPhone)) {
      return res.redirect("/login?msg=invalid");
    }

    if (users.has(cleanedPhone)) {
      return res.redirect("/login?msg=duplicate");
    }

    users.set(cleanedPhone, {
      firstName: first_name,
      lastName: last_name,
      fullName: `${first_name} ${last_name}`,
      mobile: cleanedPhone,
      createdAt: new Date().toISOString()
    });

    res.redirect("/login?msg=success");
  } catch (err) {
    console.error("Registration error:", err);
    res.redirect("/login?msg=error");
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).send('Something went wrong!');
});

// Start the server
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
  console.log(`🧪 Running in PRODUCTION TESTING mode - Twilio services disabled`);
});