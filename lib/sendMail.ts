import { sendBrevoTransacEmail } from '@/lib/brevo';

export type MailAttachment = {
  filename: string;
  /**
   * Contenu en base64 (SANS préfixe data:).
   * Doit rester identique à avant (PDF/CSV générés côté serveur).
   */
  contentBase64: string;
};

export type SendMailParams = {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: MailAttachment[];
  /**
   * Optionnel (conserve le comportement existant: répondre au client)
   */
  replyTo?: string;
};

function normalizeEmails(to: string | string[]) {
  const list = Array.isArray(to) ? to : [to];
  return list
    .map((e) => (e || '').trim())
    .filter(Boolean)
    .map((email) => ({ email }));
}

function normalizeBase64Content(b64: string) {
  const v = (b64 || '').trim();
  // Si jamais un "data:...;base64," est passé, on le retire proprement.
  const idx = v.indexOf('base64,');
  if (idx !== -1) return v.slice(idx + 'base64,'.length);
  return v;
}

export async function sendMail(params: SendMailParams) {
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME;
  if (!senderEmail || !senderName) {
    throw new Error('BREVO_SENDER_EMAIL / BREVO_SENDER_NAME manquantes dans les variables d’environnement.');
  }

  const to = normalizeEmails(params.to);
  if (to.length === 0) {
    throw new Error('Destinataire email manquant.');
  }

  const attachment = (params.attachments || []).map((a) => ({
    name: a.filename,
    content: normalizeBase64Content(a.contentBase64),
  }));

  const replyTo = (params.replyTo || '').trim();

  const payload: any = {
    sender: { email: senderEmail, name: senderName },
    to,
    subject: params.subject,
    htmlContent: params.html,
  };

  if (attachment.length > 0) payload.attachment = attachment;
  if (replyTo) payload.replyTo = { email: replyTo };

  return await sendBrevoTransacEmail(payload);
}


