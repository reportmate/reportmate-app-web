import React from 'react';
import type { Metadata } from 'next';
import ClientSettingsPage from './ClientSettingsPage';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your ReportMate configuration and modules',
};

export default function SettingsPage() {
  return <ClientSettingsPage />;
}
