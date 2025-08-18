const express = require("express");

const path = require("path");


const app = express();

// paths
const staticPath = path.join(__dirname,"../public");

// middlewares
app.use(express.static(staticPath));
app.use(express.json()); // for JSON body parsing
app.use(express.urlencoded({ extended: true })); // for URL-encoded body parsing


module.exports = app;

