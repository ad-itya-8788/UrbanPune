const express = require("express")
const cors = require("cors")
const path = require("path")
const crypto = require("crypto")
const { Client } = require("pg")
const session = require("express-session")
require("dotenv").config()

const app = express()
const port = process.env.PORT || 3000

// Log environment variables (without sensitive data)
console.log("Environment variables check:", {
  DB_USER_EXISTS: !!process.env.DB_USER,
  DB_HOST_EXISTS: !!process.env.DB_HOST,
  DB_NAME_EXISTS: !!process.env.DB_NAME,
  DB_PASSWORD_EXISTS: !!process.env.DB_PASSWORD,
  DB_PORT_EXISTS: !!process.env.DB_PORT,
  DB_SSL_REJECT_UNAUTHORIZED: process.env.DB_SSL_REJECT_UNAUTHORIZED,
})

// Database client with fixed connection handling
const dbConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number.parseInt(process.env.DB_PORT),
  ssl: {
    // Force SSL to false if the server doesn't support it
    rejectUnauthorized: false,
  },
}

console.log("Database config (without password):", {
  ...dbConfig,
  password: "******",
})

const dbClient = new Client(dbConfig)

// Connect to database with better error handling
dbClient
  .connect()
  .then(() => console.log("✅ Connected to database"))
  .catch((err) => {
    console.error("Database connection error:", err.message)
    // Continue running the app even if DB connection fails
  })

// Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioClient = require("twilio")(accountSid, authToken)
const serviceSid = process.env.TWILIO_SERVICE_SID

// Session middleware with stronger settings
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
    },
  }),
)

// Middleware
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cors())
app.use(express.static(path.join(__dirname, "assets")))
app.disable("x-powered-by")

// Enhanced Authentication middleware
const requireAuth = (req, res, next) => {
  console.log("Auth check - Session:", req.session.user ? "User exists" : "No user")

  if (!req.session.user) {
    console.log("Unauthorized access attempt to:", req.originalUrl)
    if (req.accepts("html")) {
      return res.redirect("/login?msg=Please login first")
    }
    return res.status(401).json({ success: false, message: "Unauthorized" })
  }
  next()
}

// Static file serving helper
const serveStatic = (fileName) => (req, res) => {
  res.sendFile(path.join(__dirname, "public", fileName))
}

// Routes
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")))

// Protected routes with strict authentication
app.get("/rooms", requireAuth, (req, res) => {
  console.log("Accessing rooms with user:", req.session.user?.name)
  serveStatic("rooms.html")(req, res)
})

app.get("/list", requireAuth, serveStatic("list.html"))
app.get("/how-it-works", serveStatic("how-it-works.html"))
app.get("/help", serveStatic("help.html"))
app.get("/login", serveStatic("login.html"))
app.get("/about", serveStatic("aboutus.html"))
app.get("/privacy-policy", serveStatic("privacy-policy.html"))
// Removed dashboard route as requested
app.get("/profile", requireAuth, serveStatic("profile.html"))
app.get("/add", requireAuth, serveStatic("add.html"))

// Session check endpoint
app.get("/api/session-check", (req, res) => {
  if (req.session.user) {
    return res.json({
      authenticated: true,
      user: {
        name: req.session.user.name,
        phone: req.session.user.phone,
      },
    })
  }
  return res.json({ authenticated: false })
})

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    await dbClient.query("SELECT 1")
    res.json({
      status: "UP",
      database: "CONNECTED",
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    res.json({
      status: "UP",
      database: "DISCONNECTED",
      timestamp: new Date().toISOString(),
      error: err.message,
    })
  }
})

// Validate mobile number
const validateMobileNumber = (mobile) => {
  const mobileStr = String(mobile).replace(/\D/g, "")
  return mobileStr.length === 10
}

// Send OTP with better error handling - FIXED SYNTAX ERROR
app.post("/api/send-otp", async (req, res) => {
  try {
    // Fixed the syntax error here - added comma between type and firstName
    const { mobile, type, firstName, lastName } = req.body

    // Validate required fields
    if (!mobile) {
      return res.status(400).json({ success: false, message: "Mobile number is required" })
    }

    const cleanedMobile = String(mobile).replace(/\D/g, "")

    console.log("Send OTP request:", {
      mobile: cleanedMobile,
      type: type || "unknown",
      hasFirstName: !!firstName,
      hasLastName: !!lastName,
    })

    if (!validateMobileNumber(cleanedMobile)) {
      return res.status(400).json({ success: false, message: "Invalid mobile number" })
    }

    // For registration, validate firstName and lastName before sending OTP
    if (type === "register") {
      if (!firstName || !lastName) {
        return res.status(400).json({ success: false, message: "First and last name required" })
      }
    }

    // Check if user exists in database
    let userExists = false
    try {
      const userCheck = await dbClient.query("SELECT * FROM users WHERE phone = $1", [`+91${cleanedMobile}`])
      userExists = userCheck.rows.length > 0
      console.log("User exists check:", userExists)
    } catch (dbError) {
      console.error("Database query error:", dbError.message)
      // Continue with OTP flow even if DB check fails
    }

    if (type === "login" && !userExists) {
      return res.status(404).json({ success: false, message: "User not found. Register first." })
    }

    if (type === "register" && userExists) {
      return res.status(409).json({ success: false, message: "Already registered. Please login." })
    }

    // Store firstName and lastName in session for later use during verification
    if (type === "register") {
      if (!req.session.registration) {
        req.session.registration = {}
      }
      req.session.registration.firstName = firstName
      req.session.registration.lastName = lastName
      req.session.registration.mobile = cleanedMobile
      req.session.save()
    } else {
      // For login, store mobile
      req.session.login = {
        mobile: cleanedMobile,
      }
      req.session.save()
    }

    const verification = await twilioClient.verify.v2
      .services(serviceSid)
      .verifications.create({ to: `+91${cleanedMobile}`, channel: "sms" })

    console.log(`OTP sent to ${cleanedMobile}: ${verification.status}`)
    return res.json({ success: true, message: "OTP sent successfully" })
  } catch (error) {
    console.error("Error sending OTP:", error.message)
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
})

// Verify OTP with improved error handling
app.post("/api/verify-otp", async (req, res) => {
  try {
    const { otp, mobile, type } = req.body
    let cleanedMobile = String(mobile || "").replace(/\D/g, "")

    // Get firstName and lastName from request body or session
    let firstName = req.body.firstName
    let lastName = req.body.lastName
    const gender = req.body.gender

    console.log("Verify OTP request:", {
      mobile: cleanedMobile,
      type: type || "unknown",
      hasOtp: !!otp,
      sessionRegistration: !!req.session.registration,
      sessionLogin: !!req.session.login,
    })

    // If mobile not in request, try to get from session
    if (!cleanedMobile) {
      if (type === "register" && req.session.registration) {
        cleanedMobile = req.session.registration.mobile
      } else if (type === "login" && req.session.login) {
        cleanedMobile = req.session.login.mobile
      }
    }

    // If registration and names not in request, try to get from session
    if (type === "register" && (!firstName || !lastName)) {
      if (req.session.registration) {
        firstName = req.session.registration.firstName
        lastName = req.session.registration.lastName
      }
    }

    if (!validateMobileNumber(cleanedMobile) || !otp || otp.length < 4) {
      return res.status(400).json({ success: false, message: "Invalid mobile or OTP" })
    }

    // For registration, validate firstName and lastName
    if (type === "register" && (!firstName || !lastName)) {
      return res.status(400).json({ success: false, message: "First and last name required" })
    }

    try {
      const verificationCheck = await twilioClient.verify.v2
        .services(serviceSid)
        .verificationChecks.create({ to: `+91${cleanedMobile}`, code: otp })

      if (verificationCheck.status !== "approved") {
        return res.status(401).json({ success: false, message: "Invalid OTP" })
      }
    } catch (twilioError) {
      console.error("Twilio verification error:", twilioError.message)
      return res.status(401).json({ success: false, message: "OTP verification failed" })
    }

    let user = null
    if (type === "register") {
      // Try to save to database
      try {
        const result = await dbClient.query(
          "INSERT INTO users(name, phone, gender, created_at) VALUES($1, $2, $3, $4) RETURNING *",
          [`${firstName} ${lastName}`, `+91${cleanedMobile}`, gender, new Date()],
        )
        user = result.rows[0]
        console.log("User registered successfully:", user.name)
      } catch (dbError) {
        console.error("Database error during registration:", dbError.message)
        return res.status(500).json({
          success: false,
          message: "Registration failed. Database error.",
          error: process.env.NODE_ENV === "development" ? dbError.message : undefined,
        })
      }

      // Clear registration data from session
      if (req.session.registration) {
        delete req.session.registration
      }
    } else {
      // Login flow
      try {
        const result = await dbClient.query("SELECT * FROM users WHERE phone = $1", [`+91${cleanedMobile}`])
        if (result.rows.length === 0) {
          return res.status(404).json({ success: false, message: "User not found" })
        }
        user = result.rows[0]
        console.log("User logged in successfully:", user.name)
      } catch (dbError) {
        console.error("Database error during login:", dbError.message)
        return res.status(500).json({
          success: false,
          message: "Login failed. Database error.",
          error: process.env.NODE_ENV === "development" ? dbError.message : undefined,
        })
      }

      // Clear login data from session
      if (req.session.login) {
        delete req.session.login
      }
    }

    // Create session
    req.session.user = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      gender: user.gender,
      createdAt: user.created_at,
    }

    // Force session save
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err)
      }

      return res.json({
        success: true,
        message: type === "login" ? "Login successful" : "Registration successful",
        redirectTo: "/rooms",
        user: {
          name: user.name,
          phone: user.phone,
        },
      })
    })
  } catch (error) {
    console.error("OTP Verification error:", error.message)
    return res.status(500).json({
      success: false,
      message: "OTP verification failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
})

// Logout route
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err)
      return res.redirect("/profile?msg=logout_failed")
    }
    res.redirect("/login?msg=logged_out")
  })
})

// Form login (alternative to OTP)
app.post("/login", async (req, res) => {
  const { mobile } = req.body
  const cleanedMobile = String(mobile).replace(/\D/g, "")

  console.log("Form login attempt for:", cleanedMobile)

  try {
    if (!validateMobileNumber(cleanedMobile)) {
      return res.redirect("/login?msg=invalid_mobile")
    }

    const result = await dbClient.query("SELECT * FROM users WHERE phone = $1", [`+91${cleanedMobile}`])
    if (result.rows.length === 0) {
      return res.redirect("/login?msg=invalid")
    }

    req.session.user = {
      id: result.rows[0].id,
      name: result.rows[0].name,
      phone: result.rows[0].phone,
      createdAt: result.rows[0].created_at,
    }

    // Force session save before redirect
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err)
        return res.redirect("/login?msg=session_error")
      }
      console.log("Login successful, redirecting to rooms")
      res.redirect("/rooms")
    })
  } catch (error) {
    console.error("Login error:", error.message)
    res.redirect("/login?msg=error")
  }
})

// Form register (alternative to OTP)
app.post("/register", async (req, res) => {
  const { first_name, last_name, phone } = req.body
  const cleanedPhone = String(phone).replace(/\D/g, "")

  console.log("Form registration attempt:", { first_name, last_name, phone: cleanedPhone })

  if (!first_name || !last_name || !validateMobileNumber(cleanedPhone)) {
    return res.redirect("/login?msg=invalid")
  }

  try {
    // Check if user exists
    const checkResult = await dbClient.query("SELECT * FROM users WHERE phone = $1", [`+91${cleanedPhone}`])
    if (checkResult.rows.length > 0) {
      return res.redirect("/login?msg=duplicate")
    }

    // Insert new user
    const result = await dbClient.query("INSERT INTO users(name, phone, created_at) VALUES($1, $2, $3) RETURNING *", [
      `${first_name} ${last_name}`,
      `+91${cleanedPhone}`,
      new Date(),
    ])

    // Create session
    req.session.user = {
      id: result.rows[0].id,
      name: result.rows[0].name,
      phone: result.rows[0].phone,
      createdAt: result.rows[0].created_at,
    }

    // Force session save before redirect
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err)
        return res.redirect("/login?msg=session_error")
      }
      console.log("Registration successful, redirecting to rooms")
      res.redirect("/rooms")
    })
  } catch (error) {
    console.error("Registration error:", error.message)
    res.redirect("/login?msg=error")
  }
})

// Error middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err)
  res.status(500).send("Something went wrong!")
})

// Start server
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`)
})

console.log("Server code updated with fixes for database connection and authentication flow")
