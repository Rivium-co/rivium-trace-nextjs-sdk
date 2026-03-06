'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RiviumTrace } from '@rivium-trace/nextjs-sdk';

export default function MessageLoggingTest() {
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);

  const testInfoMessage = async () => {
    const sdk = RiviumTrace.getInstance();
    if (!sdk) { setStatus('SDK not initialized'); return; }

    setSending(true);
    await sdk.captureMessage('User completed checkout', 'info', {
      orderId: '12345',
      amount: 99.99,
      currency: 'USD',
      items: 3,
    });
    setSending(false);
    setStatus('Info message sent! Check your dashboard.');
  };

  const testWarningMessage = async () => {
    const sdk = RiviumTrace.getInstance();
    if (!sdk) { setStatus('SDK not initialized'); return; }

    setSending(true);
    await sdk.captureMessage('API rate limit approaching', 'warning', {
      currentRate: 85,
      limit: 100,
      endpoint: '/api/users',
    });
    setSending(false);
    setStatus('Warning message sent! Check your dashboard.');
  };

  const testDebugMessage = async () => {
    const sdk = RiviumTrace.getInstance();
    if (!sdk) { setStatus('SDK not initialized'); return; }

    setSending(true);
    await sdk.captureMessage('Cache miss for user profile', 'debug', {
      userId: 'user-123',
      cacheKey: 'profile:user-123',
      timestamp: new Date().toISOString(),
    });
    setSending(false);
    setStatus('Debug message sent! Check your dashboard.');
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link href="/" style={{ color: '#228be6' }}>Home</Link>
      </div>

      <h1>RiviumTrace SDK Test - Messages</h1>
      <p>Test: Message Logging (captureMessage)</p>

      <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <button
          onClick={testInfoMessage}
          disabled={sending}
          style={{
            padding: '15px 30px',
            fontSize: '16px',
            backgroundColor: sending ? '#adb5bd' : '#228be6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: sending ? 'not-allowed' : 'pointer',
          }}
        >
          Log Info Message
        </button>

        <button
          onClick={testWarningMessage}
          disabled={sending}
          style={{
            padding: '15px 30px',
            fontSize: '16px',
            backgroundColor: sending ? '#adb5bd' : '#fd7e14',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: sending ? 'not-allowed' : 'pointer',
          }}
        >
          Log Warning Message
        </button>

        <button
          onClick={testDebugMessage}
          disabled={sending}
          style={{
            padding: '15px 30px',
            fontSize: '16px',
            backgroundColor: sending ? '#adb5bd' : '#868e96',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: sending ? 'not-allowed' : 'pointer',
          }}
        >
          Log Debug Message
        </button>
      </div>

      {status && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e7f5ff', border: '1px solid #339af0', borderRadius: '8px' }}>
          <p style={{ margin: 0 }}>{status}</p>
        </div>
      )}

      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h3>What this test does:</h3>
        <ol>
          <li><strong>Info Message:</strong> Logs informational events (like user actions, completed processes)</li>
          <li><strong>Warning Message:</strong> Logs warnings (like rate limits, deprecations)</li>
          <li><strong>Debug Message:</strong> Logs debug info (like cache misses, internal state)</li>
        </ol>

        <h3 style={{ marginTop: '20px' }}>What to check on your dashboard:</h3>
        <ul>
          <li>Message text and level (info/warning/debug)</li>
          <li>Custom metadata for each message type</li>
          <li>Timestamp and environment</li>
          <li>Platform info</li>
        </ul>

        <p style={{ marginTop: '20px', fontSize: '14px', color: '#495057' }}>
          <strong>Tip:</strong> Message logging is useful for tracking important events that aren't errors,
          like user actions, business metrics, or debug information.
        </p>
      </div>
    </div>
  );
}
