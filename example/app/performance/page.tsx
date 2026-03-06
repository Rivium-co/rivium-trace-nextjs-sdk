'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RiviumTrace, PerformanceSpanFactory, BreadcrumbService } from '@rivium-trace/nextjs-sdk';

export default function PerformancePage() {
  const [status, setStatus] = useState('');

  const trackManualSpans = async () => {
    const sdk = RiviumTrace.getInstance();
    if (!sdk) { setStatus('SDK not initialized'); return; }

    BreadcrumbService.addUser('Testing performance tracking');
    setStatus('Tracking performance...');

    // 1. Simulated API call span
    const startTime1 = new Date();
    await new Promise(r => setTimeout(r, 350));
    sdk.reportPerformanceSpan(
      PerformanceSpanFactory.fromHttpRequest({
        method: 'GET',
        url: 'https://api.example.com/users',
        statusCode: 200,
        durationMs: Date.now() - startTime1.getTime(),
        startTime: startTime1,
        tags: { endpoint: 'users' },
      })
    );

    // 2. Simulated DB query span
    const startTime2 = new Date();
    await new Promise(r => setTimeout(r, 150));
    sdk.reportPerformanceSpan(
      PerformanceSpanFactory.forDbQuery({
        queryType: 'SELECT',
        tableName: 'users',
        durationMs: Date.now() - startTime2.getTime(),
        startTime: startTime2,
        rowsAffected: 42,
      })
    );

    // 3. Simulated failed request span
    const startTime3 = new Date();
    await new Promise(r => setTimeout(r, 100));
    sdk.reportPerformanceSpan(
      PerformanceSpanFactory.fromHttpRequest({
        method: 'POST',
        url: 'https://api.example.com/orders',
        statusCode: 500,
        durationMs: Date.now() - startTime3.getTime(),
        startTime: startTime3,
        errorMessage: 'Internal Server Error',
        tags: { endpoint: 'orders' },
      })
    );

    setStatus('3 performance spans sent to RiviumTrace');
  };

  const trackAutoHttp = async () => {
    const sdk = RiviumTrace.getInstance();
    if (!sdk) { setStatus('SDK not initialized'); return; }

    BreadcrumbService.addUser('Testing auto HTTP tracking');
    setStatus('Making auto-tracked HTTP requests...');

    try {
      const res1 = await fetch('https://jsonplaceholder.typicode.com/posts/1');
      const res2 = await fetch('https://jsonplaceholder.typicode.com/users/1');
      setStatus(`2 HTTP requests auto-tracked: ${res1.status}, ${res2.status}`);
    } catch (e) {
      setStatus(`HTTP request failed: ${e}`);
    }
  };

  const trackDbQuerySpans = async () => {
    const sdk = RiviumTrace.getInstance();
    if (!sdk) { setStatus('SDK not initialized'); return; }

    setStatus('Reporting DB query spans...');

    // Simulate SELECT query
    const start1 = new Date();
    await new Promise(r => setTimeout(r, 15));
    sdk.reportPerformanceSpan(
      PerformanceSpanFactory.forDbQuery({
        queryType: 'SELECT',
        tableName: 'users',
        durationMs: Date.now() - start1.getTime(),
        startTime: start1,
        rowsAffected: 42,
      })
    );

    // Simulate INSERT query
    const start2 = new Date();
    await new Promise(r => setTimeout(r, 25));
    sdk.reportPerformanceSpan(
      PerformanceSpanFactory.forDbQuery({
        queryType: 'INSERT',
        tableName: 'orders',
        durationMs: Date.now() - start2.getTime(),
        startTime: start2,
        rowsAffected: 1,
        tags: { priority: 'high' },
      })
    );

    setStatus('2 DB query spans sent to RiviumTrace');
  };

  const trackOperation = async () => {
    const sdk = RiviumTrace.getInstance();
    if (!sdk) { setStatus('SDK not initialized'); return; }

    setStatus('Running tracked operation...');

    // Track successful operation
    const result = await sdk.trackOperation(
      'simulateApiCall',
      async () => {
        await new Promise(r => setTimeout(r, 350));
        return 'success';
      },
      { operationType: 'custom', tags: { source: 'example_app' } }
    );

    // Track failing operation
    try {
      await sdk.trackOperation(
        'failingOperation',
        async () => {
          await new Promise(r => setTimeout(r, 100));
          throw new Error('Simulated operation failure');
        },
        { operationType: 'custom' }
      );
    } catch {
      // Expected - span is reported with status "error"
    }

    setStatus(`2 operations tracked (1 ok, 1 error). Result: ${result}`);
  };

  const trackBatchSpans = async () => {
    const sdk = RiviumTrace.getInstance();
    if (!sdk) { setStatus('SDK not initialized'); return; }

    setStatus('Sending batch of spans...');

    const now = new Date();
    const spans = [
      PerformanceSpanFactory.fromHttpRequest({
        method: 'GET',
        url: 'https://api.example.com/products',
        statusCode: 200,
        durationMs: 120,
        startTime: new Date(now.getTime() - 120),
      }),
      PerformanceSpanFactory.forDbQuery({
        queryType: 'SELECT',
        tableName: 'products',
        durationMs: 8,
        startTime: new Date(now.getTime() - 8),
        rowsAffected: 50,
      }),
      PerformanceSpanFactory.custom({
        operation: 'renderProductList',
        durationMs: 45,
        startTime: new Date(now.getTime() - 45),
        operationType: 'custom',
      }),
    ];

    sdk.reportPerformanceSpanBatch(spans);
    setStatus(`Batch of ${spans.length} spans sent!`);
  };

  return (
    <div className="container">
      <div className="nav">
        <Link href="/">Home</Link>
      </div>

      <div className="card">
        <h2>Performance Tracking Demo</h2>
        <p>
          RiviumTrace tracks HTTP request latency, database queries, and custom operations.
          Performance data is batched and sent to the RiviumTrace APM dashboard.
        </p>
      </div>

      <div className="card">
        <h2>Manual Performance Spans</h2>
        <p>Report HTTP, DB, and failed request spans manually:</p>
        <button onClick={trackManualSpans}>
          Track Performance (Manual Spans)
        </button>
      </div>

      <div className="card">
        <h2>Auto HTTP Tracking</h2>
        <p>Fetch requests are automatically tracked when performance tracking is enabled:</p>
        <button onClick={trackAutoHttp}>
          Performance Tracking (Auto HTTP)
        </button>
      </div>

      <div className="card">
        <h2>DB Query Spans</h2>
        <p>Track database query performance with query type, table name, and rows affected:</p>
        <button onClick={trackDbQuerySpans}>
          DB Query Span
        </button>
      </div>

      <div className="card">
        <h2>Track Operation (Auto-timed)</h2>
        <p>Wrap any async operation for automatic duration tracking:</p>
        <button onClick={trackOperation}>
          Track Operation (Auto-timed)
        </button>
      </div>

      <div className="card">
        <h2>Batch Span Reporting</h2>
        <p>Send multiple spans in a single batch:</p>
        <button onClick={trackBatchSpans}>
          Batch Span Reporting
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
