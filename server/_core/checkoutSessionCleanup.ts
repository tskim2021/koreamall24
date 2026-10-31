import cron from 'node-cron';
import { deleteExpiredCheckoutSessions } from '../db';

let isSchedulerRunning = false;

/**
 * Start the checkout session cleanup scheduler
 * Runs daily at midnight (Asia/Seoul timezone) to delete expired checkout sessions
 */
export function startCheckoutSessionCleanup() {
  if (isSchedulerRunning) {
    console.log('[Checkout Session Cleanup] Scheduler is already running');
    return;
  }

  const runCleanup = async (time: string) => {
    try {
      console.log(`[Checkout Session Cleanup] Starting cleanup at ${time}`);
      const result = await deleteExpiredCheckoutSessions();
      
      if (result > 0) {
        console.log(`[Checkout Session Cleanup] Successfully cleaned up expired sessions`);
      } else {
        console.log(`[Checkout Session Cleanup] No expired sessions found or cleanup failed`);
      }
    } catch (error) {
      console.error(`[Checkout Session Cleanup] Error during cleanup:`, error);
    }
  };

  // 매일 자정 (Asia/Seoul 타임존)
  cron.schedule('0 0 * * *', async () => {
    await runCleanup('midnight');
  }, {
    timezone: 'Asia/Seoul'
  });

  isSchedulerRunning = true;
  console.log('[Checkout Session Cleanup] Scheduler started successfully - scheduled at midnight (Asia/Seoul)');
}

/**
 * Stop the checkout session cleanup scheduler
 */
export function stopCheckoutSessionCleanup() {
  if (!isSchedulerRunning) {
    console.log('[Checkout Session Cleanup] Scheduler is not running');
    return;
  }

  isSchedulerRunning = false;
  console.log('[Checkout Session Cleanup] Scheduler stopped');
}
