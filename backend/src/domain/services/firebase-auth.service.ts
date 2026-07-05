import { getAuth } from "firebase-admin/auth";
import { getFirebaseAdminApp } from "../../infrastructure/firebase/firebase-admin.js";
import { HttpError } from "../../shared/errors/http-error.js";

export type VerifiedFirebaseIdentity = {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
  picture: string | null;
};

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseIdentity> {
  const app = getFirebaseAdminApp();
  if (!app) {
    throw new HttpError(
      503,
      "Firebase Authentication is not configured",
      "FIREBASE_AUTH_UNAVAILABLE",
    );
  }

  try {
    const decoded = await getAuth(app).verifyIdToken(idToken);
    const email = decoded.email?.toLowerCase();
    if (!email) {
      throw new HttpError(
        401,
        "Firebase account does not include an email address",
        "FIREBASE_EMAIL_REQUIRED",
      );
    }

    return {
      uid: decoded.uid,
      email,
      emailVerified: decoded.email_verified === true,
      displayName: typeof decoded.name === "string" ? decoded.name : null,
      picture: typeof decoded.picture === "string" ? decoded.picture : null,
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(
      401,
      "Firebase sign-in token is invalid or expired",
      "INVALID_FIREBASE_TOKEN",
    );
  }
}
