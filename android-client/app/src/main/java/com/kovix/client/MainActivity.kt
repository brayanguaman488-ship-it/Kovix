package com.kovix.client

import android.app.ActivityManager
import android.app.AlertDialog
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Bundle
import android.text.InputType
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.kovix.client.admin.KovixDeviceAdminReceiver
import com.kovix.client.network.DevicePayload
import com.kovix.client.network.DeviceCreditInstallment
import com.kovix.client.network.KovixRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.max
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter
import android.os.UserManager

class MainActivity : AppCompatActivity() {
    companion object {
        private const val PREFS_NAME = "kovix_device_client"
        private const val PREF_BASE_URL = "baseUrl"
        private const val PREF_INSTALL_CODE = "installCode"
        private const val PREF_CLIENT_SECRET = "clientSecret"
        private const val PREF_CONFIG_LOCKED = "configLocked"
        private const val ADMIN_UNLOCK_PIN = "7429"
    }

    private lateinit var rootContainer: LinearLayout
    private lateinit var baseUrlInput: EditText
    private lateinit var installCodeInput: EditText
    private lateinit var clientSecretInput: EditText
    private lateinit var saveConfigButton: Button
    private lateinit var syncNowButton: Button
    private lateinit var unlockConfigButton: Button
    private lateinit var adminModeText: TextView
    private lateinit var statusTitle: TextView
    private lateinit var statusMessage: TextView
    private lateinit var customerNameText: TextView
    private lateinit var lastSyncText: TextView
    private lateinit var errorText: TextView
    private lateinit var restrictionCard: LinearLayout
    private lateinit var restrictionTitle: TextView
    private lateinit var restrictionDetail: TextView
    private lateinit var creditCard: LinearLayout
    private lateinit var creditTitle: TextView
    private lateinit var creditDetail: TextView
    private lateinit var reportPaymentButton: Button
    private lateinit var lockOverlay: LinearLayout
    private lateinit var lockTitle: TextView
    private lateinit var lockDetail: TextView
    private lateinit var lockRetryButton: Button
    private lateinit var callsOnlyOverlay: LinearLayout
    private lateinit var callsOnlyTitle: TextView
    private lateinit var callsOnlyDetail: TextView
    private lateinit var callsOnlySyncButton: Button

    private var pollingJob: Job? = null
    private var repository: KovixRepository? = null
    private var pollingIntervalMs: Long = 300_000L
    private var reportableInstallmentId: String? = null
    private lateinit var devicePolicyManager: DevicePolicyManager
    private lateinit var adminComponent: ComponentName
    private var isDeviceOwnerMode: Boolean = false
    private var currentDeviceStatus: String = "SIN_DATOS"
    private var isConfigLocked: Boolean = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        bindViews()
        setupDeviceControlMode()
        loadConfigFromPrefs()
        hookActions()
        startBackgroundSyncService()
        startPollingIfConfigured()
    }

    override fun onDestroy() {
        pollingJob?.cancel()
        super.onDestroy()
    }

    override fun onResume() {
        super.onResume()
        if (isDeviceOwnerMode) {
            applyRuntimeControlByStatus()
        }
    }

    private fun bindViews() {
        rootContainer = findViewById(R.id.rootContainer)
        baseUrlInput = findViewById(R.id.baseUrlInput)
        installCodeInput = findViewById(R.id.installCodeInput)
        clientSecretInput = findViewById(R.id.clientSecretInput)
        adminModeText = findViewById(R.id.adminModeText)
        saveConfigButton = findViewById(R.id.saveConfigButton)
        syncNowButton = findViewById(R.id.syncNowButton)
        unlockConfigButton = findViewById(R.id.unlockConfigButton)
        statusTitle = findViewById(R.id.statusTitle)
        statusMessage = findViewById(R.id.statusMessage)
        customerNameText = findViewById(R.id.customerNameText)
        lastSyncText = findViewById(R.id.lastSyncText)
        errorText = findViewById(R.id.errorText)
        restrictionCard = findViewById(R.id.restrictionCard)
        restrictionTitle = findViewById(R.id.restrictionTitle)
        restrictionDetail = findViewById(R.id.restrictionDetail)
        creditCard = findViewById(R.id.creditCard)
        creditTitle = findViewById(R.id.creditTitle)
        creditDetail = findViewById(R.id.creditDetail)
        reportPaymentButton = findViewById(R.id.reportPaymentButton)
        lockOverlay = findViewById(R.id.lockOverlay)
        lockTitle = findViewById(R.id.lockTitle)
        lockDetail = findViewById(R.id.lockDetail)
        lockRetryButton = findViewById(R.id.lockRetryButton)
        callsOnlyOverlay = findViewById(R.id.callsOnlyOverlay)
        callsOnlyTitle = findViewById(R.id.callsOnlyTitle)
        callsOnlyDetail = findViewById(R.id.callsOnlyDetail)
        callsOnlySyncButton = findViewById(R.id.callsOnlySyncButton)
    }

    private fun setupDeviceControlMode() {
        devicePolicyManager = getSystemService(DevicePolicyManager::class.java)
        adminComponent = ComponentName(this, KovixDeviceAdminReceiver::class.java)
        isDeviceOwnerMode = devicePolicyManager.isDeviceOwnerApp(packageName)

        if (!isDeviceOwnerMode) {
            adminModeText.text = "Modo de control: ESTANDAR (sin Device Owner)"
            return
        }

        adminModeText.text = "Modo de control: DEVICE OWNER ACTIVO"
        applyDeviceOwnerPolicies()
        applyRuntimeControlByStatus()
    }

    private fun applyDeviceOwnerPolicies() {
        runCatching {
            devicePolicyManager.setLockTaskPackages(adminComponent, arrayOf(packageName))
        }

        runCatching {
            devicePolicyManager.addUserRestriction(adminComponent, UserManager.DISALLOW_UNINSTALL_APPS)
            devicePolicyManager.addUserRestriction(adminComponent, UserManager.DISALLOW_FACTORY_RESET)
            devicePolicyManager.addUserRestriction(adminComponent, UserManager.DISALLOW_SAFE_BOOT)
            devicePolicyManager.addUserRestriction(adminComponent, UserManager.DISALLOW_ADD_USER)
        }

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            runCatching {
                devicePolicyManager.setStatusBarDisabled(adminComponent, true)
                devicePolicyManager.setKeyguardDisabled(adminComponent, true)
            }
        }

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
            runCatching {
                devicePolicyManager.setLockTaskFeatures(adminComponent, DevicePolicyManager.LOCK_TASK_FEATURE_NONE)
            }
        }

    }

    private fun activateKioskMode() {
        if (!devicePolicyManager.isLockTaskPermitted(packageName)) {
            return
        }

        val activityManager = getSystemService(ActivityManager::class.java)
        if (activityManager.lockTaskModeState != ActivityManager.LOCK_TASK_MODE_NONE) {
            return
        }

        runCatching {
            startLockTask()
        }
    }

    private fun deactivateKioskMode() {
        val activityManager = getSystemService(ActivityManager::class.java)
        if (activityManager.lockTaskModeState == ActivityManager.LOCK_TASK_MODE_NONE) {
            return
        }

        runCatching {
            stopLockTask()
        }
    }

    private fun setAsHomeLauncherForRestrictions(enable: Boolean) {
        if (!isDeviceOwnerMode) {
            return
        }

        if (enable) {
            runCatching {
                val homeFilter = IntentFilter(Intent.ACTION_MAIN).apply {
                    addCategory(Intent.CATEGORY_HOME)
                    addCategory(Intent.CATEGORY_DEFAULT)
                }
                devicePolicyManager.addPersistentPreferredActivity(
                    adminComponent,
                    homeFilter,
                    ComponentName(this, MainActivity::class.java)
                )
            }
        } else {
            runCatching {
                devicePolicyManager.clearPackagePersistentPreferredActivities(adminComponent, packageName)
            }
        }
    }

    private fun applyRuntimeControlByStatus() {
        if (!isDeviceOwnerMode) {
            return
        }

        val shouldRestrict = currentDeviceStatus == "SOLO_LLAMADAS" || currentDeviceStatus == "BLOQUEADO"

        if (shouldRestrict) {
            setAsHomeLauncherForRestrictions(true)
            activateKioskMode()
        } else {
            deactivateKioskMode()
            setAsHomeLauncherForRestrictions(false)
        }
    }

    private fun hookActions() {
        saveConfigButton.setOnClickListener {
            saveConfigToPrefs()
            buildRepository()
            setError("")
            startBackgroundSyncService()
            startPollingIfConfigured()
        }

        syncNowButton.setOnClickListener {
            lifecycleScope.launch {
                syncOnce()
            }
        }

        lockRetryButton.setOnClickListener {
            lifecycleScope.launch {
                syncOnce()
            }
        }

        callsOnlySyncButton.setOnClickListener {
            lifecycleScope.launch {
                syncOnce()
            }
        }

        reportPaymentButton.setOnClickListener {
            lifecycleScope.launch {
                reportCurrentInstallment()
            }
        }

        unlockConfigButton.setOnClickListener {
            promptUnlockConfig()
        }
    }

    private fun prefs() = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private fun loadConfigFromPrefs() {
        val prefs = prefs()
        baseUrlInput.setText(prefs.getString(PREF_BASE_URL, BuildConfig.DEFAULT_BASE_URL))
        installCodeInput.setText(prefs.getString(PREF_INSTALL_CODE, ""))
        clientSecretInput.setText(prefs.getString(PREF_CLIENT_SECRET, ""))
        isConfigLocked = prefs.getBoolean(PREF_CONFIG_LOCKED, false)
        applyConfigLockState()
        buildRepository()
    }

    private fun saveConfigToPrefs() {
        prefs().edit()
            .putString(PREF_BASE_URL, baseUrlInput.text.toString().trim())
            .putString(PREF_INSTALL_CODE, installCodeInput.text.toString().trim())
            .putString(PREF_CLIENT_SECRET, clientSecretInput.text.toString().trim())
            .apply()
    }

    private fun buildRepository() {
        val baseUrl = baseUrlInput.text.toString().trim()
        repository = if (baseUrl.isNotBlank()) {
            KovixRepository(baseUrl)
        } else {
            null
        }
    }

    private fun startPollingIfConfigured() {
        pollingJob?.cancel()

        val installCode = installCodeInput.text.toString().trim()
        val clientSecret = clientSecretInput.text.toString().trim()
        val repo = repository

        if (installCode.isBlank() || clientSecret.isBlank() || repo == null) {
            return
        }

        pollingJob = lifecycleScope.launch {
            while (true) {
                syncOnce()
                delay(pollingIntervalMs)
            }
        }
    }

    private fun startBackgroundSyncService() {
        val serviceIntent = Intent(this, DeviceSyncService::class.java).apply {
            action = DeviceSyncService.ACTION_START
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }
    }

    private suspend fun syncOnce() {
        val installCode = installCodeInput.text.toString().trim()
        val clientSecret = clientSecretInput.text.toString().trim()
        val repo = repository

        if (installCode.isBlank() || clientSecret.isBlank() || repo == null) {
            setError("Config incompleta: baseUrl, installCode y clientSecret son obligatorios.")
            return
        }

        val statusResult = repo.fetchStatus(installCode, clientSecret)
        statusResult.onSuccess { response ->
            val payload = response.device
            if (payload != null) {
                renderDeviceStatus(payload)
            }
            if (!isConfigLocked) {
                lockConfigAfterFirstSuccessfulSync()
            }
            setError("")
        }.onFailure { error ->
            setError("No se pudo consultar estado: ${error.message}")
            return
        }

        repo.heartbeat(installCode, clientSecret).onFailure { error ->
            setError("Heartbeat fallido: ${error.message}")
        }
    }

    private suspend fun reportCurrentInstallment() {
        val installCode = installCodeInput.text.toString().trim()
        val clientSecret = clientSecretInput.text.toString().trim()
        val repo = repository
        val installmentId = reportableInstallmentId

        if (installCode.isBlank() || clientSecret.isBlank() || repo == null) {
            setError("Config incompleta: baseUrl, installCode y clientSecret son obligatorios.")
            return
        }

        if (installmentId.isNullOrBlank()) {
            setError("No hay cuotas pendientes o vencidas para reportar.")
            return
        }

        reportPaymentButton.isEnabled = false
        reportPaymentButton.text = "Reportando..."

        repo.reportInstallmentPayment(
            installCode = installCode,
            clientSecret = clientSecret,
            installmentId = installmentId,
            note = "Reporte desde app cliente",
        ).onSuccess { response ->
            setError(response.message ?: "Pago reportado para validacion del administrador.")
        }.onFailure { error ->
            setError("No se pudo reportar pago: ${error.message}")
        }

        reportPaymentButton.isEnabled = true
        reportPaymentButton.text = "Reportar pago de cuota"
        syncOnce()
    }

    private fun renderDeviceStatus(payload: DevicePayload) {
        currentDeviceStatus = payload.status
        statusTitle.text = "Estado: ${payload.status}"
        statusMessage.text = payload.message
        customerNameText.text = "Cliente: ${payload.customerName}"
        lastSyncText.text = "Ultima sync: ${formatIso(payload.updatedAt)}"
        pollingIntervalMs = (payload.policy.nextCheckInSeconds.coerceAtLeast(30) * 1000L)

        val bgColor = when (payload.status) {
            "ACTIVO" -> getColor(R.color.status_active_bg)
            "PAGO_PENDIENTE" -> getColor(R.color.status_pending_bg)
            "SOLO_LLAMADAS" -> getColor(R.color.status_calls_only_bg)
            "BLOQUEADO" -> getColor(R.color.status_blocked_bg)
            else -> getColor(android.R.color.white)
        }
        rootContainer.setBackgroundColor(bgColor)

        when (payload.status) {
            "ACTIVO" -> {
                restrictionCard.setBackgroundColor(getColor(R.color.status_active_bg))
                restrictionTitle.text = "Modo normal"
                restrictionDetail.text =
                    "Equipo habilitado. Mantener sincronizacion cada ${payload.policy.nextCheckInSeconds}s."
            }

            "PAGO_PENDIENTE" -> {
                restrictionCard.setBackgroundColor(getColor(R.color.status_pending_bg))
                restrictionTitle.text = "Advertencia de pago"
                restrictionDetail.text =
                    "Notificar al cliente. Si no paga, pasa a SOLO_LLAMADAS en ${payload.policy.callsOnlyAfterDaysLate} dias."
            }

            "SOLO_LLAMADAS" -> {
                restrictionCard.setBackgroundColor(getColor(R.color.status_calls_only_bg))
                restrictionTitle.text = "Modo restringido: SOLO_LLAMADAS"
                restrictionDetail.text =
                    "Permitir solo funciones basicas y guiar al cliente para regularizacion inmediata."
            }

            "BLOQUEADO" -> {
                restrictionCard.setBackgroundColor(getColor(R.color.status_blocked_bg))
                restrictionTitle.text = "BLOQUEADO"
                restrictionDetail.text =
                    "Equipo bloqueado por incumplimiento. Mostrar mensaje de pago y contacto de cobranza."
            }

            else -> {
                restrictionCard.setBackgroundColor(getColor(android.R.color.white))
                restrictionTitle.text = "Modo operativo"
                restrictionDetail.text = "Estado no reconocido."
            }
        }

        renderCreditSummary(payload)
        applyRuntimeControlByStatus()

        if (payload.status == "BLOQUEADO") {
            callsOnlyOverlay.visibility = View.GONE
            lockOverlay.visibility = View.VISIBLE
            lockTitle.text = "DISPOSITIVO BLOQUEADO"
            lockDetail.text = "Regulariza tu pago para desbloquear el equipo."
        } else if (payload.status == "SOLO_LLAMADAS") {
            lockOverlay.visibility = View.GONE
            callsOnlyOverlay.visibility = View.VISIBLE
            callsOnlyTitle.text = "MODO SOLO LLAMADAS"
            callsOnlyDetail.text = "Tu equipo esta restringido por mora. Regulariza tu pago para desbloquear funciones."
        } else {
            lockOverlay.visibility = View.GONE
            callsOnlyOverlay.visibility = View.GONE
        }
    }

    private fun renderCreditSummary(payload: DevicePayload) {
        val credit = payload.credit

        if (credit == null || credit.totalInstallments == null || credit.totalInstallments <= 0) {
            creditCard.setBackgroundColor(getColor(R.color.status_active_bg))
            creditTitle.text = "Mi credito"
            creditDetail.text = "No hay contrato de credito activo para este dispositivo."
            reportableInstallmentId = null
            reportPaymentButton.isEnabled = false
            return
        }

        val currency = credit.currency ?: "USD"
        val principal = credit.principalAmount ?: 0.0
        val downPayment = credit.downPaymentAmount ?: 0.0
        val financed = credit.financedAmount ?: max(0.0, principal - downPayment)
        val installmentAmount = credit.installmentAmount ?: 0.0
        val paidInstallments = credit.paidInstallments ?: 0
        val pendingInstallments = credit.pendingInstallments ?: 0
        val overdueInstallments = credit.overdueInstallments ?: 0
        val reportedInstallments = credit.reportedInstallments ?: 0
        val totalInstallments = credit.totalInstallments
        val pendingAmount = credit.pendingAmount ?: 0.0
        val nextDue = credit.nextDueDate?.let { formatIso(it) } ?: "-"
        val reportableInstallment = findReportableInstallment(credit.installments)
        reportableInstallmentId = reportableInstallment?.id

        creditCard.setBackgroundColor(getColor(R.color.status_pending_bg))
        creditTitle.text = "Mi credito: $paidInstallments / $totalInstallments cuotas pagadas"
        creditDetail.text =
            "Precio: ${formatMoney(principal)} $currency\n" +
                "Entrada: ${formatMoney(downPayment)} $currency\n" +
                "Financiado: ${formatMoney(financed)} $currency\n" +
                "Cuota: ${formatMoney(installmentAmount)} $currency\n" +
                "Pendientes: $pendingInstallments | Vencidas: $overdueInstallments | Reportadas: $reportedInstallments\n" +
                "Saldo pendiente: ${formatMoney(pendingAmount)} $currency\n" +
                "Proxima cuota: $nextDue" +
                if (reportedInstallments > 0) {
                    "\nPago reportado en revision por administracion."
                } else {
                    ""
                }
        reportPaymentButton.isEnabled = reportableInstallment != null
        reportPaymentButton.text = if (reportableInstallment != null) {
            "Reportar pago de cuota #${reportableInstallment.sequence ?: "-"}"
        } else if (reportedInstallments > 0) {
            "Pago reportado en revision"
        } else {
            "Sin cuotas por reportar"
        }
    }

    private fun findReportableInstallment(installments: List<DeviceCreditInstallment>): DeviceCreditInstallment? {
        val overdue = installments.firstOrNull { it.status == "VENCIDO" }
        if (overdue != null) {
            return overdue
        }

        return installments.firstOrNull { it.status == "PENDIENTE" }
    }

    private fun setError(value: String) {
        errorText.text = value
    }

    private fun applyConfigLockState() {
        baseUrlInput.isEnabled = !isConfigLocked
        installCodeInput.isEnabled = !isConfigLocked
        clientSecretInput.isEnabled = !isConfigLocked
        saveConfigButton.isEnabled = !isConfigLocked
        unlockConfigButton.text = if (isConfigLocked) {
            "Desbloquear config (Admin)"
        } else {
            "Config desbloqueada"
        }
    }

    private fun lockConfigAfterFirstSuccessfulSync() {
        isConfigLocked = true
        prefs().edit().putBoolean(PREF_CONFIG_LOCKED, true).apply()
        applyConfigLockState()
        setError("Configuracion protegida. Solo admin puede desbloquear.")
    }

    private fun promptUnlockConfig() {
        if (!isConfigLocked) {
            setError("La configuracion ya esta desbloqueada.")
            return
        }

        val pinInput = EditText(this).apply {
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_VARIATION_PASSWORD
            hint = "PIN admin"
        }

        AlertDialog.Builder(this)
            .setTitle("Desbloquear configuracion")
            .setMessage("Ingresa PIN de administrador")
            .setView(pinInput)
            .setPositiveButton("Desbloquear") { _, _ ->
                val enteredPin = pinInput.text?.toString()?.trim().orEmpty()
                if (enteredPin == ADMIN_UNLOCK_PIN) {
                    isConfigLocked = false
                    prefs().edit().putBoolean(PREF_CONFIG_LOCKED, false).apply()
                    applyConfigLockState()
                    setError("Configuracion desbloqueada por admin.")
                } else {
                    setError("PIN admin incorrecto.")
                }
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun formatIso(value: String): String {
        return runCatching {
            val date = OffsetDateTime.parse(value)
            date.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
        }.getOrDefault(value)
    }

    private fun formatMoney(value: Double): String {
        return runCatching {
            String.format("%.2f", value)
        }.getOrDefault(value.toString())
    }
}
