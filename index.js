const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const db = require("./dbconnect");
const twilio = require("./twlingo");
const rateLimit = require('express-rate-limit');

// Import route modules
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');

require("dotenv").config();

// Generate a random cookie secret if not provided
const generateCookieSecret = () => {
  return crypto.randomBytes(32).toString('hex');
};

const app = express();
const port = process.env.PORT || 3000; // Default port 3000
const cookieSecret = process.env.COOKIE_SECRET || generateCookieSecret();
// For ALLOWED_ORIGIN, we'll default to allowing all origins in development
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';

// Test database connection on startup
db.testConnection();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors({
  origin: allowedOrigin,
  credentials: true
}));
app.use(cookieParser(cookieSecret));
app.use(express.static(path.join(__dirname, "assets")));
app.use(express.static(path.join(__dirname, "public")));
app.disable("x-powered-by");

// Log startup configuration (but not the secret)
console.log(`Server starting with port: ${port}`);
console.log(`CORS allowed origin: ${allowedOrigin}`);

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

// Security middleware to prevent direct access to sensitive files
app.use((req, res, next) => {
  const forbiddenExt = /\.(html|js|json|css)$/;
  const publicPaths = ['/css/', '/js/', '/img/', '/fonts/']; // Allow access to public assets

  // Check if the path is a public asset
  const isPublicAsset = publicPaths.some(path => req.url.startsWith(path));

  if (forbiddenExt.test(req.url) && !isPublicAsset) {
    return res.status(404).sendFile(path.join(__dirname, '404.html'));
  }
  next();
});

// Make sessionManager and requireAuth available to route modules
app.locals.sessionManager = sessionManager;
app.locals.requireAuth = requireAuth;

// Routes
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

// Protected routes - these require authentication
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

// Authentication check endpoint
app.get("/check-auth", async (req, res) => {
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

    // Update session expiry if needed
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

    return res.json({
      authenticated: true,
      user: {
        id: session.user_id,
        name: session.name,
        phone: session.phone,
        gender: session.gender
      },
      redirectTo: "/rooms" // Tell frontend where to redirect
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return res.json({ authenticated: false });
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

// Mount auth routes - IMPORTANT: Keep original API paths
app.use('/api', authRoutes);
app.use('/api', userRoutes);

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

// Serve 404.html for any undefined route
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

// Start server
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});

console.log("Server optimized for high-scale session management");