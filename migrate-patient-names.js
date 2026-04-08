const mongoose = require('mongoose');
const Appointment = require('./src/models/Appointment');
const User = require('./src/models/User');
require('dotenv').config();

async function migratePatientNames() {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/mediqueue';
    await mongoose.connect(uri);
    console.log('Connected to database');

    // Find all appointments without patientName
    const appointmentsWithoutName = await Appointment.find({
      $or: [
        { patientName: { $exists: false } },
        { patientName: null },
        { patientName: '' }
      ]
    });
 
    console.log(`Found ${appointmentsWithoutName.length} appointments to migrate`);

    let updated = 0;
    for (const apt of appointmentsWithoutName) {
      let patientName = 'Guest';
      let patientPhone = '';

      // Try to find the patient's name
      if (apt.patient && apt.patient !== 'guest') {
        try {
          const user = await User.findById(apt.patient);
          if (user) {
            patientName = user.name;
            patientPhone = user.phone || '';
          }
        } catch (err) {
          console.error(`Error fetching user ${apt.patient}:`, err.message);
        }
      }

      // Update the appointment
      await Appointment.findByIdAndUpdate(apt._id, {
        patientName: patientName,
        patientPhone: patientPhone
      });

      updated++;
      console.log(`✓ Updated appointment ${apt._id}: ${patientName}`);
    }

    console.log(`\n✅ Migration complete: Updated ${updated} appointments`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migratePatientNames();
