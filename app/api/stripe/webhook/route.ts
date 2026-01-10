// Route demandée : /api/stripe/webhook
// On délègue à l’implémentation existante (signature Stripe + upgrade Supabase).
export { POST } from '../../stripe-webhook/route';


