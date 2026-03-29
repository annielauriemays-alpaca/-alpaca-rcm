import React, { useState } from 'react';
import Dashboard from './Dashboard';
import RCMOS from './RCMOS';
import Roster from './Roster';
import PayerKB from './PayerKB';
import Prompts from './Prompts';

const navLinks = ['Revenue Health'];

export default function App() {
  const [page, setPage] = useState('dashboard');

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard />;
      case 'rcm-os': return <RCMOS />;
      case 'roster': return <Roster />;
      case 'kb': return <PayerKB />;
      case 'prompts': return <Prompts />;
      default: return <Dashboard />;
    }
  };

  return (
    <div style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text-primary)', minHeight: '100vh', background: '#fafaf8' }}>
      <div style={{ borderBottom: '0.5px solid var(--color-border-tertiary)', padding: '0 24px', background: 'var(--color-background-primary)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 2, height: 52, overflowX: 'auto' }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginRight: 20, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
            Alpaca Health RCM
          </div>
          {NAV_ITEMS.map(n => (
            <button
              key={n.id}
              onClick={() => setPage(n.id)}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px 14px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: page === n.id ? 500 : 400,
                color: page === n.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                borderBottom: page === n.id ? '2px solid var(--color-text-primary)' : '2px solid transparent',
                borderRadius: 0,
                height: 52,
                whiteSpace: 'nowrap',
              }}
            >
              {n.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 24px' }}>
        {renderPage()}
      </div>
    </div>
  );
}
