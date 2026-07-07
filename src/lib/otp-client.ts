import { createClient } from "./supabase";

export async function sendOtp(email: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke("send-otp", {
    body: { email },
  });

  if (error) {
    let errorMessage = error.message;
    if ((error as any).context) {
      try {
        const errData = await (error as any).context.json();
        if (errData && errData.error) {
          errorMessage = errData.error;
        }
      } catch (e) {
        // Keep original error message
      }
    }
    throw new Error(errorMessage || "Failed to send OTP");
  }

  if (data && data.error) {
    throw new Error(data.error);
  }

  return true;
}

export async function verifyOtp(email: string, otp: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke("verify-otp", {
    body: { email, otp },
  });

  if (error) {
    let errorMessage = error.message;
    if ((error as any).context) {
      try {
        const errData = await (error as any).context.json();
        if (errData && errData.error) {
          errorMessage = errData.error;
        }
      } catch (e) {
        // Keep original error message
      }
    }
    throw new Error(errorMessage || "Failed to verify OTP");
  }

  if (data && data.error) {
    throw new Error(data.error);
  }

  return true;
}
