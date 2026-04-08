const router = require('express').Router();
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const authMiddleware = require('../middleware/auth');

router.get('/:doctorId', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { doctorId } = req.params;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    const serving = await Appointment.findOne({
      doctor: doctorId,
      date: today,
      status: 'serving'
    });

    let servingPatientName = 'Guest';
    if (serving) {
      servingPatientName = serving.patientName || 'Guest';
    }

    const waiting = await Appointment.find({
      doctor: doctorId,
      date: today,
      status: 'waiting'
    }).sort([['type', -1], ['tokenNumber', 1]]);

    const queue = waiting.map((apt, index) => ({
      _id: apt._id,
      tokenNumber: apt.tokenNumber,
      patientName: apt.patientName || 'Guest',
      patientPhone: apt.patientPhone || '',
      type: apt.type,
      position: index + 1,
      estimatedWaitTime: index * doctor.avgConsultationTime
    }));

    res.json({
      doctorId,
      doctorName: doctor.name,
      currentToken: serving ? serving.tokenNumber : null,
      currentPatient: serving ? servingPatientName : null,
      waitingCount: waiting.length,
      queue
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:doctorId/next', async (req, res) => {
  try {

    const today = new Date().toISOString().split('T')[0];
    const { doctorId } = req.params;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    await Appointment.findOneAndUpdate(
      { doctor: doctorId, date: today, status: 'serving' },
      { status: 'completed' }
    );

    const nextAppointment = await Appointment.findOne({
      doctor: doctorId,
      date: today,
      status: 'waiting'
    }).sort([['type', -1], ['tokenNumber', 1]]);

    const io = req.app.get('io');

    if (!nextAppointment) {
      io.to(`queue:${doctorId}`).emit(`queue:${doctorId}`, {
        type: 'QUEUE_EMPTY',
        message: 'No more patients in queue'
      });
      return res.json({ message: 'No more patients in queue' });
    }

    nextAppointment.status = 'serving';
    await nextAppointment.save();

    const waiting = await Appointment.find({
      doctor: doctorId,
      date: today,
      status: 'waiting'
    }).sort([['type', -1], ['tokenNumber', 1]]);

    const queue = waiting.map((apt, index) => ({
      _id: apt._id,
      tokenNumber: apt.tokenNumber,
      patientName: apt.patientName || 'Guest',
      patientPhone: apt.patientPhone || '',
      type: apt.type,
      position: index + 1,
      estimatedWaitTime: index * doctor.avgConsultationTime
    }));

    let nextPatientName = nextAppointment.patientName || 'Guest';

    const queueUpdate = {
      type: 'NEXT_PATIENT',
      currentToken: nextAppointment.tokenNumber,
      currentPatient: nextPatientName,
      waitingCount: waiting.length,
      queue
    };

    io.to(`queue:${doctorId}`).emit(`queue:${doctorId}`, queueUpdate);

    res.json(queueUpdate);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:appointmentId/cancel', authMiddleware, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    if (
      appointment.patient.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    const io = req.app.get('io');
    io.to(`queue:${appointment.doctor}`).emit(`queue:${appointment.doctor}`, {
      type: 'APPOINTMENT_CANCELLED',
      appointmentId: appointment._id
    });

    res.json({ message: 'Appointment cancelled' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Patient scans QR at cabin door — auto check in
router.post('/checkin/:appointmentId', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId)
      .populate('doctor', 'name avgConsultationTime');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.status === 'completed') {
      return res.status(400).json({ message: 'Appointment already completed' });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({ message: 'Appointment was cancelled' });
    }

    const User = require('../models/User');
    let aptPatientName = 'Guest';
    if (appointment.patient && appointment.patient !== 'guest') {
       try { const u = await User.findById(appointment.patient); if(u) aptPatientName = u.name; } catch(e){}
    }

    const today = new Date().toISOString().split('T')[0];
    const doctorId = appointment.doctor._id.toString();

    // Mark any currently serving appointment as completed
    await Appointment.findOneAndUpdate(
      { doctor: doctorId, date: today, status: 'serving' },
      { status: 'completed' }
    );

    // Mark this appointment as serving
    appointment.status = 'serving';
    await appointment.save();

    // Get updated waiting list
    const waiting = await Appointment.find({
      doctor: doctorId,
      date: today,
      status: 'waiting'
    }).sort([['type', -1], ['tokenNumber', 1]]);

    const queue = await Promise.all(waiting.map(async (apt, index) => {
      let pName = 'Guest';
      let pPhone = '';
      if (apt.patient && apt.patient !== 'guest') {
         try { const u = await User.findById(apt.patient); if(u) { pName = u.name; pPhone = u.phone; } } catch(e){}
      }
      return {
        _id: apt._id,
        tokenNumber: apt.tokenNumber,
        patientName: pName,
        type: apt.type,
        position: index + 1,
        estimatedWaitTime: index * appointment.doctor.avgConsultationTime
      };
    }));

    const queueUpdate = {
      type: 'NEXT_PATIENT',
      currentToken: appointment.tokenNumber,
      currentPatient: aptPatientName,
      waitingCount: waiting.length,
      queue
    };

    // Broadcast to all clients watching this doctor's queue
    const io = req.app.get('io');
    io.to(`queue:${doctorId}`).emit(`queue:${doctorId}`, queueUpdate);

    res.json({
      message: 'Checked in successfully',
      tokenNumber: appointment.tokenNumber,
      patientName: appointment.patient.name,
      ...queueUpdate
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:hospital/:doctor', async (req, res) => {
  try {
    const { hospital, doctor } = req.params;

    const queue = await Appointment.find({
      hospital,
      doctor,
      status: { $in: ['waiting', 'serving'] }
    }).sort({ tokenNumber: 1 });

    res.json(queue);

  } catch (err) {
    res.status(500).json({ message: "Error fetching queue" });
  }
});

router.put('/update/:id', async (req, res) => {
  try {
    const { status } = req.body;

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    // 🔥 EMIT UPDATE
    const io = req.app.get('io');
    io.emit('queueUpdated');

    res.json(appointment);

  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
});

module.exports = router;