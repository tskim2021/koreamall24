import cron from 'node-cron';
import { syncAllShipments } from './shipmentStatusSync';

/**
 * 배송 추적 자동 동기화 스케줄러
 * 매일 오전 9시와 오후 6시에 진행 중인 모든 배송의 추적 정보를 자동으로 업데이트
 */

let isSchedulerRunning = false;

/**
 * 스케줄러 초기화 및 시작
 */
export function startShipmentTrackingScheduler() {
  if (isSchedulerRunning) {
    console.log('[Shipment Scheduler] Already running');
    return;
  }

  // 매일 오전 9시 (Asia/Seoul 타임존)
  cron.schedule('0 9 * * *', async () => {
    console.log('[Shipment Scheduler] Starting morning sync at 9:00 AM');
    await runScheduledSync('morning');
  }, {
    timezone: 'Asia/Seoul'
  });

  // 매일 오후 6시 (Asia/Seoul 타임존)
  cron.schedule('0 18 * * *', async () => {
    console.log('[Shipment Scheduler] Starting evening sync at 6:00 PM');
    await runScheduledSync('evening');
  }, {
    timezone: 'Asia/Seoul'
  });

  isSchedulerRunning = true;
  console.log('[Shipment Scheduler] Started successfully - scheduled at 9:00 AM and 6:00 PM (Asia/Seoul)');
}

/**
 * 예약된 동기화 실행
 */
async function runScheduledSync(timeSlot: 'morning' | 'evening') {
  const startTime = new Date();
  console.log(`[Shipment Scheduler] ${timeSlot} sync started at ${startTime.toISOString()}`);

  try {
    const results = await syncAllShipments();
    
    // 결과 집계
    const successCount = results.filter(r => r.updated || r.deliveryCompleted).length;
    const failedCount = results.length - successCount;
    const errors = results
      .filter(r => !r.updated && !r.deliveryCompleted && r.message.includes('Error'))
      .map(r => ({
        orderId: r.orderId,
        trackingNumber: r.trackingNumber,
        message: r.message
      }));
    
    const result = { successCount, failedCount, errors, totalCount: results.length };
    
    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;

    console.log(`[Shipment Scheduler] ${timeSlot} sync completed in ${duration}s`);
    console.log(`[Shipment Scheduler] Results: ${result.successCount} succeeded, ${result.failedCount} failed`);

    if (result.failedCount > 0) {
      console.error(`[Shipment Scheduler] Failed shipments:`, result.errors);
    }

    return result;
  } catch (error) {
    console.error(`[Shipment Scheduler] ${timeSlot} sync failed:`, error);
    throw error;
  }
}

/**
 * 스케줄러 중지 (테스트 또는 서버 종료 시)
 */
export function stopShipmentTrackingScheduler() {
  if (!isSchedulerRunning) {
    console.log('[Shipment Scheduler] Not running');
    return;
  }

  // node-cron은 자동으로 모든 작업을 관리하므로 별도 중지 로직 불필요
  isSchedulerRunning = false;
  console.log('[Shipment Scheduler] Stopped');
}

/**
 * 수동 동기화 트리거 (테스트 또는 관리자 요청 시)
 */
export async function triggerManualSync() {
  console.log('[Shipment Scheduler] Manual sync triggered');
  return await runScheduledSync('manual' as any);
}
