const express = require('express');
const router = express.Router();
const db = require('../dbconnect');

// Get user data
router.get("/user-data", async (req, res) => {
  const requireAuth = req.app.locals.requireAuth;

  // Apply the requireAuth middleware
  requireAuth(req, res, async () => {
    try {
      // Use a simple query with a timeout to prevent hanging
      const result = await Promise.race([
        db.query("SELECT * FROM users WHERE u_id = $1", [req.user.id]),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Database query timeout")), 5000)),
      ]);

      if (!result || !result.rows || result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Return user data
      res.json({
        success: true,
        user: result.rows[0],
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch user data",
      });
    }
  });
});




module.exports = router;