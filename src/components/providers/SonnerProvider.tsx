'use client';

import { Toaster } from 'sonner';

export function SonnerProvider() {
  return (
    <Toaster
      position="top-center"
      richColors
      expand={true}
      closeButton
      theme="light"
    />
  );
} 