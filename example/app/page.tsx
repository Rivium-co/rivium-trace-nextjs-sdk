'use client';

import { RiviumTrace } from '@rivium-trace/nextjs-sdk';

console.log('[PAGE LOAD] RiviumTrace imported:', RiviumTrace);
console.log('[PAGE LOAD] RiviumTrace.getInstance():', RiviumTrace?.getInstance?.());

export default function TestRiviumTracePage() {
  const testManualError = () => {
    try {
      throw new Error('Manual test error from Next.js');
    } catch (error) {
      console.log('[Test] RiviumTrace object:', RiviumTrace);
      const sdk = RiviumTrace.getInstance();
      console.log('[Test] SDK instance:', sdk);

      if (sdk) {
        sdk.captureException(error as Error, 'Testing manual error capture', {
          testData: 'custom metadata',
          timestamp: new Date().toISOString(),
          testNumber: 1,
        });
        alert('✅ Error captured! Check your RiviumTrace dashboard now.');
      } else {
        console.error('[Test] SDK is null - not initialized!');
        alert('❌ SDK not initialized! Check console for details.');
      }
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui' }}>
      <h1>RiviumTrace SDK Test - Step 1</h1>
      <p>Test: Manual Error Capture</p>

      <div style={{ marginTop: '30px' }}>
        <button
          onClick={testManualError}
          style={{
            padding: '15px 30px',
            fontSize: '16px',
            backgroundColor: '#228be6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          📤 Capture Manual Error
        </button>
      </div>

      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h3>What this test does:</h3>
        <ol>
          <li>Creates a new Error object</li>
          <li>Captures it using captureException()</li>
          <li>Sends it to your RiviumTrace backend</li>
        </ol>

        <h3 style={{ marginTop: '20px' }}>What to check on your dashboard:</h3>
        <ul>
          <li>Error message: "Manual test error from Next.js"</li>
          <li>Context message: "Testing manual error capture"</li>
          <li>Extra data: testData, timestamp, testNumber</li>
          <li>Stack trace</li>
          <li>Environment: development</li>
          <li>Platform: browser</li>
        </ul>
      </div>
    </div>
  );
}
