const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Hospital = require('../models/Hospital');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  try {
    const { doctor, hospital, department, type } = req.body;

    // Use token authorization, default to guest if bypassing auth locally.
    const userId = req.user ? req.user.id : "guest";
    
    // Fetch patient name and phone
    let patientName = 'Guest';
    let patientPhone = '';
    if (userId && userId !== 'guest') {
      try {
        const User = require('../models/User');
        const user = await User.findById(userId);
        if (user) {
          patientName = user.name;
          patientPhone = user.phone || '';
        }
      } catch (err) {
        console.error('Error fetching patient details:', err.message);
      }
    }

    const dateString = new Date().toISOString().split("T")[0];
    const sequenceItem = await Appointment.findOne({ doctor, date: dateString }).sort('-tokenNumber');
    const tokenNumber = sequenceItem ? sequenceItem.tokenNumber + 1 : 1;

    const appointment = new Appointment({
      patient: userId,
      patientName: patientName,
      patientPhone: patientPhone,
      doctor,
      hospital,
      department,
      type: type || 'normal',
      tokenNumber,
      status: "waiting",
      date: dateString
    });

    await appointment.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`queue:${doctor}`).emit(`queue:${doctor}`, {
        type: 'NEW_APPOINTMENT'
      });
    }

    return res.status(201).json(appointment);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get('/my', auth, async (req, res) => {
  try {
    const apts = await Appointment.find({ patient: req.user.id }).sort('-createdAt');
    
    // As the schema uses String IDs instead of Ref ObjectIds natively, map details manually 
    const populated = await Promise.all(apts.map(async (apt) => {
      let doc = null;
      let hosp = null;
      try { doc = await Doctor.findById(apt.doctor); } catch (e) {}
      try { hosp = await Hospital.findById(apt.hospital); } catch (e) {}

      return {
        ...apt.toObject(),
        doctor: doc ? { _id: doc._id, name: doc.name, department: doc.department } : apt.doctor,
        hospital: hosp ? { _id: hosp._id, name: hosp.name } : apt.hospital
      };
    }));

    res.json(populated);
  } catch (err) {
    console.error("GET /my error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;