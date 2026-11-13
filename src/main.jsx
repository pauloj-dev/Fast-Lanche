import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import { initializeDataSource } from './services/authService.js';
import '../css/styles.css';

// So os shells de react/ tem #root; a guarda evita erro se este entry for carregado por engano em outra pagina.
// No modo HTTP a sessao e recuperada do servidor (cookie) antes do primeiro render; no modo local resolve na hora.
const container = document.getElementById('root');
if (container) initializeDataSource().finally(() => createRoot(container).render(<React.StrictMode><App/></React.StrictMode>));
