import mongoose from 'mongoose';

const environmentalLogSchema = new mongoose.Schema({
  location: {
    lat: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    lng: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    }
  },
  rainfall: {
    type: Number,
    required: [true, 'Rainfall is required'],
    min: [0, 'Rainfall cannot be negative']
  },
  temperature: {
    type: Number,
    required: [true, 'Temperature is required']
  },
  aqi: {
    type: Number,
    min: [0, 'AQI cannot be negative'],
    default: null
  },
  is_simulated: {
    type: Boolean,
    default: false
  },
  risk_score: {
    type: Number,
    required: [true, 'Risk score is required'],
    min: [0, 'Risk score cannot be negative'],
    max: [1, 'Risk score cannot exceed 1']
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  }
}, {
  timestamps: true,
  indexes: [
    { 'location.city': 1, timestamp: -1 },
    { 'location.lat': 1, 'location.lng': 1, timestamp: -1 },
    { timestamp: -1 }
  ]
});

// Static method to get latest log for a location
environmentalLogSchema.statics.getLatestForLocation = function(lat, lng) {
  return this.findOne({
    'location.lat': lat,
    'location.lng': lng
  }).sort({ timestamp: -1 });
};

// Static method to get logs for a city within date range
environmentalLogSchema.statics.getLogsForCity = function(city, startDate, endDate) {
  const query = { 'location.city': city };
  if (startDate && endDate) {
    query.timestamp = { $gte: startDate, $lte: endDate };
  }
  return this.find(query).sort({ timestamp: -1 });
};

const EnvironmentalLog = mongoose.model('EnvironmentalLog', environmentalLogSchema);

export default EnvironmentalLog;