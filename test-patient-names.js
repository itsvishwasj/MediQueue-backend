const mongoose = require('mongoose');
const Appointment = require('./src/models/Appointment');
require('dotenv').config();

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const today = new Date().toISOString().split('T')[0];
  const apts = await Appointment.find({ 
    date: today,
    patientName: { $ne: 'Guest' }
  }).limit(5);
  
  console.log('Appointments with patient names:');
  if (apts.length === 0) {
    console.log('No real patient appointments today');
  } else {
    apts.forEach(a => {
      console.log(`  Doctor: ${a.doctor}, Patient: ${a.patientName}, Token: ${a.tokenNumber}`);
    });
  }
  
  process.exit(0);
}

test();
