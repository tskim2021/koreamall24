/**
 * 배송 추적 스케줄러 수동 테스트 스크립트
 * 
 * 사용법:
 * pnpm tsx test-scheduler.ts
 */

import { triggerManualSync } from './server/_core/shipmentTrackingScheduler';

async function testScheduler() {
  console.log('=== 배송 추적 스케줄러 수동 테스트 시작 ===\n');
  
  try {
    const result = await triggerManualSync();
    
    console.log('\n=== 테스트 결과 ===');
    console.log(`총 처리: ${result.totalCount}건`);
    console.log(`성공: ${result.successCount}건`);
    console.log(`실패: ${result.failedCount}건`);
    
    if (result.errors.length > 0) {
      console.log('\n실패한 주문:');
      result.errors.forEach(err => {
        console.log(`- 주문 ID: ${err.orderId}, 추적번호: ${err.trackingNumber}`);
        console.log(`  오류: ${err.message}`);
      });
    }
    
    console.log('\n=== 테스트 완료 ===');
    process.exit(0);
  } catch (error) {
    console.error('\n=== 테스트 실패 ===');
    console.error(error);
    process.exit(1);
  }
}

testScheduler();
