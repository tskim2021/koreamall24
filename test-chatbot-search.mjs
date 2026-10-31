import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

const client = createTRPCClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/api/trpc',
      transformer: superjson,
    }),
  ],
});

async function testChatbotSearch() {
  console.log('Testing chatbot.searchProducts API...\n');
  
  try {
    // Test 1: Search for headache medicine
    console.log('Test 1: Searching for "頭痛薬"...');
    const result1 = await client.chatbot.searchProducts.query({ query: '頭痛薬', limit: 3 });
    console.log(`Found ${result1.length} products:`);
    result1.forEach(p => console.log(`  - ${p.name} (¥${p.price}) - Stock: ${p.stock}`));
    console.log('');
    
    // Test 2: Search for vitamin C
    console.log('Test 2: Searching for "ビタミンC"...');
    const result2 = await client.chatbot.searchProducts.query({ query: 'ビタミンC', limit: 3 });
    console.log(`Found ${result2.length} products:`);
    result2.forEach(p => console.log(`  - ${p.name} (¥${p.price}) - Stock: ${p.stock}`));
    console.log('');
    
    console.log('✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testChatbotSearch();
