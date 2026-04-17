// Example Node.js integration using axios
const axios = require('axios');

async function validateClaim(claimData) {
    try {
        const response = await axios.post('https://your-agesis-ai-service.onrender.com/predict-claim', claimData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.data.success) {
            console.log('Claim processed:', response.data.data);
            return response.data.data;
        } else {
            console.error('Error:', response.data.error);
            throw new Error(response.data.error);
        }
    } catch (error) {
        console.error('Request failed:', error.message);
        throw error;
    }
}

// Example usage
const claimRequest = {
    user_id: "user123",
    user_plan: "premium",
    user_zone: "low_risk",
    user_registered_latitude: 28.6139,
    user_registered_longitude: 77.2090,
    claim_latitude: 28.6139,
    claim_longitude: 77.2090,
    claim_timestamp: "2024-01-15T10:00:00",
    rainfall_mm_hr: 50,
    temperature_celsius: 35,
    aqi: 200,
    claims_this_week: 1,
    transaction_amount: 1000,
    old_balance_org: 5000,
    new_balance_orig: 4000
};

validateClaim(claimRequest).then(data => {
    console.log('Success:', data);
}).catch(err => {
    console.error('Failed:', err.message);
});</content>
<parameter name="filePath">c:\Users\koppu\Downloads\devtrails\final\AGESIS AI\nodejs_integration_example.js