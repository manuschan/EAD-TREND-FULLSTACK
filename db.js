require("dotenv").config();

console.log("Base utilisée :", process.env.DB_NAME);

const mysql = require("mysql2");

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: false
    }
});

db.connect((err) => {
    if (err) {
        console.error("Erreur MySQL :", err);
        return;
    }

    console.log("Connexion MySQL réussie !");
});

module.exports = db;