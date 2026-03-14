/**
 * Email helper: sends transactional emails (e.g. "set your password" after sign up).
 *
 * Uses nodemailer with SMTP. Configure via environment variables so you can use
 * any provider (Gmail, SendGrid, Mailtrap, etc.). If SMTP is not configured,
 * we skip sending and log a warning so the app still works in development.
 */

import nodemailer from 'nodemailer';

/**
 * Create a reusable transporter from env vars.
 * - SMTP_HOST, SMTP_PORT, SMTP_SECURE: where to send mail
 * - SMTP_USER, SMTP_PASS: auth (leave empty for no auth)
 * If none of these are set, returns null and we won't send real email.
 */
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

/**
 * Send an email to the user with a link to set their password.
 * The link includes a token that the set-password page will use to identify the user.
 *
 * @param {string} to - Recipient email address
 * @param {string} setPasswordLink - Full URL the user should click (e.g. https://app.example.com/set-password/?token=abc123)
 * @returns {Promise<{ sent: boolean, error?: string }>} - sent: true if email was sent, false if skipped or failed; error set on failure
 */
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
    console.log('[email] Set-password email sent to', to);
    return { sent: true };
  } catch (err) {
    console.error('[email] Failed to send set-password email:', err.message);
    return { sent: false, error: err.message };
  }
}
