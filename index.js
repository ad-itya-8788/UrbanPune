const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const db = require("./dbconnect");
const twilio = require("./twlingo");
require("dotenv").config();

const app = express();
const port = process.env.PORT;

// Test database connection on startup
db.testConnection();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.use(cookieParser(process.env.COOKIE_SECRET || "your-secret-key"));
app.use(express.static(path.join(__dirname, "assets")));
app.disable("x-powered-by");

// Session management functions
const sessionManager = {
  // Generate a secure random session ID
  generateSessionId: () => {
    return crypto.randomBytes(32).toString('hex');
  },

  // Create a new session in the database
  createSession: async (userId, req) => {
    if (!userId) {
      throw new Error("User ID is required for session creation");
    }

    const sessionId = sessionManager.generateSessionId();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.query(
      `INSERT INTO sessions 
       (session_id, user_id, data, expires_at, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        sessionId,
        userId,
        JSON.stringify({}),
        expiresAt,
        req.ip,
        req.headers['user-agent']
      ]
    );

    return { sessionId, expiresAt };
  },

  // Get session data from database
  getSession: async (sessionId) => {
    if (!sessionId) return null;

    const result = await db.query(
      `SELECT s.*, u.name, u.phone, u.gender
       FROM sessions s
       JOIN users u ON s.user_id = u.u_id
       WHERE s.session_id = $1 AND s.expires_at > NOW()`,
      [sessionId]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0];
  },

  // Delete a session
  deleteSession: async (sessionId) => {
    if (!sessionId) return;

    await db.query(
      `DELETE FROM sessions WHERE session_id = $1`,
      [sessionId]
    );
  },

  // Update session expiry time
  updateSession: async (sessionId) => {
    if (!sessionId) return;

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.query(
      `UPDATE sessions 
       SET expires_at = $1, updated_at = NOW() 
       WHERE session_id = $2`,
      [expiresAt, sessionId]
    );

    return expiresAt;
  },

  // Clean up expired sessions (should be run periodically)
  cleanupSessions: async () => {
    await db.query(`DELETE FROM sessions WHERE expires_at < NOW()`);
  }
};

// Authentication middleware
const requireAuth = async (req, res, next) => {
  const sessionId = req.cookies.sessionId;

  if (!sessionId) {
    if (req.accepts('html')) {
      return res.redirect('/login?msg=Please login first');
    }
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const session = await sessionManager.getSession(sessionId);

    if (!session) {
      res.clearCookie('sessionId');
      if (req.accepts('html')) {
        return res.redirect('/login?msg=Session expired');
      }
      return res.status(401).json({ success: false, message: "Session expired" });
    }

    // Attach user data to request
    req.user = {
      id: session.user_id,
      name: session.name,
      phone: session.phone,
      gender: session.gender
    };

    // Extend session if more than 1 hour has passed since last update
    const lastUpdated = new Date(session.updated_at);
    if (Date.now() - lastUpdated.getTime() > 60 * 60 * 1000) {
      const newExpiry = await sessionManager.updateSession(sessionId);
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: newExpiry,
        sameSite: 'lax'
      });
    }

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    if (req.accepts('html')) {
      return res.redirect('/login?msg=Authentication error');
    }
    return res.status(500).json({ success: false, message: "Authentication error" });
  }
};

// Static file serving helper
const serveStatic = (fileName) => (req, res) => {
  res.sendFile(path.join(__dirname, "public", fileName));
};

// Routes
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

// Protected routes
app.get("/rooms", requireAuth, serveStatic("rooms.html"));
app.get("/list", requireAuth, serveStatic("list.html"));
app.get("/profile", requireAuth, serveStatic("profile.html"));
app.get("/add", requireAuth, serveStatic("add.html"));

// Public routes
app.get("/how-it-works", serveStatic("how-it-works.html"));
app.get("/help", serveStatic("help.html"));
app.get("/login", serveStatic("login.html"));
app.get("/about", serveStatic("aboutus.html"));
app.get("/privacy-policy", serveStatic("privacy-policy.html"));

// Session check endpoint
app.get("/api/session-check", async (req, res) => {
  const sessionId = req.cookies.sessionId;

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

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({
      status: "UP",
      database: "CONNECTED",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.json({
      status: "UP",
      database: "DISCONNECTED",
      timestamp: new Date().toISOString(),
      error: err.message
    });
  }
});

// Validate mobile number
const validateMobileNumber = (mobile) => {
  const mobileStr = String(mobile).replace(/\D/g, "");
  return mobileStr.length === 10;
};

// Send OTP
app.post("/api/send-otp", async (req, res) => {
  try {
    const { mobile, type, firstName, lastName } = req.body;

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
        mobile: cleanedMobile
      }), { maxAge: 10 * 60 * 1000, httpOnly: true }); // 10 minutes
    } else {
      res.cookie('login', JSON.stringify({
        mobile: cleanedMobile
      }), { maxAge: 10 * 60 * 1000, httpOnly: true }); // 10 minutes
    }

    // Try to send OTP with Twilio
    try {
      const result = await twilio.sendOTP(`+91${cleanedMobile}`);

      // For development mode
      if (result.development && result.testOtp) {
        return res.json({
          success: true,
          message: "Development mode: OTP simulation successful",
          testOtp: result.testOtp // Only in development!
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
app.post("/api/verify-otp", async (req, res) => {
  try {
    const { otp, mobile, type } = req.body;
    let cleanedMobile = String(mobile || "").replace(/\D/g, "");

    // Get registration data from cookies
    let firstName = req.body.firstName;
    let lastName = req.body.lastName;
    const gender = req.body.gender;

    // If mobile not in request, try to get from cookies
    if (!cleanedMobile) {
      if (type === "register" && req.cookies.registration) {
        const registration = JSON.parse(req.cookies.registration);
        cleanedMobile = registration.mobile;
        firstName = firstName || registration.firstName;
        lastName = lastName || registration.lastName;
      } else if (type === "login" && req.cookies.login) {
        const login = JSON.parse(req.cookies.login);
        cleanedMobile = login.mobile;
      }
    }

    if (!validateMobileNumber(cleanedMobile) || !otp || otp.length < 4) {
      return res.status(400).json({ success: false, message: "Invalid mobile or OTP" });
    }

    // For registration, validate firstName and lastName
    if (type === "register" && (!firstName || !lastName)) {
      return res.status(400).json({ success: false, message: "First and last name required" });
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
          [`${firstName} ${lastName}`, `+91${cleanedMobile}`, gender, new Date()]
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
app.get("/logout", async (req, res) => {
  const sessionId = req.cookies.sessionId;

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
app.post("/login", async (req, res) => {
  const { mobile } = req.body;
  const cleanedMobile = String(mobile).replace(/\D/g, "");

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
app.post("/register", async (req, res) => {
  const { first_name, last_name, phone } = req.body;
  const cleanedPhone = String(phone).replace(/\D/g, "");

  if (!first_name || !last_name || !validateMobileNumber(cleanedPhone)) {
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
      "INSERT INTO users(name, phone, created_at) VALUES($1, $2, $3) RETURNING *",
      [`${first_name} ${last_name}`, `+91${cleanedPhone}`, new Date()]
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

// Scheduled task to clean up expired sessions (run this with a cron job)
app.get("/api/cleanup-sessions", async (req, res) => {
  try {
    await sessionManager.cleanupSessions();
    res.json({ success: true, message: "Expired sessions cleaned up" });
  } catch (error) {
    console.error("Session cleanup error:", error);
    res.status(500).json({ success: false, message: "Failed to clean up sessions" });
  }
});

// Error middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).send("Something went wrong!");
});

// Start server
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});

console.log("Server optimized for high-scale session management");