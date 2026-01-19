import React from 'react';
import type { Metadata } from 'next';
import ClientEventsPage from './ClientEventsPage';

export const metadata: Metadata = {
  title: 'Events',
  description: 'System events and notifications',
};

// Force dynamic rendering and disable caching for events page
export const dynamic = 'force-dynamic';

export default function EventsPage() {
  return <ClientEventsPage />;
}
