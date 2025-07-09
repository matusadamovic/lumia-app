'use client';

import { glassClasses, cn } from '@/lib/utils';

export default function ShopPage() {
  const items = [
    { name: 'LUMIA Burger', price: '$5.99' },
    { name: 'Rainbow Fries', price: '$2.49' },
    { name: 'Aurora Shake', price: '$3.99' },
    { name: 'Prism Pizza', price: '$8.99' },
    { name: 'Nebula Nuggets', price: '$4.49' },
    { name: 'Galaxy Soda', price: '$1.99' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className={cn(glassClasses, 'p-4 max-w-md w-full') }>
        <h1 className="text-xl font-bold text-center mb-4">Shop</h1>
        <ul className="grid grid-cols-1 gap-4">
          {items.map((item) => (
            <li key={item.name} className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-zinc-500">{item.price}</p>
              </div>
              <button
                className="bg-zinc-500 text-white px-3 py-1 rounded opacity-50 cursor-not-allowed"
                disabled
              >
                Buy
              </button>
            </li>
          ))}
        </ul>
        <p className="text-center text-sm mt-4 text-zinc-400">
          Purchasing isn&apos;t implemented yet.
        </p>
      </div>
    </div>
  );
}
