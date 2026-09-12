import React from 'react';
import ReactDOM from 'react-dom/client';
import AdminApp from './AdminApp.jsx'; // మీ AdminApp.jsx ఫైల్ పేరు ఇక్కడ ఇవ్వాలి
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>
);