const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();

// =========================================================
// CORS CONFIGURATION
// =========================================================

app.use(cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
}));

// =========================================================
// MIDDLEWARE
// =========================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "frontend")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =========================================================
// CREATE UPLOAD FOLDER
// =========================================================

const uploadDir = path.join(__dirname, "uploads", "bible-studies");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// =========================================================
// MULTER FILE UPLOAD
// =========================================================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const name = Date.now() + "-" + file.originalname;
        cb(null, name);
    }
});

const upload = multer({ storage: storage });

// =========================================================
// MYSQL DATABASE
// =========================================================

const db = mysql.createConnection({
    host: "localhost",
    user: "myethel",
    password: "123456",
    database: "auth_db"
});

db.connect((err) => {
    if (err) {
        console.log("Database connection failed:", err.message);
    } else {
        console.log("Connected to MySQL");
    }
});

// Helper to format ISO or local date string to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
function formatToMySQLDate(dateString) {
    if (!dateString) return new Date().toISOString().slice(0, 19).replace('T', ' ');
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    // Convert to local ISO format for MySQL
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// =========================================================
// HOME PAGE
// =========================================================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

// =========================================================
// REGISTER MEMBER
// =========================================================

app.post("/register", (req, res) => {
    const {
        firstName,
        lastName,
        yearOfStudy,
        programOfStudy,
        email,
        password,
        agreedMission
    } = req.body;

    if (!firstName || !lastName || !yearOfStudy || !programOfStudy || !email || !password) {
        return res.status(400).json({ message: "Fill all required fields" });
    }

    db.query("SELECT id FROM members WHERE email=?", [email], async (err, result) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (result.length > 0) return res.status(400).json({ message: "Email already exists" });

        const hashed = await bcrypt.hash(password, 10);

        db.query("SELECT MAX(id) AS maxId FROM members", (err, data) => {
            let next = ((data && data[0] && data[0].maxId) || 0) + 1;
            let memberNumber = "FCC-" + new Date().getFullYear() + "-" + String(next).padStart(4, "0");

            const sql = `
                INSERT INTO members
                (firstName, lastName, yearOfStudy, programOfStudy, email, password, agreedMission, memberNumber)
                VALUES(?,?,?,?,?,?,?,?)
            `;

            db.query(sql, [firstName, lastName, yearOfStudy, programOfStudy, email, hashed, agreedMission ? 1 : 0, memberNumber], (err) => {
                if (err) {
                    console.error("Register Error:", err);
                    return res.status(500).json({ message: "Registration failed" });
                }
                res.json({ message: "Registration successful", memberNumber });
            });
        });
    });
});

// =========================================================
// LOGIN MEMBER
// =========================================================

app.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
    }

    db.query("SELECT * FROM members WHERE email=?", [email], async (err, result) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (result.length === 0) return res.status(404).json({ message: "User not found" });

        const member = result[0];
        const match = await bcrypt.compare(password, member.password);

        if (!match) return res.status(401).json({ message: "Incorrect password" });

        res.json({
            message: "Login successful",
            user: {
                id: member.id,
                firstName: member.firstName,
                lastName: member.lastName,
                email: member.email,
                yearOfStudy: member.yearOfStudy,
                programOfStudy: member.programOfStudy,
                memberNumber: member.memberNumber
            }
        });
    });
});

// =========================================================
// UPDATE PROFILE & CHANGE PASSWORD & MEMBERS
// =========================================================

app.put("/update-profile", (req, res) => {
    const { email, firstName, lastName, programOfStudy, yearOfStudy } = req.body;
    const sql = `UPDATE members SET firstName=?, lastName=?, programOfStudy=?, yearOfStudy=? WHERE email=?`;
    db.query(sql, [firstName, lastName, programOfStudy, yearOfStudy, email], (err) => {
        if (err) return res.status(500).json({ message: "Profile update failed" });
        res.json({ message: "Profile updated successfully" });
    });
});

app.put("/change-password", (req, res) => {
    const { email, currentPassword, newPassword } = req.body;

    db.query("SELECT * FROM members WHERE email=?", [email], async (err, result) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (result.length === 0) return res.status(404).json({ message: "Member not found" });

        const member = result[0];
        const check = await bcrypt.compare(currentPassword, member.password);
        if (!check) return res.status(401).json({ message: "Current password incorrect" });

        const newHash = await bcrypt.hash(newPassword, 10);
        db.query("UPDATE members SET password=? WHERE email=?", [newHash, email], (err) => {
            if (err) return res.status(500).json({ message: "Password update failed" });
            res.json({ message: "Password changed successfully" });
        });
    });
});

app.get("/members", (req, res) => {
    db.query("SELECT id, firstName, lastName, email, programOfStudy, yearOfStudy, memberNumber FROM members ORDER BY id DESC", (err, result) => {
        if (err) return res.status(500).json({ message: "Database error" });
        res.json(result);
    });
});

app.delete("/members/:id", (req, res) => {
    db.query("DELETE FROM members WHERE id=?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Failed deleting member" });
        res.json({ message: "Member deleted" });
    });
});

// =========================================================
// EVENTS SECTION (FIXED)
// =========================================================

// GET EVENTS
app.get("/events", (req, res) => {
    // Safely fetch all upcoming or present events without aggressive auto-delete
    db.query("SELECT * FROM events ORDER BY eventDate ASC", (err, result) => {
        if (err) {
            console.error("GET /events error:", err);
            return res.status(500).json({ message: "Cannot fetch events" });
        }
        res.json(result);
    });
});

// ADD EVENT
app.post("/events", (req, res) => {
    // Extract key names with fallbacks to handle frontend data safely
    const title = req.body.title || req.body.name || req.body.event_name;
    const description = req.body.description || req.body.desc || "";
    const rawDate = req.body.eventDate || req.body.date || req.body.event_date;
    const location = req.body.location || req.body.venue || req.body.place;

    if (!title || !rawDate || !location) {
        return res.status(400).json({ message: "Missing event information" });
    }

    const formattedDate = formatToMySQLDate(rawDate);

    const sql = `INSERT INTO events (title, description, eventDate, location) VALUES (?, ?, ?, ?)`;

    db.query(sql, [title, description, formattedDate, location], (err, result) => {
        if (err) {
            console.error("POST /events MySQL Insert Error:", err);
            return res.status(500).json({ message: "Failed creating event in database" });
        }

        console.log("✅ Event saved to MySQL with ID:", result.insertId);
        res.status(201).json({
            message: "Event added successfully",
            eventId: result.insertId
        });
    });
});

// DELETE EVENT
app.delete("/events/:id", (req, res) => {
    db.query("DELETE FROM events WHERE id=?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Event deletion failed" });
        res.json({ message: "Event deleted successfully" });
    });
});

// =========================================================
// PRAYER REQUESTS
// =========================================================

app.get("/prayers", (req, res) => {
    db.query("SELECT * FROM prayers ORDER BY id DESC", (err, result) => {
        if (err) return res.status(500).json({ message: "Failed loading prayers" });
        res.json(result);
    });
});

app.post("/prayers", (req, res) => {
    const { memberName, email, request } = req.body;
    if (!memberName || !request) {
        return res.status(400).json({ message: "Prayer request required" });
    }

    db.query("INSERT INTO prayers (memberName, email, request) VALUES (?, ?, ?)", [memberName, email, request], (err) => {
        if (err) return res.status(500).json({ message: "Prayer submission failed" });
        res.json({ message: "Prayer request submitted successfully" });
    });
});

app.delete("/prayers/:id", (req, res) => {
    db.query("DELETE FROM prayers WHERE id=?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Prayer deletion failed" });
        res.json({ message: "Prayer deleted successfully" });
    });
});

// =========================================================
// BIBLE STUDIES
// =========================================================

app.get("/bible-studies", (req, res) => {
    db.query("SELECT * FROM bible_studies ORDER BY id DESC", (err, result) => {
        if (err) return res.status(500).json({ message: "Failed loading bible studies" });
        res.json(result);
    });
});

app.post("/bible-studies", upload.single("document"), (req, res) => {
    const { title, description } = req.body;

    if (!req.file) {
        return res.status(400).json({ message: "Please select document" });
    }

    const fileName = req.file.filename;
    const filePath = "/uploads/bible-studies/" + fileName;

    db.query("INSERT INTO bible_studies (title, description, fileName, filePath) VALUES (?, ?, ?, ?)", [title, description, fileName, filePath], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Upload failed" });
        }
        res.json({ message: "Bible study uploaded successfully" });
    });
});

app.delete("/bible-studies/:id", (req, res) => {
    const id = req.params.id;

    db.query("SELECT fileName FROM bible_studies WHERE id=?", [id], (err, result) => {
        if (err || result.length === 0) {
            return res.status(404).json({ message: "Document not found" });
        }

        const file = path.join(uploadDir, result[0].fileName);

        db.query("DELETE FROM bible_studies WHERE id=?", [id], (err) => {
            if (err) return res.status(500).json({ message: "Delete failed" });
            if (fs.existsSync(file)) fs.unlinkSync(file);
            res.json({ message: "Bible study removed" });
        });
    });
});

// =========================================================
// ANNOUNCEMENTS
// =========================================================

app.get("/announcements", (req, res) => {
    db.query("SELECT id, title, description, eventDate, location FROM events ORDER BY eventDate ASC LIMIT 5", (err, result) => {
        if (err) return res.status(500).json({ message: "Cannot load announcements" });
        res.json(result);
    });
});

// =========================================================
// START SERVER
// =========================================================

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Forward for Christ Commission running on http://localhost:${PORT}`);
});