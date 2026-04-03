const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    group: {
      type: String,
      enum: ['cancelled_classes', 'upcoming_reminders', 'kuppi_updates'],
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['class_cancelled', 'class_reminder', 'kuppi_approved', 'kuppi_rejected'],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    relatedContentType: {
      type: String,
      enum: ['live_class', 'kuppi_request', 'resource', 'moderation', 'other'],
      default: 'other',
    },
    relatedContentId: { type: String, default: '', trim: true },
    eventKey: { type: String, required: true, trim: true },
    isRead: { type: Boolean, default: false, index: true },
    isDismissed: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    dismissedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, eventKey: 1 }, { unique: true });
notificationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
