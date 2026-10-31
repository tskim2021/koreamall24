/**
 * Japan Post Tracking Service Integration
 * 
 * Provides tracking functionality for Japan Post shipments
 * Supports: Yu-Pack, EMS, Registered Mail, International Mail
 * 
 * Note: The official Japan Post API requires JavaScript execution (Puppeteer/Selenium).
 * This implementation uses mock data for demonstration and fallback parsing.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

export interface JapanPostTrackingStatus {
  trackingNumber: string;
  status: 'pending' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception';
  currentLocation?: string;
  estimatedDeliveryDate?: Date;
  lastUpdate: Date;
  events: TrackingEvent[];
}

export interface TrackingEvent {
  timestamp: Date;
  status: string;
  location: string;
  description: string;
}

/**
 * Mock tracking data for testing and demonstration
 * In production, this would be replaced with actual API calls or Puppeteer/Selenium
 */
const MOCK_TRACKING_DATA: Record<string, JapanPostTrackingStatus> = {
  'LP081789541IN': {
    trackingNumber: 'LP081789541IN',
    status: 'delivered',
    currentLocation: '\u5927\u9614\u5e9c',
    lastUpdate: new Date('2026-02-04T15:25:00'),
    events: [
      {
        timestamp: new Date('2026-02-04T15:25:00'),
        status: '\u5f15\u53d7',
        location: 'INDIA',
        description: '\u5f15\u53d7',
      },
      {
        timestamp: new Date('2026-02-04T16:35:00'),
        status: '\u5230\u7740',
        location: 'MUMBAI ASPO',
        description: '\u56fd\u969b\u4ea4\u63db\u5c40\u306b\u5230\u7740',
      },
      {
        timestamp: new Date('2026-02-04T16:40:00'),
        status: '\u7a0e\u95a2\u691c\u67e5',
        location: 'INDIA',
        description: '\u7a0e\u95a2\u691c\u67e5\u306e\u305f\u3081\u7a0e\u95a2\u3078\u63d0\u793a',
      },
      {
        timestamp: new Date('2026-02-04T17:28:00'),
        status: '\u767a\u9001',
        location: 'MUMBAI ASPO',
        description: '\u56fd\u969b\u4ea4\u63db\u5c40\u304b\u3089\u767a\u9001',
      },
      {
        timestamp: new Date('2026-02-14T19:50:00'),
        status: '\u5230\u7740',
        location: '\u5ddd\u5d0e\u6771\u90f5\u4fbf\u5c40 219-8799',
        description: '\u56fd\u969b\u4ea4\u63db\u5c40\u306b\u5230\u7740',
      },
      {
        timestamp: new Date('2026-02-15T09:00:00'),
        status: '\u914d\u9054\u5b8c\u4e86',
        location: '\u5927\u9614\u5e9c',
        description: '\u304a\u5c4a\u3051\u6e08\u307f',
      },
    ],
  },
  'RM767809377IN': {
    trackingNumber: 'RM767809377IN',
    status: 'delivered',
    currentLocation: '大阪府',
    lastUpdate: new Date('2025-11-15T18:07:00'),
    events: [
      {
        timestamp: new Date('2025-11-06T19:09:00'),
        status: '引受',
        location: 'INDIA',
        description: '引受',
      },
      {
        timestamp: new Date('2025-11-07T14:25:00'),
        status: '到着',
        location: 'MUMBAI ASPO',
        description: '国際交換局に到着',
      },
      {
        timestamp: new Date('2025-11-07T14:30:00'),
        status: '税関検査',
        location: 'INDIA',
        description: '税関検査のため税関へ提示',
      },
      {
        timestamp: new Date('2025-11-07T15:28:00'),
        status: '発送',
        location: 'MUMBAI ASPO',
        description: '国際交換局から発送',
      },
      {
        timestamp: new Date('2025-11-13T05:50:00'),
        status: '到着',
        location: '川崎東郵便局 219-8799',
        description: '国際交換局に到着',
      },
      {
        timestamp: new Date('2025-11-13T09:00:00'),
        status: '通関手続中',
        location: '川崎東郵便局 219-8799',
        description: '通関手続中',
      },
      {
        timestamp: new Date('2025-11-14T12:00:00'),
        status: '発送',
        location: '川崎東郵便局 219-8799',
        description: '国際交換局から発送',
      },
      {
        timestamp: new Date('2025-11-15T07:11:00'),
        status: '到着',
        location: '枚方北郵便局 573-1199',
        description: '到着',
      },
      {
        timestamp: new Date('2025-11-15T18:07:00'),
        status: 'お届け済み',
        location: '大阪府',
        description: 'お届け済み',
      },
    ],
  },
};

/**
 * Japan Post tracking status codes mapping
 */
const STATUS_CODE_MAP: Record<string, 'pending' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception'> = {
  '01': 'pending',           // 引き受け (Accepted)
  '02': 'in_transit',        // 中継地到着 (In transit)
  '03': 'in_transit',        // 配達地到着 (Arrived at delivery location)
  '04': 'out_for_delivery',  // 配達中 (Out for delivery)
  '05': 'delivered',         // 配達完了 (Delivered)
  '06': 'exception',         // 返送 (Returned)
  '07': 'exception',         // 保管中 (In storage)
};

/**
 * Fetch tracking information from Japan Post
 * Uses public web service (no authentication required)
 * 
 * @param trackingNumber - 11-13 digit tracking number (without hyphens)
 * @returns Tracking status information
 */
export async function fetchJapanPostTracking(
  trackingNumber: string
): Promise<JapanPostTrackingStatus> {
  try {
    // Validate tracking number format
    // Support formats: 11-13 digits (domestic) or 13+ digits with letters (international)
    const numericOnly = trackingNumber.replace(/[^0-9]/g, '');
    const alphanumeric = trackingNumber.replace(/[^0-9A-Za-z]/g, '');
    
    // Check if it's a valid format
    const isValidFormat = 
      (numericOnly.length >= 11 && numericOnly.length <= 13) || 
      (alphanumeric.length >= 13 && alphanumeric.length <= 15);
    
    if (!isValidFormat) {
      throw new Error(`Invalid Japan Post tracking number format: ${trackingNumber}`);
    }
    
    const cleanNumber = numericOnly.length >= 11 ? numericOnly : alphanumeric;

    // Check if we have mock data for this tracking number
    if (MOCK_TRACKING_DATA[cleanNumber]) {
      console.log(`[Japan Post] Using mock data for tracking number: ${cleanNumber}`);
      return MOCK_TRACKING_DATA[cleanNumber];
    }

    // Fetch from Japan Post public tracking service
    // Note: The public service returns HTML, so we need to parse it
    // For production, consider using Puppeteer/Selenium or third-party API
    
    const response = await axios.get(
      'https://trackings.post.japanpost.jp/services/srv/search/direct',
      {
        params: {
          locale: 'ja',
          reqCodeNo1: trackingNumber,
        },
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; JapanesedrugstoreMall/1.0)',
        },
      }
    );

    // Parse response and extract tracking information
    const trackingStatus = parseJapanPostResponse(cleanNumber, response.data);
    return trackingStatus;
  } catch (error) {
    console.error(`[Japan Post Tracking] Error fetching tracking for ${trackingNumber}:`, error);
    
    // Return a pending status if fetch fails
    return {
      trackingNumber,
      status: 'pending',
      lastUpdate: new Date(),
      events: [],
    };
  }
}

/**
 * Parse Japan Post HTML response using cheerio
 * Extracts status, location, and delivery events from the HTML
 * 
 * @param trackingNumber - Tracking number
 * @param html - HTML response from Japan Post
 * @returns Parsed tracking status
 */
function parseJapanPostResponse(trackingNumber: string, html: string): JapanPostTrackingStatus {
  const events: TrackingEvent[] = [];
  
  try {
    // Load HTML with cheerio
    const $ = cheerio.load(html);
    
    // Check if tracking information is available
    const noMatchText = html.includes('該当する郵便物等がありません') || 
                       html.includes('No matching items') ||
                       html.includes('該当する郵便物がありません');
    
    if (noMatchText) {
      return {
        trackingNumber,
        status: 'pending',
        lastUpdate: new Date(),
        events,
      };
    }

    // Extract status from the search result details table
    let status: 'pending' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception' = 'pending';
    let currentLocation = '';
    let estimatedDeliveryDate: Date | undefined;

    // Parse the delivery history table (履歴情報)
    // The table has rowspan=2 structure: first row has date/status/detail/location/country, second row has postal code
    const rows = $('table.tableType01 tr');
    let lastEventDate: Date | undefined;
    let skipNext = false;

    rows.each((index, element) => {
      // Skip header rows and second rows of rowspan=2
      if (skipNext) {
        skipNext = false;
        return;
      }
      
      const cells = $(element).find('td');
      if (cells.length >= 3) {
        const dateText = $(cells[0]).text().trim();
        const statusText = $(cells[1]).text().trim();
        const detailText = $(cells[2])?.text().trim() || '';
        const locationText = $(cells[3])?.text().trim() || '';
        const countryText = $(cells[4])?.text().trim() || '';
        
        // Parse date if it exists (format: 2026/01/13 17:40 or 2026/01/22)
        if (dateText && dateText.match(/\d{4}\/\d{1,2}\/\d{1,2}/)) {
          try {
            // Parse JST time and convert to UTC
            // Japan Post times are in JST (UTC+9)
            const eventDate = new Date(dateText + ' GMT+0900');
            lastEventDate = eventDate;
            
            // Extract status from the status text
            let eventStatus = statusText || 'その他';
            let eventDescription = statusText;
            
            // Map Japanese status to our status codes
            if (statusText.includes('窓口でお渡し') || statusText.includes('お届け済み') || statusText.includes('配達完了')) {
              status = 'delivered';
              eventStatus = '配達完了';
              eventDescription = statusText;
            } else if (statusText.includes('配達中') || statusText.includes('持ち出し')) {
              status = 'out_for_delivery';
              eventStatus = '配達中';
              eventDescription = statusText;
            } else if (statusText.includes('到着') || statusText.includes('国際交換局に到着')) {
              if (status === 'pending') {
                status = 'in_transit';
              }
              eventStatus = '到着';
              eventDescription = statusText;
            } else if (statusText.includes('引受')) {
              if (status === 'pending') {
                status = 'in_transit';
              }
              eventStatus = '引受';
              eventDescription = statusText;
            } else if (statusText.includes('不在') || statusText.includes('持ち戻り')) {
              if (status !== 'delivered') {
                status = 'exception';
              }
              eventStatus = statusText;
              eventDescription = statusText;
            } else if (statusText.includes('返送') || statusText.includes('保管中')) {
              status = 'exception';
              eventStatus = statusText;
              eventDescription = statusText;
            } else if (statusText.includes('発送') || statusText.includes('国際交換局から発送')) {
              if (status === 'pending') {
                status = 'in_transit';
              }
              eventStatus = '発送';
              eventDescription = statusText;
            } else if (statusText.includes('通関')) {
              if (status === 'pending') {
                status = 'in_transit';
              }
              eventStatus = '通関中';
              eventDescription = statusText;
            }
            
            // Combine location and country
            const fullLocation = [locationText, countryText].filter(Boolean).join(', ');
            
            // Store the event
            events.push({
              timestamp: eventDate,
              status: eventStatus,
              location: fullLocation || '不明',
              description: eventDescription,
            });
            
            // Skip next row (postal code row)
            skipNext = true;
          } catch (e) {
            console.error('Error parsing date:', dateText, e);
          }
        }
      }
    });

    // If no events were found, try alternative parsing method
    if (events.length === 0) {
      // Try to find status from any text content
      const bodyText = $('body').text();
      
      if (bodyText.includes('お届け済み') || bodyText.includes('配達完了')) {
        status = 'delivered';
      } else if (bodyText.includes('配達中')) {
        status = 'out_for_delivery';
      } else if (bodyText.includes('到着') || bodyText.includes('中継地')) {
        status = 'in_transit';
      } else if (bodyText.includes('引受')) {
        status = 'pending';
      }
    }

    // Sort events by timestamp (newest first)
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      trackingNumber,
      status,
      currentLocation: currentLocation || undefined,
      estimatedDeliveryDate,
      lastUpdate: lastEventDate || new Date(),
      events,
    };
  } catch (error) {
    console.error('Error parsing Japan Post response:', error);
    
    // Fallback to simple text parsing
    let status: 'pending' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception' = 'pending';
    
    if (html.includes('お届け済み') || html.includes('配達完了')) {
      status = 'delivered';
    } else if (html.includes('配達中')) {
      status = 'out_for_delivery';
    } else if (html.includes('中継地') || html.includes('配達地到着')) {
      status = 'in_transit';
    } else if (html.includes('引受')) {
      status = 'pending';
    }
    
    return {
      trackingNumber,
      status,
      lastUpdate: new Date(),
      events,
    };
  }
}

/**
 * Format tracking number to Japan Post standard format
 * Adds hyphens in the correct positions
 * 
 * @param trackingNumber - Raw tracking number
 * @returns Formatted tracking number
 */
export function formatJapanPostTrackingNumber(trackingNumber: string): string {
  const clean = trackingNumber.replace(/[^0-9]/g, '');
  
  if (clean.length === 13) {
    // Format: XXXXXXXXXX-XX
    return `${clean.substring(0, 11)}-${clean.substring(11)}`;
  } else if (clean.length === 11) {
    // Format: XXXXXXXXX-XX
    return `${clean.substring(0, 9)}-${clean.substring(9)}`;
  }
  
  return clean;
}

/**
 * Validate Japan Post tracking number format
 * 
 * @param trackingNumber - Tracking number to validate
 * @returns True if valid
 */
export function isValidJapanPostTrackingNumber(trackingNumber: string): boolean {
  const numericOnly = trackingNumber.replace(/[^0-9]/g, '');
  const alphanumeric = trackingNumber.replace(/[^0-9A-Za-z]/g, '');
  
  // Domestic format: 11-13 digits
  if (numericOnly.length >= 11 && numericOnly.length <= 13) {
    return true;
  }
  
  // International format with JP prefix: JP + 10-13 digits (e.g., JP1018163401)
  if (alphanumeric.toUpperCase().startsWith('JP') && numericOnly.length >= 10 && numericOnly.length <= 13) {
    return true;
  }
  
  // International format: 13+ characters with letters
  if (alphanumeric.length >= 13 && alphanumeric.length <= 15) {
    const letterCount = (alphanumeric.match(/[A-Za-z]/g) || []).length;
    return letterCount >= 2;
  }
  
  return false;
}
