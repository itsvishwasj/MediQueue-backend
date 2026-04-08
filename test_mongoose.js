const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function test() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:5000/mediqueue');
  
  // Make sure to clean
  await User.deleteMany({ email: 'test_upper@email.com' });
  
  const user = new User({
    name: 'test',
    email: 'TEST_UPPER@email.com',
    password: 'password',
    phone: '12',
    role: 'hospital'
  });
  await user.save();

  // Try to find
  const found = await User.findOne({ email: 'TEST_UPPER@email.com' });
  console.log("Found user:", found !== null);
  process.exit();
}
test();
