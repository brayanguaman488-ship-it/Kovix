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
  imei2: "",
  hexnodeDeviceId: "",
  notes: "",
};

const initialCreditForm = {
  deviceId: "",
  purchaseDate: "",
  principalAmount: "",
  downPaymentAmount: "",
  installmentCount: "",
  cutOffDate: "",
  notes: "",
};

const PAGE_SIZE = 6;
const DEVICE_OWNER_COMPONENT_NAME = "com.kovix.client/.admin.KovixDeviceAdminReceiver";
const DEVICE_OWNER_PACKAGE_NAME = "com.kovix.client";
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
const dashboardFrameStyle = {
  minHeight: "100vh",
  display: "grid",
  gridTemplateColumns: "290px minmax(0, 1fr)",
  background: "#f4f6f8",
};
const sidebarStyle = {
  background: "radial-gradient(circle at top left, #1f4f93, #0b1220 48%, #05070d 100%)",
  color: "#ffffff",
  padding: "26px 18px",
  display: "grid",
  alignContent: "start",
  gap: 18,
  borderRight: "1px solid rgba(255,255,255,0.08)",
};
const sidebarBrandStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "2px 8px",
};
const sidebarNavButton = (active) => ({
  width: "100%",
  borderRadius: 16,
  border: active ? "1px solid rgba(255,255,255,0.26)" : "1px solid transparent",
  background: active ? "rgba(255,255,255,0.14)" : "transparent",
  color: active ? "#ffffff" : "rgba(255,255,255,0.82)",
  padding: "12px 14px",
  textAlign: "left",
  fontWeight: active ? 700 : 500,
  fontSize: 17,
  cursor: "pointer",
  transition: "all 0.18s ease",
});

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
  signatureChecksum,
  baseUrl,
  installCode,
  clientSecret,
}) {
  const payload = {
    "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME": DEVICE_OWNER_COMPONENT_NAME,
    "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_NAME": DEVICE_OWNER_PACKAGE_NAME,
    "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION": apkUrl,
    "android.app.extra.PROVISIONING_SKIP_ENCRYPTION": true,
    "android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED": true,
    "android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE": {
      baseUrl,
      installCode,
      clientSecret,
    },
  };

  if (signatureChecksum) {
    payload["android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM"] = signatureChecksum;
  } else {
    payload["android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_CHECKSUM"] = apkChecksum;
  }

  return payload;
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

function buildHexnodeDiagnosticsMessage(details) {
  if (!details || typeof details !== "object") {
    return "";
  }

  const localCode = String(details?.local?.installCode || "").trim();
  const localImei1 = String(details?.local?.imei || "").trim();
  const localImei2 = String(details?.local?.imei2 || "").trim();
  const topCandidate = Array.isArray(details?.suggestedCandidates) ? details.suggestedCandidates[0] : null;

  const parts = [];
  if (localCode) {
    parts.push(`Codigo local: ${localCode}`);
  }
  if (localImei1) {
    parts.push(`IMEI1: ${localImei1}`);
  }
  if (localImei2) {
    parts.push(`IMEI2: ${localImei2}`);
  }
  if (topCandidate?.id) {
    parts.push(`Sugerido Hexnode ID: ${topCandidate.id}`);
  }

  return parts.join(" | ");
}

function buildCreditInstallmentPreview(form) {
  const principalAmount = Number(form?.principalAmount || 0);
  const downPaymentAmount = Number(form?.downPaymentAmount || 0);
  const installmentCount = Number(form?.installmentCount || 0);
  const cutOffDate = String(form?.cutOffDate || "");

  if (
    !Number.isFinite(principalAmount) ||
    principalAmount <= 0 ||
    !Number.isFinite(downPaymentAmount) ||
    downPaymentAmount < 0 ||
    downPaymentAmount >= principalAmount ||
    !Number.isInteger(installmentCount) ||
    installmentCount <= 0 ||
    !cutOffDate
  ) {
    return null;
  }

  const start = new Date(`${cutOffDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) {
    return null;
  }

  const financedAmountRaw = principalAmount - downPaymentAmount;
  const financedAmount = Number(financedAmountRaw.toFixed(2));
  const baseInstallment = Number((financedAmount / installmentCount).toFixed(2));
  let allocated = 0;
  const installments = [];

  for (let index = 0; index < installmentCount; index += 1) {
    const dueDate = new Date(start);
    dueDate.setMonth(start.getMonth() + index);

    const isLast = index === installmentCount - 1;
    const amount = isLast ? Number((financedAmount - allocated).toFixed(2)) : baseInstallment;
    allocated = Number((allocated + amount).toFixed(2));

    installments.push({
      sequence: index + 1,
      dueDate,
      amount,
    });
  }

  return {
    financedAmount,
    installments,
  };
}

export default function Dashboard() {
  const router = useRouter();
  const hasHydratedQueryRef = useRef(false);
  const advancedToolsRef = useRef(null);
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
  const [clearingManualStatusDeviceId, setClearingManualStatusDeviceId] = useState("");
  const [updatingDeviceIdentityId, setUpdatingDeviceIdentityId] = useState("");
  const [rotatingSecretDeviceId, setRotatingSecretDeviceId] = useState("");
  const [linkingHexnodeDeviceId, setLinkingHexnodeDeviceId] = useState("");
  const [isLinkingAllHexnodeDevices, setIsLinkingAllHexnodeDevices] = useState(false);
  const [markingPaymentId, setMarkingPaymentId] = useState("");
  const [processingInstallmentId, setProcessingInstallmentId] = useState("");
  const [isApprovingAllReported, setIsApprovingAllReported] = useState(false);
  const [deletingCustomerId, setDeletingCustomerId] = useState("");
  const [deletingDeviceId, setDeletingDeviceId] = useState("");
  const [deletingPaymentId, setDeletingPaymentId] = useState("");
  const [selectedCreditDeviceId, setSelectedCreditDeviceId] = useState("");
  const [selectedCreditContract, setSelectedCreditContract] = useState(null);
  const [isLoadingCreditContract, setIsLoadingCreditContract] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [deviceQuery, setDeviceQuery] = useState("");
  const [paymentQuery, setPaymentQuery] = useState("");
  const [customerSort, setCustomerSort] = useState("name_asc");
  const [customerSegment, setCustomerSegment] = useState("all");
  const [deviceSort, setDeviceSort] = useState("updated_desc");
  const [paymentSort, setPaymentSort] = useState("due_asc");
  const [customerPage, setCustomerPage] = useState(1);
  const [devicePage, setDevicePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [deviceSegment, setDeviceSegment] = useState("all");
  const [deviceCustomerFilter, setDeviceCustomerFilter] = useState("all");
  const [provisioningDeviceId, setProvisioningDeviceId] = useState("");
  const [provisioningBaseUrl, setProvisioningBaseUrl] = useState("https://api.kovixec.com");
  const [provisioningApkUrl, setProvisioningApkUrl] = useState("");
  const [provisioningApkChecksum, setProvisioningApkChecksum] = useState("");
  const [provisioningSignatureChecksum, setProvisioningSignatureChecksum] = useState("");
  const [provisioningQrJson, setProvisioningQrJson] = useState("");
  const [provisioningQrUrl, setProvisioningQrUrl] = useState("");
  const [provisioningMode, setProvisioningMode] = useState("device_owner");
  const [hexnodeProvisioning, setHexnodeProvisioning] = useState(null);
  const [activeSummarySection, setActiveSummarySection] = useState("customers");
  const [activeMainView, setActiveMainView] = useState("control");
  const [isControlNavExpanded, setIsControlNavExpanded] = useState(true);
  const [isControlCenterExpanded, setIsControlCenterExpanded] = useState(true);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [renewalCustomerQuery, setRenewalCustomerQuery] = useState("");
  const [renewalSelectedCustomerId, setRenewalSelectedCustomerId] = useState("");
  const [renewalDeviceForm, setRenewalDeviceForm] = useState(initialDeviceForm);
  const [renewalCreditForm, setRenewalCreditForm] = useState(initialCreditForm);
  const [isSavingRenewalDevice, setIsSavingRenewalDevice] = useState(false);
  const [isSavingRenewalCreditContract, setIsSavingRenewalCreditContract] = useState(false);
  const [contractsCustomerQuery, setContractsCustomerQuery] = useState("");
  const [contractsCustomerId, setContractsCustomerId] = useState("");
  const [contractsAssets, setContractsAssets] = useState([]);
  const [contractsImagePreviewMap, setContractsImagePreviewMap] = useState({});
  const [isLoadingContractsAssets, setIsLoadingContractsAssets] = useState(false);
  const [isUploadingContractDoc, setIsUploadingContractDoc] = useState(false);
  const [isUploadingClientPhoto, setIsUploadingClientPhoto] = useState(false);
  const [pendingContractFile, setPendingContractFile] = useState(null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState(null);
  const [contractsOptionsAssetId, setContractsOptionsAssetId] = useState("");
  const [updatingContractAssetId, setUpdatingContractAssetId] = useState("");
  const [deletingContractAssetId, setDeletingContractAssetId] = useState("");

  function setStatus(type, message) {
    setStatusState({ type, message });
  }

  function updateDeviceInState(updatedDevice) {
    if (!updatedDevice?.id) {
      return;
    }

    setDevices((prev) =>
      prev.map((entry) => (entry.id === updatedDevice.id ? { ...entry, ...updatedDevice } : entry))
    );
  }

  function updatePaymentInState(updatedPayment) {
    if (!updatedPayment?.id) {
      return;
    }

    setPayments((prev) =>
      prev.map((entry) => (entry.id === updatedPayment.id ? { ...entry, ...updatedPayment } : entry))
    );
  }

  async function loadHexnodeProvisioningQr(options = { silent: false }) {
    try {
      const response = await api.getHexnodeProvisioningQr();
      setHexnodeProvisioning(response?.provisioning || null);

      if (!options.silent && response?.provisioning?.configured) {
        setStatus("success", "QR de Hexnode cargado");
      }
    } catch (error) {
      setHexnodeProvisioning(null);
      if (!options.silent) {
        setStatus("error", error.message || "No se pudo cargar el QR de Hexnode");
      }
    }
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

  function openControlSection(sectionKey) {
    setActiveMainView("control");
    setIsControlNavExpanded(true);
    setIsControlCenterExpanded(true);
    if (sectionKey) {
      setActiveSummarySection(sectionKey);
    }
  }

  function handleOpenAdvancedTools() {
    setIsAdvancedOpen(true);
    requestAnimationFrame(() => {
      advancedToolsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        const parts = result.split(",");
        resolve(parts.length > 1 ? parts[1] : "");
      };
      reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
      reader.readAsDataURL(file);
    });
  }

  async function loadCustomerAssets(customerId) {
    const normalizedCustomerId = String(customerId || "").trim();
    if (!normalizedCustomerId) {
      setContractsAssets([]);
      return;
    }

    try {
      setIsLoadingContractsAssets(true);
      const response = await api.getCustomerAssets(normalizedCustomerId);
      const assets = response?.assets || [];
      setContractsAssets(assets);

      const imageAssets = assets.filter((asset) => String(asset.mimeType || "").startsWith("image/"));
      const previewEntries = await Promise.all(
        imageAssets.map(async (asset) => {
          const blob = await api.getCustomerAssetContent(asset.id, "inline");
          return [asset.id, URL.createObjectURL(blob)];
        })
      );

      setContractsImagePreviewMap((prev) => {
        Object.values(prev).forEach((url) => URL.revokeObjectURL(url));
        return Object.fromEntries(previewEntries);
      });
    } catch (error) {
      setContractsAssets([]);
      setStatus("error", error.message || "No se pudieron cargar los archivos del cliente");
    } finally {
      setIsLoadingContractsAssets(false);
    }
  }

  async function handleUploadCustomerAsset(file, category) {
    const activeCustomerId = String(contractsCustomerId || "").trim();
    if (!activeCustomerId) {
      setStatus("error", "Selecciona un cliente para subir archivos");
      return;
    }

    if (!file) {
      return;
    }

    try {
      if (category === "CONTRACT") {
        setIsUploadingContractDoc(true);
      } else {
        setIsUploadingClientPhoto(true);
      }

      const base64Data = await fileToBase64(file);
      await api.uploadCustomerAsset({
        customerId: activeCustomerId,
        category,
        fileName: file.name,
        mimeType: file.type,
        base64Data,
      });

      setStatus("success", category === "CONTRACT" ? "Contrato subido correctamente" : "Foto del cliente subida");
      await loadCustomerAssets(activeCustomerId);
    } catch (error) {
      setStatus("error", error.message || "No se pudo subir el archivo");
    } finally {
      setIsUploadingContractDoc(false);
      setIsUploadingClientPhoto(false);
    }
  }

  async function handleConfirmUploadCustomerAsset(category) {
    const targetFile = category === "CONTRACT" ? pendingContractFile : pendingPhotoFile;
    if (!targetFile) {
      setStatus("error", "Primero selecciona un archivo");
      return;
    }

    const confirmed = window.confirm(`Confirmar subida de archivo "${targetFile.name}"?`);
    if (!confirmed) {
      return;
    }

    await handleUploadCustomerAsset(targetFile, category);
    if (category === "CONTRACT") {
      setPendingContractFile(null);
    } else {
      setPendingPhotoFile(null);
    }
  }

  async function handleReplaceCustomerAsset(asset, file) {
    if (!asset?.id || !file) {
      return;
    }

    const confirmed = window.confirm(`Reemplazar archivo "${asset.fileName}" por "${file.name}"?`);
    if (!confirmed) {
      return;
    }

    try {
      setUpdatingContractAssetId(String(asset.id));
      const base64Data = await fileToBase64(file);
      await api.updateCustomerAsset(asset.id, {
        fileName: file.name,
        mimeType: file.type,
        base64Data,
      });
      setStatus("success", "Archivo actualizado correctamente");
      await loadCustomerAssets(contractsCustomerId);
    } catch (error) {
      setStatus("error", error.message || "No se pudo actualizar el archivo");
    } finally {
      setUpdatingContractAssetId("");
    }
  }

  async function handleDeleteCustomerAsset(asset) {
    if (!asset?.id) {
      return;
    }

    const confirmed = window.confirm(`Eliminar archivo "${asset.fileName}"?`);
    if (!confirmed) {
      return;
    }

    try {
      setDeletingContractAssetId(String(asset.id));
      await api.deleteCustomerAsset(asset.id);
      setStatus("success", "Archivo eliminado");
      await loadCustomerAssets(contractsCustomerId);
    } catch (error) {
      setStatus("error", error.message || "No se pudo eliminar el archivo");
    } finally {
      setDeletingContractAssetId("");
      setContractsOptionsAssetId("");
    }
  }

  async function handleDownloadAsset(assetId, fileName) {
    try {
      const blob = await api.getCustomerAssetContent(assetId, "attachment");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName || "archivo";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setStatus("success", "Descarga iniciada");
    } catch (error) {
      setStatus("error", error.message || "No se pudo descargar el archivo");
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
    loadHexnodeProvisioningQr({ silent: true });
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
      const response = await api.createCustomer({
        ...customerForm,
        fullName,
        nationalId,
        phone,
      });
      const createdCustomerId = String(response?.customer?.id || "").trim();
      setCustomerForm(initialCustomerForm);
      if (createdCustomerId) {
        setDeviceForm((value) => ({ ...value, customerId: createdCustomerId }));
      }
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
    const imei2 = String(deviceForm.imei2 || "").trim();
    const rawHexnodeId = String(deviceForm.hexnodeDeviceId || "").trim();

    if (!customerId || !brand || !model || !imei) {
      setStatus("error", "Dispositivo: customerId, brand, model e imei son obligatorios");
      return;
    }

    if (rawHexnodeId && !/^\d+$/.test(rawHexnodeId)) {
      setStatus("error", "Dispositivo: Hexnode Device ID debe ser numerico");
      return;
    }

    try {
      setIsSavingDevice(true);
      const response = await api.createDevice({
        ...deviceForm,
        customerId,
        brand,
        model,
        imei,
        imei2: imei2 || undefined,
        hexnodeDeviceId: rawHexnodeId || undefined,
      });
      const createdId = String(response?.device?.id || "").trim();
      const createdCustomerId = String(response?.device?.customerId || customerId).trim();
      setDeviceForm(initialDeviceForm);
      if (createdId) {
        setSelectedCreditDeviceId(createdId);
        setProvisioningDeviceId(createdId);
        setCreditForm((value) => ({ ...value, deviceId: createdId }));
      }
      if (createdCustomerId) {
        setDeviceForm((value) => ({ ...value, customerId: createdCustomerId }));
      }
      const createdCode = String(response?.device?.installCode || "").trim();
      const createdSecret = String(response?.device?.clientSecret || "").trim();
      const autoLinkedHexnodeId = response?.hexnode?.linked ? response?.hexnode?.hexnodeDeviceId : null;
      setStatus(
        "success",
        createdCode
          ? `Dispositivo creado. Codigo: ${createdCode}${createdSecret ? ` | Secreto cliente: ${createdSecret}` : ""}${autoLinkedHexnodeId ? ` | Hexnode auto-vinculado: ${autoLinkedHexnodeId}` : ""}`
          : `Dispositivo creado correctamente${autoLinkedHexnodeId ? ` | Hexnode auto-vinculado: ${autoLinkedHexnodeId}` : ""}`
      );
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
    const purchaseDate = creditForm.purchaseDate;
    const principalAmount = Number(creditForm.principalAmount);
    const downPaymentAmount = creditForm.downPaymentAmount ? Number(creditForm.downPaymentAmount) : 0;
    const installmentCount = Number(creditForm.installmentCount);
    const startDate = creditForm.cutOffDate;

    if (!deviceId || !purchaseDate || !creditForm.principalAmount || !creditForm.installmentCount || !startDate) {
      setStatus("error", "Credito: deviceId, purchaseDate, principalAmount, installmentCount y cutOffDate son obligatorios");
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
      const response = await api.createCreditContract({
        ...creditForm,
        deviceId,
        purchaseDate,
        principalAmount,
        downPaymentAmount,
        installmentCount,
        startDate,
      });
      const autoLinkedHexnodeId = response?.hexnode?.linked ? response?.hexnode?.hexnodeDeviceId : null;
      setStatus(
        "success",
        autoLinkedHexnodeId
          ? `Contrato de credito creado correctamente | Hexnode auto-vinculado: ${autoLinkedHexnodeId}`
          : "Contrato de credito creado correctamente"
      );
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

  function handleClearCreditNewDraft() {
    setCreditForm(initialCreditForm);
    setSelectedCreditDeviceId("");
    setSelectedCreditContract(null);
    setStatus("info", "Formulario de credito limpio. No se guardo nada.");
  }

  async function handleCreateRenewalDevice(event) {
    event.preventDefault();
    const customerId = renewalSelectedCustomerId.trim();
    const brand = renewalDeviceForm.brand.trim();
    const model = renewalDeviceForm.model.trim();
    const imei = renewalDeviceForm.imei.trim();
    const imei2 = String(renewalDeviceForm.imei2 || "").trim();
    const rawHexnodeId = String(renewalDeviceForm.hexnodeDeviceId || "").trim();

    if (!customerId) {
      setStatus("error", "Renovacion: selecciona un cliente primero");
      return;
    }

    if (!brand || !model || !imei) {
      setStatus("error", "Renovacion dispositivo: brand, model e imei son obligatorios");
      return;
    }

    if (rawHexnodeId && !/^\d+$/.test(rawHexnodeId)) {
      setStatus("error", "Renovacion dispositivo: Hexnode Device ID debe ser numerico");
      return;
    }

    try {
      setIsSavingRenewalDevice(true);
      const response = await api.createDevice({
        ...renewalDeviceForm,
        customerId,
        brand,
        model,
        imei,
        imei2: imei2 || undefined,
        hexnodeDeviceId: rawHexnodeId || undefined,
      });

      const createdId = String(response?.device?.id || "").trim();
      setRenewalDeviceForm((value) => ({ ...initialDeviceForm, customerId: renewalSelectedCustomerId }));
      if (createdId) {
        setRenewalCreditForm((value) => ({ ...value, deviceId: createdId }));
        setSelectedCreditDeviceId(createdId);
      }
      setStatus("success", "Renovacion: dispositivo creado correctamente");
      await loadDashboard({ silent: true });
    } catch (error) {
      setStatus("error", error.message || "No se pudo crear el dispositivo de renovacion");
    } finally {
      setIsSavingRenewalDevice(false);
    }
  }

  async function handleCreateRenewalCreditContract(event) {
    event.preventDefault();
    const deviceId = renewalCreditForm.deviceId.trim();
    const purchaseDate = renewalCreditForm.purchaseDate;
    const principalAmount = Number(renewalCreditForm.principalAmount);
    const downPaymentAmount = renewalCreditForm.downPaymentAmount ? Number(renewalCreditForm.downPaymentAmount) : 0;
    const installmentCount = Number(renewalCreditForm.installmentCount);
    const startDate = renewalCreditForm.cutOffDate;

    if (!deviceId || !purchaseDate || !renewalCreditForm.principalAmount || !renewalCreditForm.installmentCount || !startDate) {
      setStatus("error", "Renovacion credito: deviceId, purchaseDate, principalAmount, installmentCount y cutOffDate son obligatorios");
      return;
    }

    if (!Number.isFinite(principalAmount) || principalAmount <= 0) {
      setStatus("error", "Renovacion credito: principalAmount debe ser mayor que 0");
      return;
    }

    if (!Number.isFinite(downPaymentAmount) || downPaymentAmount < 0) {
      setStatus("error", "Renovacion credito: downPaymentAmount debe ser mayor o igual que 0");
      return;
    }

    if (downPaymentAmount >= principalAmount) {
      setStatus("error", "Renovacion credito: la entrada debe ser menor que el monto total");
      return;
    }

    if (!Number.isInteger(installmentCount) || installmentCount <= 0) {
      setStatus("error", "Renovacion credito: installmentCount debe ser entero mayor que 0");
      return;
    }

    try {
      setIsSavingRenewalCreditContract(true);
      await api.createCreditContract({
        ...renewalCreditForm,
        deviceId,
        purchaseDate,
        principalAmount,
        downPaymentAmount,
        installmentCount,
        startDate,
      });
      setStatus("success", "Renovacion: contrato de credito creado correctamente");
      setSelectedCreditDeviceId(deviceId);
      setRenewalCreditForm(initialCreditForm);
      await loadDashboard({ silent: true });
      await loadCreditContract(deviceId);
    } catch (error) {
      setStatus("error", error.message || "No se pudo crear el contrato de renovacion");
    } finally {
      setIsSavingRenewalCreditContract(false);
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
      const response = await api.updateDeviceStatus(normalizedDeviceId, {
        status,
        reason: "Cambio manual desde dashboard",
      });
      updateDeviceInState(response?.device);
      setStatus(
        "success",
        `Estado actualizado: ${targetDevice ? `${targetDevice.brand} ${targetDevice.model}` : normalizedDeviceId} -> ${status}`
      );
      loadDashboard({ silent: true });
    } catch (error) {
      setStatus("error", error.message || "No se pudo actualizar el estado");
    } finally {
      setUpdatingDeviceId("");
    }
  }

  async function handleUpdateDeviceIdentity(deviceId, payload) {
    try {
      setUpdatingDeviceIdentityId(String(deviceId));
      const response = await api.updateDevice(deviceId, payload);
      updateDeviceInState(response?.device);
      setStatus("success", "IMEI del dispositivo actualizado");
      loadDashboard({ silent: true });
    } catch (error) {
      setStatus("error", error.message || "No se pudo actualizar el IMEI del dispositivo");
    } finally {
      setUpdatingDeviceIdentityId("");
    }
  }

  async function handleClearManualStatus(deviceId) {
    try {
      setClearingManualStatusDeviceId(String(deviceId));
      const response = await api.clearManualDeviceStatus(deviceId);
      updateDeviceInState(response?.device);
      setStatus("success", "Modo automatico activado para el dispositivo");
      loadDashboard({ silent: true });
    } catch (error) {
      setStatus("error", error.message || "No se pudo activar el modo automatico");
    } finally {
      setClearingManualStatusDeviceId("");
    }
  }

  async function handleMarkPaid(paymentId) {
    try {
      setMarkingPaymentId(paymentId);
      const response = await api.markPaymentPaid(paymentId);
      updatePaymentInState(response?.payment);
      setStatus("success", "Pago marcado como pagado");
      loadDashboard({ silent: true });
    } catch (error) {
      setStatus("error", error.message || "No se pudo marcar el pago");
    } finally {
      setMarkingPaymentId("");
    }
  }

  async function handleRotateSecret(deviceId) {
    try {
      setRotatingSecretDeviceId(deviceId);
      const response = await api.rotateDeviceSecret(deviceId);
      updateDeviceInState(response?.device);
      setStatus("success", "ClientSecret rotado correctamente");
      loadDashboard({ silent: true });
    } catch (error) {
      setStatus("error", error.message || "No se pudo rotar el clientSecret");
    } finally {
      setRotatingSecretDeviceId("");
    }
  }

  async function handleToggleHexnodeDeviceLink(device) {
    try {
      const deviceId = String(device?.id || "");
      if (!deviceId) {
        return;
      }

      setLinkingHexnodeDeviceId(deviceId);
      if (device?.hexnodeDeviceId) {
        const response = await api.unlinkDeviceHexnode(deviceId);
        updateDeviceInState(response?.device);
        setStatus("success", "Dispositivo desvinculado de Hexnode");
      } else {
        const response = await api.linkDeviceHexnode(deviceId);
        updateDeviceInState(response?.device);
        const hexnodeId = response?.hexnode?.hexnodeDeviceId;
        setStatus(
          "success",
          hexnodeId
            ? `Dispositivo vinculado con Hexnode ID ${hexnodeId}`
            : "Dispositivo vinculado con Hexnode"
        );
      }
      loadDashboard({ silent: true });
    } catch (error) {
      const diagnostics = buildHexnodeDiagnosticsMessage(error?.details);
      setStatus(
        "error",
        diagnostics
          ? `${error.message || "No se pudo actualizar la vinculacion con Hexnode"} | ${diagnostics}`
          : (error.message || "No se pudo actualizar la vinculacion con Hexnode")
      );
    } finally {
      setLinkingHexnodeDeviceId("");
    }
  }

  async function handleLinkAllHexnodeDevices() {
    try {
      setIsLinkingAllHexnodeDevices(true);
      const response = await api.linkAllDevicesHexnode();
      const linkedCount = Number(response?.linkedCount || 0);
      const totalPending = Number(response?.totalPending || 0);
      setStatus("success", `Vinculacion completada: ${linkedCount}/${totalPending} dispositivos vinculados`);
      loadDashboard({ silent: true });
    } catch (error) {
      setStatus("error", error.message || "No se pudo ejecutar la vinculacion masiva");
    } finally {
      setIsLinkingAllHexnodeDevices(false);
    }
  }

  async function handleMarkOverdue(paymentId) {
    try {
      setMarkingPaymentId(paymentId);
      const response = await api.markPaymentOverdue(paymentId);
      updatePaymentInState(response?.payment);
      setStatus("success", "Pago marcado como vencido");
      loadDashboard({ silent: true });
    } catch (error) {
      setStatus("error", error.message || "No se pudo marcar el pago como vencido");
    } finally {
      setMarkingPaymentId("");
    }
  }

  async function handleMarkPending(paymentId) {
    try {
      setMarkingPaymentId(paymentId);
      const response = await api.markPaymentPending(paymentId);
      updatePaymentInState(response?.payment);
      setStatus("success", "Pago marcado como pendiente");
      loadDashboard({ silent: true });
    } catch (error) {
      setStatus("error", error.message || "No se pudo marcar el pago como pendiente");
    } finally {
      setMarkingPaymentId("");
    }
  }

  async function handleDeleteCustomer(customer) {
    const confirmed = window.confirm(
      `Enviar cliente "${customer?.fullName || ""}" a papelera?\nSe purgara automaticamente en 30 dias.`
    );

    if (!confirmed || !customer?.id) {
      return;
    }

    try {
      setDeletingCustomerId(customer.id);
      await api.deleteCustomer(customer.id);
      setCustomers((prev) => prev.filter((entry) => entry.id !== customer.id));
      setDevices((prev) => prev.filter((entry) => entry.customerId !== customer.id));
      setPayments((prev) => prev.filter((entry) => entry.customerId !== customer.id));
      setStatus("success", "Cliente enviado a papelera");
    } catch (error) {
      setStatus("error", error.message || "No se pudo eliminar el cliente");
    } finally {
      setDeletingCustomerId("");
    }
  }

  async function handleDeleteDevice(device) {
    const title = `${device?.brand || ""} ${device?.model || ""}`.trim();
    const confirmed = window.confirm(
      `Enviar dispositivo "${title}" a papelera?\nSe purgara automaticamente en 30 dias.`
    );

    if (!confirmed || !device?.id) {
      return;
    }

    try {
      setDeletingDeviceId(device.id);
      await api.deleteDevice(device.id);
      setDevices((prev) => prev.filter((entry) => entry.id !== device.id));
      setPayments((prev) => prev.filter((entry) => entry.deviceId !== device.id));
      setStatus("success", "Dispositivo enviado a papelera");
    } catch (error) {
      setStatus("error", error.message || "No se pudo eliminar el dispositivo");
    } finally {
      setDeletingDeviceId("");
    }
  }

  async function handleDeletePayment(payment) {
    const confirmed = window.confirm(
      `Enviar este pago de ${payment?.customer?.fullName || "cliente"} a papelera?\nSe purgara automaticamente en 30 dias.`
    );

    if (!confirmed || !payment?.id) {
      return;
    }

    try {
      setDeletingPaymentId(payment.id);
      await api.deletePayment(payment.id);
      setPayments((prev) => prev.filter((entry) => entry.id !== payment.id));
      setStatus("success", "Pago enviado a papelera");
    } catch (error) {
      setStatus("error", error.message || "No se pudo eliminar el pago");
    } finally {
      setDeletingPaymentId("");
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
    if (provisioningMode === "hexnode") {
      if (!hexnodeProvisioning?.configured || !hexnodeProvisioning?.qrUrl) {
        setStatus(
          "error",
          "Configura HEXNODE_ENROLLMENT_QR_IMAGE_URL o HEXNODE_ENROLLMENT_QR_VALUE en backend"
        );
        return;
      }

      const payload = {
        source: "hexnode",
        configured: true,
        portalUrl: hexnodeProvisioning.portalUrl || "",
        qrUrl: hexnodeProvisioning.qrUrl,
        qrValue: hexnodeProvisioning.qrValue || "",
      };

      setProvisioningQrJson(JSON.stringify(payload, null, 2));
      setProvisioningQrUrl(hexnodeProvisioning.qrUrl);
      setStatus("success", "QR de Hexnode generado");
      return;
    }

    const selectedDevice = devices.find((entry) => entry.id === provisioningDeviceId);

    if (!selectedDevice) {
      setStatus("error", "Selecciona un dispositivo para generar el QR");
      return;
    }

    const apkUrl = provisioningApkUrl.trim();
    const apkChecksumInput = provisioningApkChecksum.trim();
    const signatureChecksumInput = provisioningSignatureChecksum.trim();
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

    let normalizedSignatureChecksum = "";
    if (signatureChecksumInput) {
      const normalized = normalizeProvisioningChecksum(signatureChecksumInput);
      if (!normalized.ok) {
        setStatus(
          "error",
          "Firma invalida: usa SHA-256 del certificado de firma en Base64 o en HEX de 64 caracteres"
        );
        return;
      }
      normalizedSignatureChecksum = normalized.value;
    }

    if (!installCode || !clientSecret) {
      setStatus("error", "El dispositivo no tiene installCode/clientSecret disponible");
      return;
    }

    const payload = buildProvisioningPayload({
      apkUrl,
      apkChecksum: normalizedChecksum.value,
      signatureChecksum: normalizedSignatureChecksum,
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

  const filteredCustomers = customers.filter((customer) => {
    if (!normalizedCustomerQuery) {
      return true;
    }

    return [customer.fullName, customer.nationalId, customer.phone]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedCustomerQuery));
  });

  const baseFilteredDevices = devices.filter((device) => {
    const matchesCustomer =
      deviceCustomerFilter === "all" || String(device.customer?.id || "") === deviceCustomerFilter;

    if (!matchesCustomer) {
      return false;
    }

    const searchTerms = [normalizedDeviceQuery].filter(Boolean);
    if (searchTerms.length === 0) {
      return true;
    }

    const haystack = [
      device.brand,
      device.model,
      device.imei,
      device.imei2,
      device.installCode,
      device.currentStatus,
      device.customer?.fullName,
      device.customer?.nationalId,
      device.customer?.phone,
    ]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase())
      .join(" ");

    return searchTerms.every((term) => haystack.includes(term));
  });

  function getDeviceSegmentKey(device) {
    const status = String(device?.currentStatus || "").toUpperCase();
    if (status === "BLOQUEADO") {
      return "blocked";
    }
    if (status === "SOLO_LLAMADAS") {
      return "calls_only";
    }
    if (status === "ACTIVO" || status === "PAGO_PENDIENTE") {
      return "active_pending";
    }
    return "all";
  }

  const deviceSegmentCounts = {
    all: baseFilteredDevices.length,
    blocked: baseFilteredDevices.filter((device) => getDeviceSegmentKey(device) === "blocked").length,
    calls_only: baseFilteredDevices.filter((device) => getDeviceSegmentKey(device) === "calls_only").length,
    active_pending: baseFilteredDevices.filter((device) => getDeviceSegmentKey(device) === "active_pending").length,
  };

  const filteredDevices = baseFilteredDevices.filter((device) => {
    if (deviceSegment === "all") {
      return true;
    }
    return getDeviceSegmentKey(device) === deviceSegment;
  });

  const filteredPayments = payments.filter((payment) => {
    const searchTerms = [normalizedPaymentQuery].filter(Boolean);
    if (searchTerms.length === 0) {
      return true;
    }

    const haystack = [
      payment.customer?.fullName,
      payment.customer?.nationalId,
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

  function getCustomerPortfolioState(customer) {
    const contracts = (customer?.devices || [])
      .map((device) => device.creditContract)
      .filter(Boolean);

    if (contracts.length === 0) {
      return "sin_contrato";
    }

    const hasDebt = contracts.some((contract) =>
      (contract?.installments || []).some(
        (installment) => installment.status !== "PAGADO" && installment.status !== "CANCELADO"
      )
    );

    return hasDebt ? "active" : "paid";
  }

  const customerSegmentCounts = {
    all: filteredCustomers.length,
    active: filteredCustomers.filter((customer) => getCustomerPortfolioState(customer) === "active").length,
    paid: filteredCustomers.filter((customer) => getCustomerPortfolioState(customer) === "paid").length,
  };

  const segmentedCustomers = filteredCustomers.filter((customer) => {
    if (customerSegment === "all") {
      return true;
    }
    return getCustomerPortfolioState(customer) === customerSegment;
  });

  const sortedCustomers = [...segmentedCustomers].sort((a, b) => {
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
  const latestCreatedDevice = [...devices].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  )[0] || null;
  const sortedDevicesByCustomer = [...devices].sort((a, b) => {
    const customerCompare = String(a.customer?.fullName || "").localeCompare(String(b.customer?.fullName || ""));
    if (customerCompare !== 0) {
      return customerCompare;
    }
    return String(a.installCode || "").localeCompare(String(b.installCode || ""));
  });
  const selectedCreditDevice = devices.find((entry) => entry.id === selectedCreditDeviceId) || null;
  const creditInstallmentPreview = buildCreditInstallmentPreview(creditForm);
  const renewalNormalizedQuery = renewalCustomerQuery.trim().toLowerCase();
  const renewalCustomerMatches = customers.filter((customer) => {
    if (!renewalNormalizedQuery) {
      return true;
    }
    return [customer.fullName, customer.nationalId, customer.phone]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(renewalNormalizedQuery));
  });
  const renewalSelectedCustomer =
    customers.find((customer) => String(customer.id) === String(renewalSelectedCustomerId)) || null;
  const renewalCustomerDevices = devices.filter(
    (device) => String(device.customer?.id || device.customerId || "") === String(renewalSelectedCustomerId || "")
  );
  const contractsNormalizedQuery = contractsCustomerQuery.trim().toLowerCase();
  const contractsCustomerMatches = customers.filter((customer) => {
    if (!contractsNormalizedQuery) {
      return true;
    }
    return [customer.fullName, customer.nationalId]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(contractsNormalizedQuery));
  });
  const contractsSelectedCustomer =
    customers.find((customer) => String(customer.id) === String(contractsCustomerId || "")) || null;
  const contractDocuments = contractsAssets.filter((asset) => String(asset.category || "").toUpperCase() === "CONTRACT");
  const customerPhotos = contractsAssets.filter((asset) => String(asset.category || "").toUpperCase() === "PHOTO");
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
    if (activeMainView === "credit_new") {
      setCustomerForm(initialCustomerForm);
      setDeviceForm(initialDeviceForm);
      setCreditForm(initialCreditForm);
      return;
    }

    if (activeMainView === "credit_renewal") {
      setRenewalCustomerQuery("");
      setRenewalSelectedCustomerId("");
      setRenewalDeviceForm(initialDeviceForm);
      setRenewalCreditForm(initialCreditForm);
      return;
    }

    if (activeMainView === "contracts") {
      setPendingContractFile(null);
      setPendingPhotoFile(null);
      setContractsOptionsAssetId("");
    }
  }, [activeMainView]);

  useEffect(() => {
    if (!renewalSelectedCustomerId) {
      setRenewalDeviceForm(initialDeviceForm);
      setRenewalCreditForm(initialCreditForm);
      return;
    }

    setRenewalDeviceForm((value) => ({
      ...value,
      customerId: renewalSelectedCustomerId,
    }));

    const firstDeviceId = renewalCustomerDevices[0]?.id ? String(renewalCustomerDevices[0].id) : "";
    setRenewalCreditForm((value) => ({
      ...value,
      deviceId: value.deviceId || firstDeviceId,
    }));
  }, [renewalSelectedCustomerId, renewalCustomerDevices]);

  useEffect(() => {
    loadCustomerAssets(contractsCustomerId).catch(() => {
      setContractsAssets([]);
    });
  }, [contractsCustomerId]);

  useEffect(() => () => {
    Object.values(contractsImagePreviewMap).forEach((url) => URL.revokeObjectURL(url));
  }, [contractsImagePreviewMap]);

  useEffect(() => {
    if (provisioningMode === "hexnode" && !hexnodeProvisioning) {
      loadHexnodeProvisioningQr({ silent: true });
    }
  }, [provisioningMode, hexnodeProvisioning]);

  useEffect(() => {
    if (activeMainView === "credit_new" && provisioningMode !== "hexnode") {
      setProvisioningMode("hexnode");
    }
  }, [activeMainView, provisioningMode]);

  useEffect(() => {
    setCustomerPage(1);
  }, [customerQuery, customerSort, customerSegment]);

  useEffect(() => {
    setDevicePage(1);
  }, [deviceQuery, deviceSort, deviceCustomerFilter, deviceSegment]);

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
      <div style={dashboardFrameStyle}>
        <aside style={sidebarStyle}>
          <div style={sidebarBrandStyle}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "linear-gradient(135deg, #1e40af 0%, #0ea5e9 100%)",
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
                fontSize: 22,
              }}
            >
              K
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 0.6 }}>KOVIX</div>
          </div>
        </aside>
        <main style={{ ...pageShellStyle, alignContent: "center", justifyItems: "start" }}>
          Cargando dashboard...
        </main>
      </div>
    );
  }

  return (
    <div style={dashboardFrameStyle}>
      <aside style={sidebarStyle}>
        <div style={sidebarBrandStyle}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "linear-gradient(135deg, #1e40af 0%, #0ea5e9 100%)",
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              fontSize: 22,
              boxShadow: "0 10px 20px rgba(30, 64, 175, 0.42)",
            }}
          >
            K
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 0.4 }}>KOVIX</div>
        </div>

        <nav style={{ display: "grid", gap: 8 }}>
          <button
            type="button"
            style={sidebarNavButton(activeMainView === "credit_new")}
            onClick={() => {
              setActiveMainView("credit_new");
              setIsAdvancedOpen(true);
            }}
          >
            Credito nuevo
          </button>
          <button
            type="button"
            style={sidebarNavButton(activeMainView === "credit_renewal")}
            onClick={() => {
              setActiveMainView("credit_renewal");
            }}
          >
            Renovacion de credito
          </button>
          <button
            type="button"
            style={sidebarNavButton(activeMainView === "control")}
            onClick={() => {
              if (activeMainView !== "control") {
                setActiveMainView("control");
                setIsControlNavExpanded(true);
                return;
              }
              setIsControlNavExpanded((value) => !value);
            }}
          >
            Centro de control {isControlNavExpanded ? "▾" : "▸"}
          </button>
          {activeMainView === "control" && isControlNavExpanded && (
            <>
              <button
                type="button"
                style={sidebarNavButton(activeMainView === "control" && activeSummarySection === "customers")}
                onClick={() => openControlSection("customers")}
              >
                Clientes
              </button>
              <button
                type="button"
                style={sidebarNavButton(activeMainView === "control" && activeSummarySection === "devices")}
                onClick={() => openControlSection("devices")}
              >
                Celulares
              </button>
              <button
                type="button"
                style={sidebarNavButton(activeMainView === "control" && activeSummarySection === "payments")}
                onClick={() => openControlSection("payments")}
              >
                Pagos
              </button>
            </>
          )}
          <button
            type="button"
            style={sidebarNavButton(activeMainView === "finance")}
            onClick={() => setActiveMainView("finance")}
          >
            Finanzas
          </button>
          <button
            type="button"
            style={sidebarNavButton(activeMainView === "contracts")}
            onClick={() => setActiveMainView("contracts")}
          >
            Contratos
          </button>
          <button
            type="button"
            style={sidebarNavButton(activeMainView === "trash")}
            onClick={() => setActiveMainView("trash")}
          >
            Papelera
          </button>
        </nav>
      </aside>

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

      {activeMainView === "control" && (
        <>
          <SummaryCards
            customersCount={customers.length}
            devicesCount={devices.length}
            paymentsCount={payments.length}
            activeSection={activeSummarySection}
            onSelectSection={handleSelectSummarySection}
          />

          <section
            style={{
              ...cardStyle,
              display: "grid",
              gap: 12,
              border: "1px solid rgba(37, 99, 235, 0.22)",
              background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(248,250,252,0.9))",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setIsControlCenterExpanded((value) => !value)}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 700,
                  cursor: "pointer",
                  color: "var(--text-main)",
                }}
              >
                Centro de control {isControlCenterExpanded ? "▾" : "▸"}
              </button>
              <p style={{ margin: 0, color: "var(--text-soft)" }}>
                Trabaja por modulo para mantener el flujo limpio y ordenado.
              </p>
            </div>
            {isControlCenterExpanded && (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {[
                  { key: "customers", label: "Clientes" },
                  { key: "devices", label: "Celulares" },
                  { key: "payments", label: "Pagos" },
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
            )}
          </section>
        </>
      )}

      {activeMainView === "credit_new" && (
      <details
        ref={advancedToolsRef}
        open={isAdvancedOpen}
        onToggle={(event) => setIsAdvancedOpen(event.currentTarget.open)}
        style={{
          ...cardStyle,
          borderStyle: "dashed",
          borderColor: "rgba(148, 163, 184, 0.5)",
          background: "rgba(255,255,255,0.75)",
        }}
      >
        <summary
          style={{
            cursor: "pointer",
            fontWeight: 700,
            color: "var(--text-main)",
            listStyle: "none",
            outline: "none",
          }}
        >
          Credito nuevo: cliente, celular, cuotas y QR Hexnode
        </summary>
        <div style={{ display: "grid", gap: 24, marginTop: 18 }}>

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
            Genera QR directo desde KOVIX (Device Owner) o usa el QR oficial de Hexnode.
          </p>

          {activeMainView === "credit_new" ? (
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
              Modo activo: <strong>QR Hexnode Enrollment</strong>
            </div>
          ) : (
            <select
              value={provisioningMode}
              onChange={(event) => setProvisioningMode(event.target.value)}
              style={inputStyle}
            >
              <option value="device_owner">QR KOVIX (Device Owner)</option>
              <option value="hexnode">QR Hexnode Enrollment</option>
            </select>
          )}

          {provisioningMode === "hexnode" ? (
            <>
              <button type="button" onClick={() => loadHexnodeProvisioningQr()} style={secondaryButtonStyle}>
                Recargar QR Hexnode
              </button>
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
                Portal: <strong>{hexnodeProvisioning?.portalUrl || "No configurado"}</strong><br />
                Estado:{" "}
                <strong>{hexnodeProvisioning?.configured ? "Configurado" : "Falta configurar variable en backend"}</strong>
              </div>
            </>
          ) : (
            <>
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

              <input
                value={provisioningSignatureChecksum}
                onChange={(event) => setProvisioningSignatureChecksum(event.target.value)}
                placeholder="SHA-256 de firma del APK (opcional, recomendado en Samsung)"
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
            </>
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
              onChange={(event) => {
                const selectedDeviceId = event.target.value;
                setCreditForm((value) => ({ ...value, deviceId: selectedDeviceId }));
                setSelectedCreditDeviceId(selectedDeviceId);
              }}
              style={inputStyle}
            >
              <option value="">
                {latestCreatedDevice ? "Selecciona cliente y dispositivo" : "Primero registra un dispositivo"}
              </option>
              {sortedDevicesByCustomer.map((device) => (
                <option key={device.id} value={device.id}>
                  {(device.customer?.fullName || "Sin cliente")} - {device.brand} {device.model} ({device.installCode})
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
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 13, color: "#334155" }}>Fecha de compra</span>
              <input
                type="date"
                value={creditForm.purchaseDate}
                onChange={(event) => setCreditForm((value) => ({ ...value, purchaseDate: event.target.value }))}
                style={inputStyle}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 13, color: "#334155" }}>Fecha de corte / primer pago</span>
              <input
                type="date"
                value={creditForm.cutOffDate}
                onChange={(event) => setCreditForm((value) => ({ ...value, cutOffDate: event.target.value }))}
                style={inputStyle}
              />
            </label>
            <textarea
              placeholder="Notas de contrato (opcional)"
              rows={3}
              value={creditForm.notes}
              onChange={(event) => setCreditForm((value) => ({ ...value, notes: event.target.value }))}
              style={inputStyle}
            />
            {creditInstallmentPreview ? (
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  border: "1px solid #bfdbfe",
                  borderRadius: 10,
                  background: "#eff6ff",
                  padding: 10,
                }}
              >
                <strong>Generador de tabla de cuotas (vista previa)</strong>
                <div style={{ color: "#1e3a8a" }}>
                  Monto financiado: ${creditInstallmentPreview.financedAmount.toFixed(2)} USD
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 460 }}>
                    <thead>
                      <tr style={{ background: "#dbeafe" }}>
                        <th style={{ textAlign: "left", border: "1px solid #93c5fd", padding: 8 }}>#</th>
                        <th style={{ textAlign: "left", border: "1px solid #93c5fd", padding: 8 }}>Vence</th>
                        <th style={{ textAlign: "left", border: "1px solid #93c5fd", padding: 8 }}>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditInstallmentPreview.installments.map((entry) => (
                        <tr key={`credit-preview-installment-${entry.sequence}`}>
                          <td style={{ border: "1px solid #bfdbfe", padding: 8 }}>{entry.sequence}</td>
                          <td style={{ border: "1px solid #bfdbfe", padding: 8 }}>
                            {entry.dueDate.toLocaleDateString()}
                          </td>
                          <td style={{ border: "1px solid #bfdbfe", padding: 8 }}>${entry.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  color: "#475569",
                }}
              >
                Completa monto total, entrada, numero de cuotas y fecha de corte para generar la tabla de cuotas.
              </div>
            )}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="submit"
                disabled={isSavingCreditContract}
                style={{
                  width: "fit-content",
                  ...buttonStyle,
                  cursor: isSavingCreditContract ? "not-allowed" : "pointer",
                }}
              >
                {isSavingCreditContract ? "Guardando..." : "Subir credito nuevo"}
              </button>
              <button
                type="button"
                onClick={handleClearCreditNewDraft}
                disabled={isSavingCreditContract}
                style={{ ...secondaryButtonStyle, width: "fit-content" }}
              >
                Limpiar
              </button>
            </div>
          </form>
        </article>

      </section>
        </div>
      </details>
      )}

      {activeMainView === "credit_renewal" && (
        <section style={{ display: "grid", gap: 16 }}>
          <article style={{ ...cardStyle, display: "grid", gap: 12 }}>
            <h3 style={{ margin: 0 }}>Renovacion de credito</h3>
            <p style={{ margin: 0, color: "var(--text-soft)" }}>
              Busca un cliente existente por nombre o cedula, registra nuevo equipo y crea su nuevo contrato.
            </p>
            <input
              value={renewalCustomerQuery}
              onChange={(event) => setRenewalCustomerQuery(event.target.value)}
              placeholder="Buscar cliente por nombre, cedula o telefono"
              style={filterInputStyle}
            />
            <select
              value={renewalSelectedCustomerId}
              onChange={(event) => {
                const nextId = event.target.value;
                setRenewalSelectedCustomerId(nextId);
              }}
              style={inputStyle}
            >
              <option value="">Selecciona cliente para renovacion</option>
              {renewalCustomerMatches.map((customer) => (
                <option key={`renewal-customer-${customer.id}`} value={customer.id}>
                  {customer.fullName} - {customer.nationalId}
                </option>
              ))}
            </select>
          </article>

          {renewalSelectedCustomer && (
            <article style={{ ...cardStyle, display: "grid", gap: 8 }}>
              <h4 style={{ margin: 0 }}>Datos del cliente seleccionado</h4>
              <div style={{ display: "grid", gap: 4 }}>
                <div>Nombre: <strong>{renewalSelectedCustomer.fullName}</strong></div>
                <div>Cedula: {renewalSelectedCustomer.nationalId}</div>
                <div>Telefono: {renewalSelectedCustomer.phone}</div>
                <div>Dispositivos actuales: {renewalCustomerDevices.length}</div>
              </div>
            </article>
          )}

          <section style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
            <article style={{ ...cardStyle, display: "grid", gap: 10 }}>
              <h3 style={{ margin: 0 }}>Registrar dispositivo (renovacion)</h3>
              <form onSubmit={handleCreateRenewalDevice} style={{ display: "grid", gap: 10 }}>
                <input
                  placeholder="Marca"
                  value={renewalDeviceForm.brand}
                  onChange={(event) => setRenewalDeviceForm((value) => ({ ...value, brand: event.target.value }))}
                  style={inputStyle}
                />
                <input
                  placeholder="Modelo"
                  value={renewalDeviceForm.model}
                  onChange={(event) => setRenewalDeviceForm((value) => ({ ...value, model: event.target.value }))}
                  style={inputStyle}
                />
                <input
                  placeholder="Alias"
                  value={renewalDeviceForm.alias}
                  onChange={(event) => setRenewalDeviceForm((value) => ({ ...value, alias: event.target.value }))}
                  style={inputStyle}
                />
                <input
                  placeholder="IMEI 1"
                  value={renewalDeviceForm.imei}
                  onChange={(event) => setRenewalDeviceForm((value) => ({ ...value, imei: event.target.value }))}
                  style={inputStyle}
                />
                <input
                  placeholder="IMEI 2 (opcional)"
                  value={renewalDeviceForm.imei2 || ""}
                  onChange={(event) => setRenewalDeviceForm((value) => ({ ...value, imei2: event.target.value }))}
                  style={inputStyle}
                />
                <input
                  placeholder="Hexnode Device ID (opcional)"
                  value={renewalDeviceForm.hexnodeDeviceId}
                  onChange={(event) =>
                    setRenewalDeviceForm((value) => ({ ...value, hexnodeDeviceId: event.target.value }))
                  }
                  style={inputStyle}
                />
                <textarea
                  placeholder="Notas"
                  rows={3}
                  value={renewalDeviceForm.notes}
                  onChange={(event) => setRenewalDeviceForm((value) => ({ ...value, notes: event.target.value }))}
                  style={inputStyle}
                />
                <button
                  type="submit"
                  disabled={isSavingRenewalDevice || !renewalSelectedCustomerId}
                  style={buttonStyle}
                >
                  {isSavingRenewalDevice ? "Guardando..." : "Guardar dispositivo renovacion"}
                </button>
              </form>
            </article>

            <article style={{ ...cardStyle, display: "grid", gap: 10 }}>
              <h3 style={{ margin: 0 }}>Crear contrato (renovacion)</h3>
              <form onSubmit={handleCreateRenewalCreditContract} style={{ display: "grid", gap: 10 }}>
                <select
                  value={renewalCreditForm.deviceId}
                  onChange={(event) =>
                    setRenewalCreditForm((value) => ({ ...value, deviceId: event.target.value }))
                  }
                  style={inputStyle}
                >
                  <option value="">Selecciona dispositivo del cliente</option>
                  {renewalCustomerDevices.map((device) => (
                    <option key={`renewal-device-${device.id}`} value={device.id}>
                      {device.brand} {device.model} ({device.installCode})
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Monto total (USD)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={renewalCreditForm.principalAmount}
                  onChange={(event) =>
                    setRenewalCreditForm((value) => ({ ...value, principalAmount: event.target.value }))
                  }
                  style={inputStyle}
                />
                <input
                  placeholder="Entrada (USD)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={renewalCreditForm.downPaymentAmount}
                  onChange={(event) =>
                    setRenewalCreditForm((value) => ({ ...value, downPaymentAmount: event.target.value }))
                  }
                  style={inputStyle}
                />
                <input
                  placeholder="Numero de cuotas"
                  type="number"
                  min="1"
                  step="1"
                  value={renewalCreditForm.installmentCount}
                  onChange={(event) =>
                    setRenewalCreditForm((value) => ({ ...value, installmentCount: event.target.value }))
                  }
                  style={inputStyle}
                />
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 13, color: "#334155" }}>Fecha de compra</span>
                  <input
                    type="date"
                    value={renewalCreditForm.purchaseDate}
                    onChange={(event) =>
                      setRenewalCreditForm((value) => ({ ...value, purchaseDate: event.target.value }))
                    }
                    style={inputStyle}
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 13, color: "#334155" }}>Fecha de corte / primer pago</span>
                  <input
                    type="date"
                    value={renewalCreditForm.cutOffDate}
                    onChange={(event) =>
                      setRenewalCreditForm((value) => ({ ...value, cutOffDate: event.target.value }))
                    }
                    style={inputStyle}
                  />
                </label>
                <textarea
                  placeholder="Notas de contrato"
                  rows={3}
                  value={renewalCreditForm.notes}
                  onChange={(event) => setRenewalCreditForm((value) => ({ ...value, notes: event.target.value }))}
                  style={inputStyle}
                />
                <button
                  type="submit"
                  disabled={isSavingRenewalCreditContract || !renewalSelectedCustomerId}
                  style={buttonStyle}
                >
                  {isSavingRenewalCreditContract ? "Guardando..." : "Crear contrato renovacion"}
                </button>
              </form>
            </article>
          </section>

        </section>
      )}

      {activeMainView === "control" && activeSummarySection === "customers" && (
        <section style={{ display: "grid", gap: 16 }}>
          <CustomersList
            customers={customersPageData.items}
            totalItems={customersPageData.totalItems}
            page={customersPageData.page}
            totalPages={customersPageData.totalPages}
            sortValue={customerSort}
            onSortChange={setCustomerSort}
            customerSegment={customerSegment}
            onCustomerSegmentChange={setCustomerSegment}
            segmentCounts={customerSegmentCounts}
            onPrevPage={() => setCustomerPage((value) => Math.max(1, value - 1))}
            onNextPage={() =>
              setCustomerPage((value) => Math.min(customersPageData.totalPages, value + 1))
            }
            onDeleteCustomer={handleDeleteCustomer}
            deletingCustomerId={deletingCustomerId}
            searchValue={customerQuery}
            onSearchChange={setCustomerQuery}
          />
        </section>
      )}

      {activeMainView === "control" && activeSummarySection === "devices" && (
        <section style={{ display: "grid", gap: 16 }}>
          <DevicesList
            devices={devicesPageData.items}
            statuses={statuses}
            onStatusChange={handleStatusChange}
            updatingDeviceId={updatingDeviceId}
            rotatingSecretDeviceId={rotatingSecretDeviceId}
            onRotateSecret={handleRotateSecret}
            linkingHexnodeDeviceId={linkingHexnodeDeviceId}
            onToggleHexnodeDeviceLink={handleToggleHexnodeDeviceLink}
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
            deviceSegment={deviceSegment}
            onDeviceSegmentChange={setDeviceSegment}
            segmentCounts={deviceSegmentCounts}
            customerOptions={deviceCustomerOptions}
            searchValue={deviceQuery}
            onSearchChange={setDeviceQuery}
            devicePaymentSignalMap={devicePaymentSignalMap}
            onLinkAllHexnodeDevices={handleLinkAllHexnodeDevices}
            isLinkingAllHexnodeDevices={isLinkingAllHexnodeDevices}
            onDeleteDevice={handleDeleteDevice}
            deletingDeviceId={deletingDeviceId}
            onUpdateDeviceIdentity={handleUpdateDeviceIdentity}
            updatingDeviceIdentityId={updatingDeviceIdentityId}
            onClearManualStatus={handleClearManualStatus}
            clearingManualStatusDeviceId={clearingManualStatusDeviceId}
          />
        </section>
      )}

      {activeMainView === "control" && activeSummarySection === "payments" && (
        <section style={{ display: "grid", gap: 16 }}>
          <PaymentsList
            payments={sortedPayments}
            searchValue={paymentQuery}
            onSearchChange={setPaymentQuery}
            onMarkPaid={handleMarkPaid}
            onMarkOverdue={handleMarkOverdue}
            onMarkPending={handleMarkPending}
            markingPaymentId={markingPaymentId}
            onDeletePayment={handleDeletePayment}
            deletingPaymentId={deletingPaymentId}
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

          <article style={{ ...cardStyle, display: "grid", gap: 12 }}>
            <h3 style={{ margin: 0 }}>Gestor de cuotas</h3>
            <select
              value={selectedCreditDeviceId}
              onChange={(event) => setSelectedCreditDeviceId(event.target.value)}
              style={inputStyle}
            >
              <option value="">Selecciona dispositivo para revisar cuotas</option>
              {sortedDevicesByCustomer.map((device) => (
                <option key={`payments-quota-device-${device.id}`} value={device.id}>
                  {(device.customer?.fullName || "Sin cliente")} - {device.brand} {device.model} ({device.installCode})
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
                Cliente: <strong>{selectedCreditDevice.customer?.fullName || "Sin cliente"}</strong>
                <br />
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
                  <div>Fecha de registro: {selectedCreditContract.summary?.registeredAt ? new Date(selectedCreditContract.summary.registeredAt).toLocaleDateString() : "-"}</div>
                  <div>Fecha de compra: {selectedCreditContract.summary?.purchaseDate ? new Date(selectedCreditContract.summary.purchaseDate).toLocaleDateString() : "-"}</div>
                  <div>Fecha de corte: {selectedCreditContract.summary?.cutOffDate ? new Date(selectedCreditContract.summary.cutOffDate).toLocaleDateString() : "-"}</div>
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
                            <tr key={`reported-payments-${installment.id}`}>
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
                        <tr key={`payments-installment-${installment.id}`}>
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
                                disabled={processingInstallmentId === installment.id || installment.status === "PAGADO"}
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
                                disabled={processingInstallmentId === installment.id || installment.status === "PAGADO"}
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
      )}

      {activeMainView === "finance" && (
        <section style={{ display: "grid", gap: 16 }}>
          <SummaryCards
            customersCount={customers.length}
            devicesCount={devices.length}
            paymentsCount={payments.length}
            activeSection="payments"
            onSelectSection={() => {}}
          />
          <FinancePanel payments={sortedPayments} />
        </section>
      )}

      {activeMainView === "contracts" && (
        <section style={{ display: "grid", gap: 16 }}>
          <article style={{ ...cardStyle, display: "grid", gap: 12 }}>
            <h3 style={{ margin: 0 }}>Contratos</h3>
            <p style={{ margin: 0, color: "var(--text-soft)" }}>
              Apartado independiente para contratos y foto del cliente.
            </p>

            <input
              value={contractsCustomerQuery}
              onChange={(event) => setContractsCustomerQuery(event.target.value)}
              placeholder="Buscar cliente por nombre o cedula"
              style={filterInputStyle}
            />
            <select
              value={contractsCustomerId}
              onChange={(event) => setContractsCustomerId(event.target.value)}
              style={inputStyle}
            >
              <option value="">Selecciona cliente</option>
              {contractsCustomerMatches.map((customer) => (
                <option key={`contracts-customer-${customer.id}`} value={customer.id}>
                  {customer.fullName} - {customer.nationalId}
                </option>
              ))}
            </select>

            {contractsSelectedCustomer && (
              <div style={{ display: "grid", gap: 8 }}>
                <div
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    color: "#334155",
                  }}
                >
                  Cliente: <strong>{contractsSelectedCustomer.fullName}</strong><br />
                  Cedula: {contractsSelectedCustomer.nationalId}<br />
                  Telefono: {contractsSelectedCustomer.phone}
                </div>

                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
                  <div style={{ display: "grid", gap: 8, border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
                    <strong>Subir contrato</strong>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      onChange={(event) => setPendingContractFile(event.target.files?.[0] || null)}
                      disabled={!contractsCustomerId || isUploadingContractDoc}
                    />
                    <button
                      type="button"
                      disabled={!pendingContractFile || !contractsCustomerId || isUploadingContractDoc}
                      onClick={() => handleConfirmUploadCustomerAsset("CONTRACT")}
                      style={buttonStyle}
                    >
                      {isUploadingContractDoc ? "Subiendo..." : "Confirmar subida contrato"}
                    </button>
                  </div>

                  <div style={{ display: "grid", gap: 8, border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
                    <strong>Subir foto cliente</strong>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                      onChange={(event) => setPendingPhotoFile(event.target.files?.[0] || null)}
                      disabled={!contractsCustomerId || isUploadingClientPhoto}
                    />
                    <button
                      type="button"
                      disabled={!pendingPhotoFile || !contractsCustomerId || isUploadingClientPhoto}
                      onClick={() => handleConfirmUploadCustomerAsset("PHOTO")}
                      style={secondaryButtonStyle}
                    >
                      {isUploadingClientPhoto ? "Subiendo..." : "Confirmar subida foto"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </article>

          {isLoadingContractsAssets && (
            <article style={{ ...cardStyle, display: "grid", gap: 8 }}>
              <p style={{ margin: 0 }}>Cargando archivos del cliente...</p>
            </article>
          )}

          {!isLoadingContractsAssets && contractsCustomerId && (
            <article style={{ ...cardStyle, display: "grid", gap: 12 }}>
              <h4 style={{ margin: 0 }}>Tarjetas de archivos ({contractsAssets.length})</h4>
              {contractsAssets.length === 0 ? (
                <p style={{ margin: 0, color: "var(--text-soft)" }}>No hay archivos cargados para este cliente.</p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {contractsAssets.map((asset) => {
                    const isPdf = String(asset.mimeType || "").toLowerCase().includes("pdf");
                    const isImage = String(asset.mimeType || "").toLowerCase().startsWith("image/");
                    return (
                      <article
                        key={`asset-card-${asset.id}`}
                        style={{
                          border: "1px solid #e2e8f0",
                          borderRadius: 10,
                          background: "#ffffff",
                          padding: 12,
                          display: "grid",
                          gap: 8,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <div>
                            <strong>{asset.fileName}</strong>
                            <div style={{ color: "var(--text-soft)", fontSize: 13 }}>
                              {asset.category} - {asset.mimeType} - {(Number(asset.fileSize || 0) / 1024).toFixed(1)} KB
                            </div>
                          </div>
                          <div style={{ position: "relative" }}>
                            <button
                              type="button"
                              onClick={() =>
                                setContractsOptionsAssetId((value) => (value === String(asset.id) ? "" : String(asset.id)))
                              }
                              style={{ ...secondaryButtonStyle, minHeight: 34, padding: "6px 10px", borderRadius: 8 }}
                            >
                              Opciones
                            </button>
                            {contractsOptionsAssetId === String(asset.id) && (
                              <div
                                style={{
                                  position: "absolute",
                                  top: 38,
                                  right: 0,
                                  zIndex: 25,
                                  minWidth: 200,
                                  borderRadius: 10,
                                  border: "1px solid var(--line-soft)",
                                  background: "#ffffff",
                                  boxShadow: "0 16px 24px rgba(15, 23, 42, 0.18)",
                                  display: "grid",
                                  gap: 0,
                                  overflow: "hidden",
                                }}
                              >
                                <label
                                  style={{
                                    padding: "10px 12px",
                                    borderBottom: "1px solid var(--line-soft)",
                                    cursor: updatingContractAssetId ? "not-allowed" : "pointer",
                                    color: "#0f172a",
                                  }}
                                >
                                  {updatingContractAssetId === String(asset.id) ? "Editando..." : "Editar archivo"}
                                  <input
                                    type="file"
                                    accept={
                                      asset.category === "PHOTO"
                                        ? ".jpg,.jpeg,.png,image/jpeg,image/png"
                                        : ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                                    }
                                    disabled={updatingContractAssetId === String(asset.id)}
                                    style={{ display: "none" }}
                                    onChange={async (event) => {
                                      const file = event.target.files?.[0] || null;
                                      await handleReplaceCustomerAsset(asset, file);
                                      event.target.value = "";
                                    }}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomerAsset(asset)}
                                  disabled={deletingContractAssetId === String(asset.id)}
                                  style={{
                                    border: "none",
                                    background: "#fff7ed",
                                    padding: "10px 12px",
                                    textAlign: "left",
                                    cursor: deletingContractAssetId === String(asset.id) ? "not-allowed" : "pointer",
                                    color: "#9a3412",
                                    fontWeight: 700,
                                  }}
                                >
                                  {deletingContractAssetId === String(asset.id) ? "Eliminando..." : "Eliminar"}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div
                          style={{
                            padding: 10,
                            borderRadius: 8,
                            border: "1px solid #e2e8f0",
                            background: "#f8fafc",
                            color: "#334155",
                          }}
                        >
                          Cliente: <strong>{contractsSelectedCustomer?.fullName || "-"}</strong><br />
                          Cedula: {contractsSelectedCustomer?.nationalId || "-"}<br />
                          Telefono: {contractsSelectedCustomer?.phone || "-"}
                        </div>

                        {isPdf ? (
                          <button
                            type="button"
                            onClick={() => handleDownloadAsset(asset.id, asset.fileName)}
                            style={secondaryButtonStyle}
                          >
                            Descargar PDF
                          </button>
                        ) : (
                          isImage && (
                            <img
                              src={contractsImagePreviewMap[asset.id] || ""}
                              alt={asset.fileName}
                              width={260}
                              height={180}
                              style={{ objectFit: "cover", borderRadius: 10, border: "1px solid #cbd5e1" }}
                            />
                          )
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </article>
          )}
        </section>
      )}

      {activeMainView === "trash" && (
        <section style={{ ...cardStyle, display: "grid", gap: 10 }}>
          <h2 style={{ margin: 0 }}>Papelera</h2>
          <p style={{ margin: 0, color: "var(--text-soft)" }}>
            Los elementos eliminados se envian a papelera y se purgan automaticamente cada 30 dias.
          </p>
          <p style={{ margin: 0, color: "var(--text-soft)" }}>
            Por ahora la papelera funciona con retencion automatica en backend.
          </p>
        </section>
      )}
      </main>
    </div>
  );
}
