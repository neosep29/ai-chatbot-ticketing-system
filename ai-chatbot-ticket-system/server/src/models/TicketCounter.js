import mongoose from 'mongoose';

const TicketCounterSchema = new mongoose.Schema({
  dateKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  seq: {
    type: Number,
    required: true,
    default: 0
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

TicketCounterSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('TicketCounter', TicketCounterSchema);
