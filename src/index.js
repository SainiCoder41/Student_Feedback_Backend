const express = require('express');
// const cors = require('cors');
const main = require("./config/db");
const cookieParser =  require('cookie-parser');

const authRouter = require("./routes/userAuth");
const cors = require('cors');
require('dotenv').config();

// Create express app
const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

app.use(cors({
    origin: 'https://student-feed-back-frontend.vercel.app/',
    credentials: true 
}))

// Enable CORS for frontend (e.g., Vite dev server on port 5173)


// Routes
app.use("/user", authRouter);

// Initialize server + DB connection
const IntializeConnection = async () => {
    try {
        await Promise.all([
            main(), 
        ]);
        console.log("DB connected");

        app.listen(3000, () => {
            console.log("Server is listening at port number 3000 ");
        });

    } catch (err) {
        console.log("Error: " + err);
    }
};

IntializeConnection();
