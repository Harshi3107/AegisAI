const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

const safeJson = async (response) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (error) {
    return { success: false, message: 'Invalid JSON response', raw: text };
  }
};

const request = async (url, options = {}) => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('aegis_auth_token') : null;
    const response = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      },
      ...options,
    });

    const data = await safeJson(response);
    if (!response.ok) {
      throw new Error(data.message || `API request failed with status ${response.status}`);
    }
    return data;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const getEnvironmentalLogs = (lat, lng, city, limit = 50) => {
  const params = new URLSearchParams();
  if (lat) params.append('lat', lat);
  if (lng) params.append('lng', lng);
  if (city) params.append('city', city);
  params.append('limit', String(limit));
  return request(`/api/environment/logs?${params.toString()}`);
};

export const getLatestEnvironment = (lat, lng) => request(`/api/environment/latest?lat=${lat}&lng=${lng}`);
export const getLocationRiskProfile = (lat, lng, startDate, endDate) => {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return request(`/api/environment/location-risk?${params.toString()}`);
};
export const getClaims = () => request('/api/claims');
export const getProfile = () => request('/api/user/profile');
export const getJobStatus = () => request('/api/environment/job-status');
export const createOrder = (amount) => request('/api/payment/create-order', {
  method: 'POST',
  body: JSON.stringify({ amount })
});
export const verifyPayment = ({ razorpay_order_id, razorpay_payment_id, razorpay_signature, amount }) => request('/api/payment/verify', {
  method: 'POST',
  body: JSON.stringify({ razorpay_order_id, razorpay_payment_id, razorpay_signature, amount })
});
export const simulateEvent = (type, lat, lng) => request('/api/environment/simulate', {
  method: 'POST',
  body: JSON.stringify({ type, lat, lng })
});
export const fetchEnvironmentalData = (lat, lng) => request('/api/environment/fetch', {
  method: 'POST',
  body: JSON.stringify({ lat, lng })
});
export const sendOtp = (phone) => request('/api/auth/send-otp', {
  method: 'POST',
  body: JSON.stringify({ phone })
});
export const verifyOtp = (phone, otp) => request('/api/auth/verify-otp', {
  method: 'POST',
  body: JSON.stringify({ phone, otp })
});

export const registerUser = (payload) => request('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify(payload)
});

export const loginUser = (payload) => request('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify(payload)
});

export const checkDuplicateFields = (payload) => request('/api/auth/check-duplicates', {
  method: 'POST',
  body: JSON.stringify(payload)
});

export const updateUserLocation = (lat, lng) => request('/api/user/location', {
  method: 'POST',
  body: JSON.stringify({ lat, lng })
});

// New function for AI backend prediction
export const predictClaim = (payload) => {
  const AI_API_BASE = 'https://aegisai-1.onrender.com';
  return fetch(`${AI_API_BASE}/predict-claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }).then(async (response) => {
    const data = await safeJson(response);
    if (!response.ok) {
      throw new Error(data.error || `API request failed with status ${response.status}`);
    }
    return data;
  });
};
