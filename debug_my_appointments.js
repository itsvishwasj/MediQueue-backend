const mongoose = require('mongoose');
const Appointment = require('./src/models/Appointment');
const Doctor = require('./src/models/Doctor');
require('dotenv').config();

async function testFetch() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mediqueue');
  const apts = await Appointment.find();
  console.log(`Found ${apts.length} appointments.`);
  for (let apt of apts) {
    try {
      const doc = await Doctor.findById(apt.doctor);
    } catch(err) {
      console.error(`Error on appointment ${apt._id} with doctor ${apt.doctor}:`, err.message);
    }
  }
  process.exit();
}
testFetch();
