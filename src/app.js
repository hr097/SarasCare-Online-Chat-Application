const express = require("express");

const path = require("path");


const app = express();

// paths
const staticPath = path.join(__dirname,"../public");

// middlewares
app.use(express.static(staticPath));
app.use(express.json()); // for JSON body parsing
app.use(express.urlencoded({ extended: true })); // for URL-encoded body parsing
// Node.js Express example
// const allowedIPs = ["203.0.113.25"]; // replace with your office's current public IP

// app.use((req, res, next) => {
//     const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
//     if (!allowedIPs.includes(clientIP)) {
//         return res.status(403).send("Access restricted to office network");
//     }
//     next();
// });

module.exports = app;

