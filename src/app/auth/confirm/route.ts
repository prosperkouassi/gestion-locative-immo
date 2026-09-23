import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;

  if (!tokenHash || !type) {
    const errorUrl = new URL("/login", requestUrl.origin);
    errorUrl.searchParams.set(
      "auth_error",
      "Le lien d’activation est incomplet ou invalide."
    );

    return NextResponse.redirect(errorUrl);
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    const errorUrl = new URL("/login", requestUrl.origin);
    errorUrl.searchParams.set(
      "auth_error",
      "Le lien d’activation est invalide ou a expiré."
    );

    return NextResponse.redirect(errorUrl);
  }

  const setPasswordUrl = new URL(
    "/auth/set-password",
    requestUrl.origin
  );

  return NextResponse.redirect(setPasswordUrl);
}
