import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

import DashboardHeader from "../components/dashboard/DashboardHeader";
import SummaryCards from "../components/dashboard/SummaryCards";
import CustomerForm from "../components/dashboard/CustomerForm";
import DeviceForm from "../components/dashboard/DeviceForm";
import CustomersList from "../components/dashboard/CustomersList";
import DevicesList from "../components/dashboard/DevicesList";
import PaymentsList from "../components/dashboard/PaymentsList";
import FinancePanel from "../components/dashboard/FinancePanel";
import StatusMessage from "../components/dashboard/StatusMessage";
import { buttonStyle, cardStyle, inputStyle, pageShellStyle, secondaryButtonStyle } from "../components/dashboard/styles";
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
const sectionGridStyle = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  alignItems: "start",
};
const filterInputStyle = {
  ...inputStyle,
  minHeight: 46,
  borderRadius: 12,
  border: "1px solid rgba(148, 163, 184, 0.45)",
  background: "rgba(255, 255, 255, 0.9)",
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.65)",
};
const filterPrimaryButtonStyle = {
  ...buttonStyle,
  minHeight: 46,
  minWidth: 170,
  borderRadius: 12,
};
const filterSecondaryButtonStyle = {
  ...secondaryButtonStyle,
  minHeight: 46,
  minWidth: 170,
  borderRadius: 12,
  background: "rgba(248, 250, 252, 0.95)",
};

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

function resolvePaymentStatus(payment) {
  const status = String(payment?.status || "").toUpperCase();
  if (status !== "PENDIENTE") {
    return status;
  }

  const dueDate = new Date(payment?.dueDate);
  if (Number.isNaN(dueDate.getTime())) {
    return status;
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return dueDate < todayStart ? "VENCIDO" : "PENDIENTE";
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

function normalizeProvisioningChecksum(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) {
    return { ok: false, value: "", reason: "checksum_vacio" };
  }

  const compact = raw.replace(/\s+/g, "");
  const hexCandidate = compact.replace(/:/g, "").toLowerCase();

  function toUrlSafeBase64(value) {
    return String(value || "").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function fromUrlSafeBase64(value) {
    const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    const padding = normalized.length % 4;
    if (padding === 2) return `${normalized}==`;
    if (padding === 3) return `${normalized}=`;
    if (padding === 1) return `${normalized}===`;
    return normalized;
  }

  if (/^[0-9a-f]{64}$/i.test(hexCandidate)) {
    const bytes = [];
    for (let index = 0; index < hexCandidate.length; index += 2) {
      bytes.push(parseInt(hexCandidate.slice(index, index + 2), 16));
    }
    const binary = String.fromCharCode(...bytes);
    return { ok: true, value: toUrlSafeBase64(btoa(binary)), reason: "hex_to_base64_urlsafe" };
  }

  try {
    const decoded = atob(fromUrlSafeBase64(compact));
    if (decoded.length !== 32) {
      return { ok: false, value: "", reason: "base64_longitud_invalida" };
    }
    return { ok: true, value: toUrlSafeBase64(compact), reason: "base64_valido_urlsafe" };
  } catch (error) {
    return { ok: false, value: "", reason: "formato_invalido" };
  }
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
  const [deviceCustomerFilter, setDeviceCustomerFilter] = useState("all");
  const [devicePanelQuery, setDevicePanelQuery] = useState("");
  const [paymentPanelQuery, setPaymentPanelQuery] = useState("");
  const [provisioningDeviceId, setProvisioningDeviceId] = useState("");
  const [provisioningBaseUrl, setProvisioningBaseUrl] = useState("https://api.kovixec.com");
  const [provisioningApkUrl, setProvisioningApkUrl] = useState("");
  const [provisioningApkChecksum, setProvisioningApkChecksum] = useState("");
  const [provisioningQrJson, setProvisioningQrJson] = useState("");
  const [provisioningQrUrl, setProvisioningQrUrl] = useState("");
  const [activeSummarySection, setActiveSummarySection] = useState("customers");

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
    setDeviceCustomerFilter("all");
    setDevicePanelQuery("");
    setPaymentPanelQuery("");
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

  function handleSelectSummarySection(section) {
    setActiveSummarySection(section);
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
    // Ejecutar solo al montar para evitar ciclos de carga.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    // Limpiar sesion en backend en segundo plano (no bloqueante).
    api.logout().catch((error) => {
      console.warn("Logout remoto no disponible:", error);
    });

    // Navegacion dura e inmediata para evitar retrasos del router.
    window.location.replace("/login");
  }

  async function handleStatusChange(deviceId, status) {
    try {
      const normalizedDeviceId = String(deviceId);
      const targetDevice = devices.find((entry) => String(entry.id) === normalizedDeviceId);
      setUpdatingDeviceId(normalizedDeviceId);
      await api.updateDeviceStatus(normalizedDeviceId, {
        status,
        reason: "Cambio manual desde dashboard",
      });
      setStatus(
        "success",
        `Estado actualizado: ${targetDevice ? `${targetDevice.brand} ${targetDevice.model}` : normalizedDeviceId} -> ${status}`
      );
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
    const apkChecksumInput = provisioningApkChecksum.trim();
    const baseUrl = provisioningBaseUrl.trim();
    const installCode = String(selectedDevice.installCode || "").trim();
    const clientSecret = String(selectedDevice.clientSecret || "").trim();

    if (!apkUrl || !apkChecksumInput || !baseUrl) {
      setStatus("error", "Completa URL APK, checksum SHA-256 y Base URL");
      return;
    }

    if (!/^https:\/\//i.test(apkUrl)) {
      setStatus("error", "La URL del APK debe iniciar con https:// para aprovisionamiento QR");
      return;
    }

    const normalizedChecksum = normalizeProvisioningChecksum(apkChecksumInput);
    if (!normalizedChecksum.ok) {
      setStatus(
        "error",
        "Checksum invalido: usa SHA-256 del APK en Base64 o en HEX de 64 caracteres"
      );
      return;
    }

    if (!installCode || !clientSecret) {
      setStatus("error", "El dispositivo no tiene installCode/clientSecret disponible");
      return;
    }

    const payload = buildProvisioningPayload({
      apkUrl,
      apkChecksum: normalizedChecksum.value,
      baseUrl,
      installCode,
      clientSecret,
    });
    const json = JSON.stringify(payload);
    const prettyJson = JSON.stringify(payload, null, 2);
    const qrUrl = `https://quickchart.io/qr?size=320&text=${encodeURIComponent(json)}`;

    setProvisioningQrJson(prettyJson);
    setProvisioningQrUrl(qrUrl);
    setStatus(
      "success",
      normalizedChecksum.reason === "hex_to_base64_urlsafe"
        ? "QR generado (checksum HEX convertido automaticamente a Base64 URL-safe)"
        : "QR de aprovisionamiento generado"
    );
  }

  const normalizedCustomerQuery = customerQuery.trim().toLowerCase();
  const normalizedDeviceQuery = deviceQuery.trim().toLowerCase();
  const normalizedPaymentQuery = paymentQuery.trim().toLowerCase();
  const normalizedDevicePanelQuery = devicePanelQuery.trim().toLowerCase();
  const normalizedPaymentPanelQuery = paymentPanelQuery.trim().toLowerCase();

  const filteredCustomers = customers.filter((customer) => {
    if (!normalizedCustomerQuery) {
      return true;
    }

    return [customer.fullName, customer.nationalId, customer.phone]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedCustomerQuery));
  });

  const filteredDevices = devices.filter((device) => {
    const matchesCustomer =
      deviceCustomerFilter === "all" || String(device.customer?.id || "") === deviceCustomerFilter;

    if (!matchesCustomer) {
      return false;
    }

    const searchTerms = [normalizedDeviceQuery, normalizedDevicePanelQuery].filter(Boolean);
    if (searchTerms.length === 0) {
      return true;
    }

    const haystack = [device.brand, device.model, device.imei, device.installCode, device.currentStatus, device.customer?.fullName]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase())
      .join(" ");

    return searchTerms.every((term) => haystack.includes(term));
  });

  const filteredPayments = payments.filter((payment) => {
    const searchTerms = [normalizedPaymentQuery, normalizedPaymentPanelQuery].filter(Boolean);
    if (searchTerms.length === 0) {
      return true;
    }

    const haystack = [
      payment.customer?.fullName,
      payment.device?.installCode,
      payment.device?.brand,
      payment.device?.model,
      payment.status,
      String(payment.amount ?? ""),
    ]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase())
      .join(" ");

    return searchTerms.every((term) => haystack.includes(term));
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
  const deviceCustomerOptions = customers
    .map((customer) => ({
      id: String(customer.id),
      name: String(customer.fullName || "").trim(),
    }))
    .filter((entry) => entry.id && entry.name)
    .sort((a, b) => a.name.localeCompare(b.name));
  const devicePaymentSignalMap = new Map();
  const paymentsByDevice = new Map();
  for (const payment of payments) {
    const deviceId = payment.device?.id;
    if (!deviceId) {
      continue;
    }
    const list = paymentsByDevice.get(deviceId) || [];
    list.push(payment);
    paymentsByDevice.set(deviceId, list);
  }

  for (const [deviceId, list] of paymentsByDevice.entries()) {
    const statuses = list.map((payment) => resolvePaymentStatus(payment));
    const hasOverdue = statuses.includes("VENCIDO");
    if (hasOverdue) {
      devicePaymentSignalMap.set(deviceId, "VENCIDO");
      continue;
    }

    const hasPending = statuses.includes("PENDIENTE");
    if (hasPending) {
      devicePaymentSignalMap.set(deviceId, "PENDIENTE");
      continue;
    }
  }
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
      <main style={pageShellStyle}>
        Cargando dashboard...
      </main>
    );
  }

  return (
    <main style={pageShellStyle}>
      <DashboardHeader user={user} onLogout={handleLogout} isLoggingOut={isLoggingOut} />

      {(isRefreshing || isLoggingOut) && (
        <section
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid var(--line)",
            background: "var(--panel)",
            color: "var(--text-soft)",
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
        activeSection={activeSummarySection}
        onSelectSection={handleSelectSummarySection}
      />

      <section
        style={{
          display: "grid",
          gap: 14,
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          ...cardStyle,
        }}
      >
        <div style={{ gridColumn: "1 / -1", color: "var(--text-soft)", fontWeight: 600 }}>
          Busqueda rapida y acciones
        </div>
        <input
          placeholder="Buscar clientes (nombre, documento, telefono)"
          value={customerQuery}
          onChange={(event) => setCustomerQuery(event.target.value)}
          style={filterInputStyle}
        />
        <input
          placeholder="Buscar dispositivos (marca, modelo, imei, codigo, estado)"
          value={deviceQuery}
          onChange={(event) => setDeviceQuery(event.target.value)}
          style={filterInputStyle}
        />
        <input
          placeholder="Buscar pagos (cliente, codigo, estado, monto)"
          value={paymentQuery}
          onChange={(event) => setPaymentQuery(event.target.value)}
          style={filterInputStyle}
        />
        <button
          type="button"
          onClick={clearFilters}
          style={filterSecondaryButtonStyle}
        >
          Limpiar filtros
        </button>
        <button
          type="button"
          onClick={handleCopyShareLink}
          style={filterPrimaryButtonStyle}
        >
          Copiar enlace
        </button>
        <button
          type="button"
          onClick={handleOpenShareLink}
          style={filterSecondaryButtonStyle}
        >
          Abrir enlace
        </button>
      </section>

      <section style={sectionGridStyle}>
        <article
          style={{
            display: "grid",
            gap: 10,
            ...cardStyle,
          }}
        >
          <h3 style={{ margin: 0 }}>QR de aprovisionamiento (Device Owner)</h3>
          <p style={{ margin: 0, color: "#475569", fontSize: 14 }}>
            Usa este QR en el primer encendido del telefono para configurar KOVIX como Device Owner.
          </p>

          <select
            value={provisioningDeviceId}
            onChange={(event) => setProvisioningDeviceId(event.target.value)}
            style={inputStyle}
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
            style={inputStyle}
          />

          <input
            value={provisioningApkUrl}
            onChange={(event) => setProvisioningApkUrl(event.target.value)}
            placeholder="URL publica del APK"
            style={inputStyle}
          />

          <input
            value={provisioningApkChecksum}
            onChange={(event) => setProvisioningApkChecksum(event.target.value)}
            placeholder="SHA-256 del APK en Base64"
            style={inputStyle}
          />

          {selectedProvisioningDevice && (
            <div
              style={{
                padding: 10,
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--panel-soft)",
                color: "var(--text-soft)",
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
              style={buttonStyle}
            >
              Generar QR
            </button>
            <button
              type="button"
              onClick={handleCopyProvisioningJson}
              style={secondaryButtonStyle}
            >
              Copiar JSON
            </button>
          </div>
        </article>

        <article
          style={{
            display: "grid",
            gap: 12,
            justifyItems: "start",
            ...cardStyle,
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
            style={inputStyle}
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

      <section style={sectionGridStyle}>
        <article
          style={{
            display: "grid",
            gap: 12,
            ...cardStyle,
          }}
        >
          <h3 style={{ margin: 0 }}>Crear contrato de credito</h3>
          <form onSubmit={handleCreateCreditContract} style={{ display: "grid", gap: 10 }}>
            <select
              value={creditForm.deviceId}
              onChange={(event) => setCreditForm((value) => ({ ...value, deviceId: event.target.value }))}
              style={inputStyle}
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
              style={inputStyle}
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
              style={inputStyle}
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
              style={inputStyle}
            />
            <input
              type="date"
              value={creditForm.startDate}
              onChange={(event) => setCreditForm((value) => ({ ...value, startDate: event.target.value }))}
              style={inputStyle}
            />
            <textarea
              placeholder="Notas de contrato (opcional)"
              rows={3}
              value={creditForm.notes}
              onChange={(event) => setCreditForm((value) => ({ ...value, notes: event.target.value }))}
              style={inputStyle}
            />
            <button
              type="submit"
              disabled={isSavingCreditContract}
              style={{
                width: "fit-content",
                ...buttonStyle,
                cursor: isSavingCreditContract ? "not-allowed" : "pointer",
              }}
            >
              {isSavingCreditContract ? "Guardando..." : "Crear contrato"}
            </button>
          </form>
        </article>

        <article
          style={{
            display: "grid",
            gap: 12,
            ...cardStyle,
          }}
        >
          <h3 style={{ margin: 0 }}>Gestion de cuotas</h3>
          <select
            value={selectedCreditDeviceId}
            onChange={(event) => setSelectedCreditDeviceId(event.target.value)}
            style={inputStyle}
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

      <section
        style={{
          ...cardStyle,
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>Centro de gestion</h3>
          <p style={{ margin: 0, color: "var(--text-soft)" }}>
            Selecciona un modulo para trabajar con mas espacio.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { key: "customers", label: "Clientes" },
            { key: "devices", label: "Dispositivos" },
            { key: "payments", label: "Pagos" },
            { key: "finance", label: "Finanzas" },
          ].map((entry) => {
            const isActive = activeSummarySection === entry.key;
            return (
              <button
                key={entry.key}
                type="button"
                onClick={() => setActiveSummarySection(entry.key)}
                style={{
                  minWidth: 188,
                  minHeight: 52,
                  padding: "12px 18px",
                  borderRadius: 14,
                  border: isActive ? "1px solid #0f4cbb" : "1px solid rgba(148, 163, 184, 0.55)",
                  background: isActive
                    ? "linear-gradient(135deg, #1e40af 0%, #0ea5e9 100%)"
                    : "linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(241, 245, 249, 0.92))",
                  color: isActive ? "#f8fafc" : "var(--text-main)",
                  fontWeight: isActive ? 700 : 600,
                  cursor: "pointer",
                  boxShadow: isActive
                    ? "0 12px 26px rgba(30, 64, 175, 0.34), inset 0 1px 0 rgba(255,255,255,0.32)"
                    : "inset 0 1px 0 rgba(255, 255, 255, 0.6)",
                  transform: isActive ? "translateY(-1px)" : "none",
                  transition: "all 0.18s ease",
                }}
              >
                {entry.label}
              </button>
            );
          })}
        </div>
      </section>

      {activeSummarySection === "customers" && (
        <section style={{ display: "grid", gap: 16 }}>
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
        </section>
      )}

      {activeSummarySection === "devices" && (
        <section style={{ display: "grid", gap: 16 }}>
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
            customerFilter={deviceCustomerFilter}
            onCustomerFilterChange={setDeviceCustomerFilter}
            customerOptions={deviceCustomerOptions}
            searchValue={devicePanelQuery}
            onSearchChange={setDevicePanelQuery}
            devicePaymentSignalMap={devicePaymentSignalMap}
          />
        </section>
      )}

      {activeSummarySection === "payments" && (
        <section style={{ display: "grid", gap: 16 }}>
          <div style={{ ...cardStyle, display: "grid", gap: 10 }}>
            <h3 style={{ margin: 0 }}>Busqueda de pagos</h3>
            <input
              value={paymentPanelQuery}
              onChange={(event) => setPaymentPanelQuery(event.target.value)}
              placeholder="Buscar por cliente, equipo, codigo o monto"
              style={filterInputStyle}
            />
          </div>
          <PaymentsList
            payments={sortedPayments}
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
        </section>
      )}

      {activeSummarySection === "finance" && (
        <section style={{ display: "grid", gap: 16 }}>
          <FinancePanel payments={sortedPayments} />
        </section>
      )}
    </main>
  );
}
