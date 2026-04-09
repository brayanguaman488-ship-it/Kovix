import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

import DashboardHeader from "../components/dashboard/DashboardHeader";
import SummaryCards from "../components/dashboard/SummaryCards";
import CustomerForm from "../components/dashboard/CustomerForm";
import DeviceForm from "../components/dashboard/DeviceForm";
import CustomersList from "../components/dashboard/CustomersList";
import DevicesList from "../components/dashboard/DevicesList";
import PaymentsList from "../components/dashboard/PaymentsList";
import StatusMessage from "../components/dashboard/StatusMessage";
import { api } from "../lib/api";

const statuses = ["ACTIVO", "PAGO_PENDIENTE", "SOLO_LLAMADAS", "BLOQUEADO"];

const initialCustomerForm = {
  fullName: "",
  nationalId: "",
  phone: "",
  address: "",
  notes: "",
};

const initialDeviceForm = {
  customerId: "",
  brand: "",
  model: "",
  alias: "",
  imei: "",
  installCode: "",
  notes: "",
};

const initialCreditForm = {
  deviceId: "",
  principalAmount: "",
  downPaymentAmount: "",
  installmentCount: "",
  startDate: "",
  notes: "",
};

const PAGE_SIZE = 6;
const DEVICE_OWNER_COMPONENT_NAME = "com.kovix.client/.admin.KovixDeviceAdminReceiver";

function paginate(items, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;

  return {
    items: items.slice(start, end),
    page: safePage,
    totalPages,
    totalItems: items.length,
  };
}

function parsePageQuery(value, fallback = 1) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeQueryValue(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value);
}

function buildProvisioningPayload({
  apkUrl,
  apkChecksum,
  baseUrl,
  installCode,
  clientSecret,
}) {
  return {
    "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME": DEVICE_OWNER_COMPONENT_NAME,
    "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION": apkUrl,
    "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_CHECKSUM": apkChecksum,
    "android.app.extra.PROVISIONING_SKIP_ENCRYPTION": true,
    "android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED": true,
    "android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE": {
      baseUrl,
      installCode,
      clientSecret,
    },
  };
}

export default function Dashboard() {
  const router = useRouter();
  const hasHydratedQueryRef = useRef(false);
  const [user, setUser] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [customerForm, setCustomerForm] = useState(initialCustomerForm);
  const [deviceForm, setDeviceForm] = useState(initialDeviceForm);
  const [creditForm, setCreditForm] = useState(initialCreditForm);
  const [statusState, setStatusState] = useState({ type: "info", message: "" });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [isSavingDevice, setIsSavingDevice] = useState(false);
  const [isSavingCreditContract, setIsSavingCreditContract] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [updatingDeviceId, setUpdatingDeviceId] = useState("");
  const [rotatingSecretDeviceId, setRotatingSecretDeviceId] = useState("");
  const [markingPaymentId, setMarkingPaymentId] = useState("");
  const [processingInstallmentId, setProcessingInstallmentId] = useState("");
  const [isApprovingAllReported, setIsApprovingAllReported] = useState(false);
  const [selectedCreditDeviceId, setSelectedCreditDeviceId] = useState("");
  const [selectedCreditContract, setSelectedCreditContract] = useState(null);
  const [isLoadingCreditContract, setIsLoadingCreditContract] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [deviceQuery, setDeviceQuery] = useState("");
  const [paymentQuery, setPaymentQuery] = useState("");
  const [customerSort, setCustomerSort] = useState("name_asc");
  const [deviceSort, setDeviceSort] = useState("updated_desc");
  const [paymentSort, setPaymentSort] = useState("due_asc");
  const [customerPage, setCustomerPage] = useState(1);
  const [devicePage, setDevicePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [provisioningDeviceId, setProvisioningDeviceId] = useState("");
  const [provisioningBaseUrl, setProvisioningBaseUrl] = useState("https://api.kovix.app");
  const [provisioningApkUrl, setProvisioningApkUrl] = useState("");
  const [provisioningApkChecksum, setProvisioningApkChecksum] = useState("");
  const [provisioningQrJson, setProvisioningQrJson] = useState("");
  const [provisioningQrUrl, setProvisioningQrUrl] = useState("");

  function setStatus(type, message) {
    setStatusState({ type, message });
  }

  function clearFilters() {
    setCustomerQuery("");
    setDeviceQuery("");
    setPaymentQuery("");
    setCustomerSort("name_asc");
    setDeviceSort("updated_desc");
    setPaymentSort("due_asc");
    setCustomerPage(1);
    setDevicePage(1);
    setPaymentPage(1);
    setStatus("info", "Filtros reiniciados");
  }

  async function handleCopyShareLink() {
    const shareUrl = `${window.location.origin}${router.asPath}`;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement("input");
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }

      setStatus("success", "Enlace copiado al portapapeles");
    } catch (error) {
      setStatus("error", "No se pudo copiar el enlace");
    }
  }

  async function handleCopyProvisioningJson() {
    if (!provisioningQrJson) {
      setStatus("error", "Primero genera el JSON del QR");
      return;
    }

    try {
      await navigator.clipboard.writeText(provisioningQrJson);
      setStatus("success", "JSON de aprovisionamiento copiado");
    } catch (error) {
      setStatus("error", "No se pudo copiar el JSON");
    }
  }

  function handleOpenShareLink() {
    const shareUrl = `${window.location.origin}${router.asPath}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  }

  async function loadDashboard(options = { silent: false }) {
    if (options.silent) {
      setIsRefreshing(true);
    }

    try {
      // 1) La sesion es la fuente de verdad para mantener al usuario en dashboard.
      // Solo si /me falla, se debe redirigir a login.
      const meResponse = await api.me();
      setUser(meResponse.user);

      // 2) Los modulos de datos se cargan de forma tolerante: si uno falla, no
      // expulsamos al usuario de su sesion.
      const [customersResult, devicesResult, paymentsResult] = await Promise.allSettled([
        api.getCustomers(),
        api.getDevices(),
        api.getPayments(),
      ]);

      if (customersResult.status === "fulfilled") {
        setCustomers(customersResult.value.customers);
      } else {
        setCustomers([]);
      }

      if (devicesResult.status === "fulfilled") {
        setDevices(devicesResult.value.devices);
      } else {
        setDevices([]);
      }

      if (paymentsResult.status === "fulfilled") {
        setPayments(paymentsResult.value.payments);
      } else {
        setPayments([]);
      }

      const failedModules = [
        customersResult.status === "rejected" ? "clientes" : null,
        devicesResult.status === "rejected" ? "dispositivos" : null,
        paymentsResult.status === "rejected" ? "pagos" : null,
      ].filter(Boolean);

      if (failedModules.length > 0) {
        setStatus(
          "error",
          `Sesion activa, pero no se pudieron cargar: ${failedModules.join(", ")}. Revisa backend logs.`
        );
      }
    } finally {
      if (options.silent) {
        setIsRefreshing(false);
      }
    }
  }

  async function loadCreditContract(deviceId) {
    const normalizedDeviceId = String(deviceId || "").trim();

    if (!normalizedDeviceId) {
      setSelectedCreditContract(null);
      return;
    }

    try {
      setIsLoadingCreditContract(true);
      const response = await api.getCreditContract(normalizedDeviceId);
      setSelectedCreditContract(response.contract || null);
    } catch (error) {
      setSelectedCreditContract(null);

      if (!String(error.message || "").toLowerCase().includes("no existe contrato")) {
        setStatus("error", error.message || "No se pudo cargar el contrato de credito");
      }
    } finally {
      setIsLoadingCreditContract(false);
    }
  }

  useEffect(() => {
    loadDashboard()
      .catch(() => {
        router.replace("/login");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    loadCreditContract(selectedCreditDeviceId).catch(() => {
      setSelectedCreditContract(null);
    });
  }, [selectedCreditDeviceId]);

  useEffect(() => {
    if (!router.isReady || hasHydratedQueryRef.current) {
      return;
    }

    setCustomerQuery(normalizeQueryValue(router.query.cq));
    setDeviceQuery(normalizeQueryValue(router.query.dq));
    setPaymentQuery(normalizeQueryValue(router.query.pq));
    setCustomerSort(normalizeQueryValue(router.query.cs) || "name_asc");
    setDeviceSort(normalizeQueryValue(router.query.ds) || "updated_desc");
    setPaymentSort(normalizeQueryValue(router.query.ps) || "due_asc");
    setCustomerPage(parsePageQuery(router.query.cp, 1));
    setDevicePage(parsePageQuery(router.query.dp, 1));
    setPaymentPage(parsePageQuery(router.query.pp, 1));
    hasHydratedQueryRef.current = true;
  }, [router.isReady, router.query]);

  useEffect(() => {
    if (!router.isReady || !hasHydratedQueryRef.current) {
      return;
    }

    const query = {};

    if (customerQuery) query.cq = customerQuery;
    if (deviceQuery) query.dq = deviceQuery;
    if (paymentQuery) query.pq = paymentQuery;
    if (customerSort !== "name_asc") query.cs = customerSort;
    if (deviceSort !== "updated_desc") query.ds = deviceSort;
    if (paymentSort !== "due_asc") query.ps = paymentSort;
    if (customerPage > 1) query.cp = String(customerPage);
    if (devicePage > 1) query.dp = String(devicePage);
    if (paymentPage > 1) query.pp = String(paymentPage);

    router.replace(
      {
        pathname: router.pathname,
        query,
      },
      undefined,
      { shallow: true }
    );
  }, [
    router,
    customerQuery,
    deviceQuery,
    paymentQuery,
    customerSort,
    deviceSort,
    paymentSort,
    customerPage,
    devicePage,
    paymentPage,
  ]);

  async function handleCreateCustomer(event) {
    event.preventDefault();
    const fullName = customerForm.fullName.trim();
    const nationalId = customerForm.nationalId.trim();
    const phone = customerForm.phone.trim();

    if (!fullName || !nationalId || !phone) {
      setStatus("error", "Cliente: fullName, nationalId y phone son obligatorios");
      return;
    }

    try {
      setIsSavingCustomer(true);
      await api.createCustomer({
        ...customerForm,
        fullName,
        nationalId,
        phone,
      });
      setCustomerForm(initialCustomerForm);
      setStatus("success", "Cliente creado correctamente");
      await loadDashboard({ silent: true });
    } catch (error) {
      setStatus("error", error.message || "No se pudo crear el cliente");
    } finally {
      setIsSavingCustomer(false);
    }
  }

  async function handleCreateDevice(event) {
    event.preventDefault();
    const customerId = deviceForm.customerId.trim();
    const brand = deviceForm.brand.trim();
    const model = deviceForm.model.trim();
    const imei = deviceForm.imei.trim();
    const installCode = deviceForm.installCode.trim();

    if (!customerId || !brand || !model || !imei || !installCode) {
      setStatus("error", "Dispositivo: customerId, brand, model, imei e installCode son obligatorios");
      return;
    }

    try {
      setIsSavingDevice(true);
      await api.createDevice({
        ...deviceForm,
        customerId,
        brand,
        model,
        imei,
        installCode,
      });
      setDeviceForm(initialDeviceForm);
      setStatus("success", "Dispositivo creado correctamente");
      await loadDashboard({ silent: true });
    } catch (error) {
      setStatus("error", error.message || "No se pudo crear el dispositivo");
    } finally {
      setIsSavingDevice(false);
    }
  }

  async function handleCreateCreditContract(event) {
    event.preventDefault();
    const deviceId = creditForm.deviceId.trim();
    const principalAmount = Number(creditForm.principalAmount);
    const downPaymentAmount = creditForm.downPaymentAmount ? Number(creditForm.downPaymentAmount) : 0;
    const installmentCount = Number(creditForm.installmentCount);
    const startDate = creditForm.startDate;

    if (!deviceId || !creditForm.principalAmount || !creditForm.installmentCount || !startDate) {
      setStatus("error", "Credito: deviceId, principalAmount, installmentCount y startDate son obligatorios");
      return;
    }

    if (!Number.isFinite(principalAmount) || principalAmount <= 0) {
      setStatus("error", "Credito: principalAmount debe ser mayor que 0");
      return;
    }

    if (!Number.isFinite(downPaymentAmount) || downPaymentAmount < 0) {
      setStatus("error", "Credito: downPaymentAmount debe ser mayor o igual que 0");
      return;
    }

    if (downPaymentAmount >= principalAmount) {
      setStatus("error", "Credito: la entrada debe ser menor que el monto total");
      return;
    }

    if (!Number.isInteger(installmentCount) || installmentCount <= 0) {
      setStatus("error", "Credito: installmentCount debe ser entero mayor que 0");
      return;
    }

    try {
      setIsSavingCreditContract(true);
      await api.createCreditContract({
        ...creditForm,
        deviceId,
        principalAmount,
        downPaymentAmount,
        installmentCount,
        startDate,
      });
      setStatus("success", "Contrato de credito creado correctamente");
      setSelectedCreditDeviceId(deviceId);
      setCreditForm(initialCreditForm);
      await loadDashboard({ silent: true });
      await loadCreditContract(deviceId);
    } catch (error) {
      setStatus("error", error.message || "No se pudo crear el contrato de credito");
    } finally {
      setIsSavingCreditContract(false);
    }
  }

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    // Navegar inmediatamente para evitar sensacion de bloqueo en la UI.
    router.replace("/login");

    // Limpiar sesion en backend en segundo plano.
    api.logout().catch((error) => {
      console.warn("Logout remoto no disponible:", error);
    });
  }

  async function handleStatusChange(deviceId, status) {
    try {
      setUpdatingDeviceId(deviceId);
      await api.updateDeviceStatus(deviceId, {
        status,
        reason: "Cambio manual desde dashboard",
      });
      setStatus("success", "Estado actualizado");
      await loadDashboard({ silent: true });
    } catch (error) {
      setStatus("error", error.message || "No se pudo actualizar el estado");
    } finally {
      setUpdatingDeviceId("");
    }
  }

  async function handleMarkPaid(paymentId) {
    try {
      setMarkingPaymentId(paymentId);
      await api.markPaymentPaid(paymentId);
      setStatus("success", "Pago marcado como pagado");
      await loadDashboard({ silent: true });
    } catch (error) {
      setStatus("error", error.message || "No se pudo marcar el pago");
    } finally {
      setMarkingPaymentId("");
    }
  }

  async function handleRotateSecret(deviceId) {
    try {
      setRotatingSecretDeviceId(deviceId);
      await api.rotateDeviceSecret(deviceId);
      setStatus("success", "ClientSecret rotado correctamente");
      await loadDashboard({ silent: true });
    } catch (error) {
      setStatus("error", error.message || "No se pudo rotar el clientSecret");
    } finally {
      setRotatingSecretDeviceId("");
    }
  }

  async function handleMarkOverdue(paymentId) {
    try {
      setMarkingPaymentId(paymentId);
      await api.markPaymentOverdue(paymentId);
      setStatus("success", "Pago marcado como vencido");
      await loadDashboard({ silent: true });
    } catch (error) {
      setStatus("error", error.message || "No se pudo marcar el pago como vencido");
    } finally {
      setMarkingPaymentId("");
    }
  }

  async function handleMarkPending(paymentId) {
    try {
      setMarkingPaymentId(paymentId);
      await api.markPaymentPending(paymentId);
      setStatus("success", "Pago marcado como pendiente");
      await loadDashboard({ silent: true });
    } catch (error) {
      setStatus("error", error.message || "No se pudo marcar el pago como pendiente");
    } finally {
      setMarkingPaymentId("");
    }
  }

  async function handleApproveInstallment(installmentId) {
    try {
      setProcessingInstallmentId(installmentId);
      await api.approveInstallmentPayment(installmentId);
      setStatus("success", "Cuota aprobada como pagada");
      await loadDashboard({ silent: true });
      await loadCreditContract(selectedCreditDeviceId);
    } catch (error) {
      setStatus("error", error.message || "No se pudo aprobar la cuota");
    } finally {
      setProcessingInstallmentId("");
    }
  }

  async function handleMarkInstallmentOverdue(installmentId) {
    try {
      setProcessingInstallmentId(installmentId);
      await api.markInstallmentOverdue(installmentId);
      setStatus("success", "Cuota marcada como vencida");
      await loadDashboard({ silent: true });
      await loadCreditContract(selectedCreditDeviceId);
    } catch (error) {
      setStatus("error", error.message || "No se pudo marcar la cuota como vencida");
    } finally {
      setProcessingInstallmentId("");
    }
  }

  async function handleApproveAllReportedInstallments() {
    if (!selectedCreditContract?.installments?.length) {
      setStatus("error", "No hay contrato seleccionado para aprobar cuotas reportadas");
      return;
    }

    const reportedInstallments = selectedCreditContract.installments.filter(
      (installment) => installment.status === "REPORTADO"
    );

    if (reportedInstallments.length === 0) {
      setStatus("info", "No hay cuotas reportadas pendientes de aprobacion");
      return;
    }

    try {
      setIsApprovingAllReported(true);

      for (const installment of reportedInstallments) {
        await api.approveInstallmentPayment(installment.id);
      }

      setStatus("success", `Se aprobaron ${reportedInstallments.length} cuotas reportadas`);
      await loadDashboard({ silent: true });
      await loadCreditContract(selectedCreditDeviceId);
    } catch (error) {
      setStatus("error", error.message || "No se pudieron aprobar todas las cuotas reportadas");
    } finally {
      setIsApprovingAllReported(false);
    }
  }

  function handleGenerateProvisioningQr() {
    const selectedDevice = devices.find((entry) => entry.id === provisioningDeviceId);

    if (!selectedDevice) {
      setStatus("error", "Selecciona un dispositivo para generar el QR");
      return;
    }

    const apkUrl = provisioningApkUrl.trim();
    const apkChecksum = provisioningApkChecksum.trim();
    const baseUrl = provisioningBaseUrl.trim();
    const installCode = String(selectedDevice.installCode || "").trim();
    const clientSecret = String(selectedDevice.clientSecret || "").trim();

    if (!apkUrl || !apkChecksum || !baseUrl) {
      setStatus("error", "Completa URL APK, checksum SHA-256 y Base URL");
      return;
    }

    if (!installCode || !clientSecret) {
      setStatus("error", "El dispositivo no tiene installCode/clientSecret disponible");
      return;
    }

    const payload = buildProvisioningPayload({
      apkUrl,
      apkChecksum,
      baseUrl,
      installCode,
      clientSecret,
    });
    const json = JSON.stringify(payload);
    const prettyJson = JSON.stringify(payload, null, 2);
    const qrUrl = `https://quickchart.io/qr?size=320&text=${encodeURIComponent(json)}`;

    setProvisioningQrJson(prettyJson);
    setProvisioningQrUrl(qrUrl);
    setStatus("success", "QR de aprovisionamiento generado");
  }

  const normalizedCustomerQuery = customerQuery.trim().toLowerCase();
  const normalizedDeviceQuery = deviceQuery.trim().toLowerCase();
  const normalizedPaymentQuery = paymentQuery.trim().toLowerCase();

  const filteredCustomers = customers.filter((customer) => {
    if (!normalizedCustomerQuery) {
      return true;
    }

    return [customer.fullName, customer.nationalId, customer.phone]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedCustomerQuery));
  });

  const filteredDevices = devices.filter((device) => {
    if (!normalizedDeviceQuery) {
      return true;
    }

    return [device.brand, device.model, device.imei, device.installCode, device.currentStatus, device.customer?.fullName]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedDeviceQuery));
  });

  const filteredPayments = payments.filter((payment) => {
    if (!normalizedPaymentQuery) {
      return true;
    }

    return [
      payment.customer?.fullName,
      payment.device?.installCode,
      payment.status,
      String(payment.amount ?? ""),
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedPaymentQuery));
  });

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    if (customerSort === "name_desc") {
      return String(b.fullName || "").localeCompare(String(a.fullName || ""));
    }
    if (customerSort === "created_desc") {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }
    if (customerSort === "created_asc") {
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    }
    return String(a.fullName || "").localeCompare(String(b.fullName || ""));
  });

  const sortedDevices = [...filteredDevices].sort((a, b) => {
    if (deviceSort === "status_asc") {
      return String(a.currentStatus || "").localeCompare(String(b.currentStatus || ""));
    }
    if (deviceSort === "status_desc") {
      return String(b.currentStatus || "").localeCompare(String(a.currentStatus || ""));
    }
    if (deviceSort === "brand_asc") {
      return String(a.brand || "").localeCompare(String(b.brand || ""));
    }
    if (deviceSort === "updated_asc") {
      return new Date(a.lastStatusChangeAt || 0) - new Date(b.lastStatusChangeAt || 0);
    }
    return new Date(b.lastStatusChangeAt || 0) - new Date(a.lastStatusChangeAt || 0);
  });

  const sortedPayments = [...filteredPayments].sort((a, b) => {
    if (paymentSort === "due_desc") {
      return new Date(b.dueDate || 0) - new Date(a.dueDate || 0);
    }
    if (paymentSort === "amount_asc") {
      return Number(a.amount || 0) - Number(b.amount || 0);
    }
    if (paymentSort === "amount_desc") {
      return Number(b.amount || 0) - Number(a.amount || 0);
    }
    if (paymentSort === "status_asc") {
      return String(a.status || "").localeCompare(String(b.status || ""));
    }
    return new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
  });

  const customersPageData = paginate(sortedCustomers, customerPage, PAGE_SIZE);
  const devicesPageData = paginate(sortedDevices, devicePage, PAGE_SIZE);
  const paymentsPageData = paginate(sortedPayments, paymentPage, PAGE_SIZE);
  const selectedCreditDevice = devices.find((entry) => entry.id === selectedCreditDeviceId) || null;
  const selectedProvisioningDevice = devices.find((entry) => entry.id === provisioningDeviceId) || null;
  const reportedInstallments = selectedCreditContract?.installments?.filter(
    (installment) => installment.status === "REPORTADO"
  ) || [];

  useEffect(() => {
    if (!provisioningDeviceId && devices.length > 0) {
      setProvisioningDeviceId(devices[0].id);
    }
  }, [devices, provisioningDeviceId]);

  useEffect(() => {
    setCustomerPage(1);
  }, [customerQuery, customerSort]);

  useEffect(() => {
    setDevicePage(1);
  }, [deviceQuery, deviceSort]);

  useEffect(() => {
    setPaymentPage(1);
  }, [paymentQuery, paymentSort]);

  useEffect(() => {
    if (customerPage !== customersPageData.page) {
      setCustomerPage(customersPageData.page);
    }
  }, [customerPage, customersPageData.page]);

  useEffect(() => {
    if (devicePage !== devicesPageData.page) {
      setDevicePage(devicesPageData.page);
    }
  }, [devicePage, devicesPageData.page]);

  useEffect(() => {
    if (paymentPage !== paymentsPageData.page) {
      setPaymentPage(paymentsPageData.page);
    }
  }, [paymentPage, paymentsPageData.page]);

  if (loading) {
    return (
      <main style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
        Cargando dashboard...
      </main>
    );
  }

  return (
    <main
      style={{
        padding: 24,
        fontFamily: "Arial, sans-serif",
        display: "grid",
        gap: 24,
        background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
        minHeight: "100vh",
      }}
    >
      <DashboardHeader user={user} onLogout={handleLogout} isLoggingOut={isLoggingOut} />

      {(isRefreshing || isLoggingOut) && (
        <section
          style={{
            padding: 12,
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
            color: "#334155",
          }}
        >
          {isLoggingOut ? "Cerrando sesion..." : "Actualizando datos..."}
        </section>
      )}

      <StatusMessage message={statusState.message} type={statusState.type} />

      <SummaryCards
        customersCount={customers.length}
        devicesCount={devices.length}
        paymentsCount={payments.length}
      />

      <section
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          background: "#ffffff",
          border: "1px solid #d8dee9",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <input
          placeholder="Buscar clientes (nombre, documento, telefono)"
          value={customerQuery}
          onChange={(event) => setCustomerQuery(event.target.value)}
          style={{ width: "100%", padding: 10, border: "1px solid #cbd5e1", borderRadius: 8 }}
        />
        <input
          placeholder="Buscar dispositivos (marca, modelo, imei, codigo, estado)"
          value={deviceQuery}
          onChange={(event) => setDeviceQuery(event.target.value)}
          style={{ width: "100%", padding: 10, border: "1px solid #cbd5e1", borderRadius: 8 }}
        />
        <input
          placeholder="Buscar pagos (cliente, codigo, estado, monto)"
          value={paymentQuery}
          onChange={(event) => setPaymentQuery(event.target.value)}
          style={{ width: "100%", padding: 10, border: "1px solid #cbd5e1", borderRadius: 8 }}
        />
        <button
          type="button"
          onClick={clearFilters}
          style={{
            width: "fit-content",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #94a3b8",
            background: "#f8fafc",
            color: "#0f172a",
            cursor: "pointer",
          }}
        >
          Limpiar filtros
        </button>
        <button
          type="button"
          onClick={handleCopyShareLink}
          style={{
            width: "fit-content",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #16a34a",
            background: "#f0fdf4",
            color: "#14532d",
            cursor: "pointer",
          }}
        >
          Copiar enlace
        </button>
        <button
          type="button"
          onClick={handleOpenShareLink}
          style={{
            width: "fit-content",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #0369a1",
            background: "#f0f9ff",
            color: "#0c4a6e",
            cursor: "pointer",
          }}
        >
          Abrir enlace
        </button>
      </section>

      <section
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          alignItems: "start",
        }}
      >
        <article
          style={{
            background: "#ffffff",
            border: "1px solid #d8dee9",
            borderRadius: 12,
            padding: 16,
            display: "grid",
            gap: 10,
          }}
        >
          <h3 style={{ margin: 0 }}>QR de aprovisionamiento (Device Owner)</h3>
          <p style={{ margin: 0, color: "#475569", fontSize: 14 }}>
            Usa este QR en el primer encendido del telefono para configurar KOVIX como Device Owner.
          </p>

          <select
            value={provisioningDeviceId}
            onChange={(event) => setProvisioningDeviceId(event.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1" }}
          >
            <option value="">Selecciona dispositivo</option>
            {devices.map((device) => (
              <option key={`qr-${device.id}`} value={device.id}>
                {device.installCode} - {device.customer?.fullName || "Sin cliente"}
              </option>
            ))}
          </select>

          <input
            value={provisioningBaseUrl}
            onChange={(event) => setProvisioningBaseUrl(event.target.value)}
            placeholder="Base URL API para Android (ej: https://api.tudominio.com)"
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1" }}
          />

          <input
            value={provisioningApkUrl}
            onChange={(event) => setProvisioningApkUrl(event.target.value)}
            placeholder="URL publica del APK"
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1" }}
          />

          <input
            value={provisioningApkChecksum}
            onChange={(event) => setProvisioningApkChecksum(event.target.value)}
            placeholder="SHA-256 del APK en Base64"
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1" }}
          />

          {selectedProvisioningDevice && (
            <div
              style={{
                padding: 10,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                color: "#334155",
                fontSize: 14,
              }}
            >
              InstallCode: <strong>{selectedProvisioningDevice.installCode}</strong><br />
              ClientSecret: <strong>{selectedProvisioningDevice.clientSecret || "No disponible"}</strong>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleGenerateProvisioningQr}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "none",
                background: "#1d4ed8",
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              Generar QR
            </button>
            <button
              type="button"
              onClick={handleCopyProvisioningJson}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #94a3b8",
                background: "#f8fafc",
                color: "#0f172a",
                cursor: "pointer",
              }}
            >
              Copiar JSON
            </button>
          </div>
        </article>

        <article
          style={{
            background: "#ffffff",
            border: "1px solid #d8dee9",
            borderRadius: 12,
            padding: 16,
            display: "grid",
            gap: 12,
            justifyItems: "start",
          }}
        >
          <h3 style={{ margin: 0 }}>Vista previa del QR</h3>
          {!provisioningQrUrl ? (
            <p style={{ margin: 0, color: "#64748b" }}>Completa datos y pulsa "Generar QR".</p>
          ) : (
            <img
              src={provisioningQrUrl}
              alt="QR de aprovisionamiento"
              width={320}
              height={320}
              style={{ border: "1px solid #cbd5e1", borderRadius: 8, background: "#ffffff" }}
            />
          )}

          <textarea
            readOnly
            value={provisioningQrJson}
            placeholder="Aqui se mostrara el JSON de aprovisionamiento"
            rows={14}
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1" }}
          />
        </article>
      </section>

      <section style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <CustomerForm
          form={customerForm}
          customers={customers.length}
          onChange={setCustomerForm}
          onSubmit={handleCreateCustomer}
          isSubmitting={isSavingCustomer}
        />
        <DeviceForm
          form={deviceForm}
          customers={customers}
          onChange={setDeviceForm}
          onSubmit={handleCreateDevice}
          isSubmitting={isSavingDevice}
        />
      </section>

      <section
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          alignItems: "start",
        }}
      >
        <article
          style={{
            background: "#ffffff",
            border: "1px solid #d8dee9",
            borderRadius: 12,
            padding: 16,
            display: "grid",
            gap: 12,
          }}
        >
          <h3 style={{ margin: 0 }}>Crear contrato de credito</h3>
          <form onSubmit={handleCreateCreditContract} style={{ display: "grid", gap: 10 }}>
            <select
              value={creditForm.deviceId}
              onChange={(event) => setCreditForm((value) => ({ ...value, deviceId: event.target.value }))}
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1" }}
            >
              <option value="">Selecciona dispositivo</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.installCode} - {device.customer?.fullName || "Sin cliente"}
                </option>
              ))}
            </select>
            <input
              placeholder="Monto total (USD)"
              type="number"
              min="0"
              step="0.01"
              value={creditForm.principalAmount}
              onChange={(event) =>
                setCreditForm((value) => ({ ...value, principalAmount: event.target.value }))
              }
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1" }}
            />
            <input
              placeholder="Valor de entrada (USD)"
              type="number"
              min="0"
              step="0.01"
              value={creditForm.downPaymentAmount}
              onChange={(event) =>
                setCreditForm((value) => ({ ...value, downPaymentAmount: event.target.value }))
              }
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1" }}
            />
            <input
              placeholder="Numero de cuotas"
              type="number"
              min="1"
              step="1"
              value={creditForm.installmentCount}
              onChange={(event) =>
                setCreditForm((value) => ({ ...value, installmentCount: event.target.value }))
              }
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1" }}
            />
            <input
              type="date"
              value={creditForm.startDate}
              onChange={(event) => setCreditForm((value) => ({ ...value, startDate: event.target.value }))}
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1" }}
            />
            <textarea
              placeholder="Notas de contrato (opcional)"
              rows={3}
              value={creditForm.notes}
              onChange={(event) => setCreditForm((value) => ({ ...value, notes: event.target.value }))}
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1" }}
            />
            <button
              type="submit"
              disabled={isSavingCreditContract}
              style={{
                width: "fit-content",
                padding: "10px 14px",
                borderRadius: 8,
                border: "none",
                background: "#1d4ed8",
                color: "#ffffff",
                cursor: isSavingCreditContract ? "not-allowed" : "pointer",
              }}
            >
              {isSavingCreditContract ? "Guardando..." : "Crear contrato"}
            </button>
          </form>
        </article>

        <article
          style={{
            background: "#ffffff",
            border: "1px solid #d8dee9",
            borderRadius: 12,
            padding: 16,
            display: "grid",
            gap: 12,
          }}
        >
          <h3 style={{ margin: 0 }}>Gestion de cuotas</h3>
          <select
            value={selectedCreditDeviceId}
            onChange={(event) => setSelectedCreditDeviceId(event.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1" }}
          >
            <option value="">Selecciona dispositivo para revisar credito</option>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.installCode} - {device.customer?.fullName || "Sin cliente"}
              </option>
            ))}
          </select>

          {selectedCreditDevice && (
            <div
              style={{
                padding: 10,
                borderRadius: 8,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                color: "#334155",
              }}
            >
              Equipo: <strong>{selectedCreditDevice.brand} {selectedCreditDevice.model}</strong> ({selectedCreditDevice.installCode})
            </div>
          )}

          {isLoadingCreditContract && <p style={{ margin: 0 }}>Cargando contrato...</p>}

          {!isLoadingCreditContract && selectedCreditDeviceId && !selectedCreditContract && (
            <p style={{ margin: 0, color: "#92400e" }}>Este dispositivo aun no tiene contrato de credito.</p>
          )}

          {selectedCreditContract && (
            <div style={{ display: "grid", gap: 12 }}>
              <div
                style={{
                  display: "grid",
                  gap: 6,
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <div>Total: ${Number(selectedCreditContract.summary?.totalAmount || 0).toFixed(2)} USD</div>
                <div>Precio del equipo: ${Number(selectedCreditContract.summary?.principalAmount || 0).toFixed(2)} USD</div>
                <div>Entrada: ${Number(selectedCreditContract.summary?.downPaymentAmount || 0).toFixed(2)} USD</div>
                <div>Monto financiado: ${Number(selectedCreditContract.summary?.financedAmount || 0).toFixed(2)} USD</div>
                <div>Pagado: ${Number(selectedCreditContract.summary?.paidAmount || 0).toFixed(2)} USD</div>
                <div>Pendiente: ${Number(selectedCreditContract.summary?.pendingAmount || 0).toFixed(2)} USD</div>
                <div>Cuotas pagadas: {selectedCreditContract.summary?.paidInstallments || 0} / {selectedCreditContract.installmentCount}</div>
              </div>

              <button
                type="button"
                onClick={handleApproveAllReportedInstallments}
                disabled={isApprovingAllReported}
                style={{
                  width: "fit-content",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #0891b2",
                  background: "#ecfeff",
                  color: "#0e7490",
                  cursor: isApprovingAllReported ? "not-allowed" : "pointer",
                }}
              >
                {isApprovingAllReported ? "Aprobando..." : "Aprobar todas las reportadas"}
              </button>

              <div
                style={{
                  border: "1px solid #bae6fd",
                  borderRadius: 8,
                  background: "#f0f9ff",
                  padding: 10,
                }}
              >
                <h4 style={{ margin: "0 0 8px 0", color: "#0c4a6e" }}>Reportes de pago pendientes</h4>
                {reportedInstallments.length === 0 ? (
                  <p style={{ margin: 0, color: "#0f172a" }}>No hay cuotas reportadas por el cliente.</p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 460 }}>
                      <thead>
                        <tr style={{ background: "#e0f2fe" }}>
                          <th style={{ textAlign: "left", border: "1px solid #bae6fd", padding: 8 }}>Cuota</th>
                          <th style={{ textAlign: "left", border: "1px solid #bae6fd", padding: 8 }}>Valor</th>
                          <th style={{ textAlign: "left", border: "1px solid #bae6fd", padding: 8 }}>Vence</th>
                          <th style={{ textAlign: "left", border: "1px solid #bae6fd", padding: 8 }}>Accion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportedInstallments.map((installment) => (
                          <tr key={`reported-${installment.id}`}>
                            <td style={{ border: "1px solid #bae6fd", padding: 8 }}>#{installment.sequence}</td>
                            <td style={{ border: "1px solid #bae6fd", padding: 8 }}>
                              ${Number(installment.amount).toFixed(2)}
                            </td>
                            <td style={{ border: "1px solid #bae6fd", padding: 8 }}>
                              {new Date(installment.dueDate).toLocaleDateString()}
                            </td>
                            <td style={{ border: "1px solid #bae6fd", padding: 8 }}>
                              <button
                                type="button"
                                disabled={processingInstallmentId === installment.id}
                                onClick={() => handleApproveInstallment(installment.id)}
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: 6,
                                  border: "1px solid #16a34a",
                                  background: "#f0fdf4",
                                  color: "#14532d",
                                  cursor: "pointer",
                                }}
                              >
                                Aprobar reporte
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 540 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={{ textAlign: "left", border: "1px solid #e2e8f0", padding: 8 }}>#</th>
                      <th style={{ textAlign: "left", border: "1px solid #e2e8f0", padding: 8 }}>Vence</th>
                      <th style={{ textAlign: "left", border: "1px solid #e2e8f0", padding: 8 }}>Monto</th>
                      <th style={{ textAlign: "left", border: "1px solid #e2e8f0", padding: 8 }}>Estado</th>
                      <th style={{ textAlign: "left", border: "1px solid #e2e8f0", padding: 8 }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCreditContract.installments?.map((installment) => (
                      <tr key={installment.id}>
                        <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{installment.sequence}</td>
                        <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>
                          {new Date(installment.dueDate).toLocaleDateString()}
                        </td>
                        <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>
                          ${Number(installment.amount).toFixed(2)}
                        </td>
                        <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{installment.status}</td>
                        <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              disabled={
                                processingInstallmentId === installment.id || installment.status === "PAGADO"
                              }
                              onClick={() => handleApproveInstallment(installment.id)}
                              style={{
                                padding: "6px 10px",
                                borderRadius: 6,
                                border: "1px solid #16a34a",
                                background: "#f0fdf4",
                                color: "#14532d",
                                cursor: "pointer",
                              }}
                            >
                              Aprobar pago
                            </button>
                            <button
                              type="button"
                              disabled={
                                processingInstallmentId === installment.id || installment.status === "PAGADO"
                              }
                              onClick={() => handleMarkInstallmentOverdue(installment.id)}
                              style={{
                                padding: "6px 10px",
                                borderRadius: 6,
                                border: "1px solid #b45309",
                                background: "#fffbeb",
                                color: "#78350f",
                                cursor: "pointer",
                              }}
                            >
                              Marcar vencida
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </article>
      </section>

      <section style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <CustomersList
          customers={customersPageData.items}
          totalItems={customersPageData.totalItems}
          page={customersPageData.page}
          totalPages={customersPageData.totalPages}
          sortValue={customerSort}
          onSortChange={setCustomerSort}
          onPrevPage={() => setCustomerPage((value) => Math.max(1, value - 1))}
          onNextPage={() =>
            setCustomerPage((value) => Math.min(customersPageData.totalPages, value + 1))
          }
        />
        <DevicesList
          devices={devicesPageData.items}
          statuses={statuses}
          onStatusChange={handleStatusChange}
          updatingDeviceId={updatingDeviceId}
          rotatingSecretDeviceId={rotatingSecretDeviceId}
          onRotateSecret={handleRotateSecret}
          totalItems={devicesPageData.totalItems}
          page={devicesPageData.page}
          totalPages={devicesPageData.totalPages}
          sortValue={deviceSort}
          onSortChange={setDeviceSort}
          onPrevPage={() => setDevicePage((value) => Math.max(1, value - 1))}
          onNextPage={() =>
            setDevicePage((value) => Math.min(devicesPageData.totalPages, value + 1))
          }
        />
      </section>

      <PaymentsList
        payments={paymentsPageData.items}
        onMarkPaid={handleMarkPaid}
        onMarkOverdue={handleMarkOverdue}
        onMarkPending={handleMarkPending}
        markingPaymentId={markingPaymentId}
        totalItems={paymentsPageData.totalItems}
        page={paymentsPageData.page}
        totalPages={paymentsPageData.totalPages}
        sortValue={paymentSort}
        onSortChange={setPaymentSort}
        onPrevPage={() => setPaymentPage((value) => Math.max(1, value - 1))}
        onNextPage={() =>
          setPaymentPage((value) => Math.min(paymentsPageData.totalPages, value + 1))
        }
      />
    </main>
  );
}
