const express = require('express');
const router = express.Router();
const db = require('../dbconnect');
const twilio = require('../twlingo');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Rate limiter for OTP requests
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // max 3 requests per 15 minutes per IP
  message: "Too many OTP requests. Please try again later."
});

// Validate mobile number
const validateMobileNumber = (mobile) => {
  const mobileStr = String(mobile).replace(/\D/g, "");
  return mobileStr.length === 10;
};

// Send OTP
router.post("/send-otp", async (req, res) => {
  try {
    const { mobile, type, firstName, lastName, gender } = req.body;

    if (!mobile) {
      return res.status(400).json({ success: false, message: "Mobile number is required" });
    }

    const cleanedMobile = String(mobile).replace(/\D/g, "");

    if (!validateMobileNumber(cleanedMobile)) {
      return res.status(400).json({ success: false, message: "Invalid mobile number" });
    }

    // For registration, validate firstName and lastName
    if (type === "register") {
      if (!firstName || !lastName) {
        return res.status(400).json({ success: false, message: "First and last name required" });
      }

      if (!gender) {
        return res.status(400).json({ success: false, message: "Gender is required" });
      }
    }

    // Check if user exists in database
    let userExists = false;
    try {
      const userCheck = await db.query("SELECT * FROM users WHERE phone = $1", [`+91${cleanedMobile}`]);
      userExists = userCheck.rows.length > 0;
    } catch (dbError) {
      console.error("Database query error:", dbError.message);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    if (type === "login" && !userExists) {
      return res.status(404).json({ success: false, message: "User not found. Register first." });
    }

    if (type === "register" && userExists) {
      return res.status(409).json({ success: false, message: "Already registered. Please login." });
    }

    // Store registration data in a temporary cookie
    if (type === "register") {
      res.cookie('registration', JSON.stringify({
        firstName,
        lastName,
        gender,
        mobile: cleanedMobile
      }), {
        maxAge: 10 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      }); // 10 minutes
    } else {
      res.cookie('login', JSON.stringify({
        mobile: cleanedMobile
      }), {
        maxAge: 10 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      }); // 10 minutes
    }

    // Try to send OTP with Twilio
    try {
      const result = await twilio.sendOTP(`+91${cleanedMobile}`);

      // For development mode
      if (result.development && result.testOtp) {
        return res.json({
          success: true,
          message: "Development mode: OTP simulation successful",
          testOtp: process.env.NODE_ENV === 'development' ? result.testOtp : undefined // Only in development!
        });
      }

      return res.json({ success: true, message: "OTP sent successfully" });
    } catch (twilioError) {
      console.error("Twilio error:", twilioError.message);
      return res.status(500).json({ success: false, message: "Failed to send OTP" });
    }
  } catch (error) {
    console.error("Error sending OTP:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP"
    });
  }
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
  try {
    const { otp, mobile, type, firstName, lastName, gender } = req.body;
    let cleanedMobile = String(mobile || "").replace(/\D/g, "");
    const sessionManager = req.app.locals.sessionManager;

    // Get registration data from cookies if not in request body
    let userFirstName = firstName;
    let userLastName = lastName;
    let userGender = gender;

    // If mobile not in request, try to get from cookies
    if (!cleanedMobile) {
      if (type === "register" && req.cookies.registration) {
        const registration = JSON.parse(req.cookies.registration);
        cleanedMobile = registration.mobile;
        userFirstName = userFirstName || registration.firstName;
        userLastName = userLastName || registration.lastName;
        userGender = userGender || registration.gender;
      } else if (type === "login" && req.cookies.login) {
        const login = JSON.parse(req.cookies.login);
        cleanedMobile = login.mobile;
      }
    }

    if (!validateMobileNumber(cleanedMobile) || !otp || otp.length < 4) {
      return res.status(400).json({ success: false, message: "Invalid mobile or OTP" });
    }

    // For registration, validate firstName and lastName
    if (type === "register" && (!userFirstName || !userLastName || !userGender)) {
      return res.status(400).json({ success: false, message: "First name, last name, and gender required" });
    }

    // Verify OTP with Twilio
    let otpVerified = false;
    try {
      const result = await twilio.verifyOTP(`+91${cleanedMobile}`, otp);
      otpVerified = result.verified;

      // For development mode
      if (result.development) {
        console.log("Development mode OTP verification:", result);
      }
    } catch (twilioError) {
      console.error("Twilio verification error:", twilioError.message);
      return res.status(401).json({ success: false, message: "OTP verification failed" });
    }

    if (!otpVerified) {
      return res.status(401).json({ success: false, message: "Invalid OTP" });
    }

    let user = null;
    if (type === "register") {
      // Try to save to database
      try {
        const result = await db.query(
          "INSERT INTO users(name, phone, gender, created_at) VALUES($1, $2, $3, $4) RETURNING *",
          [`${userFirstName} ${userLastName}`, `+91${cleanedMobile}`, userGender, new Date()]
        );
        user = result.rows[0];
      } catch (dbError) {
        console.error("Database error during registration:", dbError.message);
        return res.status(500).json({
          success: false,
          message: "Registration failed. Database error."
        });
      }

      // Clear registration cookie
      res.clearCookie('registration');
    } else {
      // Login flow
      try {
        const result = await db.query("SELECT * FROM users WHERE phone = $1", [`+91${cleanedMobile}`]);
        if (result.rows.length === 0) {
          return res.status(404).json({ success: false, message: "User not found" });
        }
        user = result.rows[0];
      } catch (dbError) {
        console.error("Database error during login:", dbError.message);
        return res.status(500).json({
          success: false,
          message: "Login failed. Database error."
        });
      }

      // Clear login cookie
      res.clearCookie('login');
    }

    // Create session in database
    try {
      // Make sure we have a valid user ID (u_id in the users table)
      if (!user || !user.u_id) {
        console.error("Missing user ID:", user);
        return res.status(500).json({
          success: false,
          message: "Failed to create session: Missing user ID"
        });
      }

      const { sessionId, expiresAt } = await sessionManager.createSession(user.u_id, req);

      // Set session cookie
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: expiresAt,
        sameSite: 'lax'
      });

      return res.json({
        success: true,
        message: type === "login" ? "Login successful" : "Registration successful",
        redirectTo: "/rooms",
        user: {
          name: user.name,
          phone: user.phone
        }
      });
    } catch (sessionError) {
      console.error("Session creation error:", sessionError);
      return res.status(500).json({
        success: false,
        message: "Failed to create session: " + sessionError.message
      });
    }
  } catch (error) {
    console.error("OTP Verification error:", error.message);
    return res.status(500).json({
      success: false,
      message: "OTP verification failed"
    });
  }
});

// Logout route
router.get("/logout", async (req, res) => {
  const sessionId = req.cookies.sessionId;
  const sessionManager = req.app.locals.sessionManager;

  if (sessionId) {
    try {
      await sessionManager.deleteSession(sessionId);
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  }

  res.clearCookie('sessionId');
  res.redirect("/login?msg=logged_out");
});

// Form login (alternative to OTP)
router.post("/login", async (req, res) => {
  const { mobile } = req.body;
  const cleanedMobile = String(mobile).replace(/\D/g, "");
  const sessionManager = req.app.locals.sessionManager;

  try {
    if (!validateMobileNumber(cleanedMobile)) {
      return res.redirect("/login?msg=invalid_mobile");
    }

    const result = await db.query("SELECT * FROM users WHERE phone = $1", [`+91${cleanedMobile}`]);
    if (result.rows.length === 0) {
      return res.redirect("/login?msg=invalid");
    }

    const user = result.rows[0];

    // Make sure we have a valid user ID (u_id in the users table)
    if (!user || !user.u_id) {
      console.error("Missing user ID:", user);
      return res.redirect("/login?msg=user_error");
    }

    // Create session in database
    const { sessionId, expiresAt } = await sessionManager.createSession(user.u_id, req);

    // Set session cookie
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: expiresAt,
      sameSite: 'lax'
    });

    res.redirect("/rooms");
  } catch (error) {
    console.error("Login error:", error.message);
    res.redirect("/login?msg=error");
  }
});

// Form register (alternative to OTP)
router.post("/register", async (req, res) => {
  const { first_name, last_name, phone, gender } = req.body;
  const cleanedPhone = String(phone).replace(/\D/g, "");
  const sessionManager = req.app.locals.sessionManager;

  if (!first_name || !last_name || !validateMobileNumber(cleanedPhone) || !gender) {
    return res.redirect("/login?msg=invalid");
  }

  try {
    // Check if user exists
    const checkResult = await db.query("SELECT * FROM users WHERE phone = $1", [`+91${cleanedPhone}`]);
    if (checkResult.rows.length > 0) {
      return res.redirect("/login?msg=duplicate");
    }

    // Insert new user
    const result = await db.query(
      "INSERT INTO users(name, phone, gender, created_at) VALUES($1, $2, $3, $4) RETURNING *",
      [`${first_name} ${last_name}`, `+91${cleanedPhone}`, gender, new Date()]
    );

    const user = result.rows[0];

    // Make sure we have a valid user ID (u_id in the users table)
    if (!user || !user.u_id) {
      console.error("Missing user ID:", user);
      return res.redirect("/login?msg=user_error");
    }

    // Create session in database
    const { sessionId, expiresAt } = await sessionManager.createSession(user.u_id, req);

    // Set session cookie
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: expiresAt,
      sameSite: 'lax'
    });

    res.redirect("/rooms");
  } catch (error) {
    console.error("Registration error:", error.message);
    res.redirect("/login?msg=error");
  }
});

// Session check endpoint
router.get("/session-check", async (req, res) => {
  const sessionId = req.cookies.sessionId;
  const sessionManager = req.app.locals.sessionManager;

  if (!sessionId) {
    return res.json({ authenticated: false });
  }

  try {
    const session = await sessionManager.getSession(sessionId);

    if (!session) {
      res.clearCookie('sessionId');
      return res.json({ authenticated: false });
    }

    return res.json({
      authenticated: true,
      user: {
        name: session.name,
        phone: session.phone
      }
    });
  } catch (error) {
    console.error("Session check error:", error);
    return res.json({ authenticated: false, error: "Session check failed" });
  }
});
router.get("/logout", (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        return res.status(500).json({ success: false, message: "Logout failed" });
      } else {
        return res.json({ success: true, message: "Logged out successfully" });
      }
    });
  } else {
    return res.json({ success: true, message: "No active session" });
  }
});
module.exports = router;