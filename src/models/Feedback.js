const mongoose = require('mongoose');
const User = require('./user');
const feedbackSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ratings: {
    teaching_quality: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    subject_clarity: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    interaction: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    preparation: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    punctuality: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    }
  },
  comments: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Prevent duplicate feedback from same student to same teacher
// feedbackSchema.index({ studentId: 1, teacherId: 1 }, { unique: true });

module.exports = mongoose.model('Feedback', feedbackSchema);