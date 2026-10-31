/**
 * Email System Verification Script
 * 
 * This script tests the email system by:
 * 1. Setting sender information (EMAIL_FROM_NAME)
 * 2. Sending a test email
 * 3. Verifying the email workflow
 */

import { sendTestEmail } from '../server/_core/emailService';

async function main() {
  console.log('=== Email System Verification ===\n');

  // Step 1: Sender information (configured via admin dashboard)
  console.log('Step 1: Sender information');
  console.log('  FROM_NAME: Yakuri Shop');
  console.log('  FROM_ADDRESS: onboarding@resend.dev');
  console.log('  (Configure via Admin Dashboard > Site Settings > Email tab)');
  console.log('\n');

  // Step 2: Send test email
  console.log('Step 2: Sending test email...');
  
  try {
    const result = await sendTestEmail({
      to: 'kim2025.platform@gmail.com',
      from: 'onboarding@resend.dev',
      fromName: 'Yakuri Shop',
    });

    if (result.success) {
      console.log('✓ Test email sent successfully!');
      console.log('  Recipient: kim2025.platform@gmail.com');
      console.log('  From: Yakuri Shop <onboarding@resend.dev>');
    } else {
      console.error('✗ Failed to send test email:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('✗ Error sending test email:', error);
    process.exit(1);
  }

  console.log('\n');

  // Step 3: Verification summary
  console.log('=== Verification Summary ===');
  console.log('✓ Test email sent successfully');
  console.log('\nNext steps:');
  console.log('1. Check your inbox (kim2025.platform@gmail.com) for the test email');
  console.log('2. Verify the sender name appears as "Yakuri Shop"');
  console.log('3. Configure sender info via Admin Dashboard > Site Settings > Email tab');
  console.log('4. Test the retry payment email workflow');

  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
