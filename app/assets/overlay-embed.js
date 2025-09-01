// Product Overlay App Embed
// This automatically adds overlays to product pages without theme extensions

(function() {
  'use strict';
  
  // Wait for page to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOverlays);
  } else {
    initOverlays();
  }
  
  function initOverlays() {
    // Check if we're on a product page
    if (!window.Shopify || !window.Shopify.theme) return;
    
    // Get product data from meta tags or other sources
    const productId = getProductId();
    if (!productId) return;
    
    // Fetch overlay data from your app
    fetchOverlayData(productId);
  }
  
  function getProductId() {
    // Try multiple ways to get product ID
    const ogUrlMeta = document.querySelector('meta[property="og:url"]');
    const ogUrlMatch = ogUrlMeta && ogUrlMeta.content ? ogUrlMeta.content.match(/products\/([^\/\?]+)/) : null;
    const ogUrlProductId = ogUrlMatch ? ogUrlMatch[1] : null;
    
    const dataProductElement = document.querySelector('[data-product-id]');
    const dataProductId = dataProductElement ? dataProductElement.dataset.productId : null;
    
    const pathMatch = window.location.pathname.match(/products\/([^\/\?]+)/);
    const pathProductId = pathMatch ? pathMatch[1] : null;
    
    return ogUrlProductId || dataProductId || pathProductId;
  }
  
  function fetchOverlayData(productId) {
    // Make request to your app's API to get overlay data
    fetch(`/apps/product-badge/api/overlays/${productId}`)
      .then(response => response.json())
      .then(data => {
        if (data.overlay) {
          createOverlay(data.overlay);
        }
      })
      .catch(error => {
        console.log('Overlay data not available:', error);
      });
  }
  
  function createOverlay(overlayData) {
    // Find product image containers using multiple selectors
    const selectors = [
      '.product__media-container',
      '.product__image-wrapper', 
      '.product-single__photo',
      '.product__media',
      '.product__image'
    ];
    
    let imageContainers = [];
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      imageContainers = imageContainers.concat(Array.from(elements));
    });
    
    // Also find elements with class containing product-image or product-media
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
      const className = element.className || '';
      if (typeof className === 'string' && (className.includes('product-image') || className.includes('product-media'))) {
        imageContainers.push(element);
      }
    });
    
    imageContainers.forEach(container => {
      // Make sure container is positioned relatively
      if (getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
      }
      
      // Create overlay element
      const overlay = document.createElement('div');
      overlay.className = 'app-product-overlay';
      overlay.innerHTML = `
        <span class="overlay-text" style="
          background-color: ${overlayData.color || '#ff0000'};
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: bold;
          text-transform: uppercase;
          font-size: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          border: 2px solid white;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        ">
          ${overlayData.text}
        </span>
      `;
      
      // Position overlay
      const position = overlayData.position || 'top-left';
      overlay.style.cssText = `
        position: absolute;
        z-index: 1000;
        pointer-events: none;
        max-width: 200px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ${getPositionStyles(position)}
      `;
      
      // Add overlay to container
      container.appendChild(overlay);
    });
  }
  
  function getPositionStyles(position) {
    const positions = {
      'top-left': 'top: 15px; left: 15px;',
      'top-center': 'top: 15px; left: 50%; transform: translateX(-50%);',
      'top-right': 'top: 15px; right: 15px;',
      'center-left': 'top: 50%; left: 15px; transform: translateY(-50%);',
      'center': 'top: 50%; left: 50%; transform: translate(-50%, -50%);',
      'center-right': 'top: 50%; right: 15px; transform: translateY(-50%);',
      'bottom-left': 'bottom: 15px; left: 15px;',
      'bottom-center': 'bottom: 15px; left: 50%; transform: translateX(-50%);',
      'bottom-right': 'bottom: 15px; right: 15px;'
    };
    
    return positions[position] || positions['top-left'];
  }
  
  // Also check for collection pages
  function checkCollectionPages() {
    const cardSelectors = [
      '.product-card',
      '.product-item', 
      '.collection-product',
      '.grid-product'
    ];
    
    let productCards = [];
    cardSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      productCards = productCards.concat(Array.from(elements));
    });
    
    // Also find elements with class containing product-card or product-item
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
      const className = element.className || '';
      if (typeof className === 'string' && (className.includes('product-card') || className.includes('product-item'))) {
        productCards.push(element);
      }
    });
    
    productCards.forEach(card => {
      const productIdElement = card.querySelector('[data-product-id]');
      const productId = card.dataset.productId || 
                       (productIdElement ? productIdElement.dataset.productId : null);
      
      if (productId) {
        fetchOverlayData(productId);
      }
    });
  }
  
  // Check for collection pages after a delay
  setTimeout(checkCollectionPages, 1000);
  
})();
