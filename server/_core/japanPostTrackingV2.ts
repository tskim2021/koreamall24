/**
 * Japan Post Tracking Service V2 - Puppeteer-based Implementation
 * 
 * Provides real-time tracking functionality for Japan Post shipments
 * Uses Puppeteer to handle JavaScript-rendered content
 * Supports: Yu-Pack, EMS, Registered Mail, International Mail
 */

import puppeteer, { Browser, Page } from 'puppeteer';
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

let browserInstance: Browser | null = null;

/**
 * Get or create a Puppeteer browser instance
 */
async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  try {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });
    return browserInstance;
  } catch (error) {
    console.error('[Japan Post] Failed to launch browser:', error);
    throw new Error('Failed to initialize browser for tracking');
  }
}

/**
 * Fetch tracking information from Japan Post using Puppeteer
 * 
 * @param trackingNumber - 11-13 digit tracking number (without hyphens)
 * @returns Tracking status information
 */
export async function fetchJapanPostTrackingV2(
  trackingNumber: string
): Promise<JapanPostTrackingStatus> {
  let page: Page | null = null;

  try {
    // Validate tracking number format
    const numericOnly = trackingNumber.replace(/[^0-9]/g, '');
    const alphanumeric = trackingNumber.replace(/[^0-9A-Za-z]/g, '');
    
    const isValidFormat = 
      (numericOnly.length >= 11 && numericOnly.length <= 13) || 
      (alphanumeric.length >= 13 && alphanumeric.length <= 15);
    
    if (!isValidFormat) {
      throw new Error(`Invalid Japan Post tracking number format: ${trackingNumber}`);
    }
    
    const cleanNumber = numericOnly.length >= 11 ? numericOnly : alphanumeric;

    // Get browser instance
    const browser = await getBrowser();
    page = await browser.newPage();

    // Set timeout
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(15000);

    // Navigate to Japan Post tracking service
    const trackingUrl = `https://trackings.post.japanpost.jp/services/srv/search/input?locale=en&number=${cleanNumber}`;
    
    console.log(`[Japan Post V2] Fetching tracking for: ${cleanNumber}`);
    await page.goto(trackingUrl, { waitUntil: 'networkidle2' });

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get page content
    const content = await page.content();
    
    // Parse the HTML
    const trackingStatus = parseJapanPostResponseV2(cleanNumber, content);
    
    return trackingStatus;
  } catch (error) {
    console.error(`[Japan Post V2] Error fetching tracking for ${trackingNumber}:`, error);
    
    // Return a pending status if fetch fails
    return {
      trackingNumber,
      status: 'pending',
      lastUpdate: new Date(),
      events: [],
    };
  } finally {
    // Close page but keep browser alive for reuse
    if (page) {
      try {
        await page.close();
      } catch (e) {
        console.error('[Japan Post V2] Error closing page:', e);
      }
    }
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
function parseJapanPostResponseV2(trackingNumber: string, html: string): JapanPostTrackingStatus {
  const events: TrackingEvent[] = [];
  
  try {
    const $ = cheerio.load(html);
    
    // Check if tracking information is available
    const noMatchText = html.includes('該当する郵便物等がありません') || 
                       html.includes('No matching items') ||
                       html.includes('該当する郵便物がありません');
    
    if (noMatchText) {
      console.log(`[Japan Post V2] No tracking info found for: ${trackingNumber}`);
      return {
        trackingNumber,
        status: 'pending',
        lastUpdate: new Date(),
        events,
      };
    }

    let status: 'pending' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception' = 'pending';
    let currentLocation = '';
    let estimatedDeliveryDate: Date | undefined;

    // Parse delivery details table
    // Look for table rows with tracking information
    const rows = $('table tr');
    let lastEventDate: Date | undefined;

    rows.each((index, element) => {
      const cells = $(element).find('td');
      if (cells.length >= 2) {
        const dateText = $(cells[0]).text().trim();
        const statusText = $(cells[1]).text().trim();
        const locationText = $(cells[2])?.text().trim() || '';
        
        // Parse date if it exists (format: YYYY/MM/DD HH:MM or similar)
        if (dateText && dateText.match(/\d{4}\/\d{1,2}\/\d{1,2}/)) {
          try {
            const eventDate = new Date(dateText);
            lastEventDate = eventDate;
            
            let eventStatus = 'その他';
            let eventDescription = statusText;
            
            // Map Japanese status to our status codes
            if (statusText.includes('お届け済み') || statusText.includes('配達完了')) {
              status = 'delivered';
              eventStatus = '配達完了';
              eventDescription = 'お届け済み';
            } else if (statusText.includes('配達中')) {
              status = 'out_for_delivery';
              eventStatus = '配達中';
              eventDescription = '配達中';
            } else if (statusText.includes('到着')) {
              if (!status || status === 'pending') {
                status = 'in_transit';
              }
              eventStatus = '到着';
              eventDescription = statusText;
            } else if (statusText.includes('引受')) {
              if (!status || status === 'pending') {
                status = 'pending';
              }
              eventStatus = '引受';
              eventDescription = '引受';
            } else if (statusText.includes('返送') || statusText.includes('保管中')) {
              status = 'exception';
              eventStatus = statusText;
              eventDescription = statusText;
            } else if (statusText.includes('国際交換局')) {
              status = 'in_transit';
              eventStatus = '国際交換局';
              eventDescription = statusText;
            } else if (statusText.includes('税関')) {
              status = 'in_transit';
              eventStatus = '税関検査';
              eventDescription = statusText;
            }
            
            // Store the event
            events.push({
              timestamp: eventDate,
              status: eventStatus,
              location: locationText,
              description: eventDescription,
            });
          } catch (e) {
            console.error('[Japan Post V2] Error parsing date:', dateText, e);
          }
        }
      }
    });

    // If no events were found, try alternative parsing
    if (events.length === 0) {
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

    console.log(`[Japan Post V2] Parsed ${events.length} events for ${trackingNumber}, status: ${status}`);

    return {
      trackingNumber,
      status,
      currentLocation: currentLocation || undefined,
      estimatedDeliveryDate,
      lastUpdate: lastEventDate || new Date(),
      events,
    };
  } catch (error) {
    console.error('[Japan Post V2] Error parsing response:', error);
    
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
 * Close browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance && browserInstance.isConnected()) {
    try {
      await browserInstance.close();
      browserInstance = null;
      console.log('[Japan Post V2] Browser closed');
    } catch (error) {
      console.error('[Japan Post V2] Error closing browser:', error);
    }
  }
}

/**
 * Validate Japan Post tracking number format
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
