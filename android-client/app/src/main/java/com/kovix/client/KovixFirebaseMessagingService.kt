package com.kovix.client

import android.content.Context
import android.content.Intent
import android.os.Build
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class KovixFirebaseMessagingService : FirebaseMessagingService() {
    companion object {
        private const val PREFS_NAME = "kovix_device_client"
        private const val PREF_PENDING_PUSH_TOKEN = "pendingPushToken"
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(PREF_PENDING_PUSH_TOKEN, token)
            .apply()
        startSyncService()
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        startSyncService()

        val status = message.data["status"]
        if (status == "BLOQUEADO" || status == "SOLO_LLAMADAS") {
            val launchIntent = Intent(this, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
            startActivity(launchIntent)
        }
    }

    private fun startSyncService() {
        val serviceIntent = Intent(this, DeviceSyncService::class.java).apply {
            action = DeviceSyncService.ACTION_START
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }
    }
}
