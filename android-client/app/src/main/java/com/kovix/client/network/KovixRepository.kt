package com.kovix.client.network

import com.kovix.client.BuildConfig
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class KovixRepository(baseUrl: String) {
    private val api: KovixApiService

    init {
        val logger = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(logger)
            .build()

        val retrofit = Retrofit.Builder()
            .baseUrl(normalizeBaseUrl(baseUrl))
            .addConverterFactory(GsonConverterFactory.create())
            .client(client)
            .build()

        api = retrofit.create(KovixApiService::class.java)
    }

    suspend fun fetchStatus(installCode: String, clientSecret: String): Result<DeviceStatusResponse> {
        return runCatching {
            val response = api.getDeviceStatus(installCode, clientSecret)
            if (!response.isSuccessful) {
                throw IllegalStateException("Status HTTP ${response.code()}")
            }
            response.body() ?: throw IllegalStateException("Respuesta vacia")
        }
    }

    suspend fun heartbeat(installCode: String, clientSecret: String): Result<DeviceStatusResponse> {
        return runCatching {
            val body = HeartbeatRequest(appVersion = BuildConfig.VERSION_NAME)
            val response = api.sendHeartbeat(installCode, clientSecret, body)
            if (!response.isSuccessful) {
                throw IllegalStateException("Heartbeat HTTP ${response.code()}")
            }
            response.body() ?: throw IllegalStateException("Heartbeat vacio")
        }
    }

    suspend fun reportInstallmentPayment(
        installCode: String,
        clientSecret: String,
        installmentId: String,
        note: String? = null,
    ): Result<ReportPaymentResponse> {
        return runCatching {
            val response = api.reportInstallmentPayment(
                installCode = installCode,
                installmentId = installmentId,
                clientSecret = clientSecret,
                body = ReportPaymentRequest(note = note),
            )
            if (!response.isSuccessful) {
                throw IllegalStateException("Reportar pago HTTP ${response.code()}")
            }
            response.body() ?: throw IllegalStateException("Respuesta vacia al reportar pago")
        }
    }

    suspend fun registerPushToken(
        installCode: String,
        clientSecret: String,
        token: String,
    ): Result<PushTokenResponse> {
        return runCatching {
            val response = api.registerPushToken(
                installCode = installCode,
                clientSecret = clientSecret,
                body = PushTokenRequest(token = token),
            )
            if (!response.isSuccessful) {
                throw IllegalStateException("Registrar token push HTTP ${response.code()}")
            }
            response.body() ?: throw IllegalStateException("Respuesta vacia al registrar token push")
        }
    }

    private fun normalizeBaseUrl(value: String): String {
        val trimmed = value.trim()
        if (trimmed.isBlank()) {
            return trimmed
        }

        val withScheme = if (
            trimmed.startsWith("http://", ignoreCase = true) ||
            trimmed.startsWith("https://", ignoreCase = true)
        ) {
            trimmed
        } else {
            "https://$trimmed"
        }

        return if (withScheme.endsWith("/")) withScheme else "$withScheme/"
    }
}
