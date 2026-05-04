import { useEffect, useState } from 'react';
import API from '../api/api';

export function useBackendWarmup(enabled = true) {
  const [status, setStatus] = useState(enabled ? 'checking' : 'ready');

  useEffect(() => {
    if (!enabled) {
      setStatus('ready');
      return;
    }

    let cancelled = false;
    const startedAt = Date.now();

    const warmup = async () => {
      while (!cancelled) {
        try {
          await API.get('/health', { timeout: 10000 });
          if (!cancelled) setStatus('ready');
          return;
        } catch {
          if (cancelled) return;
          if (Date.now() - startedAt > 3000) setStatus('initializing');
          if (Date.now() - startedAt > 45000) {
            setStatus('ready');
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 2500));
        }
      }
    };

    warmup();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return status;
}
