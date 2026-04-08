const mongoose = require('mongoose');
const Appointment = require('./src/models/Appointment');
require('dotenv').config();

async function checkApts() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mediqueue');
  const apts = await Appointment.find().sort({ createdAt: -1 }).limit(3);
  apts.forEach(a => console.log('Patient:', a.patient, 'Status:', a.status));
  process.exit();
}
checkApts();
