import nodemailer from 'nodemailer';

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  if (!host || !port) return null;

  return nodemailer.createTransport({
    host,
    port: parseInt(port, 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
}

export async function sendSetPasswordEmail(to, setPasswordLink) {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn(
      '[email] SMTP not configured (SMTP_HOST, SMTP_PORT). Skipping send. Set password link (for testing):',
      setPasswordLink
    );
    return { sent: false };
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@nocarbuddy.local',
    to,
    subject: 'Set your NoCarBuddy password',
    text: `Welcome to NoCarBuddy!\n\nClick the link below to set your password. This link expires in 30 minutes.\n\n${setPasswordLink}\n\nIf you didn't sign up, you can ignore this email.`,
    html: `
      <p>Welcome to NoCarBuddy!</p>
      <p>Click the link below to set your password. This link expires in <strong>30 minutes</strong>.</p>
      <p><a href="${setPasswordLink}">Set my password</a></p>
      <p>If you didn't sign up, you can ignore this email.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { sent: true };
  } catch (err) {
    console.error('[email] Failed to send set-password email:', err.message);
    return { sent: false, error: err.message };
  }
}
