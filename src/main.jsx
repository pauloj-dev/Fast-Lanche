import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import '../css/styles.css';

// So os shells de react/ tem #root; a guarda evita erro se este entry for carregado por engano em outra pagina.
const container = document.getElementById('root');
if (container) createRoot(container).render(<React.StrictMode><App/></React.StrictMode>);
