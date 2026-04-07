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

/**
 * Notifies the submitter that their contribution was received and is pending review.
 * Fire-and-forget: logs errors, never throws.
 */
export function sendSubmissionReceived(params: {
  to: string;
  submissionId: string;
  type: 'reciter' | 'album' | 'track';
}): void {
  const transport = createTransport();
  const typeLabel = params.type.charAt(0).toUpperCase() + params.type.slice(1);
  transport
    .sendMail({
      from: FROM,
      to: params.to,
      subject: `Your ${typeLabel} submission was received — Nawhas.com`,
      text: [
        `Thank you for your contribution!`,
        '',
        `We received your ${params.type} submission (ID: ${params.submissionId}) and it is now pending review by our moderation team.`,
        '',
        'We will notify you once a decision has been made.',
        '',
        '— The Nawhas.com team',
      ].join('\n'),
      html: `
        <p>Thank you for your contribution!</p>
        <p>We received your <strong>${params.type}</strong> submission and it is now pending review by our moderation team.</p>
        <p style="color:#6b7280;font-size:14px">Submission ID: ${params.submissionId}</p>
        <p>We will notify you once a decision has been made.</p>
        <p style="color:#9ca3af;font-size:12px">— The Nawhas.com team</p>
      `,
    })
    .catch((err: unknown) => {
      console.error('[email] sendSubmissionReceived failed', err);
    });
}

/**
 * Notifies the submitter that their contribution was approved and applied.
 * Fire-and-forget: logs errors, never throws.
 */
export function sendSubmissionApproved(params: {
  to: string;
  submissionId: string;
  type: 'reciter' | 'album' | 'track';
}): void {
  const transport = createTransport();
  const typeLabel = params.type.charAt(0).toUpperCase() + params.type.slice(1);
  transport
    .sendMail({
      from: FROM,
      to: params.to,
      subject: `Your ${typeLabel} submission was approved — Nawhas.com`,
      text: [
        `Great news! Your ${params.type} submission has been approved and is now live on Nawhas.com.`,
        '',
        `Submission ID: ${params.submissionId}`,
        '',
        'Thank you for helping us grow the library!',
        '',
        '— The Nawhas.com team',
      ].join('\n'),
      html: `
        <p>Great news! Your <strong>${params.type}</strong> submission has been approved and is now live on Nawhas.com.</p>
        <p style="color:#6b7280;font-size:14px">Submission ID: ${params.submissionId}</p>
        <p>Thank you for helping us grow the library!</p>
        <p style="color:#9ca3af;font-size:12px">— The Nawhas.com team</p>
      `,
    })
    .catch((err: unknown) => {
      console.error('[email] sendSubmissionApproved failed', err);
    });
}

/**
 * Notifies the submitter of feedback (rejection or changes requested).
 * Fire-and-forget: logs errors, never throws.
 */
export function sendSubmissionFeedback(params: {
  to: string;
  submissionId: string;
  action: 'rejected' | 'changes_requested';
  comment: string | null;
}): void {
  const transport = createTransport();
  const isChangesRequested = params.action === 'changes_requested';
  const subject = isChangesRequested
    ? 'Changes requested on your submission — Nawhas.com'
    : 'Your submission was not approved — Nawhas.com';
  const headline = isChangesRequested
    ? 'Our moderation team has reviewed your submission and requested some changes.'
    : 'Our moderation team has reviewed your submission and it was not approved at this time.';

  transport
    .sendMail({
      from: FROM,
      to: params.to,
      subject,
      text: [
        headline,
        '',
        ...(params.comment ? [`Reviewer comment: ${params.comment}`, ''] : []),
        `Submission ID: ${params.submissionId}`,
        '',
        '— The Nawhas.com team',
      ].join('\n'),
      html: `
        <p>${headline}</p>
        ${params.comment ? `<blockquote style="border-left:3px solid #e5e7eb;padding-left:12px;color:#374151">${params.comment}</blockquote>` : ''}
        <p style="color:#6b7280;font-size:14px">Submission ID: ${params.submissionId}</p>
        <p style="color:#9ca3af;font-size:12px">— The Nawhas.com team</p>
      `,
    })
    .catch((err: unknown) => {
      console.error('[email] sendSubmissionFeedback failed', err);
    });
}
