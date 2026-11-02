import { useCallback, useEffect, useRef, useState } from 'react';
import { reportError } from '../utils/errors.js';
import { subscribeToStorage } from '../services/storage/storageEvents.js';

// Estados padronizados de dados assincronos (Fase 41): 'loading' -> 'success' | 'error', com `reload` para tentar
// de novo. Quando uma das `watchKeys` muda (nesta ou em outra aba) os dados sao recarregados em segundo plano,
// sem voltar para 'loading' nem piscar a tela.
export function useAsyncData(loader, deps = [], watchKeys = []) {
  const [state, setState] = useState({ status: 'loading', data: undefined, error: null });
  const request = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback((background = false) => {
    const id = ++request.current;
    if (!background) setState(current => ({ ...current, status: 'loading', error: null }));
    Promise.resolve()
      .then(() => loaderRef.current())
      .then(data => { if (id === request.current) setState({ status: 'success', data, error: null }); })
      .catch(error => {
        reportError('carregamento de dados', error);
        if (id === request.current) setState(current => ({ ...current, status: 'error', error }));
      });
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run(false); return () => { request.current += 1; }; }, deps);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => (watchKeys.length ? subscribeToStorage(watchKeys, () => run(true)) : undefined), [watchKeys.join('|')]);

  return { ...state, reload: ({ background = false } = {}) => run(background) };
}
