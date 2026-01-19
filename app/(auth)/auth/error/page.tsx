import React from 'react';
import type { Metadata } from 'next';
import ClientAuthError from './ClientAuthError';

export const metadata: Metadata = {
  title: 'Authentication Error',
  description: 'Authentication failed',
};

export default function AuthErrorPage() {
  return <ClientAuthError />;
}
