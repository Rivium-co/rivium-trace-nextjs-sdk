'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RiviumTrace } from '@rivium-trace/nextjs-sdk';

export default function UserContextPage() {
  const [status, setStatus] = useState('');

  const setUserId = () => {
    const sdk = RiviumTrace.getInstance();
    if (!sdk) { setStatus('SDK not initialized'); return; }

    const userId = `user_${Date.now()}`;
    sdk.setUserId(userId);

    sdk.captureMessage('User ID updated', 'info', { user_id: userId });
    setStatus(`User ID set: ${userId}`);
  };

  const getUserId = () => {
    const sdk = RiviumTrace.getInstance();
    if (!sdk) { setStatus('SDK not initialized'); return; }

    const userId = sdk.getUserId();
    setStatus(userId ? `Current User ID: ${userId}` : 'No User ID set');
  };

  const captureWithUserContext = () => {
    const sdk = RiviumTrace.getInstance();
    if (!sdk) { setStatus('SDK not initialized'); return; }

    try {
      throw new Error('Test error with user context');
    } catch (error) {
      sdk.captureException(error as Error, 'Error with user context attached', {
        screen: 'user-context',
        action: 'test_user_context',
      });
      setStatus(`Error captured with User ID: ${sdk.getUserId() || 'none'}`);
    }
  };

  return (
    <div className="container">
      <div className="nav">
        <Link href="/">Home</Link>
      </div>

      <div className="card">
        <h2>User Context Demo</h2>
        <p>
          Set a user ID to associate errors, messages, and logs with specific users.
          The user ID is included in all subsequent reports.
        </p>
      </div>

      <div className="card">
        <h2>Set User ID</h2>
        <p>Generate and set a random user ID:</p>
        <button onClick={setUserId}>
          Set User ID
        </button>
      </div>

      <div className="card">
        <h2>Get Current User ID</h2>
        <p>Check what user ID is currently set:</p>
        <button className="secondary" onClick={getUserId}>
          Get User ID
        </button>
      </div>

      <div className="card">
        <h2>Capture Error with User Context</h2>
        <p>Send an error that includes the current user ID:</p>
        <button className="danger" onClick={captureWithUserContext}>
          Capture Error with User Context
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
