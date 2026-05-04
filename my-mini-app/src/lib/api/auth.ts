import { ApiError } from "./client";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) ?? "";
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_KEY as string) ?? "";

interface LoginResponse {
  userKey: string;
  accessToken: string;
}

export async function loginWithCode(
  authorizationCode: string,
  referrer: string,
): Promise<LoginResponse> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/auth-login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ authorizationCode, referrer }),
  });

  if (!response.ok) {
    const fallbackMessage = `요청에 실패했어요. (${response.status})`;
    let message = fallbackMessage;
    try {
      const errorBody = (await response.json()) as { message?: string };
      message = errorBody.message ?? fallbackMessage;
    } catch {
      message = fallbackMessage;
    }
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as LoginResponse;
}
