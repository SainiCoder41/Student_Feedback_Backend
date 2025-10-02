const express = require('express');
const User = require('../models/user');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userMiddleware = require("../middleware/userMiddleware");
const Feedback  = require('../models/Feedback')
require('dotenv').config();

const authRouter = express.Router();


authRouter.post("/register", async (req, res) => {
  try {
    const { FullName, EndrollmentNumber, password, role, SubjectName, SubjectCode } = req.body;

    if (!EndrollmentNumber || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ EndrollmentNumber });
    if (existingUser) {
      return res.status(400).json({ message: "User already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      FullName,
      EndrollmentNumber,
      password: hashedPassword,
      role,
      SubjectName: role === "Teacher" ? SubjectName : undefined,
      SubjectCode: role === "Teacher" ? SubjectCode : undefined,
    });

    const reply = {
      FullName: user.FullName,
      EndrollmentNumber: user.EndrollmentNumber,
      _id: user._id
    };

    res.status(201).json({
      user: reply,
      message: "Registered Successfully"
    });
  } catch (err) {
    console.error("Registration error:", err); // <-- log the full error
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
});


authRouter.post("/login", async (req, res) => {
  try {
    const { EndrollmentNumber, password } = req.body;

    // Validate input
    if (!EndrollmentNumber || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find user
    const user = await User.findOne({ EndrollmentNumber });
    if (!user) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    // Compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    // Generate JWT
    const token = jwt.sign(
      { _id: user._id, EndrollmentNumber: user.EndrollmentNumber },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );

    // Send cookie
 res.cookie("token", token, {
  httpOnly: true,
  secure: true,
  sameSite: "None",
  maxAge: 60 * 60 * 1000 // 1 hour
});

    // Response
    const reply = {
      FullName: user.FullName,
      EndrollmentNumber: user.EndrollmentNumber,
      role:user.role,
      _id: user._id
    };

    res.status(200).json({
      user: reply,
      message: "Logged in Successfully"
    });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});
authRouter.post("/logout", async (req, res) => {
  try {
    // Clear the cookie with the same options used during login
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Logout failed" });
  }
});
authRouter.post("/me", userMiddleware, (req, res) => {
  const reply = {
    FullName: req?.result?.FullName,
    EndrollmentNumber: req?.result?.EndrollmentNumber,
    role: req?.result?.role,  // FIXED
    _id: req?.result?._id,
  };

  res.status(200).json({
    user: reply,
    message: "Valid User",
  });
});
authRouter.get("/getAll",async (req, res) => {
  try {
    const users = await User.find({}, 'FullName role SubjectName SubjectCode');
    // or using an object for projection:
    // const users = await User.find({}, { firstName: 1, lastName: 1, problemSolved: 1 });
    
    res.send(users);
  } catch (error) {
    res.status(500).send({ message: 'Error fetching users', error });
  }
});
authRouter.post('/feedback', userMiddleware, async (req, res) => {
  try {
    const student = req.result; // authenticated user
    const { teacherId, ratings, comments } = req.body;

    if (!teacherId || !ratings) {
      return res.status(400).json({ message: "Teacher ID and ratings are required" });
    }

    // Check if teacher exists
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'Teacher') {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // Check if feedback already submitted by this student
    const alreadySubmitted = await Feedback.findOne({ studentId: student._id, teacherId });
    if (alreadySubmitted) {
      return res.status(409).json({ message: "Feedback already submitted for this teacher" });
    }

    // Create new feedback document
    const newFeedback = new Feedback({
      studentId: student._id,
      teacherId,
      ratings,
      comments: comments || '',
    });

    await newFeedback.save();

    res.status(200).json({ message: "Feedback submitted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});
authRouter.get("/Submitedfeedback", userMiddleware, async (req, res) => {
  try {
    const student = req.result; // logged-in user

    // Get all feedbacks submitted by this student
    const feedbacks = await Feedback.find({ studentId: student._id })
      .populate("teacherId", "FullName SubjectName SubjectCode") // fetch teacher details
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Submitted feedbacks fetched successfully",
      total: feedbacks.length,
      feedbacks,
    });
  } catch (err) {
    console.error("Error in /Submitedfeedback:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});
authRouter.get("/getFeedback", userMiddleware, async (req, res) => {
  try {
    const teacher = req.result; // Logged-in teacher from middleware

    if (!teacher || teacher.role !== "Teacher") {
      return res.status(403).json({ message: "Only teachers can view their feedback" });
    }

    // Find all feedback for this teacher
    const feedbacks = await Feedback.find({ teacherId: teacher._id })
      .populate("studentId", "FullName EnrollmentNumber") // Optional: populate student info
      .lean();

    if (!feedbacks || feedbacks.length === 0) {
      return res.status(200).json({ message: "No feedback found for this teacher", feedbacks: [] });
    }

    res.status(200).json({
      message: "Feedback fetched successfully",
      feedbacks,
    });
  } catch (err) {
    console.error("Error fetching feedback:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});
authRouter.get("/getAllFeedback", userMiddleware, async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .populate("studentId", "FullName") // populate student name
      .populate("teacherId", "FullName SubjectName") // populate teacher name & subject
      .sort({ createdAt: -1 }); // latest feedback first

    res.status(200).json({ feedbacks });
  } catch (err) {
    console.error("Error fetching feedbacks:", err);
    res.status(500).json({ message: "Server error fetching feedbacks" });
  }
});
// /routes/authRouter.ts
authRouter.get("/getTeacherPerformance/:T", userMiddleware, async (req, res) => {
  try {
    const { T } = req.params;

    const teacher = await User.findById(T).select("FullName SubjectName SubjectCode");
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    const feedbacks = await Feedback.find({ teacherId: T })
      .populate("studentId", "FullName")
      .sort({ createdAt: -1 });

    // Calculate overall average
    const totalFeedbacks = feedbacks.length;
    const overallAvg =
      totalFeedbacks > 0
        ? feedbacks.reduce((acc, fb) => {
            const sumRatings =
              fb.ratings.teaching_quality +
              fb.ratings.subject_clarity +
              fb.ratings.interaction +
              fb.ratings.preparation +
              fb.ratings.punctuality;
            return acc + sumRatings / 5;
          }, 0) / totalFeedbacks
        : 0;

    res.status(200).json({ teacher, feedbacks, overallAvg: Number(overallAvg.toFixed(2)) });
  } catch (err) {
    console.error("Error fetching teacher performance:", err);
    res.status(500).json({ message: "Server error fetching performance" });
  }
});


// Add this route to check feedback status


module.exports = authRouter;
