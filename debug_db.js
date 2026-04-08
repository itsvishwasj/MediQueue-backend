const mongoose = require('mongoose');
const Appointment = require('./src/models/Appointment');
require('dotenv').config();

async function checkApts() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mediqueue');
  const apts = await Appointment.find().sort({ createdAt: -1 }).limit(5);
  console.log("Latest appointments:", JSON.stringify(apts, null, 2));
  process.exit(0);
}
checkApts();
