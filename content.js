const SCRAPE_MAX_ATTEMPTS = 5;
const SCRAPE_DELAY = 2000;

function scrapeBottleInfo() {
  let name, price, size = 'N/A', abv = 'N/A', age = 'N/A', spiritType = 'N/A', currency = 'EUR';
  const hostname = window.location.hostname;

  if (hostname.includes('thewhiskyexchange.com')) {
    const mainName = document.querySelector('.product-main__name')?.innerText || '';
    const subName = document.querySelector('.product-main__sub-name')?.innerText || '';
    name = `${mainName} ${subName}`.trim();

    const priceElement = document.querySelector('.product-action__price');
    price = priceElement ? priceElement.innerText : 'N/A';
    currency = priceElement?.innerText.includes('£') ? 'GBP' : 'EUR';

    const dataElements = document.querySelectorAll('.product-main__data');
    const descriptionElement = document.querySelector('.product-main__description')?.innerText || '';

    dataElements.forEach(el => {
      const text = el.innerText.toLowerCase();
      if (text.includes('cl') || text.includes('ml')) {
        const sizePart = el.innerText.split('/')[0].trim();
        size = sizePart.includes('cl') ? `${parseFloat(sizePart.replace('cl', '')) * 10} ml` : sizePart;
      }
      if (text.includes('%')) abv = el.innerText.split('/')[1]?.trim().replace('%', '') || 'N/A';
    });

    if (descriptionElement) {
      const descriptionLower = descriptionElement.toLowerCase();
      if (descriptionLower.includes('bourbon')) spiritType = 'Bourbon';
      else if (descriptionLower.includes('single malt')) spiritType = 'Single Malt Scotch Whisky';
      else if (descriptionLower.includes('scotch') || descriptionLower.includes('blended scotch')) spiritType = 'Blended Scotch Whisky';
    }

    const breadcrumb = document.querySelector('.breadcrumb')?.innerText.toLowerCase() || '';
    if (breadcrumb.includes('blended scotch')) spiritType = 'Blended Scotch Whisky';
    else if (breadcrumb.includes('bourbon')) spiritType = 'Bourbon';
  } else if (hostname.includes('masterofmalt.com')) {
    name = document.querySelector('h1.product-header__title')?.innerText || '';

    const priceElement = document.querySelector('.product-price');
    price = priceElement ? priceElement.innerText : 'N/A';
    currency = priceElement?.innerText.includes('£') ? 'GBP' : 'EUR';

    const volumeElement = document.querySelector('.product-info__meta-item--volume')?.innerText;
    if (volumeElement) {
      const sizeMatch = volumeElement.match(/(\d+(\.\d+)?)\s*(cl|ml)/i);
      if (sizeMatch) {
        const value = parseFloat(sizeMatch[1]);
        size = sizeMatch[3].toLowerCase() === 'cl' ? `${value * 10} ml` : `${value} ml`;
      }
    }

    const abvElement = document.querySelector('.product-info__meta-item--abv')?.innerText;
    if (abvElement) abv = abvElement.replace('%', '').trim();

    const descriptionElement = document.querySelector('.product-description')?.innerText || '';
    if (descriptionElement) {
      const descriptionLower = descriptionElement.toLowerCase();
      if (descriptionLower.includes('bourbon')) spiritType = 'Bourbon';
      else if (descriptionLower.includes('single malt')) spiritType = 'Single Malt Scotch Whisky';
      else if (descriptionLower.includes('scotch')) spiritType = 'Scotch Whisky';
    }
  } else if (hostname.includes('wangsliquors.com')) {
    name = (document.querySelector('h1')?.innerText || 
           document.querySelector('.product__content')?.innerText.split('\n')[0] || '').trim();

    const priceElement = document.querySelector('.product-detail--price-sub');
    price = priceElement ? priceElement.innerText : 'N/A';
    currency = priceElement?.innerText.includes('$') ? 'USD' : 'EUR';

    const sizeElement = document.querySelector('.product__content');
    if (sizeElement) {
      const sizeText = sizeElement.innerText.match(/(\d+(\.\d+)?)\s*(ml|cl)/i);
      if (sizeText) {
        const value = parseFloat(sizeText[1]);
        size = sizeText[3].toLowerCase() === 'cl' ? `${value * 10} ml` : `${value} ml`;
      }
    }

    const breadcrumb = document.querySelector('.breadcrumb')?.innerText.toLowerCase() || '';
    if (name.toLowerCase().includes('american whiskey') || breadcrumb.includes('whiskey')) spiritType = 'American Whiskey';
    else if (name.toLowerCase().includes('bourbon')) spiritType = 'Bourbon';
    else if (name.toLowerCase().includes('scotch')) spiritType = 'Scotch Whisky';
  } else if (hostname.includes('patsliquordelray.com')) {
    name = (document.querySelector('[data-hook="product-title"]')?.innerText || 
           document.querySelector('h1')?.innerText || '').trim();

    if (!name) return { success: false, data: null };

    const priceElement = document.querySelector('[data-hook="product-price-discount-main-price"]');
    price = priceElement ? priceElement.innerText.trim() : 'N/A';
    currency = priceElement?.innerText.includes('$') ? 'USD' : 'EUR';

    let sizeElement = document.querySelector('[data-hook="product-price-discount-size-label"] span.ng-star-inserted');
    if (!sizeElement) {
      sizeElement = document.querySelector('[data-hook="product-description"]') || 
                    document.querySelector('span.ng-star-inserted') ||
                    document.querySelector('.product-details') || 
                    document.querySelector('p') || 
                    document.querySelector('div');
    }
    if (sizeElement) {
      const sizeText = sizeElement.innerText.match(/(\d+(\.\d+)?)\s*(ml|cl)/i) || 
                       sizeElement.innerText.match(/(\d+(\.\d+)?)(ml|cl)/i);
      if (sizeText) {
        const value = parseFloat(sizeText[1]);
        size = sizeText[3].toLowerCase() === 'cl' ? `${value * 10} ml` : `${value} ml`;
      } else {
        const bodySizeMatch = document.body.innerText.match(/(\d+(\.\d+)?)\s*(ml|cl)/i) || 
                              document.body.innerText.match(/(\d+(\.\d+)?)(ml|cl)/i);
        size = bodySizeMatch ? 
          (bodySizeMatch[3].toLowerCase() === 'cl' ? `${parseFloat(bodySizeMatch[1]) * 10} ml` : `${parseFloat(bodySizeMatch[1])} ml`) : 
          '750 ml';
      }
    } else {
      size = '750 ml';
    }

    let abvElement = document.querySelector('[data-hook="product-description"]') || 
                     document.querySelector('.product-details') || 
                     document.querySelector('p') || 
                     document.querySelector('div');
    if (abvElement) {
      const abvMatch = abvElement.innerText.match(/(\d+(\.\d+)?)\s*%/i) || 
                       abvElement.innerText.match(/(\d+(\.\d+)?)%/i);
      if (abvMatch) {
        abv = abvMatch[1];
      } else {
        const bodyAbvMatch = document.body.innerText.match(/(\d+(\.\d+)?)\s*%/i) || 
                             document.body.innerText.match(/(\d+(\.\d+)?)%/i);
        abv = bodyAbvMatch ? bodyAbvMatch[1] : 'N/A';
      }
    }

    if (name.toLowerCase().includes('amer whiskey') || name.toLowerCase().includes('american whiskey')) spiritType = 'American Whiskey';
    else if (name.toLowerCase().includes('bourbon')) spiritType = 'Bourbon';
    else if (name.toLowerCase().includes('scotch')) spiritType = 'Scotch Whisky';
  } else if (hostname.includes('totalwine.com')) {
    name = (document.querySelector('h1.productTitle__name')?.innerText || 
           document.querySelector('h1')?.innerText || '').trim();

    const priceElement = document.querySelector('.priceSection__price') || 
                         document.querySelector('.price-container .price');
    price = priceElement ? priceElement.innerText : 'N/A';
    currency = priceElement?.innerText.includes('$') ? 'USD' : 'EUR';

    const sizeElement = document.querySelector('.productInfo__size') || 
                        document.querySelector('.product-details');
    if (sizeElement) {
      const sizeText = sizeElement.innerText.match(/(\d+(\.\d+)?)\s*(ml|cl)/i);
      if (sizeText) {
        const value = parseFloat(sizeText[1]);
        size = sizeText[3].toLowerCase() === 'cl' ? `${value * 10} ml` : `${value} ml`;
      }
    }

    const abvElement = document.querySelector('.productInfo__abv') || 
                       document.querySelector('.product-details');
    if (abvElement) {
      const abvMatch = abvElement.innerText.match(/(\d+(\.\d+)?)%/i);
      if (abvMatch) abv = abvMatch[1];
    }

    const categoryElement = document.querySelector('.breadcrumb')?.innerText.toLowerCase() || '';
    if (name.toLowerCase().includes('bourbon') || categoryElement.includes('bourbon')) spiritType = 'Bourbon';
    else if (name.toLowerCase().includes('scotch') || categoryElement.includes('scotch')) spiritType = 'Scotch Whisky';
    else if (name.toLowerCase().includes('american whiskey') || categoryElement.includes('american whiskey')) spiritType = 'American Whiskey';
    else if (categoryElement.includes('wine')) spiritType = 'Wine';
  } else if (hostname.includes('drizly.com')) {
    name = (document.querySelector('h1.product-name')?.innerText || 
           document.querySelector('h1')?.innerText || '').trim();

    const priceElement = document.querySelector('.price-block__price') || 
                         document.querySelector('.price');
    price = priceElement ? priceElement.innerText : 'N/A';
    currency = priceElement?.innerText.includes('$') ? 'USD' : 'EUR';

    const sizeElement = document.querySelector('.product-details__size') || 
                        document.querySelector('.product-info');
    if (sizeElement) {
      const sizeText = sizeElement.innerText.match(/(\d+(\.\d+)?)\s*(ml|cl)/i);
      if (sizeText) {
        const value = parseFloat(sizeText[1]);
        size = sizeText[3].toLowerCase() === 'cl' ? `${value * 10} ml` : `${value} ml`;
      }
    }

    const abvElement = document.querySelector('.product-details__abv') || 
                       document.querySelector('.product-info');
    if (abvElement) {
      const abvMatch = abvElement.innerText.match(/(\d+(\.\d+)?)%/i);
      if (abvMatch) abv = abvMatch[1];
    }

    const categoryElement = document.querySelector('.breadcrumb')?.innerText.toLowerCase() || '';
    if (name.toLowerCase().includes('bourbon') || categoryElement.includes('bourbon')) spiritType = 'Bourbon';
    else if (name.toLowerCase().includes('scotch') || categoryElement.includes('scotch')) spiritType = 'Scotch Whisky';
    else if (name.toLowerCase().includes('american whiskey') || categoryElement.includes('american whiskey')) spiritType = 'American Whiskey';
    else if (categoryElement.includes('wine')) spiritType = 'Wine';
  } else if (hostname.includes('wine.com')) {
    name = (document.querySelector('h1.prodTitle')?.innerText || 
           document.querySelector('h1')?.innerText || '').trim();

    const priceElement = document.querySelector('.prodPrice__amount') || 
                         document.querySelector('.price');
    price = priceElement ? priceElement.innerText : 'N/A';
    currency = priceElement?.innerText.includes('$') ? 'USD' : 'EUR';

    const sizeElement = document.querySelector('.prodInfo__size') || 
                        document.querySelector('.product-details');
    if (sizeElement) {
      const sizeText = sizeElement.innerText.match(/(\d+(\.\d+)?)\s*(ml|cl)/i);
      if (sizeText) {
        const value = parseFloat(sizeText[1]);
        size = sizeText[3].toLowerCase() === 'cl' ? `${value * 10} ml` : `${value} ml`;
      }
    }

    const abvElement = document.querySelector('.prodInfo__abv') || 
                       document.querySelector('.product-details');
    if (abvElement) {
      const abvMatch = abvElement.innerText.match(/(\d+(\.\d+)?)%/i);
      if (abvMatch) abv = abvMatch[1];
    }

    const categoryElement = document.querySelector('.breadcrumb')?.innerText.toLowerCase() || '';
    if (categoryElement.includes('wine')) spiritType = 'Wine';
    else if (name.toLowerCase().includes('bourbon') || categoryElement.includes('bourbon')) spiritType = 'Bourbon';
    else if (name.toLowerCase().includes('scotch') || categoryElement.includes('scotch')) spiritType = 'Scotch Whisky';
  } else {
    return { success: false, data: null };
  }

  if (!name) return { success: false, data: null };

  const ageMatch = name.match(/\d+\s*(year|yr)/i);
  if (ageMatch) age = ageMatch[0].replace(/[^0-9]/g, '');

  const rawPrice = price && typeof price === 'string' ? price : '';
  const parsedPrice = parseFloat(rawPrice.replace(/[^\d.]/g, '').trim());
  const finalPrice = isNaN(parsedPrice) ? 'N/A' : parsedPrice;

  return { 
    success: true, 
    data: { name, price: finalPrice, size, abv, age, spiritType, currency }
  };
}

function tryScrapeWithRetry() {
  let attempts = 0;
  let observer;

  const attemptScrape = () => {
    attempts++;
    const result = scrapeBottleInfo();
    if (result.success && result.data && result.data.price !== 'N/A' && result.data.size !== 'N/A') {
      if (chrome?.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ action: 'bottleFound', data: result.data });
      }
      if (observer) observer.disconnect();
      return;
    }

    if (attempts >= SCRAPE_MAX_ATTEMPTS) {
      if (chrome?.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ action: 'bottleFound', data: result.data || null });
      }
      if (observer) observer.disconnect();
      return;
    }

    setTimeout(attemptScrape, SCRAPE_DELAY);
  };

  observer = new MutationObserver(attemptScrape);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true });
  attemptScrape();
}

document.addEventListener('DOMContentLoaded', tryScrapeWithRetry);
window.addEventListener('load', tryScrapeWithRetry);