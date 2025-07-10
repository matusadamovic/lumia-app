'use client';

import { glassClasses, cn } from '@/lib/utils';

export default function ShopPage() {
  const realMoneyItems = [
    { name: 'Kúpa coinov', price: '€ ???' },
    { name: 'Mesačné Premium', price: '€ ???' },
    { name: 'VIP balíček (7 dní)', price: '€ ???' },
    { name: 'VIP balíček (14 dní)', price: '€ ???' },
    { name: 'VIP balíček (30 dní)', price: '€ ???' },
  ];

  const coinItems = [
    { name: 'Darčeky do chatu', price: '?? coinov' },
    { name: 'Flex itemy na flex wall', price: '?? coinov' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className={cn(glassClasses, 'p-4 max-w-md w-full') }>
        <h1 className="text-xl font-bold text-center mb-4">Shop</h1>
        <h2 className="text-lg font-semibold mb-2">Za reálne peniaze €</h2>
        <ul className="grid grid-cols-1 gap-4 mb-4">
          {realMoneyItems.map((item) => (
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
        <h2 className="text-lg font-semibold mb-2">Za coiny</h2>
        <ul className="grid grid-cols-1 gap-4">
          {coinItems.map((item) => (
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
