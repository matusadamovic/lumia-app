import { createContext, useContext, useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

/** Context storing number of currently online users */
export const OnlineCountContext = createContext<number | null>(null);

export function OnlineCountProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState<number | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  useEffect(() => {
    const socket = io({ path: '/api/socket', query: { purpose: 'count' } });
    socketRef.current = socket;

    const handleCount = (value: number) => setCount(value);
    socket.on('online-count', handleCount);

    return () => {
      socket.off('online-count', handleCount);
      socket.disconnect();
    };
  }, []);

  return (
    <OnlineCountContext.Provider value={count}>{children}</OnlineCountContext.Provider>
  );
}

export function useOnlineCount() {
  return useContext(OnlineCountContext);
}
