let firebaseMessaging = null;
let firebaseInitAttempted = false;

function normalizePrivateKey(value) {
  if (!value) {
    return null;
  }

  return value.replace(/\\n/g, "\n");
}

function canInitializeFirebase() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID
      && process.env.FIREBASE_CLIENT_EMAIL
      && process.env.FIREBASE_PRIVATE_KEY
  );
}

async function getFirebaseMessaging() {
  if (firebaseMessaging) {
    return firebaseMessaging;
  }

  if (firebaseInitAttempted) {
    return null;
  }

  firebaseInitAttempted = true;

  if (!canInitializeFirebase()) {
    return null;
  }

  try {
    const admin = await import("firebase-admin");
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

    if (!admin.default.apps.length) {
      admin.default.initializeApp({
        credential: admin.default.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }

    firebaseMessaging = admin.default.messaging();
    return firebaseMessaging;
  } catch (error) {
    console.error("No se pudo inicializar Firebase Admin:", error?.message || error);
    return null;
  }
}

export async function sendDeviceStatusPush(device) {
  if (!device?.pushToken) {
    return { ok: false, skipped: "device_without_push_token" };
  }

  const messaging = await getFirebaseMessaging();
  if (!messaging) {
    return { ok: false, skipped: "firebase_not_configured" };
  }

  const payload = {
    token: device.pushToken,
    data: {
      event: "DEVICE_STATUS_CHANGED",
      deviceId: device.id,
      installCode: device.installCode,
      status: device.currentStatus,
      updatedAt: new Date(device.lastStatusChangeAt || new Date()).toISOString(),
    },
    android: {
      priority: "high",
    },
  };

  try {
    const messageId = await messaging.send(payload);
    return { ok: true, messageId };
  } catch (error) {
    const errorCode = error?.errorInfo?.code || error?.code || "unknown_error";
    return {
      ok: false,
      errorCode,
      errorMessage: error?.message || "No se pudo enviar push",
    };
  }
}
