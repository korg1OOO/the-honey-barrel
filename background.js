let baxusApiCache = new Map();
let latestResult = null;
let eurToUsdRate = 1.08;
let gbpToUsdRate = 1.25;

const CACHE_DURATION = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT = 10000;
const RETRY_MAX = 3;
const PAGE_SIZE = 20;
const FETCH_DELAY = 500;

async function fetchExchangeRates() {
  try {
    let controller = new AbortController();
    let timeoutId = setTimeout(() => controller.abort(), 5000);
    let response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR', { signal: controller.signal });
    clearTimeout(timeoutId);
    let data = await response.json();
    eurToUsdRate = data.rates.USD;

    controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 5000);
    response = await fetch('https://api.exchangerate-api.com/v4/latest/GBP', { signal: controller.signal });
    clearTimeout(timeoutId);
    data = await response.json();
    gbpToUsdRate = data.rates.USD;
  } catch (error) {}
}

async function fetchWithRetry(url) {
  let retryCount = 0;
  while (retryCount < RETRY_MAX) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.status === 429) {
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
        continue;
      }

      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const listings = Array.isArray(data) ? data : data.listings || [];
      if (!Array.isArray(listings)) throw new Error('Unexpected API response format');
      return listings;
    } catch (error) {
      if (retryCount === RETRY_MAX - 1) throw error;
      retryCount++;
    }
  }
  return [];
}

async function fetchBaxusListings(searchTerm = '', spiritType = '') {
  const cacheKey = `all_listings_${searchTerm || 'default'}_${spiritType || 'all'}`;
  const cachedData = await new Promise(resolve => chrome.storage.local.get(['baxusListings', 'cacheTimestamp'], resolve));
  const now = Date.now();

  if (cachedData.baxusListings && cachedData.cacheTimestamp && (now - cachedData.cacheTimestamp < CACHE_DURATION)) {
    let filteredListings = cachedData.baxusListings;
    if (spiritType) {
      filteredListings = filteredListings.filter(listing => 
        (listing._source?.spiritType || '').toLowerCase() === spiritType.toLowerCase()
      );
    }
    baxusApiCache.set(cacheKey, filteredListings);
    return filteredListings;
  }

  baxusApiCache.clear();
  let allListings = [];
  let from = 0;
  let hasMore = true;

  const optimizedSearchTerm = searchTerm.replace(/(straight|whiskey|whisky|\d+\s*(yr|year))/gi, '').trim();
  while (hasMore) {
    const url = `https://services.baxus.co/api/search/listings?from=${from}&size=${PAGE_SIZE}&listed=true&query=${encodeURIComponent(optimizedSearchTerm)}`;
    const listings = await fetchWithRetry(url);

    allListings = allListings.concat(listings);
    if (listings.length < PAGE_SIZE) hasMore = false;
    from += PAGE_SIZE;
    await new Promise(resolve => setTimeout(resolve, FETCH_DELAY));
  }

  let filteredListings = allListings;

  if (!filteredListings.length && spiritType) {
    from = 0;
    hasMore = true;
    allListings = [];
    while (hasMore) {
      const url = `https://services.baxus.co/api/search/listings?from=${from}&size=${PAGE_SIZE}&listed=true&query=${encodeURIComponent(spiritType)}`;
      const listings = await fetchWithRetry(url);

      allListings = allListings.concat(listings);
      if (listings.length < PAGE_SIZE) hasMore = false;
      from += PAGE_SIZE;
      await new Promise(resolve => setTimeout(resolve, FETCH_DELAY));
    }
    filteredListings = allListings;
  }

  if (spiritType) {
    filteredListings = filteredListings.filter(listing => 
      (listing._source?.spiritType || '').toLowerCase() === spiritType.toLowerCase()
    );
  }

  if (!filteredListings.length) {
    from = 0;
    hasMore = true;
    allListings = [];
    while (hasMore) {
      const url = `https://services.baxus.co/api/search/listings?from=${from}&size=${PAGE_SIZE}&listed=true`;
      const listings = await fetchWithRetry(url);

      allListings = allListings.concat(listings);
      if (listings.length < PAGE_SIZE) hasMore = false;
      from += PAGE_SIZE;
      await new Promise(resolve => setTimeout(resolve, FETCH_DELAY));
    }

    filteredListings = allListings;
    if (spiritType) {
      filteredListings = filteredListings.filter(listing => 
        (listing._source?.spiritType || '').toLowerCase() === spiritType.toLowerCase()
      );
    }
    chrome.storage.local.set({ baxusListings: allListings, cacheTimestamp: Date.now() });
  }

  baxusApiCache.set(cacheKey, filteredListings);
  return filteredListings;
}

fetchExchangeRates();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'bottleFound') {
    const bottleData = message.data;
    if (!bottleData) {
      latestResult = { scraped: null, baxus: null, error: true, message: 'Failed to scrape bottle data', conversionRate: eurToUsdRate };
      chrome.runtime.sendMessage({ action: 'showResult', data: latestResult });
      return;
    }
    if (!bottleData.name) {
      latestResult = { scraped: bottleData, baxus: null, error: true, message: 'Supported Website not found', conversionRate: eurToUsdRate };
      chrome.runtime.sendMessage({ action: 'showResult', data: latestResult });
      return;
    }
    checkBaxusPrice(bottleData).then(result => {
      latestResult = result;
      chrome.runtime.sendMessage({ action: 'showResult', data: result });
    }).catch(() => {
      latestResult = { scraped: bottleData, baxus: null, error: true, message: 'Failed to process bottle data', conversionRate: eurToUsdRate };
      chrome.runtime.sendMessage({ action: 'showResult', data: latestResult });
    });
  } else if (message.action === 'requestLatestData') {
    chrome.runtime.sendMessage({ 
      action: 'showResult', 
      data: latestResult || { error: true, message: 'You should open a supported website', conversionRate: eurToUsdRate }
    });
  } else if (message.action === 'updateShippingCost') {
    if (latestResult && latestResult.scraped && latestResult.baxus) {
      const shippingCost = message.shippingCost || 0;
      const savings = calculateSavings(latestResult.scraped.price, latestResult.baxus.price, shippingCost, latestResult.scraped.currency);
      latestResult.savings = savings;
      latestResult.shippingCost = shippingCost;
      chrome.runtime.sendMessage({ action: 'showResult', data: latestResult });
    }
  } else if (message.action === 'refreshListings') {
    chrome.storage.local.remove(['baxusListings', 'cacheTimestamp'], () => {
      checkBaxusPrice(latestResult?.scraped).then(result => {
        latestResult = result;
        chrome.runtime.sendMessage({ action: 'showResult', data: result });
      });
    });
  }
});

async function checkBaxusPrice(bottleData) {
  if (!bottleData || !bottleData.name || typeof bottleData.name !== 'string') {
    return { scraped: bottleData || {}, baxus: null, error: true, message: 'Supported Website not found', conversionRate: eurToUsdRate };
  }

  const listings = await fetchBaxusListings(bottleData.name, bottleData.spiritType);
  if (!listings || !listings.length) {
    return { 
      scraped: bottleData, 
      baxus: null, 
      savings: 'N/A', 
      conversionRate: bottleData.currency === 'GBP' ? gbpToUsdRate : (bottleData.currency === 'USD' ? 1 : eurToUsdRate) 
    };
  }

  const bestMatch = findBestMatch(bottleData, listings);
  if (!bestMatch) {
    return { 
      scraped: bottleData, 
      baxus: null, 
      savings: 'N/A', 
      conversionRate: bottleData.currency === 'GBP' ? gbpToUsdRate : (bottleData.currency === 'USD' ? 1 : eurToUsdRate) 
    };
  }

  return {
    scraped: bottleData,
    baxus: {
      name: bestMatch._source.name,
      price: bestMatch._source.price,
      url: `https://baxus.co/asset/${bestMatch._source.id}`,
      confidence: bestMatch.confidence
    },
    savings: bottleData.price === 'N/A' ? 'N/A' : calculateSavings(bottleData.price, bestMatch._source.price, 0, bottleData.currency),
    conversionRate: bottleData.currency === 'GBP' ? gbpToUsdRate : (bottleData.currency === 'USD' ? 1 : eurToUsdRate)
  };
}

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace('year', 'y')
    .replace('yr', 'y')
    .replace('bot\.', 'bottling')
    .replace('bottling\s*bottling', 'bottling')
    .replace('1970s', '1970')
    .replace('half size', '')
    .replace('amer whiskey', 'american whiskey')
    .replace('amer', 'american')
    .replace('single malt', 'sm')
    .replace('whisky', 'whiskey')
    .trim();
}

function extractCoreTerms(name) {
  return normalizeName(name)
    .split(' ')
    .filter(term => term.length > 3);
}

function calculateSimilarity(str1, str2) {
  const tokens1 = extractCoreTerms(str1);
  const tokens2 = extractCoreTerms(str2);
  const intersection = tokens1.filter(token => tokens2.includes(token));
  const union = [...new Set([...tokens1, ...tokens2])];
  return (intersection.length / union.length) * 100;
}

function findBestMatch(scraped, listings) {
  if (!listings || !listings.length) return null;

  const scrapedCoreTerms = extractCoreTerms(scraped.name);
  const scoredListings = listings.map(listing => {
    const baxus = listing._source;
    let score = 0;
    let confidence = 0;

    if (scraped.spiritType && baxus.spiritType) {
      if (scraped.spiritType.toLowerCase() !== baxus.spiritType.toLowerCase()) {
        return { listing, score: -Infinity, confidence: 0 };
      }
      score += 10;
      confidence += 0.2;
    }

    const scrapedName = normalizeName(scraped.name);
    const baxusName = normalizeName(baxus.name);
    const baxusCoreTerms = extractCoreTerms(baxus.name);
    if (!scrapedCoreTerms.every(term => baxusCoreTerms.some(baxusTerm => baxusTerm.includes(term)))) {
      return { listing, score: -Infinity, confidence: 0 };
    }

    const nameMatchScore = calculateSimilarity(scrapedName, baxusName);
    score += nameMatchScore * 2;
    confidence += (nameMatchScore / 100) * 0.5;

    const specialDescriptors = ['limited edition', 'cask strength', 'special release', 'rare'];
    const scrapedLower = scraped.name.toLowerCase();
    const baxusLower = baxus.name.toLowerCase();
    const isSpecialScraped = specialDescriptors.some(desc => scrapedLower.includes(desc));
    const isSpecialBaxus = specialDescriptors.some(desc => baxusLower.includes(desc));
    if (isSpecialScraped && isSpecialBaxus) {
      score += 20;
      confidence += 0.2;
    } else if (isSpecialScraped !== isSpecialBaxus) {
      score -= 10;
      confidence -= 0.1;
    }

    const baxusSize = baxus.attributes.Size ? baxus.attributes.Size.replace(/\s/g, '').toLowerCase() : (baxus.name.toLowerCase().includes('half size') ? '375ml' : null);
    if (scraped.size !== 'N/A' && baxusSize) {
      const scrapedSize = parseInt(scraped.size.replace(/\s/g, '')) || 0;
      const baxusSizeValue = parseInt(baxusSize) || 0;
      if (scrapedSize === baxusSizeValue) {
        score += 20;
        confidence += 0.15;
      } else if (Math.abs(scrapedSize - baxusSizeValue) <= 500) {
        score += 2;
        confidence += 0.05;
      }
    } else {
      score += 5;
      confidence += 0.05;
    }

    if (scraped.abv !== 'N/A' && baxus.attributes.ABV) {
      const scrapedAbv = parseFloat(scraped.abv);
      const baxusAbv = parseFloat(baxus.attributes.ABV);
      if (!isNaN(scrapedAbv) && !isNaN(baxusAbv) && Math.abs(scrapedAbv - baxusAbv) < 0.1) {
        score += 5;
        confidence += 0.1;
      }
    } else if (scraped.abv === 'N/A' && baxus.attributes.ABV === "40") {
      score += 5;
      confidence += 0.05;
    } else {
      score += 2;
      confidence += 0.02;
    }

    if (scraped.age !== 'N/A' && baxus.attributes.Age === scraped.age) {
      score += 15;
      confidence += 0.15;
    }

    if (baxus.vintage && scraped.name.includes(baxus.vintage)) {
      score += 10;
      confidence += 0.1;
    }
    if (baxus.caskNumber && scraped.name.includes(baxus.caskNumber)) {
      score += 10;
      confidence += 0.1;
    }

    return { listing, score, confidence: Math.min(confidence, 1) };
  });

  scoredListings.sort((a, b) => b.score - a.score);
  return scoredListings[0].score > 40 ? { ...scoredListings[0].listing, confidence: scoredListings[0].confidence } : null;
}

function calculateSavings(price, usdPrice, shippingCost = 0, currency = 'EUR') {
  if (currency === 'USD') return price - (usdPrice + shippingCost);
  const rate = currency === 'GBP' ? gbpToUsdRate : eurToUsdRate;
  return (price * rate) - (usdPrice + shippingCost);
}