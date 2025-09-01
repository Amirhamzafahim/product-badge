import { json } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { authenticate } from "./shopify.server";

import "./styles/app.css";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return json({
    ENV: {
      SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY || "",
    },
  });
};

export default function App() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <AppProvider isEmbeddedApp>
          <Outlet />
        </AppProvider>
        <ScrollRestoration />
        <Scripts />
        
        {/* Product Overlay Script - Automatically injects overlays */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Product Overlay App Script
              (function() {
                'use strict';
                
                // Suppress WebSocket and SendBeacon errors that don't affect functionality
                const originalConsoleError = console.error;
                console.error = function(...args) {
                  const message = args.join(' ');
                  if (message.includes('WebSocket') || message.includes('SendBeacon') || message.includes('permission error')) {
                    return; // Suppress these errors
                  }
                  originalConsoleError.apply(console, args);
                };
                
                // Suppress console.log for certain messages
                const originalConsoleLog = console.log;
                console.log = function(...args) {
                  const message = args.join(' ');
                  if (message.includes('content-script.js') || message.includes('AdUnit')) {
                    return; // Suppress these messages
                  }
                  originalConsoleLog.apply(console, args);
                };
                
                function initOverlays() {
                  // Check if we're on a product page
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
                  fetch('/apps/product-badge/api/overlays/' + productId)
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
                    overlay.innerHTML = '<span class="overlay-text" style="background-color: ' + (overlayData.color || '#ff0000') + '; color: white; padding: 8px 16px; border-radius: 8px; font-weight: bold; text-transform: uppercase; font-size: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 2px solid white; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">' + overlayData.text + '</span>';
                    
                    // Position overlay
                    const position = overlayData.position || 'top-left';
                    overlay.style.cssText = 'position: absolute; z-index: 1000; pointer-events: none; max-width: 200px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; ' + getPositionStyles(position);
                    
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
                
                // Wait for page to load
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', initOverlays);
                } else {
                  initOverlays();
                }
                
                // Handle unhandled promise rejections
                window.addEventListener('unhandledrejection', function(event) {
                  const reason = event.reason;
                  const message = reason && reason.message ? reason.message : String(reason);
                  
                  // Suppress specific errors that don't affect functionality
                  if (message.includes('permission error') || 
                      message.includes('content-script.js') ||
                      message.includes('AdUnit') ||
                      message.includes('favicon')) {
                    event.preventDefault();
                    return;
                  }
                  
                  console.log('Suppressed unhandled promise rejection:', reason);
                  event.preventDefault();
                });
                
                // Handle global errors
                window.addEventListener('error', function(event) {
                  const message = event.message || '';
                  const filename = event.filename || '';
                  
                  // Suppress specific errors that don't affect functionality
                  if (message.includes('Unexpected token') ||
                      message.includes('content-script.js') ||
                      filename.includes('content-script.js') ||
                      filename.includes('favicon')) {
                    event.preventDefault();
                    return;
                  }
                  
                  console.log('Suppressed global error:', event);
                  event.preventDefault();
                });
                
                // Also check for collection pages
                setTimeout(function() {
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
                  
                  productCards.forEach(function(card) {
                    const productIdElement = card.querySelector('[data-product-id]');
                    const productId = card.dataset.productId || 
                                     (productIdElement ? productIdElement.dataset.productId : null);
                    
                    if (productId) {
                      fetchOverlayData(productId);
                    }
                  });
                }, 1000);
                
              })();
            `
          }}
        />
      </body>
    </html>
  );
}
