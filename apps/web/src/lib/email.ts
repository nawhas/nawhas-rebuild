import nodemailer from 'nodemailer';

function createTransport(): nodemailer.Transporter {
  const secure = process.env['SMTP_SECURE'] === 'true';
  return nodemailer.createTransport({
    host: process.env['SMTP_HOST'] ?? 'localhost',
    port: parseInt(process.env['SMTP_PORT'] ?? '1025', 10),
    secure,
    ...(process.env['SMTP_USER'] && process.env['SMTP_PASS']
      ? { auth: { user: process.env['SMTP_USER'], pass: process.env['SMTP_PASS'] } }
      : {}),
  });
}

const FROM = process.env['SMTP_FROM'] ?? 'noreply@nawhas.com';

export async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  resetUrl: string;
}): Promise<void> {
  const transport = createTransport();
  await transport.sendMail({
    from: FROM,
    to: params.to,
    subject: 'Reset your Nawhas.com password',
    text: [
      `Hi ${params.name},`,
      '',
      'We received a request to reset your password. Click the link below to choose a new password:',
      '',
      params.resetUrl,
      '',
      'This link expires in 1 hour.',
      '',
      'If you did not request a password reset, you can ignore this email — your password will not be changed.',
    ].join('\n'),
    html: `
      <p>Hi ${params.name},</p>
      <p>We received a request to reset your password. Click the button below to choose a new password:</p>
      <p>
        <a href="${params.resetUrl}"
           style="display:inline-block;padding:10px 20px;background:#111827;color:#fff;text-decoration:none;border-radius:6px;font-weight:500">
          Reset password
        </a>
      </p>
      <p style="color:#6b7280;font-size:14px">This link expires in 1 hour.</p>
      <p style="color:#6b7280;font-size:14px">
        If the button doesn't work, copy and paste this URL into your browser:<br/>
        <a href="${params.resetUrl}" style="color:#374151">${params.resetUrl}</a>
      </p>
      <p style="color:#9ca3af;font-size:12px">If you did not request a password reset, you can ignore this email — your password will not be changed.</p>
    `,
  });
}

export async function sendVerificationEmail(params: {
  to: string;
  name: string;
  verificationUrl: string;
}): Promise<void> {
  const transport = createTransport();
  await transport.sendMail({
    from: FROM,
    to: params.to,
    subject: 'Verify your Nawhas.com email address',
    text: [
      `Hi ${params.name},`,
      '',
      'Please verify your email address by visiting the link below:',
      '',
      params.verificationUrl,
      '',
      'This link expires in 1 hour.',
      '',
      'If you did not create an account, you can ignore this email.',
    ].join('\n'),
    html: `
      <p>Hi ${params.name},</p>
      <p>Please verify your email address by clicking the button below:</p>
      <p>
        <a href="${params.verificationUrl}"
           style="display:inline-block;padding:10px 20px;background:#111827;color:#fff;text-decoration:none;border-radius:6px;font-weight:500">
          Verify email address
        </a>
      </p>
      <p style="color:#6b7280;font-size:14px">This link expires in 1 hour.</p>
      <p style="color:#6b7280;font-size:14px">
        If the button doesn't work, copy and paste this URL into your browser:<br/>
        <a href="${params.verificationUrl}" style="color:#374151">${params.verificationUrl}</a>
      </p>
      <p style="color:#9ca3af;font-size:12px">If you did not create an account, you can ignore this email.</p>
    `,
  });
}
