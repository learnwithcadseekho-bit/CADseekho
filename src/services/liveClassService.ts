import { invokeFunction } from "@/services/paymentService";

export interface LiveClassJoinDetails {
  courseTitle: string;
  schedule: string | null;
  signature: string;
  meetingNumber: string;
  password: string;
  userName: string;
  userEmail: string;
}

// Checks enrolment on the server and returns a fresh Zoom SDK signature.
// Signatures expire, so fetch again right before joining.
export function getLiveClassJoinDetails(slug: string): Promise<LiveClassJoinDetails> {
  return invokeFunction<LiveClassJoinDetails>("zoom-join", { slug });
}
