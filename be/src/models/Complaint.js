const mongoose = require('mongoose');
const { Schema } = mongoose;

const complaintSchema = new Schema(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    buyer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      enum: ['question', 'late', 'return', 'fraud', 'cancel'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    images: {
      type: [{ url: String }],
      default: [],
    },
    status: {
      type: String,
      enum: ['OPEN', 'SENT_TO_ADMIN', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
    },
    history: {
      type: [
        {
          actionBy: { type: Schema.Types.ObjectId, ref: 'User' },
          action: String,
          note: String,
          at: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    // Admin resolution
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: {
      type: Date,
    },
    resolution: {
      type: String,
      enum: ['APPROVED', 'REJECTED'],
    },
    resolutionNote: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

complaintSchema.index({ buyer: 1, seller: 1, status: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);
