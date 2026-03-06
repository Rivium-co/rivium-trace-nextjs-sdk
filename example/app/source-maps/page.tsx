'use client';

import { useState } from 'react';
import { RiviumTrace } from '@rivium-trace/nextjs-sdk';

// Deeply nested functions to test stack trace clarity
const deepFunction3 = () => {
  throw new Error('Error from deeply nested function (depth 3)');
};

const deepFunction2 = () => {
  deepFunction3();
};

const deepFunction1 = () => {
  deepFunction2();
};

// Complex class with methods to test source maps
class UserProfileManager {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  validateEmail(email: string): boolean {
    if (!email.includes('@')) {
      throw new Error(`Invalid email format: ${email}`);
    }
    return true;
  }

  async saveProfile(data: any): Promise<void> {
    if (!data.name) {
      throw new Error('Profile name is required');
    }
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    throw new Error('Database connection failed while saving profile');
  }

  calculateAge(birthYear: number): number {
    const currentYear = new Date().getFullYear();
    if (birthYear > currentYear) {
      throw new Error('Birth year cannot be in the future');
    }
    return currentYear - birthYear;
  }
}

export default function SourceMapsTest() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isProduction, setIsProduction] = useState(false);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const captureError = (error: Error, context: string) => {
    const sdk = RiviumTrace.getInstance();
    if (sdk) {
      sdk.captureException(error, context, {
        testType: 'source_map_test',
        buildType: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
      });
      addResult(`✅ Error captured: ${error.message}`);
    } else {
      addResult('❌ SDK not initialized');
    }
  };

  const testSimpleError = () => {
    try {
      throw new Error('Simple error from inline code');
    } catch (error) {
      captureError(error as Error, 'Testing simple error stack trace');
    }
  };

  const testDeepStackTrace = () => {
    try {
      deepFunction1();
    } catch (error) {
      captureError(error as Error, 'Testing deep nested function calls');
    }
  };

  const testClassMethodError = () => {
    try {
      const manager = new UserProfileManager('user-123');
      manager.validateEmail('invalid-email');
    } catch (error) {
      captureError(error as Error, 'Testing class method error');
    }
  };

  const testAsyncError = async () => {
    try {
      const manager = new UserProfileManager('user-456');
      await manager.saveProfile({ email: 'test@example.com' });
    } catch (error) {
      captureError(error as Error, 'Testing async function error');
    }
  };

  const testArrowFunctionError = () => {
    const processPayment = (amount: number) => {
      const validateAmount = (amt: number) => {
        if (amt <= 0) {
          throw new Error(`Invalid payment amount: ${amt}`);
        }
      };
      validateAmount(amount);
    };

    try {
      processPayment(-100);
    } catch (error) {
      captureError(error as Error, 'Testing arrow function error');
    }
  };

  const testCalculationError = () => {
    try {
      const manager = new UserProfileManager('user-789');
      manager.calculateAge(2050);
    } catch (error) {
      captureError(error as Error, 'Testing calculation logic error');
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const checkEnvironment = () => {
    setIsProduction(process.env.NODE_ENV === 'production');
    addResult(`Environment: ${process.env.NODE_ENV || 'development'}`);
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui', maxWidth: '1000px', color: '#000' }}>
      <h1 style={{ color: '#000' }}>RiviumTrace SDK Test - Step 7</h1>
      <p style={{ color: '#000' }}>Test: Source Maps & Production Stack Traces</p>

      {/* Environment Info */}
      <div style={{
        marginTop: '20px',
        padding: '20px',
        backgroundColor: isProduction ? '#fff3bf' : '#e7f5ff',
        borderRadius: '8px',
        border: `2px solid ${isProduction ? '#fcc419' : '#339af0'}`,
        marginBottom: '30px'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: isProduction ? '#e67700' : '#1971c2' }}>
          {isProduction ? '🏭 Production Build' : '🔧 Development Build'}
        </h3>
        <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#000' }}>
          <strong>Environment:</strong> {process.env.NODE_ENV || 'development'}
        </p>
        <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#000' }}>
          <strong>Source Maps:</strong> {isProduction ? 'Required for readable stack traces' : 'Not needed (code is not minified)'}
        </p>
        <button
          onClick={checkEnvironment}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: '#228be6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginTop: '10px',
          }}
        >
          🔍 Check Environment
        </button>
      </div>

      {/* Test Buttons */}
      <div style={{
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        marginBottom: '30px'
      }}>
        <h2 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#000' }}>Stack Trace Tests</h2>
        <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#495057' }}>
          Click each button to trigger different types of errors and check how stack traces appear in your dashboard:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={testSimpleError}
            style={{
              padding: '12px 20px',
              fontSize: '15px',
              backgroundColor: '#228be6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            📝 Test 1: Simple Inline Error
          </button>

          <button
            onClick={testDeepStackTrace}
            style={{
              padding: '12px 20px',
              fontSize: '15px',
              backgroundColor: '#7950f2',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            📚 Test 2: Deep Nested Functions (3 levels)
          </button>

          <button
            onClick={testClassMethodError}
            style={{
              padding: '12px 20px',
              fontSize: '15px',
              backgroundColor: '#40c057',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            🏗️ Test 3: Class Method Error
          </button>

          <button
            onClick={testAsyncError}
            style={{
              padding: '12px 20px',
              fontSize: '15px',
              backgroundColor: '#fd7e14',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            ⏱️ Test 4: Async Function Error
          </button>

          <button
            onClick={testArrowFunctionError}
            style={{
              padding: '12px 20px',
              fontSize: '15px',
              backgroundColor: '#f59f00',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            ➡️ Test 5: Arrow Function Error
          </button>

          <button
            onClick={testCalculationError}
            style={{
              padding: '12px 20px',
              fontSize: '15px',
              backgroundColor: '#fa5252',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            🧮 Test 6: Calculation Logic Error
          </button>
        </div>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div style={{
          padding: '20px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          marginBottom: '30px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>Test Results ({testResults.length})</h3>
            <button
              onClick={clearResults}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                backgroundColor: '#495057',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          </div>
          <div style={{
            maxHeight: '200px',
            overflowY: 'auto',
            fontSize: '13px',
            fontFamily: 'monospace',
            backgroundColor: '#f8f9fa',
            padding: '12px',
            borderRadius: '4px',
          }}>
            {testResults.map((result, index) => (
              <div key={index} style={{ marginBottom: '4px', color: result.includes('✅') ? '#40c057' : '#fa5252' }}>
                {result}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documentation */}
      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h3 style={{ color: '#000' }}>What are Source Maps?</h3>
        <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#495057' }}>
          Source maps are files that map minified/compiled production code back to your original source code.
          When you build your app for production, Next.js minifies and bundles your code for performance.
          Without source maps, stack traces show minified code that's impossible to debug.
        </p>

        <h3 style={{ marginTop: '20px', color: '#000' }}>Development vs Production:</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
          <div style={{ padding: '15px', backgroundColor: '#e7f5ff', borderRadius: '6px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#1971c2' }}>Development</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.6' }}>
              <li>Code is not minified</li>
              <li>Stack traces show actual file names and line numbers</li>
              <li>Easy to debug</li>
              <li>Source maps not required</li>
            </ul>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#fff3bf', borderRadius: '6px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#e67700' }}>Production</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.6' }}>
              <li>Code is minified & bundled</li>
              <li>Stack traces show cryptic locations like "chunk-abc123.js:1:2345"</li>
              <li>Impossible to debug without source maps</li>
              <li><strong>Source maps REQUIRED</strong></li>
            </ul>
          </div>
        </div>

        <h3 style={{ marginTop: '20px', color: '#000' }}>How to Test Source Maps:</h3>
        <ol style={{ fontSize: '14px', lineHeight: '1.8', color: '#000' }}>
          <li><strong>Build for production:</strong>
            <pre style={{
              backgroundColor: '#1e1e1e',
              color: '#d4d4d4',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '13px',
              marginTop: '8px',
              overflow: 'auto'
            }}>npm run build</pre>
          </li>
          <li><strong>Start production server:</strong>
            <pre style={{
              backgroundColor: '#1e1e1e',
              color: '#d4d4d4',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '13px',
              marginTop: '8px',
              overflow: 'auto'
            }}>npm run start</pre>
          </li>
          <li><strong>Trigger errors:</strong> Click the test buttons above to send errors to your dashboard</li>
          <li><strong>Check dashboard:</strong> WITHOUT source maps, you'll see minified stack traces like:
            <pre style={{
              backgroundColor: '#fff5f5',
              color: '#c92a2a',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '12px',
              marginTop: '8px',
              overflow: 'auto'
            }}>
{`Error: Simple error from inline code
    at r (chunk-abc123.js:1:23456)
    at onClick (chunk-def456.js:2:34567)
    at invokePassiveEffectCreate (react-dom.production.min.js:3:45678)`}
            </pre>
          </li>
          <li><strong>Upload source maps:</strong> Go to your RiviumTrace dashboard → Settings → Source Maps → Upload</li>
          <li><strong>Find source maps:</strong> They're in <code>.next/static/chunks/</code> with <code>.map</code> extensions:
            <pre style={{
              backgroundColor: '#1e1e1e',
              color: '#d4d4d4',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '12px',
              marginTop: '8px',
              overflow: 'auto'
            }}>
{`.next/static/chunks/app/source-maps/page.js
.next/static/chunks/app/source-maps/page.js.map  ← Upload this
.next/static/chunks/[id].js
.next/static/chunks/[id].js.map  ← And these`}
            </pre>
          </li>
          <li><strong>Re-trigger errors:</strong> After uploading, click the test buttons again</li>
          <li><strong>Verify:</strong> Stack traces should now show readable file names and line numbers:
            <pre style={{
              backgroundColor: '#d3f9d8',
              color: '#2b8a3e',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '12px',
              marginTop: '8px',
              overflow: 'auto'
            }}>
{`Error: Simple error from inline code
    at testSimpleError (app/source-maps/page.tsx:72:13)
    at onClick (app/source-maps/page.tsx:145:20)
    at HTMLButtonElement.callCallback (react-dom.js:123:45)`}
            </pre>
          </li>
        </ol>

        <h3 style={{ marginTop: '20px', color: '#000' }}>What to check on your dashboard:</h3>
        <ul style={{ fontSize: '14px', lineHeight: '1.8', color: '#000' }}>
          <li><strong>Before source maps:</strong> Minified stack traces with cryptic file names</li>
          <li><strong>After source maps:</strong> Clear stack traces showing your actual source files</li>
          <li>File paths like <code>app/source-maps/page.tsx</code> instead of <code>chunk-abc123.js</code></li>
          <li>Accurate line numbers pointing to your actual code</li>
          <li>Function names matching your source code</li>
        </ul>

        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#fff3bf',
          borderRadius: '6px',
          border: '1px solid #fcc419'
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#e67700' }}>⚠️ Important Notes:</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.6' }}>
            <li>Source maps are generated automatically by Next.js during <code>npm run build</code></li>
            <li>Keep source maps private - they contain your original source code</li>
            <li>Upload source maps to RiviumTrace (they're stored securely and not publicly accessible)</li>
            <li>Each deployment may have different source maps due to code changes</li>
            <li>Upload source maps after each production deployment for accurate debugging</li>
          </ul>
        </div>

        <div style={{
          marginTop: '15px',
          padding: '15px',
          backgroundColor: '#e7f5ff',
          borderRadius: '6px',
          border: '1px solid #339af0'
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#1971c2' }}>💡 Pro Tips:</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.6' }}>
            <li>Automate source map uploads in your CI/CD pipeline</li>
            <li>Tag source maps with version numbers or git commit SHAs</li>
            <li>Test in production mode locally before deploying to staging/production</li>
            <li>Compare stack traces before and after source map upload to verify they're working</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
