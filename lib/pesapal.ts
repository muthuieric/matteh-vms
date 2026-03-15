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