const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    // 🔥 Make everything flexible (NO ObjectId for now)

    patient: {
      type: String, // instead of ObjectId
      default: "guest"
    },

    patientName: {
      type: String,
      default: "Guest"
    },

    patientPhone: {
      type: String,
      default: ""
    },

    doctor: {
      type: String, // was ObjectId ❌
      required: true
    },

    hospital: {
      type: String, // was ObjectId ❌
      required: true
    },

    department: {
      type: String,
      required: true
    },

    tokenNumber: {
      type: Number,
      required: true
    },

    type: {
      type: String,
      enum: ['normal', 'emergency'],
      default: 'normal'
    },

    status: {
      type: String,
      enum: ['waiting', 'serving', 'completed', 'cancelled'],
      default: 'waiting'
    },

    date: {
      type: String,
      default: () => new Date().toISOString().split("T")[0]
    },

    estimatedWaitTime: {
      type: Number,
      default: 10
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Appointment', appointmentSchema);