
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
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  
  // GraphQL query to get products with metafields
  const response = await admin.graphql(`
    query getProducts {
      products(first: 20) {
        edges {
          node {
            id
            title
            handle
            status
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
                }
              }
            }
            metafield(namespace: "badge_app", key: "badge_type") {
              value
            }
          }
        }
      }
    }
  `);

  const responseJson = await response.json();
  const products = responseJson.data.products.edges.map(edge => ({
    ...edge.node,
    image: edge.node.images.edges[0]?.node,
    price: edge.node.variants.edges[0]?.node.price,
    currentBadge: edge.node.metafield?.value || ""
  }));

  return json({ products });
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const productId = formData.get("productId");
  const badgeType = formData.get("badgeType");
  
  // Update product metafield using GraphQL
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
          namespace: "badge_app",
          key: "badge_type",
          value: badgeType,
          type: "single_line_text_field"
        }
      ]
    }
  };

  await admin.graphql(mutation, { variables });
  
  return json({ success: true, productId, badgeType });
};

export default function Index() {
  const { products } = useLoaderData();
  const submit = useSubmit();
  const fetcher = useFetcher();
  const [updatingProduct, setUpdatingProduct] = useState(null);

  const badgeTypes = [
    { value: "", label: "No Badge", color: "subdued" },
    { value: "sale", label: "Sale", color: "critical" },
    { value: "new", label: "New", color: "success" },
    { value: "best_seller", label: "Best Seller", color: "info" },
    { value: "limited", label: "Limited Edition", color: "warning" },
  ];

  const handleBadgeUpdate = (productId, badgeType) => {
    setUpdatingProduct(productId);
    
    const formData = new FormData();
    formData.append("productId", productId);
    formData.append("badgeType", badgeType);
    
    submit(formData, { 
      method: "post",
      onSettled: () => setUpdatingProduct(null)
    });
  };

  return (
    <Page>
      <TitleBar title="Product Badge Manager" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Manage Product Badges
              </Text>
              <Text as="p" variant="bodyMd">
                Add badges to your products to highlight special offers, new arrivals, and bestsellers.
              </Text>
              
              {products.length === 0 ? (
                <Box padding="400" borderWidth="025" borderRadius="200" borderColor="border">
                  <Text as="p" variant="bodyMd" alignment="center">
                    No products found. Create some products first to manage badges.
                  </Text>
                </Box>
              ) : (
                <BlockStack gap="400">
                  {products.map((product) => (
                    <Card key={product.id} sectioned>
                      <InlineStack align="space-between" blockAlign="center">
                        <InlineStack gap="400" blockAlign="center">
                          {product.image && (
                            <Thumbnail
                              source={product.image.url}
                              alt={product.image.altText || product.title}
                              size="medium"
                            />
                          )}
                          <BlockStack gap="200">
                            <Text as="h3" variant="headingMd">
                              {product.title}
                            </Text>
                            <Text as="p" variant="bodyMd" tone="subdued">
                              ${product.price} • Status: {product.status}
                            </Text>
                            {product.currentBadge && (
                              <Badge tone={badgeTypes.find(b => b.value === product.currentBadge)?.color || "subdued"}>
                                Current: {badgeTypes.find(b => b.value === product.currentBadge)?.label || "Unknown"}
                              </Badge>
                            )}
                          </BlockStack>
                        </InlineStack>
                        
                        <InlineStack gap="200">
                          {badgeTypes.map((badge) => (
                            <Button
                              key={badge.value}
                              size="slim"
                              variant={product.currentBadge === badge.value ? "primary" : "secondary"}
                              tone={badge.color !== "subdued" ? badge.color : undefined}
                              loading={updatingProduct === product.id}
                              onClick={() => handleBadgeUpdate(product.id, badge.value)}
                            >
                              {badge.label}
                            </Button>
                          ))}
                        </InlineStack>
                      </InlineStack>
                    </Card>
                  ))}
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
        
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Badge Types
              </Text>
              <BlockStack gap="200">
                {badgeTypes.filter(b => b.value !== "").map((badge) => (
                  <Box key={badge.value} padding="200" borderWidth="025" borderRadius="200" borderColor="border">
                    <InlineStack gap="200" blockAlign="center">
                      <Badge tone={badge.color}>{badge.label}</Badge>
                      <Text as="span" variant="bodyMd">
                        {badge.value === "sale" && "Perfect for discounted items"}
                        {badge.value === "new" && "Highlight new arrivals"}
                        {badge.value === "best_seller" && "Show popular products"}
                        {badge.value === "limited" && "Create urgency"}
                      </Text>
                    </InlineStack>
                  </Box>
                ))}
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}