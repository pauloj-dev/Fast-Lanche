import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [modal, setModal] = useState(null);
  const close = useCallback(() => setModal(null), []);
  const open = useCallback(({ title, content }) => setModal({ title, content }), []);
  const value = useMemo(() => ({ open, close, modal }), [open, close, modal]);
  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
}

export const useModal = () => useContext(ModalContext);
