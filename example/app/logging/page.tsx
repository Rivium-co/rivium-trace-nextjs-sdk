'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RiviumTrace } from '@rivium-trace/nextjs-sdk';

export default function LoggingPage() {
  const [status, setStatus] = useState('');

  const sendAllLogs = async () => {
    const sdk = RiviumTrace.getInstance();
    if (!sdk) { setStatus('SDK not initialized'); return; }

    await sdk.trace('Entering checkout flow');
    await sdk.logDebug('Cart items loaded', { item_count: 3 });
    await sdk.info('User started checkout');
    await sdk.warn('Inventory low for item SKU-123', { stock: 2 });
    await sdk.logError('Failed to apply discount code');
    await sdk.fatal('Database connection lost');

    await sdk.flushLogs();
    setStatus('6 logs sent to RiviumTrace (trace, debug, info, warn, error, fatal)');
  };

  const sendTraceLog = async () => {
    const sdk = RiviumTrace.getInstance();
    if (!sdk) { setStatus('SDK not initialized'); return; }

    await sdk.trace('Entering function processOrder', { orderId: 'ORD-12345' });
    setStatus('Trace log sent');
  };

  const sendDebugLog = async () => {
    const sdk = RiviumTrace.getInstance();
    if (!sdk) { setStatus('SDK not initialized'); return; }

    await sdk.logDebug('Cache miss for user profile', {
      userId: 'user-123',
      cacheKey: 'profile:user-123',
    });
    setStatus('Debug log sent');
  };

  const sendInfoLog = async () => {
    const sdk = RiviumTrace.getInstance();
    if (!sdk) { setStatus('SDK not initialized'); return; }

    await sdk.info('User completed checkout', {
      orderId: 'ORD-12345',
      amount: 99.99,
      currency: 'USD',
    });
    setStatus('Info log sent');
  };

  const sendWarnLog = async () => {
    const sdk = RiviumTrace.getInstance();
    if (!sdk) { setStatus('SDK not initialized'); return; }

    await sdk.warn('API rate limit approaching', {
      currentRate: 85,
      limit: 100,
      endpoint: '/api/users',
    });
    setStatus('Warning log sent');
  };

  const sendErrorLog = async () => {
    const sdk = RiviumTrace.getInstance();
    if (!sdk) { setStatus('SDK not initialized'); return; }

    await sdk.logError('Failed to process payment', {
      paymentId: 'PAY-789',
      reason: 'insufficient_funds',
    });
    setStatus('Error log sent');
  };

  const sendFatalLog = async () => {
    const sdk = RiviumTrace.getInstance();
    if (!sdk) { setStatus('SDK not initialized'); return; }

    await sdk.fatal('Database connection pool exhausted', {
      activeConnections: 100,
      maxConnections: 100,
    });
    setStatus('Fatal log sent');
  };

  const flushLogs = async () => {
    const sdk = RiviumTrace.getInstance();
    if (!sdk) { setStatus('SDK not initialized'); return; }

    await sdk.flushLogs();
    setStatus(`Logs flushed! Pending: ${sdk.pendingLogCount}`);
  };

  return (
    <div className="container">
      <div className="nav">
        <Link href="/">Home</Link>
      </div>

      <div className="card">
        <h2>Logging Demo</h2>
        <p>
          RiviumTrace supports structured logging with 6 severity levels.
          Logs are batched and sent periodically or on flush.
        </p>
      </div>

      <div className="card">
        <h2>Send All Log Levels</h2>
        <p>Send one log at each level (trace, debug, info, warn, error, fatal):</p>
        <button onClick={sendAllLogs}>
          Send All 6 Logs
        </button>
      </div>

      <div className="card">
        <h2>Individual Log Levels</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button style={{ background: '#adb5bd' }} onClick={sendTraceLog}>
            Trace
          </button>
          <button style={{ background: '#868e96' }} onClick={sendDebugLog}>
            Debug
          </button>
          <button style={{ background: '#228be6' }} onClick={sendInfoLog}>
            Info
          </button>
          <button style={{ background: '#fd7e14' }} onClick={sendWarnLog}>
            Warning
          </button>
          <button style={{ background: '#fa5252' }} onClick={sendErrorLog}>
            Error
          </button>
          <button style={{ background: '#c92a2a' }} onClick={sendFatalLog}>
            Fatal
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Flush Logs</h2>
        <p>Force-flush any buffered logs immediately:</p>
        <button className="secondary" onClick={flushLogs}>
          Flush Logs Now
        </button>
      </div>

      {status && (
        <div className="card" style={{ backgroundColor: '#e7f5ff', border: '1px solid #339af0' }}>
          <p style={{ margin: 0 }}>{status}</p>
        </div>
      )}
    </div>
  );
}
