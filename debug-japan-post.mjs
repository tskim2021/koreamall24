import axios from 'axios';
import * as cheerio from 'cheerio';

const trackingNumber = 'RM767809377IN';

async function debugJapanPostResponse() {
  try {
    console.log(`\n=== Debugging Japan Post Tracking: ${trackingNumber} ===\n`);

    const response = await axios.get(
      'https://trackings.post.japanpost.jp/services/srv/search/input',
      {
        params: {
          locale: 'en',
          number: trackingNumber,
        },
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; JapanesedrugstoreMall/1.0)',
        },
      }
    );

    console.log('Response Status:', response.status);
    console.log('Response Headers:', response.headers);
    console.log('\n=== HTML Content (First 2000 chars) ===\n');
    console.log(response.data.substring(0, 2000));
    console.log('\n=== HTML Content (Last 2000 chars) ===\n');
    console.log(response.data.substring(response.data.length - 2000));

    // Try to find tables
    const $ = cheerio.load(response.data);
    
    console.log('\n=== Looking for tables ===\n');
    const tables = $('table');
    console.log(`Found ${tables.length} tables`);
    
    tables.each((index, table) => {
      console.log(`\n--- Table ${index + 1} ---`);
      const rows = $(table).find('tr');
      console.log(`Rows: ${rows.length}`);
      
      rows.slice(0, 5).each((rowIndex, row) => {
        const cells = $(row).find('td, th');
        const cellTexts = cells.map((i, cell) => $(cell).text().trim()).get();
        console.log(`Row ${rowIndex + 1}:`, cellTexts);
      });
    });

    // Look for specific text
    console.log('\n=== Looking for key text ===\n');
    const bodyText = $('body').text();
    
    const keywords = [
      'お届け済み',
      '配達完了',
      '配達中',
      '到着',
      '引受',
      '2025',
      '11月',
      'RM767809377IN'
    ];

    keywords.forEach(keyword => {
      if (bodyText.includes(keyword)) {
        console.log(`✓ Found: "${keyword}"`);
        const index = bodyText.indexOf(keyword);
        console.log(`  Context: ...${bodyText.substring(index - 50, index + 100)}...`);
      } else {
        console.log(`✗ Not found: "${keyword}"`);
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugJapanPostResponse();
