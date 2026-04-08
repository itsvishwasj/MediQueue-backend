const mongoose = require('mongoose');
const User = require('./src/models/User');
const fs = require('fs');
require('dotenv').config();

async function test() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mediqueue');
  
  await User.deleteMany({ email: 'test_upper_123@email.com' });
  
  const user = new User({
    name: 'test',
    email: 'TEST_UPPER_123@email.com',
    password: 'password',
    phone: '12',
    role: 'hospital'
  });
  await user.save();

  const found = await User.findOne({ email: 'TEST_UPPER_123@email.com' });
  fs.writeFileSync('test_mongoose_out.txt', "Found user: " + (found !== null));
  process.exit();
}
test();
