import React from 'react';
import type { Metadata } from 'next';
import ClientLiveInstallsPage from './ClientLiveInstallsPage';

export const metadata: Metadata = {
  title: 'Live Installs',
  description: 'Real-time software installation tracking',
};

export default function LiveInstallsPage() {
  return <ClientLiveInstallsPage />;
}
