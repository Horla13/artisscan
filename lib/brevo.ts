const BREVO_API_BASE = 'https://api.brevo.com/v3';

export type BrevoTransacEmailPayload = {
  sender: { email: string; name: string };
  to: Array<{ email: string }>;
  subject: string;
  htmlContent: string;
  replyTo?: { email: string };
  attachment?: Array<{ name: string; content: string }>;
};

export async function sendBrevoTransacEmail(payload: BrevoTransacEmailPayload) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('BREVO_API_KEY manquante dans les variables d’environnement.');
  }

  const res = await fetch(`${BREVO_API_BASE}/smtp/email`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return { raw: text }; } })() : {};

  if (!res.ok) {
    const msg = data?.message || data?.raw || `Erreur Brevo (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

