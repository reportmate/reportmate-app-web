import React from 'react';
import type { Metadata } from 'next';
import ClientFailuresPage from './ClientFailuresPage';

export const metadata: Metadata = {
  title: 'Failed Check-ins',
  description: 'Devices that reached the server but were rejected during registration or check-in',
};

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic';

export default function FailuresPage() {
  return <ClientFailuresPage />;
}
