import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://cdn.jsdelivr.net/npm/resend@latest/+esm";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface SendPasswordResetOTPRequest {
  email: string;
  otp: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, otp } = (await req.json()) as SendPasswordResetOTPRequest;

    if (!email || !otp) {
      return new Response(JSON.stringify({ error: "Missing email or otp" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const response = await resend.emails.send({
      from: "onboarding@resend.dev", // For testing - change to your verified domain later
      to: email,
      subject: "Password Reset Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2d8cff;">Password Reset Request</h2>
          <p>We received a request to reset your password. Here's your verification code:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h1 style="letter-spacing: 5px; color: #2d8cff; margin: 0; font-size: 36px;">${otp}</h1>
          </div>
          
          <p style="color: #666;">
            This code will expire in 10 minutes. If you didn't request a password reset, please ignore this email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          
          <p style="font-size: 12px; color: #999;">
            This is an automated email. Please do not reply to this message.
          </p>
        </div>
      `,
    });

    if (response.error) {
      return new Response(JSON.stringify({ error: response.error }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(
      JSON.stringify({ success: true, messageId: response.data?.id }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
