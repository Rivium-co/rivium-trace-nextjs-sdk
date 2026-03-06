'use client';

import { useState } from 'react';
import { ErrorBoundary } from '@rivium-trace/nextjs-sdk/react';

// Component that throws an error when clicked
function BuggyComponent({ shouldError }: { shouldError: boolean }) {
  if (shouldError) {
    throw new Error('Boom! Component crashed intentionally for testing');
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#d3f9d8', borderRadius: '8px' }}>
      <h3>✅ Component is working fine</h3>
      <p>Click the button below to trigger an error</p>
    </div>
  );
}

export default function ErrorBoundaryTest() {
  const [triggerError, setTriggerError] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const causeError = () => {
    setTriggerError(true);
  };

  const resetErrorBoundary = () => {
    setTriggerError(false);
    setResetKey(prev => prev + 1);
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui' }}>
      <h1>RiviumTrace SDK Test - Step 3</h1>
      <p>Test: Error Boundary (React Component Errors)</p>

      <div style={{ marginTop: '30px' }}>
        <ErrorBoundary
          key={resetKey}
          fallback={(error, errorInfo, resetError) => (
            <div style={{ padding: '20px', backgroundColor: '#ffe3e3', borderRadius: '8px', border: '2px solid #ff6b6b' }}>
              <h3 style={{ color: '#c92a2a', margin: '0 0 10px 0' }}>❌ Error Caught by ErrorBoundary!</h3>
              <p style={{ margin: '0 0 10px 0', color: '#495057' }}>
                <strong>Message:</strong> {error.message}
              </p>
              <details style={{ marginBottom: '15px' }}>
                <summary style={{ cursor: 'pointer', color: '#495057' }}>
                  View stack trace
                </summary>
                <pre style={{
                  fontSize: '12px',
                  backgroundColor: '#f8f9fa',
                  padding: '10px',
                  borderRadius: '4px',
                  overflow: 'auto',
                  marginTop: '10px'
                }}>
                  {error.stack}
                  {'\n\nComponent Stack:'}
                  {errorInfo?.componentStack}
                </pre>
              </details>
              <button
                onClick={() => {
                  resetError();
                  resetErrorBoundary();
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#228be6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                🔄 Reset and Try Again
              </button>
            </div>
          )}
        >
          <BuggyComponent shouldError={triggerError} />
        </ErrorBoundary>

        {!triggerError && (
          <button
            onClick={causeError}
            style={{
              marginTop: '20px',
              padding: '15px 30px',
              fontSize: '16px',
              backgroundColor: '#fa5252',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            💥 Trigger Component Error
          </button>
        )}
      </div>

      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h3>What this test does:</h3>
        <ol>
          <li>Wraps a component with RiviumTrace's ErrorBoundary</li>
          <li>When you click "Trigger Component Error", the component throws an error</li>
          <li>ErrorBoundary catches the error and:
            <ul style={{ marginTop: '10px' }}>
              <li>Shows a fallback UI to the user</li>
              <li>Automatically sends the error to RiviumTrace dashboard</li>
              <li>Includes component stack trace</li>
            </ul>
          </li>
          <li>You can reset and try again</li>
        </ol>

        <h3 style={{ marginTop: '20px' }}>What to check on your dashboard:</h3>
        <ul>
          <li>Error message: "Boom! Component crashed intentionally for testing"</li>
          <li>Context: "React Error Boundary"</li>
          <li>Component stack showing which component failed</li>
          <li>Extra data: errorBoundary: true, componentStack</li>
        </ul>

        <p style={{ marginTop: '20px', fontSize: '14px', color: '#495057' }}>
          <strong>Tip:</strong> Error boundaries are React's way of catching errors in component trees.
          RiviumTrace's ErrorBoundary automatically reports these to your dashboard while showing a
          graceful fallback UI to users.
        </p>
      </div>
    </div>
  );
}
