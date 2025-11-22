import { inngest } from "../client";

export const campaignDrip = inngest.createFunction(
  { id: "ai-campaign-drip" },
  { event: "campaign/started" },
  async ({ event, step }) => {
    // 1. Generate Content
    const smsContent = await step.run("generate-sms", async () => {
      // Dynamic import for AI SDK
      const { generateText } = await import("ai");
      const { openai } = await import("@ai-sdk/openai");
      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt: `Write an SMS about ${event.data.topic}`,
      });
      return text;
    });

    // 2. Send SMS (Dynamic Import for Optional Module)
    await step.run("send-sms", async () => {
      try {
        const { sendSMS } = await import("@/services/twilio"); 
        await sendSMS(event.data.phone, smsContent);
      } catch (e) {
        console.log("Twilio module missing, skipping.");
      }
    });
  }
);