const cron = require('node-cron');
const User = require('../models/User');
const priceMonitor = require('../services/priceMonitor');

let cronJob = null;
let isJobRunning = false;

/**
 * Start the background price checker scheduler
 * Default: Every 6 hours (0 and 6 hr interval)
 */
const startPriceCheckerJob = (cronExpression = '0 */6 * * *') => {
  if (cronJob) {
    cronJob.stop();
  }

  cronJob = cron.schedule(cronExpression, async () => {
    if (isJobRunning) {
      console.log('[PriceCheckerJob] Previous scheduled check still active. Skipping run.');
      return;
    }

    isJobRunning = true;
    console.log('[PriceCheckerJob] Running scheduled commodity price check cycle at:', new Date().toISOString());

    try {
      const users = await User.find({}, '_id name email');
      for (const user of users) {
        try {
          const res = await priceMonitor.checkPricesForUser(user._id);
          console.log(`[PriceCheckerJob] Checked user ${user.name} (${user.email}): ${res.updated} updated, ${res.alertsCreated} alerts.`);
        } catch (userErr) {
          console.error(`[PriceCheckerJob] Error checking user ${user._id}:`, userErr.message);
        }
      }
    } catch (err) {
      console.error('[PriceCheckerJob] Cron loop error:', err.message);
    } finally {
      isJobRunning = false;
    }
  });

  console.log(`[PriceCheckerJob] Background scheduler registered with schedule: ${cronExpression}`);
};

/**
 * Stop background scheduler
 */
const stopPriceCheckerJob = () => {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('[PriceCheckerJob] Background scheduler stopped.');
  }
};

module.exports = {
  startPriceCheckerJob,
  stopPriceCheckerJob,
  start: startPriceCheckerJob
};
