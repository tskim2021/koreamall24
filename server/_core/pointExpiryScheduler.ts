import cron from 'node-cron';
import { getExpiringPointTransactions, markPointExpiryNotified } from '../db';
import { sendPointExpiryAlertEmail } from './emailService';

let isSchedulerRunning = false;

/**
 * 포인트 만료 알림 스케줄러
 * 매일 자정 (Asia/Seoul) 실행 — 30일 이내 만료 예정 포인트 보유 고객에게 이메일 발송
 */
export function startPointExpiryScheduler() {
  if (isSchedulerRunning) {
    console.log('[PointExpiry] Scheduler is already running');
    return;
  }

  const runExpiryCheck = async (trigger: string) => {
    console.log(`[PointExpiry] Starting expiry check (trigger: ${trigger})`);
    try {
      const transactions = await getExpiringPointTransactions(30);
      if (transactions.length === 0) {
        console.log('[PointExpiry] No expiring points found');
        return;
      }

      // 사용자별로 그룹화 (한 사용자에게 이메일 1통만 발송)
      const byUser = new Map<number, { email: string; name: string; totalPoints: number; nearestExpiry: Date; txIds: number[] }>();
      for (const tx of transactions) {
        if (!tx.userEmail) continue;
        const existing = byUser.get(tx.userId);
        if (existing) {
          existing.totalPoints += tx.amount;
          existing.txIds.push(tx.id);
          if (tx.expiresAt < existing.nearestExpiry) {
            existing.nearestExpiry = tx.expiresAt;
          }
        } else {
          byUser.set(tx.userId, {
            email: tx.userEmail,
            name: tx.userName || 'お客様',
            totalPoints: tx.amount,
            nearestExpiry: tx.expiresAt,
            txIds: [tx.id],
          });
        }
      }

      let sent = 0;
      let failed = 0;
      for (const [, userData] of Array.from(byUser)) {
        const result = await sendPointExpiryAlertEmail({
          to: userData.email,
          userName: userData.name,
          expiringPoints: userData.totalPoints,
          expiryDate: userData.nearestExpiry,
        });

        if (result.success) {
          // 알림 발송 완료 표시
          for (const txId of userData.txIds) {
            await markPointExpiryNotified(txId);
          }
          sent++;
        } else {
          console.error(`[PointExpiry] Failed to send email to ${userData.email}: ${result.error}`);
          failed++;
        }
      }

      console.log(`[PointExpiry] Check complete — sent: ${sent}, failed: ${failed}, total users: ${byUser.size}`);
    } catch (error) {
      console.error('[PointExpiry] Error during expiry check:', error);
    }
  };

  // 매일 자정 (Asia/Seoul)
  cron.schedule('0 0 * * *', async () => {
    await runExpiryCheck('midnight-cron');
  }, {
    timezone: 'Asia/Seoul',
  });

  isSchedulerRunning = true;
  console.log('[PointExpiry] Scheduler started — runs daily at midnight (Asia/Seoul)');
}

export function stopPointExpiryScheduler() {
  isSchedulerRunning = false;
  console.log('[PointExpiry] Scheduler stopped');
}
