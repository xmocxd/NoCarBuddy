import { Resend } from 'resend';

function getFromAddress() {
  return process.env.RESEND_FROM || process.env.SMTP_FROM;
}

export async function sendSetPasswordEmail(to, setPasswordLink) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = getFromAddress();

  if (!apiKey || !from) {
    console.warn(
      '[email] Resend not configured (set RESEND_API_KEY and RESEND_FROM, or SMTP_FROM for the sender). Skipping send. Set password link (for testing):',
      setPasswordLink
    );
    return { sent: false };
  }

  const resend = new Resend(apiKey);
  const text = `Welcome to NoCarBuddy!\n\nClick the link below to set your password. This link expires in 30 minutes.\n\n${setPasswordLink}\n\nIf you didn't sign up, you can ignore this email.`;
  const html = `
      <p>Welcome to NoCarBuddy!</p>
      <p>Click the link below to set your password. This link expires in <strong>30 minutes</strong>.</p>
      <p><a href="${setPasswordLink}">Set my password</a></p>
      <p>If you didn't sign up, you can ignore this email.</p>
    `;

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject: 'Set your NoCarBuddy password',
      text,
      html,
    });

    if (error) {
      console.error('[email] Failed to send set-password email:', error.message ?? error);
      return { sent: false, error: error.message ?? String(error) };
    }

    return { sent: true, id: data?.id };
  } catch (err) {
    console.error('[email] Failed to send set-password email:', err.message);
    return { sent: false, error: err.message };
  }
}
