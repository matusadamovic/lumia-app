'use client';

import { glassClasses, cn } from '@/lib/utils';

export default function ShopPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className={cn(glassClasses, 'p-4 max-w-md w-full text-center')}>
        <h1 className="text-xl font-bold">Shop</h1>
        <p>Placeholder page.</p>
      </div>
    </div>
  );
}
