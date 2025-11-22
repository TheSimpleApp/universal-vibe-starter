import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { campaignDrip } from "@/inngest/functions/campaign";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [campaignDrip],
});