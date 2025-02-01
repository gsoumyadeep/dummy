const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const schedule = require("node-schedule");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Sql@worst123", // Change this to your MySQL password
  database: "seat_tracker"
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("Connected to MySQL database");
  }
});

// ✅ 1️⃣ Store Team Booking (team_bookings)
app.post("/book", (req, res) => {
  const { floor, members, startTime, endTime } = req.body;

  if (!floor || !members || !startTime || !endTime) {
    return res.status(400).json({ error: "All fields are required!" });
  }

  const sql = "INSERT INTO team_bookings (floor, members, start_time, end_time) VALUES (?, ?, ?, ?)";
  db.query(sql, [floor, members, startTime, endTime], (err, result) => {
    if (err) {
      console.error("Error inserting data:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json({ message: "Booking saved successfully!", bookingId: result.insertId });
  });
});

// ✅ 2️⃣ Get Latest Team Booking Details
app.get("/team/:teamId", (req, res) => {
  const { teamId } = req.params;
  
  db.query("SELECT * FROM team_bookings WHERE id = ? ORDER BY id DESC LIMIT 1",
    [teamId], 
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).json({ message: "No booking found." });

      res.json(results[0]);
    }
  );
});

// ✅ 3️⃣ Book a Conference Room, Meeting Room, or Normal Office Seat
app.post("/book/room", (req, res) => {
    const { teamId, bookingType } = req.body;

    db.query("SELECT * FROM team_bookings WHERE id = ? ORDER BY id DESC LIMIT 1",
        [teamId], 
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length === 0) return res.status(404).json({ message: "No team booking found." });

            const { members, floor, start_time, end_time } = results[0];
            const bookingId = `BKG_${Date.now()}`;

            if (bookingType === "office_seating") {
                db.query(
                    "SELECT id FROM seats WHERE status = 'available' AND floor = ? ORDER BY r_number, seat_number LIMIT ?",
                    [floor, members], (err, results) => {
                        if (err) return res.status(500).json({ error: err.message });
                        if (results.length < members) return res.status(400).json({ error: "Not enough adjacent seats available." });

                        const seatIDs = results.map(seat => seat.id);

                        db.query("UPDATE seats SET status = 'booked', table_name = ?, end_time = ? WHERE id IN (?)",
                            [bookingId, end_time, seatIDs], (updateErr) => {
                                if (updateErr) return res.status(500).json({ error: updateErr.message });

                                res.json({ bookingId, seats: seatIDs });
                            }
                        );
                    }
                );
            } else {
                db.query(
                    "SELECT id FROM rooms WHERE floor = ? AND room_type = ? AND status = 'available' LIMIT 1",
                    [floor, bookingType], (err, results) => {
                        if (err) return res.status(500).json({ error: err.message });
                        if (results.length === 0) return res.status(400).json({ error: "No available rooms." });

                        const roomId = results[0].id;

                        db.query("UPDATE rooms SET status = 'booked', booking_id = ?, end_time = ? WHERE id = ?",
                            [bookingId, end_time, roomId], (updateErr) => {
                                if (updateErr) return res.status(500).json({ error: updateErr.message });

                                res.json({ bookingId, roomId });
                            }
                        );
                    }
                );
            }
        }
    );
});

// ✅ 4️⃣ Auto-Release Expired Bookings Every Minute
schedule.scheduleJob("* * * * *", () => {
    db.query("UPDATE seats SET status = 'available', table_name = NULL WHERE end_time <= NOW() AND status = 'booked'", (err) => {
        if (err) console.error("Error freeing expired seats:", err);
    });

    db.query("UPDATE rooms SET status = 'available', booking_id = NULL WHERE end_time <= NOW() AND status = 'booked'", (err) => {
        if (err) console.error("Error freeing expired rooms:", err);
    });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
