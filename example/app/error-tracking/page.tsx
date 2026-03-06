'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRiviumTrace } from '@rivium-trace/nextjs-sdk/react';

export default function ErrorTrackingPage() {
  const { captureException, captureMessage } = useRiviumTrace();
  const [counter, setCounter] = useState(0);

  const throwError = () => {
    throw new Error('This is a test error from a button click!');
  };

  const throwAsyncError = async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    throw new Error('This is an async error!');
  };

  const captureManualError = () => {
    try {
      // Simulate some operation
      const result = JSON.parse('invalid json');
      console.log(result);
    } catch (error) {
      captureException(
        error as Error,
        'Failed to parse JSON',
        {
          input: 'invalid json',
          operation: 'manual_error_test',
          timestamp: new Date().toISOString(),
        }
      );
      alert('Error captured! Check console and RiviumTrace dashboard.');
    }
  };

  const captureCustomMessage = () => {
    captureMessage(
      `User clicked button ${counter + 1} times`,
      'info',
      {
        counter: counter + 1,
        page: 'error-tracking',
      }
    );
    setCounter(counter + 1);
    alert('Message logged! Check console and RiviumTrace dashboard.');
  };

  const captureWarning = () => {
    captureMessage(
      'This is a warning message',
      'warning',
      {
        warningType: 'custom',
        severity: 'medium',
      }
    );
    alert('Warning logged!');
  };

  return (
    <div className="container">
      <div className="nav">
        <Link href="/">Home</Link>
        <Link href="/breadcrumbs">Breadcrumbs</Link>
        <Link href="/ab-testing">A/B Testing</Link>
        <Link href="/crash-detection">Crash Detection</Link>
      </div>

      <div className="card">
        <h2>Error Tracking Demo</h2>
        <p>
          RiviumTrace automatically captures uncaught errors, promise rejections, and React errors.
          You can also manually capture errors and log messages.
        </p>
      </div>

      <div className="card">
        <h2>Automatic Error Capture</h2>
        <p>Click this button to throw an uncaught error (will be caught by error boundary):</p>
        <button className="danger" onClick={throwError}>
          Throw Synchronous Error
        </button>
        <button className="danger" onClick={() => throwAsyncError()}>
          Throw Async Error
        </button>
      </div>

      <div className="card">
        <h2>Manual Error Capture</h2>
        <p>Catch and report errors manually with custom context:</p>
        <button onClick={captureManualError}>
          Capture Manual Error
        </button>
        <pre style={{ marginTop: '12px', background: '#f4f4f4', padding: '12px', borderRadius: '6px', fontSize: '12px' }}>
{`try {
  const result = JSON.parse('invalid json');
} catch (error) {
  captureException(error, 'Failed to parse JSON', {
    input: 'invalid json',
    operation: 'manual_error_test',
  });
}`}
        </pre>
      </div>

      <div className="card">
        <h2>Message Logging</h2>
        <p>Log messages with different severity levels:</p>
        <button className="secondary" onClick={captureCustomMessage}>
          Log Info Message (clicked {counter} times)
        </button>
        <button style={{ background: '#ed8936' }} onClick={captureWarning}>
          Log Warning
        </button>
        <pre style={{ marginTop: '12px', background: '#f4f4f4', padding: '12px', borderRadius: '6px', fontSize: '12px' }}>
{`captureMessage(
  'User action logged',
  'info',
  { counter, page: 'error-tracking' }
);`}
        </pre>
      </div>

      <div className="card">
        <h2>Error Context</h2>
        <p>Every error includes:</p>
        <ul style={{ marginLeft: '20px', lineHeight: '2' }}>
          <li>Full stack trace with source maps</li>
          <li>Current and previous routes</li>
          <li>Time spent on current route</li>
          <li>Last 20 breadcrumbs (user actions)</li>
          <li>User ID (if set)</li>
          <li>Environment and release version</li>
          <li>Platform information</li>
          <li>Custom tags and metadata</li>
        </ul>
      </div>
    </div>
  );
}
