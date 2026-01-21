// ================= API CONFIG =================
const isLocal =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

const API_BASE = isLocal
  ? 'http://localhost:5000/api'
  : 'https://food-app-945m.onrender.com/api';

console.log('API Base:', API_BASE);

// ================= CORE API CALL =================
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config = {
    method: options.method || 'GET',
    headers
  };

  if (options.body) {
    config.body =
      typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body);
  }

  try {
    console.log(`${config.method} → ${endpoint}`);

    const res = await fetch(`${API_BASE}${endpoint}`, config);

    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || data.message || 'Request failed');
    }

    return data;
  } catch (err) {
    console.error('API ERROR:', err.message);
    throw err;
  }
}

// ================= AUTH HELPERS =================
export function isAuthenticated() {
  return !!localStorage.getItem('token');
}

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
}

export function isAdmin() {
  const user = getCurrentUser();
  return user && user.role === 'admin';
}

// ================= AUTH =================
export async function registerUser(userData) {
  return apiCall('/auth/register', {
    method: 'POST',
    body: userData
  });
}

export async function loginUser(email, password) {
  const res = await apiCall('/auth/login', {
    method: 'POST',
    body: { email, password }
  });

  if (res?.token && res?.user) {
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
  }

  return res;
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

// ================= RESTAURANTS =================
export async function fetchRestaurants() {
  return apiCall('/restaurants');
}

export async function fetchRestaurant(id) {
  return apiCall(`/restaurants/${id}`);
}

export async function createRestaurant(data) {
  return apiCall('/restaurants', {
    method: 'POST',
    body: data
  });
}

export async function deleteRestaurant(id) {
  return apiCall(`/restaurants/${id}`, {
    method: 'DELETE'
  });
}

// ================= MENU =================
export async function fetchMenu(restaurantId) {
  return apiCall(`/menu/${restaurantId}`);
}

export async function createMenuItem(data) {
  return apiCall('/menu', {
    method: 'POST',
    body: data
  });
}

export async function deleteMenuItem(id) {
  return apiCall(`/menu/${id}`, {
    method: 'DELETE'
  });
}

// ================= ORDERS =================
export async function createOrder(orderData) {
  return apiCall('/orders', {
    method: 'POST',
    body: orderData
  });
}

export async function fetchMyOrders() {
  return apiCall('/orders/my-orders');
}

// ================= USER PROFILE =================
export async function fetchProfile() {
  return apiCall('/users/profile');
}

export async function updateProfile(data) {
  return apiCall('/users/profile', {
    method: 'PUT',
    body: data
  });
}
