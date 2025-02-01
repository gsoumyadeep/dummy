const express = require("express");
const mysql = require("mysql");
const cors = require("cors");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON data

// Database Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Sql@worst123", // Change to your MySQL password
  database: "seat_tracker"
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("Connected to MySQL database");
  }
});

// API Endpoint to Handle Form Submission
app.post("/solo-book", (req, res) => {
  const { floor, days, startTime, endTime } = req.body;

  if (!floor || !days || !startTime || !endTime) {
    return res.status(400).json({ error: "All fields are required!" });
  }

  const sql = "INSERT INTO solo_bookings (floor, days, start_time, end_time) VALUES (?, ?, ?, ?)";
  db.query(sql, [floor, days.join(", "), startTime, endTime], (err, result) => {
    if (err) {
      console.error("Error inserting data:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json({ message: "Solo Booking saved successfully!", bookingId: result.insertId });
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
