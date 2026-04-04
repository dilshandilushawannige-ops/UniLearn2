const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ensureUpcomingClassReminderNotifications } = require('../services/notificationService');

const toGroupedNotifications = (items) => {
  const groups = {
    cancelledClasses: [],
    upcomingReminders: [],
    kuppiUpdates: [],
  };

  for (const item of items) {
    if (item.group === 'cancelled_classes') {
      groups.cancelledClasses.push(item);
      continue;
    }

    if (item.group === 'upcoming_reminders') {
      groups.upcomingReminders.push(item);
      continue;
    }

    if (item.group === 'kuppi_updates') {
      groups.kuppiUpdates.push(item);
    }
  }

  return groups;
};

// @desc Get notifications for current user
// @route GET /api/notifications
// @access Private
const getNotifications = asyncHandler(async (req, res) => {
  await ensureUpcomingClassReminderNotifications(req.user);

  const notifications = await Notification.find({
    user: req.user._id,
    isDismissed: false,
  })
    .sort({ createdAt: -1 })
    .limit(100);

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  res.json({
    unreadCount,
    groups: toGroupedNotifications(notifications),
  });
});

// @desc Dismiss one notification
// @route PATCH /api/notifications/:id/dismiss
// @access Private
const dismissNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  notification.isDismissed = true;
  notification.dismissedAt = new Date();
  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();
  }

  await notification.save();

  res.json({ success: true });
});

// @desc Dismiss all notifications
// @route POST /api/notifications/clear-all
// @access Private
const clearAllNotifications = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user._id, isDismissed: false },
    {
      $set: {
        isDismissed: true,
        dismissedAt: new Date(),
        isRead: true,
        readAt: new Date(),
      },
    }
  );

  res.json({ success: true });
});

// @desc Mark all notifications as read
// @route POST /api/notifications/mark-read-all
// @access Private
const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user._id, isRead: false, isDismissed: false },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    }
  );

  res.json({ success: true });
});

module.exports = {
  getNotifications,
  dismissNotification,
  clearAllNotifications,
  markAllNotificationsRead,
};
