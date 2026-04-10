const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true
  },
  departments: [{
    type: String,
    trim: true
  }]
}, { timestamps: true });

module.exports = mongoose.model('Hospital', hospitalSchema);