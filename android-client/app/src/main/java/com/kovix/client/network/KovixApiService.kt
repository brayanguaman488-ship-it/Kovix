package com.kovix.client.network

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path

interface KovixApiService {
    @GET("devices/client/{installCode}/status")
    suspend fun getDeviceStatus(
        @Path("installCode") installCode: String,
        @Header("x-client-secret") clientSecret: String,
    ): Response<DeviceStatusResponse>

    @POST("devices/client/{installCode}/heartbeat")
    suspend fun sendHeartbeat(
        @Path("installCode") installCode: String,
        @Header("x-client-secret") clientSecret: String,
        @Body body: HeartbeatRequest,
    ): Response<DeviceStatusResponse>

    @POST("credits/client/{installCode}/installments/{installmentId}/report-payment")
    suspend fun reportInstallmentPayment(
        @Path("installCode") installCode: String,
        @Path("installmentId") installmentId: String,
        @Header("x-client-secret") clientSecret: String,
        @Body body: ReportPaymentRequest,
    ): Response<ReportPaymentResponse>

    @POST("devices/client/{installCode}/push-token")
    suspend fun registerPushToken(
        @Path("installCode") installCode: String,
        @Header("x-client-secret") clientSecret: String,
        @Body body: PushTokenRequest,
    ): Response<PushTokenResponse>
}
