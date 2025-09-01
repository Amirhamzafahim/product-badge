
// 1. Replace app/routes/app._index.jsx with this:

import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useFetcher } from "@remix-run/react";
import { useState } from "react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Thumbnail,
  Badge,
  Box,
  Select,
  Modal,
  TextContainer,
  Divider,
  TextField,
  ChoiceList,
  RangeSlider,
  ColorPicker,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);
    
    // GraphQL query to get products with metafields and better data
    const response = await admin.graphql(`
      query getProducts {
        products(first: 50) {
          edges {
            node {
              id
              title
              handle
              status
              tags
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              variants(first: 1) {
                edges {
                  node {
                    price
                    compareAtPrice
                    availableForSale
                  }
                }
              }
              metafields(first: 10, namespace: "overlay_app") {
                edges {
                  node {
                    key
                    value
                  }
                }
              }
            }
          }
        }
      }
    `);

    const responseJson = await response.json();
    
    // Check for GraphQL errors
    if (responseJson.errors) {
      console.error('GraphQL errors:', responseJson.errors);
      return json({ products: [] });
    }
    
    const products = responseJson.data.products.edges.map(edge => {
    const product = edge.node;
    
    // Extract metafield values
    const metafields = product.metafields.edges.reduce((acc, metafield) => {
      acc[metafield.node.key] = metafield.node.value;
      return acc;
    }, {});
    
    return {
      ...product,
      image: product.images.edges[0]?.node,
      price: product.variants.edges[0]?.node.price,
      compareAtPrice: product.variants.edges[0]?.node.compareAtPrice,
      availableForSale: product.variants.edges[0]?.node.availableForSale || false,
      overlayType: metafields.overlay_type || "",
      overlayText: metafields.overlay_text || "",
      overlayPosition: metafields.overlay_position || "top-left",
      overlayColor: metafields.overlay_color || "#ff0000",
      overlaySize: metafields.overlay_size || "medium",
      isOnSale: product.variants.edges[0]?.node.compareAtPrice > product.variants.edges[0]?.node.price,
      isNew: product.tags.includes("new") || product.tags.includes("New"),
      isBestSeller: product.tags.includes("bestseller") || product.tags.includes("best-seller"),
      isLimited: product.tags.includes("limited") || product.tags.includes("Limited"),
    };
  });

      return json({ products });
  } catch (error) {
    console.error('Error loading products:', error);
    return json({ products: [] });
  }
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const productId = formData.get("productId");
  const overlayType = formData.get("overlayType");
  const overlayText = formData.get("overlayText");
  const overlayPosition = formData.get("overlayPosition");
  const overlayColor = formData.get("overlayColor");
  const overlaySize = formData.get("overlaySize");
  
  // Update product metafields using GraphQL
  const mutation = `
    mutation productUpdate($product: ProductInput!) {
      productUpdate(input: $product) {
        product {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    product: {
      id: productId,
      metafields: [
        {
          namespace: "overlay_app",
          key: "overlay_type",
          value: overlayType,
          type: "single_line_text_field"
        },
        {
          namespace: "overlay_app",
          key: "overlay_text",
          value: overlayText,
          type: "single_line_text_field"
        },
        {
          namespace: "overlay_app",
          key: "overlay_position",
          value: overlayPosition,
          type: "single_line_text_field"
        },
        {
          namespace: "overlay_app",
          key: "overlay_color",
          value: overlayColor,
          type: "single_line_text_field"
        },
        {
          namespace: "overlay_app",
          key: "overlay_size",
          value: overlaySize,
          type: "single_line_text_field"
        }
      ]
    }
  };

  try {
    const response = await admin.graphql(mutation, { variables });
    const responseJson = await response.json();
    
    if (responseJson.data?.productUpdate?.userErrors?.length > 0) {
      console.error('GraphQL errors:', responseJson.data.productUpdate.userErrors);
      return json({ 
        success: false, 
        errors: responseJson.data.productUpdate.userErrors 
      });
    }
    
    return json({ success: true, productId, overlayType, overlayText, overlayPosition, overlayColor, overlaySize });
  } catch (error) {
    console.error('GraphQL error:', error);
    return json({ 
      success: false, 
      error: error.message 
    });
  }
};

export default function Index() {
  const { products } = useLoaderData();
  const submit = useSubmit();
  const fetcher = useFetcher();
  const [updatingProduct, setUpdatingProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showOverlayEditor, setShowOverlayEditor] = useState(false);
  const [overlaySettings, setOverlaySettings] = useState({
    type: "text",
    text: "",
    position: "top-left",
    color: "#ff0000",
    size: "medium"
  });

  const overlayTypes = [
    { value: "", label: "No Overlay", color: "subdued" },
    { value: "text", label: "Text Overlay", color: "success" },
    { value: "badge", label: "Badge Overlay", color: "info" },
    { value: "image", label: "Image Overlay", color: "warning" },
  ];

  const overlayPositions = [
    { value: "top-left", label: "Top Left" },
    { value: "top-center", label: "Top Center" },
    { value: "top-right", label: "Top Right" },
    { value: "center-left", label: "Center Left" },
    { value: "center", label: "Center" },
    { value: "center-right", label: "Center Right" },
    { value: "bottom-left", label: "Bottom Left" },
    { value: "bottom-center", label: "Bottom Center" },
    { value: "bottom-right", label: "Bottom Right" },
  ];

  const overlaySizes = [
    { value: "small", label: "Small" },
    { value: "medium", label: "Medium" },
    { value: "large", label: "Large" },
  ];

  const handleOverlayUpdate = (productId, overlayType, overlayText, overlayPosition, overlayColor, overlaySize) => {
    setUpdatingProduct(productId);
    
    const formData = new FormData();
    formData.append("productId", productId);
    formData.append("overlayType", overlayType);
    formData.append("overlayText", overlayText);
    formData.append("overlayPosition", overlayPosition);
    formData.append("overlayColor", overlayColor);
    formData.append("overlaySize", overlaySize);
    
    submit(formData, { 
      method: "post",
      onSettled: (result) => {
        setUpdatingProduct(null);
        if (result?.success === false) {
          console.error('Overlay update failed:', result);
          alert('Failed to update overlay. Check console for details.');
        }
      }
    });
  };

  const openOverlayEditor = (product) => {
    setSelectedProduct(product);
    setOverlaySettings({
      type: product.overlayType || "text",
      text: product.overlayText || "",
      position: product.overlayPosition || "top-left",
      color: product.overlayColor || "#ff0000",
      size: product.overlaySize || "medium"
    });
    setShowOverlayEditor(true);
  };

  const saveOverlay = () => {
    if (selectedProduct) {
      handleOverlayUpdate(
        selectedProduct.id,
        overlaySettings.type,
        overlaySettings.text,
        overlaySettings.position,
        overlaySettings.color,
        overlaySettings.size
      );
      setShowOverlayEditor(false);
    }
  };

  const getOverlayPreview = (product) => {
    if (!product.overlayType || !product.overlayText) return null;

    const positionClasses = {
      'top-left': 'top-2 left-2',
      'top-center': 'top-2 left-1/2 transform -translate-x-1/2',
      'top-right': 'top-2 right-2',
      'center-left': 'top-1/2 left-2 transform -translate-y-1/2',
      'center': 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
      'center-right': 'top-1/2 right-2 transform -translate-y-1/2',
      'bottom-left': 'bottom-2 left-2',
      'bottom-center': 'bottom-2 left-1/2 transform -translate-x-1/2',
      'bottom-right': 'bottom-2 right-2'
    };

    const sizeClasses = {
      'small': 'text-xs px-2 py-1',
      'medium': 'text-sm px-3 py-2',
      'large': 'text-base px-4 py-3'
    };

    return (
      <div className={`absolute ${positionClasses[product.overlayPosition]} z-10`}>
        <span 
          className={`${sizeClasses[product.overlaySize]} text-white font-bold rounded-lg shadow-lg`}
          style={{ backgroundColor: product.overlayColor }}
        >
          {product.overlayText}
        </span>
      </div>
    );
  };

  return (
    <Page>
      <TitleBar title="Product Image Overlay Manager" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Manage Product Image Overlays
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Add text, badges, and image overlays to your product images to highlight special offers and features.
                  </Text>
                </BlockStack>
                <InlineStack gap="200">
                  <Button
                    onClick={() => setShowPreview(true)}
                  >
                    View Examples
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setShowOverlayEditor(true)}
                  >
                    Create New Overlay
                  </Button>
                  <Button
                    onClick={() => {
                      // Test function
                      console.log('Testing app functionality...');
                      alert('App is working! Check console for details.');
                    }}
                  >
                    Test App
                  </Button>
                </InlineStack>
              </InlineStack>
              
              {products.length === 0 ? (
                <Box padding="400" borderWidth="025" borderRadius="200" borderColor="border">
                  <Text as="p" variant="bodyMd" alignment="center">
                    No products found. Create some products first to manage overlays.
                  </Text>
                </Box>
              ) : (
                <BlockStack gap="400">
                  {products.map((product) => {
                    const hasOverlay = product.overlayType && product.overlayText;
                    
                    return (
                      <Card key={product.id} sectioned>
                        <InlineStack align="space-between" blockAlign="center">
                          <InlineStack gap="400" blockAlign="center">
                            <Box position="relative" style={{ width: "100px", height: "100px" }}>
                              {product.image && (
                                <Thumbnail
                                  source={product.image.url}
                                  alt={product.image.altText || product.title}
                                  size="medium"
                                />
                              )}
                              {/* Overlay Preview */}
                              {hasOverlay && getOverlayPreview(product)}
                            </Box>
                            
                            <BlockStack gap="200">
                              <Text as="h3" variant="headingMd">
                                {product.title}
                              </Text>
                              <Text as="p" variant="bodyMd" tone="subdued">
                                ${product.price} • Status: {product.status}
                              </Text>
                              
                              {/* Current Overlay Info */}
                              {hasOverlay && (
                                <InlineStack gap="200" blockAlign="center">
                                  <Text as="span" variant="bodyMd" tone="subdued">Current Overlay:</Text>
                                  <Badge tone="success">
                                    {product.overlayType}: {product.overlayText}
                                  </Badge>
                                </InlineStack>
                              )}
                            </BlockStack>
                          </InlineStack>
                          
                          <BlockStack gap="300">
                            {/* Quick Actions */}
                            <InlineStack gap="200">
                              <Button
                                size="slim"
                                variant="secondary"
                                onClick={() => openOverlayEditor(product)}
                                loading={updatingProduct === product.id}
                              >
                                {hasOverlay ? 'Edit Overlay' : 'Add Overlay'}
                              </Button>
                              
                              {hasOverlay && (
                                <Button
                                  size="slim"
                                  variant="secondary"
                                  tone="critical"
                                  loading={updatingProduct === product.id}
                                  onClick={() => handleOverlayUpdate(product.id, "", "", "", "", "")}
                                >
                                  Remove Overlay
                                </Button>
                              )}
                            </InlineStack>
                          </BlockStack>
                        </InlineStack>
                      </Card>
                    );
                  })}
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
        
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Overlay Types
              </Text>
              <BlockStack gap="200">
                {overlayTypes.filter(o => o.value !== "").map((overlay) => (
                  <Box key={overlay.value} padding="200" borderWidth="025" borderRadius="200" borderColor="border">
                    <InlineStack gap="200" blockAlign="center">
                      <Badge tone={overlay.color}>{overlay.label}</Badge>
                      <Text as="span" variant="bodyMd">
                        {overlay.value === "text" && "Add custom text overlays"}
                        {overlay.value === "badge" && "Add badge-style overlays"}
                        {overlay.value === "image" && "Add image overlays"}
                      </Text>
                    </InlineStack>
                  </Box>
                ))}
              </BlockStack>
            </BlockStack>
          </Card>
          
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Overlay Positions
              </Text>
              <BlockStack gap="200">
                {overlayPositions.map((position) => (
                  <Box key={position.value} padding="200" borderWidth="025" borderRadius="200" borderColor="border">
                    <Text as="span" variant="bodyMd">
                      {position.label}
                    </Text>
                  </Box>
                ))}
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Overlay Editor Modal */}
      <Modal
        open={showOverlayEditor}
        onClose={() => setShowOverlayEditor(false)}
        title="Create/Edit Image Overlay"
        primaryAction={{
          content: 'Save Overlay',
          onAction: saveOverlay,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowOverlayEditor(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Select
              label="Overlay Type"
              options={overlayTypes.filter(o => o.value !== "")}
              value={overlaySettings.type}
              onChange={(value) => setOverlaySettings({...overlaySettings, type: value})}
            />
            
            <TextField
              label="Overlay Text"
              value={overlaySettings.text}
              onChange={(value) => setOverlaySettings({...overlaySettings, text: value})}
              placeholder="Enter overlay text..."
            />
            
            <Select
              label="Position"
              options={overlayPositions}
              value={overlaySettings.position}
              onChange={(value) => setOverlaySettings({...overlaySettings, position: value})}
            />
            
            <Select
              label="Size"
              options={overlaySizes}
              value={overlaySettings.size}
              onChange={(value) => setOverlaySettings({...overlaySettings, size: value})}
            />
            
            <div>
              <Text as="span" variant="bodyMd">Overlay Color</Text>
              <div style={{ marginTop: '8px' }}>
                <input
                  type="color"
                  value={overlaySettings.color}
                  onChange={(e) => setOverlaySettings({...overlaySettings, color: e.target.value})}
                  style={{ width: '100px', height: '40px', border: 'none', borderRadius: '4px' }}
                />
              </div>
            </div>
            
            {/* Preview */}
            {overlaySettings.text && (
              <Box padding="400" borderWidth="025" borderRadius="200" borderColor="border">
                <Text as="p" variant="bodyMd" tone="subdued">Preview:</Text>
                <Box position="relative" style={{ width: "200px", height: "150px", backgroundColor: "#f6f6f7", marginTop: '16px' }}>
                  <div className={`absolute ${
                    overlaySettings.position === 'top-left' ? 'top-2 left-2' :
                    overlaySettings.position === 'top-center' ? 'top-2 left-1/2 transform -translate-x-1/2' :
                    overlaySettings.position === 'top-right' ? 'top-2 right-2' :
                    overlaySettings.position === 'center-left' ? 'top-1/2 left-2 transform -translate-y-1/2' :
                    overlaySettings.position === 'center' ? 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2' :
                    overlaySettings.position === 'center-right' ? 'top-1/2 right-2 transform -translate-y-1/2' :
                    overlaySettings.position === 'bottom-left' ? 'bottom-2 left-2' :
                    overlaySettings.position === 'bottom-center' ? 'bottom-2 left-1/2 transform -translate-x-1/2' :
                    'bottom-2 right-2'
                  } z-10`}>
                    <span 
                      className={`${
                        overlaySettings.size === 'small' ? 'text-xs px-2 py-1' :
                        overlaySettings.size === 'medium' ? 'text-sm px-3 py-2' :
                        'text-base px-4 py-3'
                      } text-white font-bold rounded-lg shadow-lg`}
                      style={{ backgroundColor: overlaySettings.color }}
                    >
                      {overlaySettings.text}
                    </span>
                  </div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-400">
                    Product Image
                  </div>
                </Box>
              </Box>
            )}
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Examples Modal */}
      <Modal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title="Overlay Examples"
        primaryAction={{
          content: 'Close',
          onAction: () => setShowPreview(false),
        }}
      >
        <Modal.Section>
          <TextContainer>
            <Text as="p" variant="bodyMd">
              Here are examples of different overlay types you can create:
            </Text>
            
            <BlockStack gap="400">
              <Box padding="400" borderWidth="025" borderRadius="200" borderColor="border">
                <InlineStack gap="400" blockAlign="center">
                  <Box position="relative" style={{ width: "150px", height: "100px", backgroundColor: "#f6f6f7" }}>
                    <div className="absolute top-2 left-2 z-10">
                      <span className="bg-red-500 text-white text-sm font-bold px-3 py-2 rounded-lg shadow-lg">
                        🔥 SALE
                      </span>
                    </div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-400">
                      Product Image
                    </div>
                  </Box>
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingMd">Sale Overlay</Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Highlight discounted products with eye-catching text overlays
                    </Text>
                  </BlockStack>
                </InlineStack>
              </Box>
              
              <Box padding="400" borderWidth="025" borderRadius="200" borderColor="border">
                <InlineStack gap="400" blockAlign="center">
                  <Box position="relative" style={{ width: "150px", height: "100px", backgroundColor: "#f6f6f7" }}>
                    <div className="absolute bottom-2 right-2 z-10">
                      <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                        ✨ NEW
                      </span>
                    </div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-400">
                      Product Image
                    </div>
                  </Box>
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingMd">New Product Badge</Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Show new arrivals with positioned badges
                    </Text>
                  </BlockStack>
                </InlineStack>
              </Box>
              
              <Box padding="400" borderWidth="025" borderRadius="200" borderColor="border">
                <InlineStack gap="400" blockAlign="center">
                  <Box position="relative" style={{ width: "150px", height: "100px", backgroundColor: "#f6f6f7" }}>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                      <span className="bg-blue-500 text-white text-base font-bold px-4 py-3 rounded-lg shadow-lg">
                        BEST SELLER
                      </span>
                    </div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-400">
                      Product Image
                    </div>
                  </Box>
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingMd">Center Overlay</Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Place overlays in the center for maximum visibility
                    </Text>
                  </BlockStack>
                </InlineStack>
              </Box>
            </BlockStack>
          </TextContainer>
        </Modal.Section>
      </Modal>
    </Page>
  );
}