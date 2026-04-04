import mongoose from 'mongoose';

const claimSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  trigger_type: {
    type: String,
    enum: ['rain', 'heat', 'aqi', 'flood'],
    required: true
  },
  location: {
    lat: {
      type: Number
    },
    lng: {
      type: Number
    },
    city: {
      type: String,
      trim: true
    }
  },
  value: {
    type: Number,
    required: true
  },
  threshold: {
    type: Number,
    required: true
  },
  payout: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['PENDING', 'REVIEW', 'SUSPICIOUS', 'PAID'],
    default: 'PENDING'
  },
  fraud_score: {
    type: Number,
    default: 0
  },
  confidence_score: {
    type: Number,
    default: 0
  },
  fraud_classification: {
    type: String,
    enum: ['NORMAL', 'REVIEW', 'SUSPICIOUS'],
    default: 'NORMAL'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Claim = mongoose.model('Claim', claimSchema);
export default Claim;
