/**
 * Retry Payment Email Workflow Verification Script
 * 
 * This script tests the retry payment email workflow by:
 * 1. Creating a test checkout session with 'failed' status
 * 2. Sending a retry payment email
 * 3. Verifying the email content and retry link
 */

import { sendRetryPaymentEmail } from '../server/_core/emailService';
import { createRetryPaymentLink } from '../server/stripe';

async function main() {
  console.log('=== Retry Payment Email Workflow Verification ===\n');

  // Mock checkout session data (simulating a failed payment)
  const mockCheckoutSession = {
    id: 999,
    sessionId: 'cs_test_mock_failed_session',
    userId: 1,
    userEmail: 'kim2025.platform@gmail.com',
    itemsJson: JSON.stringify([
      {
        id: 1,
        name: '테스트 상품',
        price: 10000,
        quantity: 2,
      }
    ]),
    shippingPostalCode: '11111',
    shippingPrefecture: '경기도',
    shippingCity: '동두천시',
    shippingAddress1: '생연로 10',
    shippingAddress2: null,
    shippingName: 'KIM NA ONG',
    shippingPhone: '010-9044-3857',
    totalAmount: '20000',
    status: 'failed' as const,
    failureReason: 'card_declined',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  console.log('Step 1: Mock failed checkout session');
  console.log(`  Session ID: ${mockCheckoutSession.sessionId}`);
  console.log(`  User ID: ${mockCheckoutSession.userId}`);
  console.log(`  Total Amount: ₩${parseInt(mockCheckoutSession.totalAmount).toLocaleString()}`);
  console.log(`  Status: ${mockCheckoutSession.status}`);
  console.log(`  Failure Reason: ${mockCheckoutSession.failureReason}`);
  console.log('\n');

  // Step 2: Create retry payment link
  console.log('Step 2: Creating retry payment link...');
  
  try {
    const result = await createRetryPaymentLink({
      checkoutSession: mockCheckoutSession,
      origin: 'https://3000-iok28xuxn8avgodpwc8e3-d6da707f.sg1.manus.computer',
    });
    const retryLink = result.url;
    console.log('✓ Retry payment link created successfully!');
    console.log(`  Link: ${retryLink}`);
    console.log('\n');

    // Step 3: Send retry payment email
    console.log('Step 3: Sending retry payment email...');
    
    const emailResult = await sendRetryPaymentEmail({
      to: 'kim2025.platform@gmail.com',
      customerName: 'KIM NA ONG',
      orderAmount: `₩${parseInt(mockCheckoutSession.totalAmount).toLocaleString()}`,
      retryPaymentUrl: retryLink,
      failureReason: '카드가 거절되었습니다.',
      from: 'onboarding@resend.dev',
      fromName: 'Yakuri Shop',
    });

    if (emailResult.success) {
      console.log('✓ Retry payment email sent successfully!');
      console.log('  Recipient: kim2025.platform@gmail.com');
      console.log('  Customer: KIM NA ONG');
      console.log('  Amount: ₩20,000');
      console.log('  From: Yakuri Shop <onboarding@resend.dev>');
    } else {
      console.error('✗ Failed to send retry payment email:', emailResult.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('✗ Error in retry payment workflow:', error);
    process.exit(1);
  }

  console.log('\n');

  // Step 4: Verification summary
  console.log('=== Verification Summary ===');
  console.log('✓ Failed checkout session simulated');
  console.log('✓ Retry payment link generated');
  console.log('✓ Retry payment email sent successfully');
  console.log('\nNext steps:');
  console.log('1. Check your inbox (kim2025.platform@gmail.com) for the retry payment email');
  console.log('2. Verify the email contains:');
  console.log('   - Customer name (KIM NA ONG)');
  console.log('   - Order amount (₩20,000)');
  console.log('   - Failure reason (카드가 거절되었습니다.)');
  console.log('   - Retry payment button with working link');
  console.log('3. Click the retry payment link to verify it redirects to Stripe checkout');

  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
