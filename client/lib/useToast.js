'use client';

import { useCallback, useRef, useState } from 'react';

export function useToast() {
  const [message, setMessage] = useState('');
  const timerRef = useRef(null);

  const showToast = useCallback((text) => {
    setMessage(text);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMessage(''), 2400);
  }, []);

  return { message, showToast };
}
