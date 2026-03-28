export async function getPesapalToken() {
  const response = await fetch(`${process.env.PESAPAL_BASE_URL}/api/Auth/RequestToken`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      consumer_key: process.env.PESAPAL_CONSUMER_KEY,
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.token;
}

export async function getTransactionStatus(orderTrackingId: string) {
  const token = await getPesapalToken();
  
  const response = await fetch(`${process.env.PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });

  return await response.json();
}

// --- NEW FUNCTION ADDED BELOW ---
// This takes the order data from your initiate route and securely sends it to Pesapal
export async function submitOrder(orderData: any) {
  // 1. Get the secure auth token first
  const token = await getPesapalToken();

  // 2. Submit the order to Pesapal
  const response = await fetch(`${process.env.PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(orderData),
  });

  const data = await response.json();
  
  // 3. Handle errors or return the success data (which includes the redirect_url)
  if (!response.ok || data.error) {
    console.error("Pesapal Submit Order Error:", data);
    throw new Error(data.error?.message || "Failed to submit order to Pesapal");
  }

  return data;
}