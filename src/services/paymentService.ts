import { supabase } from "@/lib/supabaseClient";

// Razorpay Checkout flow — see supabase/migrations/20260922090000_razorpay_payments.sql
// for the full server-side picture. The browser only ever sends a course id;
// the amount comes from courses.price inside create-razorpay-order.

const CHECKOUT_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayFailure {
  error?: { description?: string };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: "payment.failed", handler: (response: RazorpayFailure) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

interface OrderResponse {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  courseTitle: string;
}

let scriptPromise: Promise<void> | null = null;

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT_URL;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Couldn't load the payment window. Check your connection and try again."));
    };
    document.body.appendChild(script);
  });
  return scriptPromise;
}

// supabase.functions.invoke puts non-2xx bodies on error.context — surface
// the function's own { error } message when there is one.
async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T & { error?: string }>(name, { body });
  if (error) {
    let message = "Something went wrong. Please try again.";
    try {
      const parsed = await (error as { context?: Response }).context?.json();
      if (parsed?.error) message = parsed.error;
    } catch {
      // keep the generic message
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export type CheckoutResult = "enrolled" | "dismissed";

export async function startCourseCheckout(
  courseId: string,
  prefill: { name?: string; email?: string; contact?: string }
): Promise<CheckoutResult> {
  const [order] = await Promise.all([
    invokeFunction<OrderResponse>("create-razorpay-order", { courseId }),
    loadCheckoutScript(),
  ]);

  return new Promise<CheckoutResult>((resolve, reject) => {
    let lastFailure: string | null = null;
    const rzp = new window.Razorpay!({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: "CADseekho",
      description: order.courseTitle,
      prefill,
      // Matches --accent in src/styles/tokens.css.
      theme: { color: "#E8622C" },
      handler: (response: RazorpaySuccess) => {
        invokeFunction("verify-razorpay-payment", { ...response })
          .then(() => resolve("enrolled"))
          // Payment went through but instant verification failed — the
          // webhook will still enroll them, so don't tell them it failed.
          .catch(() =>
            reject(new Error("Payment received — your enrollment is being confirmed. Refresh in a minute."))
          );
      },
      // Closing the modal after a failed attempt surfaces that failure;
      // closing it without trying is a plain cancel.
      modal: {
        ondismiss: () => (lastFailure ? reject(new Error(lastFailure)) : resolve("dismissed")),
      },
    });
    // Razorpay keeps the modal open after a failure so the user can retry
    // with another method — remember why, in case they give up instead.
    rzp.on("payment.failed", (response) => {
      lastFailure = `Payment failed: ${response.error?.description ?? "please try again"}. You have not been charged.`;
    });
    rzp.open();
  });
}
