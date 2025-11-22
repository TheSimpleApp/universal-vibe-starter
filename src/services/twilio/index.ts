import twilio from 'twilio';

const getClient = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid) throw new Error("Twilio credentials missing");
  return twilio(sid, token);
}

export async function sendSMS(to: string, body: string) {
  const client = getClient();
  return client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
  });
}