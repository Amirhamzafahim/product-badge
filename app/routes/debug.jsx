import { json } from "@remix-run/node";

export const loader = async () => {
  return json({ 
    message: "Debug route working",
    timestamp: new Date().toISOString()
  });
};

export default function Debug() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Debug Route Working</h1>
      <p>If you can see this, your app is running correctly.</p>
      
      <h2>Test Overlay API</h2>
      <p>Try this URL: <code>/api/overlays/[product-id]</code></p>
      
      <h2>Next Steps:</h2>
      <ol>
        <li>Make sure your app is running: <code>npm run dev</code></li>
        <li>Add an overlay through your dashboard</li>
        <li>Check the product page</li>
        <li>Look at browser console for errors</li>
      </ol>
    </div>
  );
}
