# The Honey Barrel

A Chrome extension that scrapes whisky and wine bottle information from retail websites and compares prices with the BAXUS marketplace to help users find better deals.

## Features
- Scrapes bottle information (name, price, size, ABV, age, spirit type) from supported retail websites.
- Matches scraped bottles with listings on the BAXUS marketplace.
- Displays a popup with price comparisons, potential savings, and direct links to BAXUS.
- Handles variations in naming conventions and supports limited editions, rare bottles, and special packages.
- Caches BAXUS listings for faster performance.
- Supports dynamic shipping cost adjustments.

## Supported Websites
- thewhiskyexchange.com
- masterofmalt.com
- wangsliquors.com
- patsliquordelray.com
- totalwine.com
- drizly.com
- wine.com

#### **A. Installation**
1. Clone the repository:
   ```bash
   git clone https://github.com/korg1OOO/the-honey-barrel
2. Open Chrome and navigate to chrome://extensions/.
3. Enable "Developer mode" in the top right.
4. Click "Load unpacked" and select the the-honey-barrel directory.
5. The extension will appear in your toolbar. Navigate to a supported retail website to use it.

#### **B. Source Code**
- `background.js`: Handles BAXUS API integration, matching, and price comparison.
- `content.js`: Scrapes bottle information from retail websites.
- `popup.js`/`popup.html`/`popup.css`: Manages the UI.
- `privacy-policy.html`: Provides privacy information.
- `MATCHING_ALGORITHM.md`: Documents the matching algorithm.

#### **C. Documentation**
- **API Integration Documentation**
    The extension integrates with the BAXUS marketplace API to fetch listings for price comparison.
    Endpoint: GET https://services.baxus.co/api/search/listings?from=0&size=20&listed=true
    - **Parameters**
        1. from: Starting index for pagination.
        2. size: Number of listings per page (set to 20).
        3. listed: Filters for currently listed assets (true).
        4. query: Search term (e.g., bottle name or spirit type).
    - **Implementation**
        1. The fetchBaxusListings function paginates through listings until all matches are retrieved.
        2. Results are cached locally for 24 hours using chrome.storage.local to minimize API calls.
        3. Rate limiting is handled with exponential backoff (429 status code).
    - **Error Handling**
        1. Retries API calls up to 3 times with increasing delays.
        2. Falls back to an empty array if all retries fail.

#### **D. Addressing Additional Notes**
- **User Privacy and Security**: The `privacy-policy.html` already outlines that no personal data is collected, and API calls are made securely over HTTPS.
- **Seamless Experience**: The popup is non-intrusive, and direct links to BAXUS drive traffic effectively.
- **Edge Cases**: The matching algorithm handles limited editions, rare bottles, and special packages, as documented in `MATCHING_ALGORITHM.md`.
