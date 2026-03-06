'use client';

import { useEffect, useState } from 'react';

export default function CrashDetectionTest() {
  const [crashMarkerExists, setCrashMarkerExists] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState<string | null>(null);

  useEffect(() => {
    // Check if crash marker exists
    checkCrashMarker();

    // Check heartbeat every 2 seconds
    const interval = setInterval(() => {
      checkHeartbeat();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const checkCrashMarker = () => {
    try {
      const marker = localStorage.getItem('rivium_trace_crash_marker');
      setCrashMarkerExists(marker !== null);
    } catch (error) {
      console.error('Failed to check crash marker:', error);
    }
  };

  const checkHeartbeat = () => {
    try {
      const heartbeat = localStorage.getItem('rivium_trace_heartbeat');
      if (heartbeat) {
        const timestamp = parseInt(heartbeat, 10);
        const date = new Date(timestamp);
        setLastHeartbeat(date.toLocaleTimeString());
      } else {
        setLastHeartbeat(null);
      }
    } catch (error) {
      setLastHeartbeat(null);
    }
  };

  const simulateCrash = () => {
    alert(
      '⚠️ This will simulate a browser crash.\n\n' +
      'Method: Force-create a crash marker that persists through tab close.\n\n' +
      'Steps:\n' +
      '1. Crash marker will be created\n' +
      '2. Kill this browser tab (use Task Manager or Force Quit)\n' +
      '3. Or simply close the browser entirely\n' +
      '4. Reopen and navigate to this page\n' +
      '5. The crash will be detected and reported\n\n' +
      'Note: Normal tab close might clean up the marker.\n' +
      'For best results, force-kill the tab or browser.\n\n' +
      'Ready? Click OK to proceed.'
    );

    // Create a crash marker with a past timestamp to simulate a real crash
    try {
      const marker = {
        timestamp: new Date(Date.now() - 30000).toISOString(), // 30 seconds ago
        startTime: Date.now() - 30000,
        url: window.location.href,
        userAgent: navigator.userAgent,
      };

      localStorage.setItem('rivium_trace_crash_marker', JSON.stringify(marker));
      localStorage.setItem('rivium_trace_heartbeat', (Date.now() - 35000).toString()); // 35 seconds ago

      alert(
        '✅ Crash marker created!\n\n' +
        'The marker is timestamped 30 seconds in the past.\n\n' +
        'IMPORTANT: To test properly:\n' +
        '• On Mac: Cmd+Option+Esc → Force Quit browser\n' +
        '• On Windows: Task Manager → End Task\n' +
        '• Or: Close entire browser (not just this tab)\n\n' +
        'Then reopen browser and navigate to:\n' +
        window.location.href
      );

      setCrashMarkerExists(true);
    } catch (error) {
      console.error('Failed to create crash marker:', error);
      alert('❌ Failed to create crash marker!');
    }
  };

  const clearCrashMarker = () => {
    try {
      localStorage.removeItem('rivium_trace_crash_marker');
      localStorage.removeItem('rivium_trace_heartbeat');
      setCrashMarkerExists(false);
      alert('✅ Crash marker cleared!');
    } catch (error) {
      alert('❌ Failed to clear crash marker!');
    }
  };

  const causeCrashWithInfiniteLoop = () => {
    const confirmed = confirm(
      '⚠️ WARNING: This will freeze your browser tab!\n\n' +
      'This creates an infinite loop that makes the tab unresponsive.\n' +
      'Your browser will likely offer to kill the tab.\n\n' +
      'Are you sure you want to proceed?'
    );

    if (confirmed) {
      alert('Starting infinite loop in 2 seconds...\n\nYour tab will freeze!');
      setTimeout(() => {
        // Create infinite loop
        // eslint-disable-next-line no-constant-condition
        while (true) {
          // This will freeze the tab
        }
      }, 2000);
    }
  };

  const causeMemoryLeak = () => {
    const confirmed = confirm(
      '⚠️ WARNING: This will consume a lot of memory!\n\n' +
      'This creates a massive array that may crash your tab or browser.\n\n' +
      'Are you sure you want to proceed?'
    );

    if (confirmed) {
      alert('Allocating massive memory in 2 seconds...');
      setTimeout(() => {
        try {
          const hugeArray = [];
          // Try to allocate huge memory
          for (let i = 0; i < 100000000; i++) {
            hugeArray.push(new Array(10000).fill(Math.random()));
          }
        } catch (error) {
          alert('Memory allocation failed: ' + error);
        }
      }, 2000);
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui', maxWidth: '900px' }}>
      <h1>RiviumTrace SDK Test - Step 5</h1>
      <p>Test: Crash Detection</p>

      <div style={{
        marginTop: '20px',
        padding: '20px',
        backgroundColor: crashMarkerExists ? '#fff3bf' : '#e7f5ff',
        borderRadius: '8px',
        border: `2px solid ${crashMarkerExists ? '#fcc419' : '#339af0'}`,
        marginBottom: '30px'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: crashMarkerExists ? '#e67700' : '#1971c2' }}>
          {crashMarkerExists ? '⚠️ Crash Marker Active' : '✅ No Crash Detected'}
        </h3>
        <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
          <strong>Crash Marker:</strong> {crashMarkerExists ? 'EXISTS (tab may have crashed)' : 'Not present'}
        </p>
        <p style={{ margin: '0', fontSize: '14px' }}>
          <strong>Last Heartbeat:</strong> {lastHeartbeat || 'No heartbeat detected'}
        </p>
        {crashMarkerExists && (
          <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: '#495057' }}>
            The crash marker indicates the app did not close properly in the last session.
            Check your RiviumTrace dashboard for the crash report.
          </p>
        )}
      </div>

      <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>Method 1: Simulated Crash (Recommended)</h3>
          <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#495057' }}>
            This creates a crash marker and instructs you to close the tab manually.
            When you reopen, the crash will be detected and reported.
          </p>
          <button
            onClick={simulateCrash}
            style={{
              padding: '15px 30px',
              fontSize: '16px',
              backgroundColor: '#fd7e14',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            🧪 Simulate Browser Crash (Safe)
          </button>
        </div>

        <div style={{
          padding: '20px',
          backgroundColor: '#fff5f5',
          borderRadius: '8px',
          border: '2px solid #fa5252'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#c92a2a' }}>Method 2: Real Crash - Infinite Loop</h3>
          <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#495057' }}>
            ⚠️ <strong>WARNING:</strong> This will freeze your browser tab with an infinite loop.
            Your browser will detect it's unresponsive and offer to kill the tab.
          </p>
          <button
            onClick={causeCrashWithInfiniteLoop}
            style={{
              padding: '15px 30px',
              fontSize: '16px',
              backgroundColor: '#fa5252',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            💥 Freeze Tab with Infinite Loop
          </button>
        </div>

        <div style={{
          padding: '20px',
          backgroundColor: '#fff5f5',
          borderRadius: '8px',
          border: '2px solid #fa5252'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#c92a2a' }}>Method 3: Real Crash - Memory Overflow</h3>
          <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#495057' }}>
            ⚠️ <strong>WARNING:</strong> This tries to allocate massive amounts of memory,
            which may crash your tab or entire browser.
          </p>
          <button
            onClick={causeMemoryLeak}
            style={{
              padding: '15px 30px',
              fontSize: '16px',
              backgroundColor: '#fa5252',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            💥 Crash Tab with Memory Overflow
          </button>
        </div>

        {crashMarkerExists && (
          <button
            onClick={clearCrashMarker}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              backgroundColor: '#495057',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            🗑️ Clear Crash Marker
          </button>
        )}
      </div>

      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h3>How Crash Detection Works:</h3>
        <ol>
          <li><strong>App Start:</strong> When your app starts, it creates a crash marker in localStorage</li>
          <li><strong>Heartbeat:</strong> Every 5 seconds, a heartbeat timestamp is updated</li>
          <li><strong>Normal Close:</strong> When the app closes normally (page unload), the crash marker is removed</li>
          <li><strong>Crash Detection:</strong> On next start, if the marker still exists, a crash is detected</li>
          <li><strong>Reporting:</strong> The crash is automatically reported to RiviumTrace with details</li>
        </ol>

        <h3 style={{ marginTop: '20px' }}>What to check on your dashboard:</h3>
        <ul>
          <li>Error message: "Browser tab crashed or was force-closed"</li>
          <li>Crash type: "abnormal_termination" or "unresponsive"</li>
          <li>Crashed URL: The page where crash occurred</li>
          <li>Time since crash in seconds</li>
          <li>Last heartbeat timestamp</li>
          <li>User agent information</li>
        </ul>

        <h3 style={{ marginTop: '20px' }}>Testing Instructions:</h3>
        <p><strong>Method 1 (Recommended):</strong></p>
        <ol>
          <li>Click "Simulate Browser Crash"</li>
          <li>Close this tab using the X button (or Cmd+W / Ctrl+W)</li>
          <li>Open a new tab and navigate back to this page</li>
          <li>Check your RiviumTrace dashboard for the crash report</li>
        </ol>

        <p style={{ marginTop: '15px' }}><strong>Method 2 & 3 (Real Crashes):</strong></p>
        <ol>
          <li>Click one of the "Real Crash" buttons</li>
          <li>Your tab will freeze or crash</li>
          <li>Your browser will offer to kill the unresponsive tab</li>
          <li>Kill the tab and reopen this page</li>
          <li>The crash will be detected and reported automatically</li>
        </ol>

        <p style={{ marginTop: '20px', fontSize: '14px', color: '#495057' }}>
          <strong>Note:</strong> Crash detection works best in production builds. Development mode
          may have hot-reloading that interferes with the crash marker. For best results, test in
          a production build.
        </p>
      </div>
    </div>
  );
}
