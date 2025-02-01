const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL Database Connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Sql@worst123", // Change if needed
    database: "seat_tracker"
});

db.connect(err => {
    if (err) {
        console.error("❌ Database connection failed:", err);
        return;
    }
    console.log("✅ Connected to MySQL database");
});

// ✅ Convert Time to 24-Hour Format
const convertTo24HourFormat = (time) => {
    const [timePart, modifier] = time.split(" ");
    let [hours, minutes] = timePart.split(":");

    if (modifier === "PM" && hours !== "12") {
        hours = String(parseInt(hours) + 12);
    } else if (modifier === "AM" && hours === "12") {
        hours = "00";
    }

    return `${hours}:${minutes}:00`;
};

// ✅ API to Handle Team Booking (team_booking.html)
app.post("/book/team", (req, res) => {
    const { floor, members, days, startTime, endTime } = req.body;

    if (!floor || !members || !days || !startTime || !endTime) {
        return res.status(400).json({ error: "All fields are required" });
    }

    // Convert time format
    const formattedStartTime = convertTo24HourFormat(startTime);
    const formattedEndTime = convertTo24HourFormat(endTime);

    const query = `
        INSERT INTO team_bookings (floor, members, days, start_time, end_time, created_at) 
        VALUES (?, ?, ?, ?, ?, NOW())
    `;

    db.query(query, [floor, members, days.join(", "), formattedStartTime, formattedEndTime], (err, result) => {
        if (err) {
            console.error("❌ Database error:", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json({ message: "✅ Booking successful", bookingId: result.insertId });
    });
});

// ✅ API to Handle Table Allocation for Meeting Rooms (room_selection.html)
app.post("/allocate-table", (req, res) => {
    const { floor, members } = req.body;

    if (!floor || !members) {
        return res.status(400).json({ error: "Floor and members required" });
    }

    // Step 1: Find an available table on the given floor
    const findTableQuery = `
        SELECT table_id, remaining_seats FROM tables
        WHERE floor = ? AND remaining_seats >= ? AND occupied = 0
        ORDER BY remaining_seats ASC LIMIT 1
    `;

    db.query(findTableQuery, [floor, members], (err, tables) => {
        if (err) {
            console.error("❌ Database error while finding a table:", err);
            return res.status(500).json({ error: "Database error" });
        }

        if (tables.length === 0) {
            return res.status(400).json({ error: "⚠️ No available tables found!" });
        }

        // Step 2: Select the table with the best capacity fit
        const selectedTable = tables[0];
        const tableId = selectedTable.table_id;
        const newRemainingSeats = selectedTable.remaining_seats - members;
        const isTableFull = newRemainingSeats === 0 ? 1 : 0;

        // Step 3: Update the table occupancy
        const updateTableQuery = `
            UPDATE tables SET remaining_seats = ?, occupied = ? WHERE table_id = ?
        `;

        db.query(updateTableQuery, [newRemainingSeats, isTableFull, tableId], (updateErr) => {
            if (updateErr) {
                console.error("❌ Error updating table occupancy:", updateErr);
                return res.status(500).json({ error: "Failed to update table occupancy" });
            }

            // Step 4: Return success response
            res.json({ message: "✅ Table allocated successfully", tableId });
        });
    });
});

// ✅ API to Handle Conference Room Allocation (room_selection.html)
app.post("/allocate-conference-room", (req, res) => {
    const { floor } = req.body;

    if (!floor) {
        return res.status(400).json({ error: "Floor is required" });
    }

    // Find an available conference room on the given floor
    const findRoomQuery = `
        SELECT room_id FROM conference_rooms
        WHERE floor = ? AND occupied = 0
        LIMIT 1
    `;

    db.query(findRoomQuery, [floor], (err, rooms) => {
        if (err) {
            console.error("❌ Database error while finding conference room:", err);
            return res.status(500).json({ error: "Database error" });
        }

        if (rooms.length === 0) {
            return res.status(400).json({ error: "⚠️ No available conference rooms" });
        }

        const selectedRoom = rooms[0];
        const roomId = selectedRoom.room_id;

        // Step 2: Mark the room as occupied
        const updateRoomQuery = `
            UPDATE conference_rooms SET occupied = 1 WHERE room_id = ?
        `;

        db.query(updateRoomQuery, [roomId], (updateErr) => {
            if (updateErr) {
                console.error("❌ Error updating conference room status:", updateErr);
                return res.status(500).json({ error: "Failed to update conference room status" });
            }

            // Step 3: Return success response
            res.json({ message: "✅ Conference room allocated successfully", roomId });
        });
    });
});

// ✅ API to Fetch Confirmation Details for Meeting/Conference Room
app.get("/confirmation/:bookingType", (req, res) => {
    const { bookingType } = req.params;
    let { id } = req.query; // ID will be either tableId (meeting) or roomId (conference)

    if (!id) {
        return res.status(400).json({ error: "Booking ID is required" });
    }

    // ✅ Ensure ID is properly converted to an integer
    id = parseInt(id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid Booking ID" });
    }

    let query;
    if (bookingType === "meeting") {
        query = `SELECT * FROM tables WHERE table_id = ?`;
    } else if (bookingType === "conference") {
        query = `SELECT * FROM conference_rooms WHERE room_id = ?`;
    } else {
        return res.status(400).json({ error: "Invalid booking type" });
    }

    db.query(query, [id], (err, result) => {
        if (err) {
            console.error("❌ Database error while fetching confirmation details:", err);
            return res.status(500).json({ error: "Database error" });
        }

        if (result.length === 0) {
            console.error(`⚠️ No booking found for ID: ${id} (Type: ${bookingType})`);
            return res.status(404).json({ error: "No booking found" });
        }

        res.json(result[0]);
    });
});

// 🌍 Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
