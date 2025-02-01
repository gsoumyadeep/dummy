const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// Database connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Sql@worst123",
    database: "seat_tracker"
});

db.connect(err => {
    if (err) {
        console.error("Database connection failed: " + err.stack);
        return;
    }
    console.log("Connected to database.");
});

// API to auto-book a seat
app.post("/book/seat", (req, res) => {
    const query = `SELECT id FROM seat_availability WHERE is_available = TRUE LIMIT 1`;
    
    db.query(query, (err, result) => {
        if (err || result.length === 0) {
            console.error("No available seats: ", err);
            return res.status(500).json({ error: "No available seats." });
        }
        const seatId = result[0].id;
        
        const insertQuery = `INSERT INTO bookings (seat_id, status) VALUES (?, 'booked')`;
        db.query(insertQuery, [seatId], (err, bookingResult) => {
            if (err) {
                console.error("Error booking seat: ", err);
                return res.status(500).json({ error: "Failed to book seat." });
            }
            
            db.query(`UPDATE seat_availability SET is_available = FALSE WHERE id = ?`, [seatId]);
            res.json({ message: "Seat booked successfully", bookingId: bookingResult.insertId });
        });
    });
});

// API to release seats after booking period ends
app.post("/release/seat/:id", (req, res) => {
    const bookingId = req.params.id;
    const query = `UPDATE seat_availability SET is_available = TRUE WHERE id = (SELECT seat_id FROM bookings WHERE id = ?)`;
    
    db.query(query, [bookingId], (err, result) => {
        if (err) {
            console.error("Error releasing seat: ", err);
            return res.status(500).json({ error: "Failed to release seat." });
        }
        res.json({ message: "Seat released successfully." });
    });
});

// Server listening
app.listen(5000, () => {
    console.log("Server running on port 5000");
});