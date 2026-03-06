'use client';

import { useState } from 'react';
import { RiviumTrace, BreadcrumbService } from '@rivium-trace/nextjs-sdk';

export default function BreadcrumbsTest() {
  const [logCount, setLogCount] = useState(0);

  const testNavigationBreadcrumb = () => {
    BreadcrumbService.addNavigation('/dashboard', '/profile');
    setLogCount(c => c + 1);
    alert('✅ Navigation breadcrumb added!');
  };

  const testUserActionBreadcrumb = () => {
    BreadcrumbService.addUser('User clicked Buy Now button', {
      buttonId: 'buy-now-btn',
      productId: 'prod-12345',
      price: 49.99,
    });
    setLogCount(c => c + 1);
    alert('✅ User action breadcrumb added!');
  };

  const testHttpBreadcrumb = () => {
    BreadcrumbService.addHttp('GET', 'https://api.example.com/products', 200, {
      duration: 145,
    });
    setLogCount(c => c + 1);
    alert('✅ HTTP breadcrumb added!');
  };

  const testConsoleBreadcrumb = () => {
    BreadcrumbService.addConsole('debug', 'Cart total calculated: $149.99');
    setLogCount(c => c + 1);
    alert('✅ Console breadcrumb added!');
  };

  const testCustomBreadcrumb = () => {
    BreadcrumbService.add('Payment processed successfully', 'info' as any, {
      paymentMethod: 'credit_card',
      amount: 149.99,
      currency: 'USD',
      transactionId: 'txn_abc123',
    });
    setLogCount(c => c + 1);
    alert('✅ Custom breadcrumb added!');
  };

  const triggerErrorWithBreadcrumbs = () => {
    try {
      throw new Error('Test error with breadcrumb trail');
    } catch (error) {
      const sdk = RiviumTrace.getInstance();
      if (sdk) {
        sdk.captureException(error as Error, 'Testing error with breadcrumbs', {
          breadcrumbCount: logCount,
        });
        alert(`✅ Error captured with ${logCount} breadcrumbs! Check your dashboard.`);
      }
    }
  };

  const clearBreadcrumbs = () => {
    BreadcrumbService.clear();
    setLogCount(0);
    alert('🗑️ All breadcrumbs cleared!');
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui', maxWidth: '800px' }}>
      <h1>RiviumTrace SDK Test - Step 4</h1>
      <p>Test: Breadcrumbs (User Journey Tracking)</p>

      <div style={{
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#e7f5ff',
        borderRadius: '8px',
        marginBottom: '30px'
      }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#1971c2' }}>
          📊 Breadcrumbs logged in this session: <strong>{logCount}</strong>
        </p>
        <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#495057' }}>
          Note: Navigation breadcrumbs are automatically tracked by useRiviumTraceNavigation hook
        </p>
      </div>

      <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <button
          onClick={testNavigationBreadcrumb}
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
          🧭 Add Navigation Breadcrumb
        </button>

        <button
          onClick={testUserActionBreadcrumb}
          style={{
            padding: '15px 30px',
            fontSize: '16px',
            backgroundColor: '#40c057',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          👆 Add User Action Breadcrumb
        </button>

        <button
          onClick={testHttpBreadcrumb}
          style={{
            padding: '15px 30px',
            fontSize: '16px',
            backgroundColor: '#7950f2',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          🌐 Add HTTP Breadcrumb
        </button>

        <button
          onClick={testConsoleBreadcrumb}
          style={{
            padding: '15px 30px',
            fontSize: '16px',
            backgroundColor: '#868e96',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          💬 Add Console Breadcrumb
        </button>

        <button
          onClick={testCustomBreadcrumb}
          style={{
            padding: '15px 30px',
            fontSize: '16px',
            backgroundColor: '#f59f00',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          ⭐ Add Custom Breadcrumb
        </button>

        <div style={{
          marginTop: '20px',
          padding: '20px',
          backgroundColor: '#fff3bf',
          borderRadius: '8px',
          border: '2px solid #fcc419'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#e67700' }}>
            Test Complete Breadcrumb Trail
          </h3>
          <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#495057' }}>
            After adding several breadcrumbs above, click this button to trigger an error.
            The error report will include all breadcrumbs in chronological order.
          </p>
          <button
            onClick={triggerErrorWithBreadcrumbs}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#fa5252',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            💥 Trigger Error with Breadcrumbs
          </button>
        </div>

        <button
          onClick={clearBreadcrumbs}
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
          🗑️ Clear All Breadcrumbs
        </button>
      </div>

      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h3>What this test does:</h3>
        <ol>
          <li><strong>Navigation Breadcrumbs:</strong> Track page/route changes</li>
          <li><strong>User Action Breadcrumbs:</strong> Track button clicks, form submissions, etc.</li>
          <li><strong>HTTP Breadcrumbs:</strong> Track API calls and network requests</li>
          <li><strong>Console Breadcrumbs:</strong> Track console.log/warn/error messages</li>
          <li><strong>Custom Breadcrumbs:</strong> Track any custom events (payments, analytics, etc.)</li>
        </ol>

        <h3 style={{ marginTop: '20px' }}>What to check on your dashboard:</h3>
        <ul>
          <li>Each breadcrumb should appear in the "User Journey" or "Breadcrumbs" section</li>
          <li>Breadcrumbs should be in chronological order (oldest to newest)</li>
          <li>Each breadcrumb should include: message, type, timestamp, and custom data</li>
          <li>When you trigger an error, all breadcrumbs should be included in the error report</li>
          <li>Breadcrumb trail helps you understand what the user was doing before the error occurred</li>
        </ul>

        <h3 style={{ marginTop: '20px' }}>Breadcrumb Types:</h3>
        <ul>
          <li><code>navigation</code> - Page/route changes</li>
          <li><code>user</code> - User interactions (clicks, inputs)</li>
          <li><code>http</code> - Network requests</li>
          <li><code>console</code> - Console messages</li>
          <li><code>custom</code> - Any custom event</li>
        </ul>

        <p style={{ marginTop: '20px', fontSize: '14px', color: '#495057' }}>
          <strong>Tip:</strong> Breadcrumbs are powerful for debugging because they show you exactly
          what the user was doing before an error occurred, making it much easier to reproduce and fix issues.
        </p>
      </div>
    </div>
  );
}
