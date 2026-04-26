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
    const error = new Error(data.message || "Error en la solicitud");
    error.details = data.details || null;
    throw error;
  }

  return data;
}

async function requestRaw(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: {
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

  if (!response.ok) {
    let message = "Error en la solicitud";
    let details = null;
    try {
      const data = await response.json();
      message = data?.message || message;
      details = data?.details || null;
    } catch {
      // no-op
    }
    const error = new Error(message);
    error.details = details;
    throw error;
  }

  return response;
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
  deleteCustomer(customerId) {
    return request(`/customers/${customerId}`, {
      method: "DELETE",
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
  updateDevice(deviceId, payload) {
    return request(`/devices/${deviceId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  deleteDevice(deviceId) {
    return request(`/devices/${deviceId}`, {
      method: "DELETE",
    });
  },
  updateDeviceStatus(deviceId, payload) {
    return request(`/devices/${deviceId}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  clearManualDeviceStatus(deviceId) {
    return request(`/devices/${deviceId}/clear-manual-status`, {
      method: "POST",
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
  unlinkDeviceHexnode(deviceId) {
    return request(`/devices/${deviceId}/unlink-hexnode`, {
      method: "POST",
    });
  },
  linkAllDevicesHexnode() {
    return request("/devices/link-hexnode-all", {
      method: "POST",
    });
  },
  getHexnodeProvisioningQr() {
    return request("/devices/provisioning/hexnode-qr");
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
  deletePayment(paymentId) {
    return request(`/payments/${paymentId}`, {
      method: "DELETE",
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
  getCustomerAssets(customerId) {
    return request(`/customer-assets?customerId=${encodeURIComponent(customerId)}`);
  },
  uploadCustomerAsset(payload) {
    return request("/customer-assets", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateCustomerAsset(assetId, payload) {
    return request(`/customer-assets/${encodeURIComponent(assetId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  deleteCustomerAsset(assetId) {
    return request(`/customer-assets/${encodeURIComponent(assetId)}`, {
      method: "DELETE",
    });
  },
  getTrashEntries(limit = 80) {
    return request(`/trash?limit=${encodeURIComponent(limit)}`);
  },
  deleteTrashEntry(entryId) {
    return request(`/trash/${encodeURIComponent(entryId)}`, {
      method: "DELETE",
    });
  },
  async getCustomerAssetContent(assetId, disposition = "inline") {
    const response = await requestRaw(
      `/customer-assets/${encodeURIComponent(assetId)}/content?disposition=${encodeURIComponent(disposition)}`,
      { method: "GET" }
    );
    return response.blob();
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
  getEquifaxConsultations(params = {}) {
    const query = new URLSearchParams();
    if (params.status) {
      query.set("status", params.status);
    }
    if (params.search) {
      query.set("search", params.search);
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request(`/equifax-consultations${suffix}`);
  },
  createEquifaxConsultation(payload) {
    return request("/equifax-consultations", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  respondEquifaxConsultation(consultationId, payload) {
    return request(`/equifax-consultations/${encodeURIComponent(consultationId)}/respond`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};
