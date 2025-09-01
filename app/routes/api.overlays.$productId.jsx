import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request, params }) => {
  try {
    const { admin } = await authenticate.admin(request);
    const { productId } = params;
    
    if (!productId) {
      return json({ overlay: null });
    }
    // Get product metafields for overlay data
    const response = await admin.graphql(`
      query getProductOverlay($productId: ID!) {
        product(id: $productId) {
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
    `, {
      variables: {
        productId: `gid://shopify/Product/${productId}`
      }
    });

    const responseJson = await response.json();
    
    // Check for GraphQL errors
    if (responseJson.errors) {
      console.error('GraphQL errors:', responseJson.errors);
      return json({ overlay: null });
    }
    
    const product = responseJson.data.product;
    
    if (!product) {
      return json({ overlay: null });
    }
    
    // Extract overlay data from metafields
    const metafields = product.metafields.edges.reduce((acc, metafield) => {
      acc[metafield.node.key] = metafield.node.value;
      return acc;
    }, {});
    
    // Check if overlay exists
    if (metafields.overlay_type && metafields.overlay_text) {
      const overlay = {
        type: metafields.overlay_type,
        text: metafields.overlay_text,
        position: metafields.overlay_position || 'top-left',
        color: metafields.overlay_color || '#ff0000',
        size: metafields.overlay_size || 'medium'
      };
      
      return json({ overlay });
    }
    
    return json({ overlay: null });
    
  } catch (error) {
    console.error('Error fetching overlay data:', error);
    return json({ overlay: null });
  }
};
