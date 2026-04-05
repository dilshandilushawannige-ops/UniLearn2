const Notification = require('../models/Notification');
const LiveClass = require('../models/LiveClass');
const { isAdminUser } = require('../utils/admin');

const REMINDER_WINDOWS = [
  { key: '1d', ms: 24 * 60 * 60 * 1000, label: '1 day' },
  { key: '1h', ms: 60 * 60 * 1000, label: '1 hour' },
  { key: '10m', ms: 10 * 60 * 1000, label: '10 minutes' },
];

const createNotificationIfAbsent = async (payload) => {
  try {
    return await Notification.create(payload);
  } catch (error) {
    // Ignore duplicate notifications for the same event key.
    if (error && error.code === 11000) {
      return null;
    }
    throw error;
  }
};

const ensureUpcomingClassReminderNotifications = async (user) => {
  if (!user || isAdminUser(user)) return;

  const now = Date.now();
  const upcomingClasses = await LiveClass.find({
    year: Number(user.currentYear),
    semester: Number(user.currentSemester),
    isCancelled: false,
    classDateTime: { $gt: new Date(now) },
  })
    .select('_id title moduleCode classDateTime')
    .lean();

  const tasks = [];

  for (const liveClass of upcomingClasses) {
    const classTime = new Date(liveClass.classDateTime).getTime();

    for (const window of REMINDER_WINDOWS) {
      const triggerAt = classTime - window.ms;
      if (now < triggerAt) continue;

      tasks.push(
        createNotificationIfAbsent({
          user: user._id,
          group: 'upcoming_reminders',
          category: 'class_reminder',
          title: 'Upcoming class reminder',
          message: `${liveClass.title} (${liveClass.moduleCode}) starts in ${window.label}.`,
          relatedContentType: 'live_class',
          relatedContentId: String(liveClass._id),
          eventKey: `class-reminder:${liveClass._id}:${window.key}`,
        })
      );
    }
  }

  if (tasks.length > 0) {
    await Promise.all(tasks);
  }
};

module.exports = {
  createNotificationIfAbsent,
  ensureUpcomingClassReminderNotifications,
};
