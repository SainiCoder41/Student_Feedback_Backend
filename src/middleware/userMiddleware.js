const jwt = require("jsonwebtoken");
const User = require("../models/user");
require("dotenv").config();

const userMiddleware = async (req, res, next) => {
  try {
    const { token } = req.cookies;
    

    if (!token) {
      throw new Error("Token doesn't exist");
    }

    const payload = jwt.verify(token, process.env.JWT_KEY);
   

    const { _id } = payload;

    if (!_id) {
      throw new Error("Id is missing in token");
    }

    const result = await User.findById(_id);

    if (!result) {
      throw new Error("User doesn't exist");
    }

    req.result = result; // attach user to request
    next();
  } catch (err) {
    res.status(401).json({ message: "Authentication failed", error: err.message });
  }
};

module.exports = userMiddleware;