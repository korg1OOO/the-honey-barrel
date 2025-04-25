let hasResult = false;
let loadingTimeout;

function showLoading(show) {
  const loadingDiv = document.getElementById('loading');
  const refreshButton = document.getElementById('refreshButton');
  
  if (loading && !hasResult) {
    loadingDiv.style.display = 'flex';
    refreshButton.style.display = 'none';

    if (loadingTimeout) clearTimeout(loadingTimeout);

    loadingTimeout = setTimeout(() => {
      if (!hasResult) {
        displayResult({ error: true, message: 'You should open a supported website' });
      }
    }, 10000);
  } else {
    loadingDiv.style.display = 'none';
    refreshButton.style.display = 'block';
    if (loadingTimeout) clearTimeout(loadingTimeout);
  }
}

function displayResult(data) {
  const resultsDiv = document.getElementById('results');
  
  hasResult = true;
  showLoading(false);

  if (data.error || !data.scraped) {
    resultsDiv.innerHTML = `
      <h3>Error</h3>
      <p>${data.message || 'You should open a supported website'}</p>
    `;
    return;
  }

  const scraped = data.scraped;
  const baxus = data.baxus;
  const savings = data.savings !== undefined ? data.savings : 'N/A';
  const shippingCost = data.shippingCost || 0;

  let html = `
    <h3>${scraped.name}</h3>
    <p>Retailer: ${scraped.currency} ${scraped.price} (${scraped.size})</p>
  `;

  if (baxus) {
    html += `
      <p>BAXUS: $${baxus.price.toFixed(2)}</p>
      <p>Confidence: ${(baxus.confidence * 100).toFixed(0)}%</p>
      <p><a href="${baxus.url}" target="_blank">View on BAXUS</a></p>
      <label for="shippingCost">Shipping Cost ($):</label>
      <input type="number" id="shippingCost" value="${shippingCost}" min="0" step="1">
      <p class="savings ${savings !== 'N/A' && savings > 0 ? 'positive' : savings !== 'N/A' ? 'negative' : ''}">
        Savings: ${savings !== 'N/A' ? (savings > 0 ? `$${savings.toFixed(2)}` : `-$${Math.abs(savings).toFixed(2)}`) : 'N/A'}
      </p>
    `;
  } else {
    const searchQuery = encodeURIComponent(scraped.name);
    html += `
      <p>Not found on BAXUS</p>
      <p><a href="https://baxus.co" target="_blank">Search other options on BAXUS</a></p>
    `;
  }

  resultsDiv.innerHTML = html;

  const shippingInput = document.getElementById('shippingCost');
  if (shippingInput) {
    shippingInput.addEventListener('input', e => {
      const newShippingCost = parseFloat(e.target.value) || 0;
      chrome.runtime.sendMessage({ action: 'updateShippingCost', shippingCost: newShippingCost });
    });
  }
}

document.getElementById('refreshButton').addEventListener('click', () => {
  hasResult = false;
  showLoading(true);
  chrome.runtime.sendMessage({ action: 'refreshListings' });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showResult') {
    hasResult = true;
    showLoading(false);
    displayResult(message.data);
  }
});

window.addEventListener('load', () => {
  hasResult = false;
  showLoading(true);
  chrome.runtime.sendMessage({ action: 'requestLatestData' });
});