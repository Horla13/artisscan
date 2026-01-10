import { redirect } from 'next/navigation';

// Page legacy (ancienne structure) : redirige vers les pages officielles demandées
export default function TermsPage() {
  redirect('/legal/cgu');
}


