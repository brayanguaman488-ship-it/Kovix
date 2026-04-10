package com.kovix.client

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.kovix.client.admin.KovixDeviceAdminReceiver
import com.google.android.gms.tasks.Tasks
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import com.kovix.client.network.KovixRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.concurrent.TimeUnit

class DeviceSyncService : Service() {
    companion object {
        private const val PREFS_NAME = "kovix_device_client"
        private const val PREF_BASE_URL = "baseUrl"
        private const val PREF_INSTALL_CODE = "installCode"
        private const val PREF_CLIENT_SECRET = "clientSecret"
        private const val PREF_LAST_STATUS = "lastStatus"
        private const val PREF_LAST_SYNC = "lastSyncAt"
        private const val PREF_PENDING_PUSH_TOKEN = "pendingPushToken"
        private const val PREF_REGISTERED_PUSH_TOKEN = "registeredPushToken"
        private const val CHANNEL_ID = "kovix_device_sync"
        private const val CHANNEL_NAME = "KOVIX Sync"
        private const val NOTIFICATION_ID = 4001
        private const val DEFAULT_INTERVAL_MS = 300_000L
        private const val RETRY_INTERVAL_MS = 60_000L

        const val ACTION_START = "com.kovix.client.action.START_SYNC"
        const val ACTION_STOP = "com.kovix.client.action.STOP_SYNC"
    }

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var pollingJob: Job? = null
    private var pollingIntervalMs: Long = DEFAULT_INTERVAL_MS

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }

        startForegroundInternal("Sincronizacion activa")
        if (pollingJob == null) {
            startPollingLoop()
        }
        return START_STICKY
    }

    override fun onDestroy() {
        pollingJob?.cancel()
        serviceScope.cancel()
        super.onDestroy()
    }

    private fun startPollingLoop() {
        pollingJob = serviceScope.launch {
            while (true) {
                runSyncCycle()
                delay(pollingIntervalMs)
            }
        }
    }

    private suspend fun runSyncCycle() {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val baseUrl = prefs.getString(PREF_BASE_URL, BuildConfig.DEFAULT_BASE_URL).orEmpty().trim()
        val installCode = prefs.getString(PREF_INSTALL_CODE, "").orEmpty().trim()
        val clientSecret = prefs.getString(PREF_CLIENT_SECRET, "").orEmpty().trim()

        if (baseUrl.isBlank() || installCode.isBlank() || clientSecret.isBlank()) {
            pollingIntervalMs = RETRY_INTERVAL_MS
            updateNotification("Esperando configuracion")
            return
        }

        val repository = KovixRepository(baseUrl)
        registerPushTokenIfNeeded(
            repository = repository,
            installCode = installCode,
            clientSecret = clientSecret,
            prefs = prefs,
        )

        val statusResult = repository.fetchStatus(installCode, clientSecret)
        statusResult.onSuccess { response ->
            val payload = response.device
            if (payload == null) {
                pollingIntervalMs = RETRY_INTERVAL_MS
                updateNotification("Respuesta sin estado")
                return
            }

            val previousStatus = prefs.getString(PREF_LAST_STATUS, null)
            val currentStatus = normalizeStatus(payload.status)

            prefs.edit()
                .putString(PREF_LAST_STATUS, currentStatus)
                .putLong(PREF_LAST_SYNC, System.currentTimeMillis())
                .apply()

            pollingIntervalMs = (payload.policy.nextCheckInSeconds.coerceAtLeast(30) * 1000L)
            updateNotification("Estado: $currentStatus")

            val wasRestricted = isRestricted(previousStatus)
            val nowRestricted = isRestricted(currentStatus)
            val shouldOpenControl = previousStatus == null || wasRestricted != nowRestricted || nowRestricted

            if (shouldOpenControl) {
                launchControlActivity()
            }
        }.onFailure {
            pollingIntervalMs = RETRY_INTERVAL_MS
            updateNotification("Sin conexion con servidor")
            return
        }

        repository.heartbeat(installCode, clientSecret)
    }

    private suspend fun registerPushTokenIfNeeded(
        repository: KovixRepository,
        installCode: String,
        clientSecret: String,
        prefs: android.content.SharedPreferences,
    ) {
        val pendingToken = prefs.getString(PREF_PENDING_PUSH_TOKEN, null)
        val registeredToken = prefs.getString(PREF_REGISTERED_PUSH_TOKEN, null)
        val token = pendingToken ?: fetchFirebaseTokenOrNull() ?: return

        if (token == registeredToken) {
            if (pendingToken != null) {
                prefs.edit().remove(PREF_PENDING_PUSH_TOKEN).apply()
            }
            return
        }

        repository.registerPushToken(
            installCode = installCode,
            clientSecret = clientSecret,
            token = token,
        ).onSuccess {
            prefs.edit()
                .putString(PREF_REGISTERED_PUSH_TOKEN, token)
                .remove(PREF_PENDING_PUSH_TOKEN)
                .apply()
        }
    }

    private fun fetchFirebaseTokenOrNull(): String? {
        FirebaseApp.initializeApp(this)
        val messaging = FirebaseMessaging.getInstance()
        return runCatching {
            Tasks.await(messaging.token, 10, TimeUnit.SECONDS)
        }.getOrNull()?.trim()?.takeIf { it.isNotBlank() }
    }

    private fun isRestricted(status: String?): Boolean {
        return status == "SOLO_LLAMADAS" || status == "BLOQUEADO"
    }

    private fun normalizeStatus(rawStatus: String?): String {
        val value = rawStatus?.trim()?.uppercase().orEmpty()
        return when (value) {
            "ACTIVO", "PAGO_PENDIENTE", "SOLO_LLAMADAS", "BLOQUEADO" -> value
            else -> "SIN_DATOS"
        }
    }

    private fun launchControlActivity() {
        val devicePolicyManager = getSystemService(DevicePolicyManager::class.java)
        val adminComponent = ComponentName(this, KovixDeviceAdminReceiver::class.java)
        val isOwner = devicePolicyManager.isDeviceOwnerApp(packageName)
        if (!isOwner || !devicePolicyManager.isAdminActive(adminComponent)) {
            return
        }

        val launchIntent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        startActivity(launchIntent)
    }

    private fun startForegroundInternal(contentText: String) {
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification(contentText))
    }

    private fun updateNotification(contentText: String) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, buildNotification(contentText))
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channel = NotificationChannel(
            CHANNEL_ID,
            CHANNEL_NAME,
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = "Sincronizacion continua para control remoto del equipo"
        }
        manager.createNotificationChannel(channel)
    }

    private fun buildNotification(contentText: String): Notification {
        val openAppIntent = Intent(this, MainActivity::class.java)
        val pendingIntentFlags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        val pendingIntent = PendingIntent.getActivity(this, 1001, openAppIntent, pendingIntentFlags)

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setContentTitle("KOVIX Client")
            .setContentText(contentText)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .build()
    }
}
