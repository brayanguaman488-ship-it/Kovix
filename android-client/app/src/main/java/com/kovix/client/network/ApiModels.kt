package com.kovix.client.network

data class DevicePolicy(
    val nextCheckInSeconds: Int = 300,
    val warningAfterDaysLate: Int = 1,
    val callsOnlyAfterDaysLate: Int = 7,
    val blockedAfterDaysLate: Int = 30,
)

data class DeviceCreditSummary(
    val contractId: String? = null,
    val totalInstallments: Int? = null,
    val principalAmount: Double? = null,
    val downPaymentAmount: Double? = null,
    val financedAmount: Double? = null,
    val installmentAmount: Double? = null,
    val currency: String? = "USD",
    val paidInstallments: Int? = null,
    val pendingInstallments: Int? = null,
    val overdueInstallments: Int? = null,
    val reportedInstallments: Int? = null,
    val nextDueDate: String? = null,
    val pendingAmount: Double? = null,
    val installments: List<DeviceCreditInstallment> = emptyList(),
)

data class DeviceCreditInstallment(
    val id: String,
    val sequence: Int? = null,
    val dueDate: String? = null,
    val amount: Double? = null,
    val status: String? = null,
)

data class DevicePayload(
    val id: String,
    val installCode: String,
    val status: String? = null,
    val customerName: String? = null,
    val message: String? = null,
    val updatedAt: String? = null,
    val policy: DevicePolicy = DevicePolicy(),
    val credit: DeviceCreditSummary? = null,
)

data class DeviceStatusResponse(
    val ok: Boolean,
    val device: DevicePayload?,
    val message: String? = null,
)

data class HeartbeatRequest(
    val battery: Double? = null,
    val appVersion: String? = null,
)

data class ReportPaymentRequest(
    val note: String? = null,
)

data class ReportPaymentResponse(
    val ok: Boolean,
    val message: String? = null,
)

data class PushTokenRequest(
    val token: String,
)

data class PushTokenResponse(
    val ok: Boolean,
    val message: String? = null,
)
