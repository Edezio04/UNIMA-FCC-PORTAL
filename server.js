require('dotenv').config();
const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// CLOUDINARY INTEGRATION LIBRARIES
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

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
// MIDDLEWARE & STATIC FILES
// =========================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serving static files from frontend
app.use(express.static(path.join(__dirname, "frontend")));

// Serve uploaded files statically so legacy local links still work
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =========================================================
// CLOUDINARY CONFIGURATION & MULTER STORAGE
// =========================================================

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);

        return {
            folder: "bible-studies",
            resource_type: isImage ? "image" : "raw",
            public_id: Date.now() + "-" + path.parse(file.originalname).name.replace(/[^a-zA-Z0-9]/g, "_") + (isImage ? "" : "." + ext)
        };
    }
});

const upload = multer({ storage: storage });

// =========================================================
// MYSQL DATABASE CONFIGURATION (TiDB CLOUD OPTIMIZED)
// =========================================================

const isSSL = process.env.DB_SSL === "true" || process.env.DB_SSL === true;

const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "myethel",
    password: process.env.DB_PASSWORD || "123456",
    database: process.env.DB_NAME || "sys",
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 4000,
    ssl: isSSL ? {
        rejectUnauthorized: false
    } : false,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 2,                  // Clean up idle connections aggressively
    idleTimeout: 15000,          // Drop idle sockets after 15s before TiDB kills them
    queueLimit: 0,
    connectTimeout: 30000,       // Connection handshake timeout
    enableKeepAlive: true,       // Force TCP Keep-Alive
    keepAliveInitialDelay: 0
};

const db = mysql.createPool(dbConfig);

// Test initial connection on start without leaving checked-out sockets
db.query("SELECT 1", (err) => {
    if (err) {
        console.error("❌ Initial Database connection failed:", err.message);
    } else {
        console.log(`✅ Connected to MySQL Database [${dbConfig.database}] on ${dbConfig.host}:${dbConfig.port}`);
    }
});

function formatToMySQLDate(dateString) {
    if (!dateString) return new Date().toISOString().slice(0, 19).replace('T', ' ');
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// =========================================================
// HOME PAGE ROUTE
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
// EVENTS SECTION
// =========================================================

app.get("/events", (req, res) => {
    db.query("SELECT * FROM events ORDER BY eventDate ASC", (err, result) => {
        if (err) {
            console.error("GET /events error:", err);
            return res.status(500).json({ message: "Cannot fetch events" });
        }
        res.json(result);
    });
});

app.post("/events", (req, res) => {
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
// BIBLE STUDIES & DOWNLOADS (HYBRID LOCAL + CLOUDINARY)
// =========================================================

app.get("/bible-studies", (req, res) => {
    db.query("SELECT * FROM bible_studies ORDER BY id DESC", (err, result) => {
        if (err) return res.status(500).json({ message: "Failed loading bible studies" });
        res.json(result);
    });
});

// Primary Download Route
app.get("/bible-studies/download/:id", async (req, res) => {
    const id = req.params.id;

    db.query("SELECT fileName, filePath FROM bible_studies WHERE id=?", [id], async (err, result) => {
        if (err || !result || result.length === 0) {
            console.error(`❌ Download failed: ID ${id} not found in database.`);
            return res.status(404).json({ success: false, message: "File record not found in database" });
        }

        const filePath = result[0].filePath;
        const fileName = result[0].fileName || "document.pdf";

        if (!filePath) {
            return res.status(404).json({ success: false, message: "File path missing" });
        }

        // Check if the file path is a Cloudinary URL
        if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
            try {
                console.log(`✅ Streaming file from Cloudinary for ID ${id}: ${fileName}`);

                const response = await fetch(filePath);

                if (!response.ok) {
                    throw new Error(`Failed fetching from Cloudinary: ${response.statusText}`);
                }

                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                res.setHeader("Content-Type", response.headers.get("content-type") || "application/octet-stream");
                res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
                res.setHeader("Content-Length", buffer.length);

                return res.send(buffer);
            } catch (fetchErr) {
                console.error("❌ Cloud download stream error:", fetchErr);
                return res.status(500).json({ success: false, message: "Failed downloading file from cloud storage" });
            }
        } else {
            // Fallback for legacy local disk uploads
            console.log(`📂 Fallback to local server file for ID ${id}: ${filePath}`);
            const cleanPath = filePath.startsWith("/") ? filePath.substring(1) : filePath;
            const absoluteLocalPath = path.join(__dirname, cleanPath);

            if (!fs.existsSync(absoluteLocalPath)) {
                return res.status(404).json({ success: false, message: "Local file no longer exists on server disk" });
            }

            return res.download(absoluteLocalPath, fileName);
        }
    });
});

// ALIAS ROUTE: Directs /download/:id to /bible-studies/download/:id
app.get("/download/:id", (req, res) => {
    res.redirect(`/bible-studies/download/${req.params.id}`);
});

// ROBUST POST ROUTE WITH EXPLICIT CLOUDINARY LOGGING
app.post("/bible-studies", (req, res) => {
    upload.single("document")(req, res, (err) => {
        if (err) {
            console.error("❌ Cloudinary / Multer Error:", err);
            return res.status(500).json({ message: "Cloudinary upload failed", error: err.message });
        }

        const { title, description } = req.body;

        if (!req.file) {
            console.warn("⚠️ Upload attempted without selecting a document.");
            return res.status(400).json({ message: "Please select document" });
        }

        const fileName = req.file.originalname;
        const filePath = req.file.path; // Cloudinary URL

        console.log("☁️ File uploaded to Cloudinary URL:", filePath);

        db.query(
            "INSERT INTO bible_studies (title, description, fileName, filePath) VALUES (?, ?, ?, ?)",
            [title, description || "", fileName, filePath],
            (dbErr, result) => {
                if (dbErr) {
                    console.error("❌ MySQL Insert Error:", dbErr);
                    return res.status(500).json({ message: "Database insert failed" });
                }

                console.log(`✅ Saved into Database with ID #${result.insertId}`);
                res.json({
                    message: "Bible study uploaded successfully to cloud",
                    id: result.insertId,
                    filePath: filePath
                });
            }
        );
    });
});

app.delete("/bible-studies/:id", (req, res) => {
    const id = req.params.id;

    db.query("DELETE FROM bible_studies WHERE id=?", [id], (err) => {
        if (err) return res.status(500).json({ message: "Delete failed" });
        res.json({ message: "Bible study removed" });
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
// CATCH-ALL ROUTE FOR FRONTEND NAVIGATION
// =========================================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "404 - Route not found"
    });
});

// =========================================================
// START SERVER
// =========================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Forward for Christ Commission running on port ${PORT}`);
});