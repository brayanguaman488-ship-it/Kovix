package com.kovix.client

import android.Manifest
import android.app.ActivityManager
import android.app.AlertDialog
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.graphics.drawable.GradientDrawable
import android.graphics.Typeface
import android.os.Build
import android.os.Bundle
import android.os.PersistableBundle
import android.provider.Settings
import android.text.InputType
import android.view.View
import android.view.animation.DecelerateInterpolator
import android.widget.Button
import android.widget.EditText
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.PopupMenu
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.kovix.client.admin.KovixDeviceAdminReceiver
import com.kovix.client.network.BootstrapRequest
import com.kovix.client.network.DeviceCreditInstallment
import com.kovix.client.network.DevicePayload
import com.kovix.client.network.KovixRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import android.telephony.TelephonyManager
import java.util.Locale
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter
import android.os.UserManager
import android.graphics.Color

class MainActivity : AppCompatActivity() {
    companion object {
        private const val PREFS_NAME = "kovix_device_client"
        private const val PREF_BASE_URL = "baseUrl"
        private const val PREF_INSTALL_CODE = "installCode"
        private const val PREF_CLIENT_SECRET = "clientSecret"
        private const val PREF_CONFIG_LOCKED = "configLocked"
        private const val ADMIN_UNLOCK_PIN = "189902"
    }

    private lateinit var rootContainer: LinearLayout
    private lateinit var lightTrail: View
    private lateinit var headerSignalDot: View
    private lateinit var adminMenuButton: ImageButton
    private lateinit var headerCard: LinearLayout
    private lateinit var statusCard: LinearLayout
    private lateinit var configSection: LinearLayout
    private lateinit var configActionsRow: LinearLayout
    private lateinit var baseUrlInput: EditText
    private lateinit var installCodeInput: EditText
    private lateinit var clientSecretInput: EditText
    private lateinit var saveConfigButton: Button
    private lateinit var syncNowButton: Button
    private lateinit var unlockConfigButton: Button
    private lateinit var adminModeText: TextView
    private lateinit var statusTitle: TextView
    private lateinit var statusBadge: TextView
    private lateinit var statusMessage: TextView
    private lateinit var customerAvatar: TextView
    private lateinit var customerNameText: TextView
    private lateinit var lastSyncText: TextView
    private lateinit var errorText: TextView
    private lateinit var restrictionCard: LinearLayout
    private lateinit var restrictionTitle: TextView
    private lateinit var restrictionDetail: TextView
    private lateinit var creditCard: LinearLayout
    private lateinit var creditTitle: TextView
    private lateinit var creditDetail: TextView
    private lateinit var creditProgressText: TextView
    private lateinit var creditProgressBar: ProgressBar
    private lateinit var totalInstallmentsValueText: TextView
    private lateinit var paidInstallmentsValueText: TextView
    private lateinit var pendingInstallmentsValueText: TextView
    private lateinit var nextPaymentDateValueText: TextView
    private lateinit var nextPaymentYearValueText: TextView
    private lateinit var installmentsTitle: TextView
    private lateinit var installmentsTableContainer: LinearLayout
    private lateinit var installmentsTableText: TextView
    private lateinit var lockOverlay: LinearLayout
    private lateinit var lockTitle: TextView
    private lateinit var lockDetail: TextView
    private lateinit var callsOnlyOverlay: LinearLayout
    private lateinit var callsOnlyTitle: TextView
    private lateinit var callsOnlyDetail: TextView

    private var pollingJob: Job? = null
    private var repository: KovixRepository? = null
    private var pollingIntervalMs: Long = 300_000L
    private lateinit var devicePolicyManager: DevicePolicyManager
    private lateinit var adminComponent: ComponentName
    private var isDeviceOwnerMode: Boolean = false
    private var currentDeviceStatus: String = "SIN_DATOS"
    private var isConfigLocked: Boolean = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        bindViews()
        applyProvisioningExtrasIfPresent(intent)
        setupDeviceControlMode()
        loadConfigFromPrefs()
        hookActions()
        attemptAutomaticBootstrapIfNeeded()
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
        lightTrail = findViewById(R.id.lightTrail)
        headerSignalDot = findViewById(R.id.headerSignalDot)
        adminMenuButton = findViewById(R.id.adminMenuButton)
        headerCard = findViewById(R.id.headerCard)
        statusCard = findViewById(R.id.statusCard)
        configSection = findViewById(R.id.configSection)
        configActionsRow = findViewById(R.id.configActionsRow)
        baseUrlInput = findViewById(R.id.baseUrlInput)
        installCodeInput = findViewById(R.id.installCodeInput)
        clientSecretInput = findViewById(R.id.clientSecretInput)
        adminModeText = findViewById(R.id.adminModeText)
        saveConfigButton = findViewById(R.id.saveConfigButton)
        syncNowButton = findViewById(R.id.syncNowButton)
        unlockConfigButton = findViewById(R.id.unlockConfigButton)
        statusTitle = findViewById(R.id.statusTitle)
        statusBadge = findViewById(R.id.statusBadge)
        statusMessage = findViewById(R.id.statusMessage)
        customerAvatar = findViewById(R.id.customerAvatar)
        customerNameText = findViewById(R.id.customerNameText)
        lastSyncText = findViewById(R.id.lastSyncText)
        errorText = findViewById(R.id.errorText)
        restrictionCard = findViewById(R.id.restrictionCard)
        restrictionTitle = findViewById(R.id.restrictionTitle)
        restrictionDetail = findViewById(R.id.restrictionDetail)
        creditCard = findViewById(R.id.creditCard)
        creditTitle = findViewById(R.id.creditTitle)
        creditDetail = findViewById(R.id.creditDetail)
        creditProgressText = findViewById(R.id.creditProgressText)
        creditProgressBar = findViewById(R.id.creditProgressBar)
        totalInstallmentsValueText = findViewById(R.id.totalInstallmentsValueText)
        paidInstallmentsValueText = findViewById(R.id.paidInstallmentsValueText)
        pendingInstallmentsValueText = findViewById(R.id.pendingInstallmentsValueText)
        nextPaymentDateValueText = findViewById(R.id.nextPaymentDateValueText)
        nextPaymentYearValueText = findViewById(R.id.nextPaymentYearValueText)
        installmentsTitle = findViewById(R.id.installmentsTitle)
        installmentsTableContainer = findViewById(R.id.installmentsTableContainer)
        installmentsTableText = findViewById(R.id.installmentsTableText)
        lockOverlay = findViewById(R.id.lockOverlay)
        lockTitle = findViewById(R.id.lockTitle)
        lockDetail = findViewById(R.id.lockDetail)
        callsOnlyOverlay = findViewById(R.id.callsOnlyOverlay)
        callsOnlyTitle = findViewById(R.id.callsOnlyTitle)
        callsOnlyDetail = findViewById(R.id.callsOnlyDetail)
        runIntroAnimations()
    }

    private fun runIntroAnimations() {
        val cards = listOf(headerCard, statusCard, restrictionCard, creditCard)
        cards.forEachIndexed { index, view ->
            view.alpha = 0f
            view.translationY = 28f
            view.animate()
                .alpha(1f)
                .translationY(0f)
                .setStartDelay((index * 90L) + 30L)
                .setDuration(420L)
                .setInterpolator(DecelerateInterpolator())
                .start()
        }

        headerSignalDot.animate()
            .alpha(0.35f)
            .setDuration(900L)
            .withEndAction {
                headerSignalDot.animate().alpha(1f).setDuration(900L).start()
            }
            .start()

        lightTrail.alpha = 0.25f
        lightTrail.animate()
            .alpha(1f)
            .setDuration(700L)
            .withEndAction {
                lightTrail.animate().alpha(0.35f).setDuration(900L).start()
            }
            .start()
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
            attemptAutomaticBootstrapIfNeeded()
            startBackgroundSyncService()
            startPollingIfConfigured()
        }

        syncNowButton.setOnClickListener {
            lifecycleScope.launch {
                syncOnce()
            }
        }

        unlockConfigButton.setOnClickListener {
            promptUnlockConfig()
        }

        adminMenuButton.setOnClickListener { anchor ->
            showAdminMenu(anchor)
        }
    }

    private fun showAdminMenu(anchor: View) {
        val popup = PopupMenu(this, anchor)
        popup.menu.add(0, 1, 0, "Administrador")
        popup.setOnMenuItemClickListener { item ->
            when (item.itemId) {
                1 -> {
                    promptUnlockConfig()
                    true
                }
                else -> false
            }
        }
        popup.show()
    }

    private fun prefs() = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private fun loadConfigFromPrefs() {
        val prefs = prefs()
        val storedBaseUrl = prefs.getString(PREF_BASE_URL, BuildConfig.DEFAULT_BASE_URL).orEmpty().trim()
        val migratedBaseUrl = if (storedBaseUrl.equals("http://10.0.2.2:4000", ignoreCase = true)) {
            BuildConfig.DEFAULT_BASE_URL
        } else {
            storedBaseUrl.ifBlank { BuildConfig.DEFAULT_BASE_URL }
        }
        if (migratedBaseUrl != storedBaseUrl) {
            prefs.edit().putString(PREF_BASE_URL, migratedBaseUrl).apply()
        }
        baseUrlInput.setText(migratedBaseUrl)
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

    private fun applyProvisioningExtrasIfPresent(startIntent: Intent?) {
        val extrasBundle = readProvisioningAdminExtras(startIntent) ?: return

        val baseUrl = extrasBundle.getString("baseUrl")?.trim().orEmpty()
        val installCode = extrasBundle.getString("installCode")?.trim().orEmpty()
        val clientSecret = extrasBundle.getString("clientSecret")?.trim().orEmpty()

        if (baseUrl.isBlank() || installCode.isBlank() || clientSecret.isBlank()) {
            return
        }

        // Aplica datos provenientes del QR de aprovisionamiento (Device Owner)
        // para evitar carga manual en el primer arranque.
        prefs().edit()
            .putString(PREF_BASE_URL, baseUrl)
            .putString(PREF_INSTALL_CODE, installCode)
            .putString(PREF_CLIENT_SECRET, clientSecret)
            .putBoolean(PREF_CONFIG_LOCKED, true)
            .apply()

        isConfigLocked = true
    }

    private fun readProvisioningAdminExtras(startIntent: Intent?): PersistableBundle? {
        if (startIntent == null) {
            return null
        }

        return runCatching {
            @Suppress("DEPRECATION")
            startIntent.getParcelableExtra(DevicePolicyManager.EXTRA_PROVISIONING_ADMIN_EXTRAS_BUNDLE)
                as? PersistableBundle
        }.getOrNull()
    }

    private fun buildRepository() {
        val baseUrl = baseUrlInput.text.toString().trim()
        repository = if (baseUrl.isNotBlank()) {
            KovixRepository(baseUrl)
        } else {
            null
        }
    }

    private fun attemptAutomaticBootstrapIfNeeded() {
        val baseUrl = baseUrlInput.text.toString().trim()
        val currentInstallCode = installCodeInput.text.toString().trim()
        val currentClientSecret = clientSecretInput.text.toString().trim()
        val repo = repository

        if (baseUrl.isBlank() || repo == null) {
            return
        }

        if (currentInstallCode.isNotBlank() && currentClientSecret.isNotBlank()) {
            return
        }

        lifecycleScope.launch {
            val payload = buildBootstrapRequest()
            if (payload.imei.isNullOrBlank() && payload.imei2.isNullOrBlank()) {
                setError("Falta IMEI para bootstrap automatico. Verifica permisos del dispositivo.")
                return@launch
            }

            repo.bootstrapCredentials(payload)
                .onSuccess { response ->
                    val installCode = response.bootstrap?.installCode?.trim().orEmpty()
                    val clientSecret = response.bootstrap?.clientSecret?.trim().orEmpty()
                    if (installCode.isBlank() || clientSecret.isBlank()) {
                        return@onSuccess
                    }

                    prefs().edit()
                        .putString(PREF_BASE_URL, baseUrl)
                        .putString(PREF_INSTALL_CODE, installCode)
                        .putString(PREF_CLIENT_SECRET, clientSecret)
                        .putBoolean(PREF_CONFIG_LOCKED, true)
                        .apply()

                    installCodeInput.setText(installCode)
                    clientSecretInput.setText(clientSecret)
                    isConfigLocked = true
                    applyConfigLockState()
                    setError("")
                    startPollingIfConfigured()

                    lifecycleScope.launch {
                        syncOnce()
                    }
                }
                .onFailure {
                    // Silencioso: si no hay match aun, permitimos reintento en siguiente apertura/sync.
                }
        }
    }

    private fun buildBootstrapRequest(): BootstrapRequest {
        val imeiA = readImei(0)
        val imeiB = readImei(1)
        val serial = readSerialNumber()
        val androidId = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID)
            ?.trim()
            .orEmpty()
            .takeIf { it.isNotBlank() && it != "9774d56d682e549c" }
        val enrollmentSpecificId = readEnrollmentSpecificId()

        return BootstrapRequest(
            imei = imeiA,
            imei2 = imeiB,
            serialNumber = serial,
            androidId = androidId,
            enrollmentSpecificId = enrollmentSpecificId,
            manufacturer = Build.MANUFACTURER?.trim(),
            brand = Build.BRAND?.trim(),
            model = Build.MODEL?.trim(),
            packageName = packageName,
            appVersion = BuildConfig.VERSION_NAME,
        )
    }

    private fun readImei(slotIndex: Int): String? {
        val hasPhonePermission = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) ==
            PackageManager.PERMISSION_GRANTED
        if (!hasPhonePermission) {
            return null
        }

        val telephonyManager = getSystemService(TelephonyManager::class.java) ?: return null
        val rawValue = runCatching {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                telephonyManager.getImei(slotIndex)
            } else {
                @Suppress("DEPRECATION")
                telephonyManager.deviceId
            }
        }.getOrNull()

        val normalized = normalizeDigits(rawValue)
        return if (normalized.length in 14..17) normalized else null
    }

    private fun readSerialNumber(): String? {
        val rawValue = runCatching {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Build.getSerial()
            } else {
                @Suppress("DEPRECATION")
                Build.SERIAL
            }
        }.getOrNull()

        return rawValue
            ?.trim()
            ?.takeIf { it.isNotBlank() && !it.equals("UNKNOWN", ignoreCase = true) }
    }

    private fun readEnrollmentSpecificId(): String? {
        if (!isDeviceOwnerMode) {
            return null
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return null
        }

        return runCatching {
            devicePolicyManager.enrollmentSpecificId
        }.getOrNull()?.trim()?.takeIf { it.isNotBlank() }
    }

    private fun normalizeDigits(value: String?): String {
        return (value ?: "").filter { it.isDigit() }.trim()
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
        val baseUrl = baseUrlInput.text.toString().trim()
        val installCode = installCodeInput.text.toString().trim()
        val clientSecret = clientSecretInput.text.toString().trim()

        if (baseUrl.isBlank() || installCode.isBlank() || clientSecret.isBlank()) {
            setError("Config incompleta: baseUrl, installCode y clientSecret son obligatorios.")
            return
        }

        // Guardamos siempre la configuracion actual para no perderla al cerrar/reabrir la app.
        saveConfigToPrefs()
        val repo = KovixRepository(baseUrl)
        repository = repo

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

    private fun renderDeviceStatus(payload: DevicePayload) {
        val normalizedStatus = normalizeStatus(payload.status)
        currentDeviceStatus = normalizedStatus
        statusTitle.text = "Estado: $normalizedStatus"
        statusBadge.text = normalizedStatus.replace('_', ' ')
        applyStatusBadge(normalizedStatus)
        statusMessage.text = payload.message?.trim().takeUnless { it.isNullOrBlank() }
            ?: "Sincroniza para obtener estado del servidor."
        val customerName = payload.customerName?.trim().takeUnless { it.isNullOrBlank() } ?: "-"
        customerNameText.text = "Cliente: $customerName"
        customerAvatar.text = buildAvatarInitials(customerName)
        lastSyncText.text = "Ultima sync: ${payload.updatedAt?.let { formatIso(it) } ?: "-"}"
        pollingIntervalMs = (payload.policy.nextCheckInSeconds.coerceAtLeast(30) * 1000L)

        applyReadableContentColors()

        when (normalizedStatus) {
            "ACTIVO" -> {
                tintCard(restrictionCard, "#2A77B8")
                restrictionTitle.text = "Cuenta al dia"
                restrictionDetail.text =
                    "Equipo habilitado y sin restricciones."
            }

            "PAGO_PENDIENTE" -> {
                tintCard(restrictionCard, "#2A77B8")
                restrictionTitle.text = "Pago pendiente"
                restrictionDetail.text =
                    "Tienes cuotas pendientes. Regulariza para evitar bloqueo."
            }

            "SOLO_LLAMADAS" -> {
                tintCard(restrictionCard, "#2A77B8")
                restrictionTitle.text = "Restriccion parcial"
                restrictionDetail.text =
                    "Tu dispositivo esta en modo de llamadas por falta de pago."
            }

            "BLOQUEADO" -> {
                tintCard(restrictionCard, "#2A77B8")
                restrictionTitle.text = "BLOQUEADO"
                restrictionDetail.text =
                    "Equipo bloqueado por incumplimiento. Mostrar mensaje de pago y contacto de cobranza."
            }

            else -> {
                tintCard(restrictionCard, "#2A77B8")
                restrictionTitle.text = "Modo operativo"
                restrictionDetail.text = "Estado no reconocido."
            }
        }

        renderCreditSummary(payload)
        applyRuntimeControlByStatus()

        if (normalizedStatus == "BLOQUEADO") {
            callsOnlyOverlay.visibility = View.GONE
            lockOverlay.visibility = View.VISIBLE
            lockTitle.text = "DISPOSITIVO BLOQUEADO"
            lockDetail.text = "Regulariza tu pago para desbloquear el equipo."
        } else if (normalizedStatus == "SOLO_LLAMADAS") {
            lockOverlay.visibility = View.GONE
            callsOnlyOverlay.visibility = View.VISIBLE
            callsOnlyTitle.text = "MODO SOLO LLAMADAS"
            callsOnlyDetail.text = "Tu equipo esta restringido por mora. Regulariza tu pago para desbloquear funciones."
        } else {
            lockOverlay.visibility = View.GONE
            callsOnlyOverlay.visibility = View.GONE
        }
    }

    private fun applyStatusBadge(status: String) {
        val drawableRes = when (status) {
            "ACTIVO" -> R.drawable.bg_status_chip_active
            "PAGO_PENDIENTE" -> R.drawable.bg_status_chip_pending
            "SOLO_LLAMADAS" -> R.drawable.bg_status_chip_calls
            "BLOQUEADO" -> R.drawable.bg_status_chip_blocked
            else -> R.drawable.bg_status_chip_pending
        }
        val textColor = when (status) {
            "ACTIVO" -> Color.parseColor("#1D4ED8")
            "PAGO_PENDIENTE" -> Color.parseColor("#92400E")
            "SOLO_LLAMADAS" -> Color.parseColor("#B45309")
            "BLOQUEADO" -> Color.parseColor("#B91C1C")
            else -> Color.parseColor("#475569")
        }
        statusBadge.background = ContextCompat.getDrawable(this, drawableRes)
        statusBadge.setTextColor(textColor)
    }

    private fun buildAvatarInitials(name: String): String {
        if (name.isBlank() || name == "-") return "--"
        val parts = name
            .split(" ")
            .map { it.trim() }
            .filter { it.isNotBlank() }
        return when {
            parts.isEmpty() -> "--"
            parts.size == 1 -> parts.first().take(2).uppercase()
            else -> (parts[0].take(1) + parts[1].take(1)).uppercase()
        }
    }

    private fun renderCreditSummary(payload: DevicePayload) {
        val credit = payload.credit

        if (credit == null || credit.totalInstallments == null || credit.totalInstallments <= 0) {
            tintCard(creditCard, "#2A77B8")
            creditTitle.text = "Mis cuotas"
            creditDetail.text = "No hay cuotas activas."
            creditProgressText.text = "Progreso: 0%"
            creditProgressBar.progress = 0
            totalInstallmentsValueText.text = "Total de cuotas: -"
            paidInstallmentsValueText.text = "Cuotas pagadas: -"
            pendingInstallmentsValueText.text = "Cuotas pendientes: -"
            nextPaymentDateValueText.text = "-- ---"
            nextPaymentYearValueText.text = "----"
            installmentsTitle.text = "Resumen de credito"
            installmentsTableText.text = "Sin cuotas para mostrar."
            installmentsTableContainer.removeAllViews()
            return
        }

        val paidInstallments = credit.paidInstallments ?: 0
        val pendingInstallments = credit.pendingInstallments ?: 0
        val totalInstallments = credit.totalInstallments
        val nextDue = credit.nextDueDate?.let { formatIsoDateOnly(it) } ?: "-"
        val nextDueMain = credit.nextDueDate?.let { formatDueDateFull(it) } ?: "-- --- ----"
        val paidPercent = ((paidInstallments * 100.0) / totalInstallments).toInt().coerceIn(0, 100)
        val currency = credit.currency ?: "USD"

        tintCard(creditCard, "#2A77B8")
        creditTitle.text = "Mis cuotas"
        creditDetail.text =
            "Resumen: $paidInstallments pagadas de $totalInstallments\n" +
                "Pendientes: $pendingInstallments\n" +
                "Proxima fecha de pago: $nextDue"
        creditProgressText.text = "Progreso: $paidPercent% completado"
        creditProgressBar.progress = paidPercent
        totalInstallmentsValueText.text = "Total de cuotas: $totalInstallments"
        paidInstallmentsValueText.text = "Cuotas pagadas: $paidInstallments"
        pendingInstallmentsValueText.text = "Cuotas pendientes: $pendingInstallments"
        nextPaymentDateValueText.text = nextDueMain
        nextPaymentYearValueText.text = ""

        installmentsTitle.text = "Resumen de credito"
        renderInstallmentsTable(credit.installments, currency)
    }

    private fun renderInstallmentsTable(
        installments: List<DeviceCreditInstallment>,
        currency: String,
    ) {
        installmentsTableContainer.removeAllViews()

        if (installments.isEmpty()) {
            installmentsTableText.visibility = View.VISIBLE
            installmentsTableText.text = "Sin cuotas para mostrar."
            return
        }

        installmentsTableText.visibility = View.GONE
        installments
            .sortedBy { it.sequence ?: Int.MAX_VALUE }
            .forEachIndexed { index, installment ->
                val sequence = installment.sequence?.toString() ?: "-"
                val dueDate = installment.dueDate?.let { formatIsoDateOnly(it) } ?: "-"
                val amount = installment.amount ?: 0.0
                val rawStatus = installment.status?.trim()?.uppercase().orEmpty()
                val clientStatus = if (rawStatus == "PAGADO") "PAGADO" else "PENDIENTE"
                val card = LinearLayout(this).apply {
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        topMargin = if (index == 0) 0 else 10
                    }
                    orientation = LinearLayout.VERTICAL
                    setPadding(14, 12, 14, 12)
                    background = ContextCompat.getDrawable(
                        this@MainActivity,
                        R.drawable.bg_installment_item_card
                    )
                }

                val topRow = LinearLayout(this).apply {
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    )
                    orientation = LinearLayout.HORIZONTAL
                    gravity = android.view.Gravity.CENTER_VERTICAL
                }

                val sequenceView = TextView(this).apply {
                    layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                    text = "Cuota $sequence"
                    setTextColor(Color.parseColor("#111827"))
                    textSize = 16f
                    setTypeface(typeface, Typeface.BOLD)
                }

                val statusView = TextView(this).apply {
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    )
                    text = clientStatus
                    setPadding(18, 8, 18, 8)
                    setTextColor(
                        if (clientStatus == "PAGADO") Color.parseColor("#166534")
                        else Color.parseColor("#92400E")
                    )
                    background = ContextCompat.getDrawable(
                        this@MainActivity,
                        if (clientStatus == "PAGADO") R.drawable.bg_chip_paid_light
                        else R.drawable.bg_chip_pending_light
                    )
                    textSize = 12f
                    setTypeface(typeface, Typeface.BOLD)
                }

                val dueDateView = TextView(this).apply {
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        topMargin = 8
                    }
                    text = "Fecha de pago: $dueDate"
                    setTextColor(Color.parseColor("#334155"))
                    textSize = 13f
                }

                val amountView = TextView(this).apply {
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        topMargin = 3
                    }
                    text = "Valor: ${formatMoney(amount)} $currency"
                    setTextColor(Color.parseColor("#475569"))
                    textSize = 13f
                }

                val hintStatusView = TextView(this).apply {
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        topMargin = 2
                    }
                    text = if (clientStatus == "PAGADO") {
                        "Estado validado."
                    } else {
                        "Pendiente de cancelacion."
                    }
                    setTextColor(Color.parseColor("#64748B"))
                    textSize = 12f
                }

                val separator = View(this).apply {
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        1
                    ).apply {
                        topMargin = 10
                    }
                    setBackgroundColor(Color.parseColor("#E2E8F0"))
                }

                topRow.addView(sequenceView)
                topRow.addView(statusView)

                card.addView(topRow)
                card.addView(dueDateView)
                card.addView(amountView)
                card.addView(hintStatusView)
                if (index != installments.lastIndex) {
                    card.addView(separator)
                }

                card.alpha = 0f
                card.translationY = 22f
                card.animate()
                    .alpha(1f)
                    .translationY(0f)
                    .setDuration(260L)
                    .setStartDelay((index * 35L).coerceAtMost(280L))
                    .start()

                installmentsTableContainer.addView(card)
            }
    }

    private fun setError(value: String) {
        errorText.text = value
    }

    private fun applyConfigLockState() {
        baseUrlInput.isEnabled = !isConfigLocked
        installCodeInput.isEnabled = !isConfigLocked
        clientSecretInput.isEnabled = !isConfigLocked
        saveConfigButton.isEnabled = !isConfigLocked
        syncNowButton.isEnabled = !isConfigLocked
        configActionsRow.visibility = if (isConfigLocked) View.GONE else View.VISIBLE
        unlockConfigButton.visibility = if (isConfigLocked) View.GONE else View.VISIBLE
        configSection.visibility = if (isConfigLocked) View.GONE else View.VISIBLE
        applyConfigFieldReadability(baseUrlInput)
        applyConfigFieldReadability(installCodeInput)
        applyConfigFieldReadability(clientSecretInput)
        unlockConfigButton.text = if (isConfigLocked) {
            "Desbloquear config (Admin)"
        } else {
            "Config desbloqueada"
        }
    }

    private fun applyConfigFieldReadability(field: EditText) {
        field.alpha = 1.0f
        field.setTextColor(Color.parseColor("#102A43"))
        field.setHintTextColor(Color.parseColor("#829AB1"))
    }

    private fun applyReadableContentColors() {
        val dark = Color.parseColor("#102A43")
        val muted = Color.parseColor("#486581")
        val accent = Color.parseColor("#243B53")

        statusTitle.setTextColor(dark)
        statusMessage.setTextColor(muted)
        customerNameText.setTextColor(dark)
        lastSyncText.setTextColor(Color.parseColor("#627D98"))
        restrictionTitle.setTextColor(dark)
        restrictionDetail.setTextColor(muted)
        creditTitle.setTextColor(accent)
        creditDetail.setTextColor(muted)
        installmentsTitle.setTextColor(accent)
        installmentsTableText.setTextColor(Color.parseColor("#627D98"))
    }

    private fun tintCard(card: LinearLayout, colorHex: String) {
        val base = ContextCompat.getDrawable(this, R.drawable.bg_summary_panel)
        if (base is GradientDrawable) {
            base.setStroke(1, Color.parseColor(colorHex))
            card.background = base
        } else {
            card.background = ContextCompat.getDrawable(this, R.drawable.bg_summary_panel)
        }
    }

    private fun lockConfigAfterFirstSuccessfulSync() {
        isConfigLocked = true
        prefs().edit().putBoolean(PREF_CONFIG_LOCKED, true).apply()
        applyConfigLockState()
        setError("Configuracion protegida. Solo admin puede desbloquear.")
    }

    private fun promptUnlockConfig() {
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
                    setError("Configuracion desbloqueada por administrador.")
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

    private fun formatIsoDateOnly(value: String): String {
        val date = parseFlexibleDate(value) ?: return value
        return runCatching {
            date.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
        }.getOrDefault(value)
    }

    private fun formatDueDateMain(value: String): String {
        val date = parseFlexibleDate(value) ?: return "-- ---"
        return runCatching {
            date.format(DateTimeFormatter.ofPattern("dd MMM", Locale("es", "EC"))).uppercase(Locale("es", "EC"))
        }.getOrDefault("-- ---")
    }

    private fun formatDueDateFull(value: String): String {
        val date = parseFlexibleDate(value) ?: return "-- --- ----"
        return runCatching {
            date.format(DateTimeFormatter.ofPattern("dd MMM yyyy", Locale("es", "EC"))).uppercase(Locale("es", "EC"))
        }.getOrDefault("-- --- ----")
    }

    private fun formatDueDateYear(value: String): String {
        val date = parseFlexibleDate(value) ?: return "----"
        return runCatching {
            date.format(DateTimeFormatter.ofPattern("yyyy"))
        }.getOrDefault("----")
    }

    private fun parseFlexibleDate(value: String): LocalDate? {
        return runCatching { OffsetDateTime.parse(value).toLocalDate() }.getOrNull()
            ?: runCatching {
                LocalDateTime.parse(value, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")).toLocalDate()
            }.getOrNull()
            ?: runCatching { LocalDate.parse(value, DateTimeFormatter.ofPattern("yyyy-MM-dd")) }.getOrNull()
    }

    private fun formatMoney(value: Double): String {
        return String.format("%.2f", value)
    }

    private fun normalizeStatus(rawStatus: String?): String {
        val value = rawStatus?.trim()?.uppercase().orEmpty()
        return when (value) {
            "ACTIVO", "PAGO_PENDIENTE", "SOLO_LLAMADAS", "BLOQUEADO" -> value
            else -> "SIN_DATOS"
        }
    }
}
