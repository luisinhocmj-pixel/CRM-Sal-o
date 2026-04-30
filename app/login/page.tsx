'use client';

import { AuthView } from '@/components/views/AuthView';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const handleAuthSuccess = () => {
    router.push('/');
    router.refresh();
  };

  return <AuthView onAuthSuccess={handleAuthSuccess} />;
}
