const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  (process.env.NODE_ENV === "production"
    ? "https://api.kovixec.com"
    : "http://localhost:4000");
const REQUEST_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS || 12000);

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
      signal: options.signal || controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Tiempo de espera agotado al conectar con el servidor");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Error en la solicitud");
  }

  return data;
}

export const api = {
  login(payload) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  me() {
    return request("/auth/me");
  },
  logout() {
    return request("/auth/logout", {
      method: "POST",
    });
  },
  getCustomers() {
    return request("/customers");
  },
  createCustomer(payload) {
    return request("/customers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getDevices() {
    return request("/devices");
  },
  createDevice(payload) {
    return request("/devices", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateDeviceStatus(deviceId, payload) {
    return request(`/devices/${deviceId}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  rotateDeviceSecret(deviceId) {
    return request(`/devices/${deviceId}/rotate-client-secret`, {
      method: "POST",
    });
  },
  linkDeviceHexnode(deviceId) {
    return request(`/devices/${deviceId}/link-hexnode`, {
      method: "POST",
    });
  },
  linkAllDevicesHexnode() {
    return request("/devices/link-hexnode-all", {
      method: "POST",
    });
  },
  getPayments() {
    return request("/payments");
  },
  createPayment(payload) {
    return request("/payments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  markPaymentPaid(paymentId) {
    return request(`/payments/${paymentId}/mark-paid`, {
      method: "PATCH",
    });
  },
  markPaymentOverdue(paymentId) {
    return request(`/payments/${paymentId}/mark-overdue`, {
      method: "PATCH",
    });
  },
  markPaymentPending(paymentId) {
    return request(`/payments/${paymentId}/mark-pending`, {
      method: "PATCH",
    });
  },
  createCreditContract(payload) {
    return request("/credits/contracts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getCreditContract(deviceId) {
    return request(`/credits/contracts/${deviceId}`);
  },
  approveInstallmentPayment(installmentId) {
    return request(`/credits/installments/${installmentId}/approve-payment`, {
      method: "PATCH",
    });
  },
  markInstallmentOverdue(installmentId) {
    return request(`/credits/installments/${installmentId}/mark-overdue`, {
      method: "PATCH",
    });
  },
};
