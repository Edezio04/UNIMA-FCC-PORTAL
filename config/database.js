const mysql = require("mysql2");

const db = mysql.createConnection({
    host: "localhost",
    user: "authuser",
    password: "myethel",
    database: "auth_db"
});

db.connect((err) => {
    if (err) {
        console.error("Database connection failed:");
        console.error(err);
        return;
    }

    console.log("Connected to MySQL");
});

module.exports = db;