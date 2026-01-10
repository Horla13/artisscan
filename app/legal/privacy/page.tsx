import { redirect } from 'next/navigation';

// Page legacy (ancienne structure) : redirige vers la page officielle
export default function PrivacyPage() {
  redirect('/legal/confidentialite');
}


