import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true
  },
  category: {
    type: String,
    enum: ['LOW', 'HIGH'],
    required: [true, 'Plan category is required']
  },
  thresholds: {
    rain: { type: Number, required: [true, 'Rain threshold is required'] },
    temp: { type: Number, required: [true, 'Temperature threshold is required'] },
    aqi: { type: Number, required: [true, 'AQI threshold is required'] }
  },
  payouts: {
    rain: { type: Number, required: [true, 'Rain payout is required'] },
    heat: { type: Number, required: [true, 'Heat payout is required'] },
    aqi: { type: Number, required: [true, 'AQI payout is required'] },
    flood: { type: Number, required: [true, 'Flood payout is required'] }
  },
  max_per_event: {
    type: Number,
    required: [true, 'max_per_event is required']
  },
  weekly_cap: {
    type: Number,
    required: [true, 'weekly_cap is required']
  }
}, { timestamps: true });

const Plan = mongoose.model('Plan', planSchema);
export default Plan;
