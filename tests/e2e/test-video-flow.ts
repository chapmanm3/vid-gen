import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

// ─── Configuration ───────────────────────────────────────────────────────────

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_TOPIC = process.env.TEST_TOPIC || 'The Fall of the Roman Empire';
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '5000', 10);
const POLL_TIMEOUT_MS = parseInt(process.env.POLL_TIMEOUT_MS || '600000', 10); // 10 min
const START_SERVER = process.env.START_SERVER !== 'false';
const LOG_DIR = path.join(process.cwd(), 'test-e2e-logs');

// ─── Logging ─────────────────────────────────────────────────────────────────

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = path.join(LOG_DIR, `e2e-test-${timestamp}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(level: string, message: string, data?: unknown) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}`;
  console.log(line);
  logStream.write(line + '\n');
}

function info(message: string, data?: unknown) {
  log('INFO', message, data);
}

function warn(message: string, data?: unknown) {
  log('WARN', message, data);
}

function error(message: string, data?: unknown) {
  log('ERROR', message, data);
}

function step(message: string, data?: unknown) {
  log('STEP', message, data);
}

// ─── HTTP Helpers ────────────────────────────────────────────────────────────

function httpRequest(
  url: string,
  options: { method?: string; body?: unknown } = {}
): Promise<{ status: number; body: unknown; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const body = options.body ? JSON.stringify(options.body) : undefined;

    const reqOptions: http.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      reqOptions.headers!['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsedBody: unknown = data;
        try {
          parsedBody = JSON.parse(data);
        } catch {
          // Not JSON
        }
        resolve({ status: res.statusCode || 0, body: parsedBody, headers: res.headers });
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error(`Request to ${url} timed out after 30s`));
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

// ─── Server Management ───────────────────────────────────────────────────────

let serverProcess: ChildProcess | null = null;

function waitForServer(maxRetries = 30, intervalMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    let attempts = 0;

    const tryConnect = async () => {
      attempts++;
      try {
        await httpRequest(`${BASE_URL}/health`);
        info('Server is ready');
        resolve(true);
      } catch (err) {
        if (attempts >= maxRetries) {
          error('Server did not become ready', { attempts, maxRetries });
          resolve(false);
        } else {
          info(`Server not ready yet, retrying (${attempts}/${maxRetries})...`);
          setTimeout(tryConnect, intervalMs);
        }
      }
    };

    tryConnect();
  });
}

function startServer(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    info('Starting server...');
    serverProcess = spawn('npx', ['ts-node', 'src/server.ts'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    serverProcess.stdout?.on('data', (data) => {
      info(`[server stdout] ${data.toString().trim()}`);
    });

    serverProcess.stderr?.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) {
        // Server startup messages often go to stderr with ts-node
        if (msg.includes('Error') || msg.includes('error') || msg.includes('EADDRINUSE')) {
          error(`[server stderr] ${msg}`);
        } else {
          info(`[server stderr] ${msg}`);
        }
      }
    });

    serverProcess.on('error', (err) => {
      error('Failed to start server process', { error: err.message });
      reject(err);
    });

    serverProcess.on('exit', (code, signal) => {
      if (code !== 0 && code !== null) {
        error('Server exited unexpectedly', { code, signal });
      }
    });

    resolve(serverProcess);
  });
}

function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!serverProcess) {
      resolve();
      return;
    }

    info('Stopping server...');
    serverProcess.on('exit', () => {
      info('Server stopped');
      resolve();
    });

    serverProcess.kill('SIGTERM');

    // Force kill after 5s if it doesn't stop
    setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        serverProcess.kill('SIGKILL');
      }
      resolve();
    }, 5000);
  });
}

// ─── Test Steps ──────────────────────────────────────────────────────────────

async function testHealthCheck(): Promise<boolean> {
  step('Testing health check endpoint');
  try {
    const { status, body } = await httpRequest(`${BASE_URL}/health`);
    if (status === 200 && (body as any).status === 'ok') {
      info('Health check passed');
      return true;
    } else {
      error('Health check failed', { status, body });
      return false;
    }
  } catch (err) {
    error('Health check request failed', { error: (err as Error).message });
    return false;
  }
}

async function submitVideoJob(topic: string): Promise<string | null> {
  step('Submitting video job', { topic });
  try {
    const { status, body } = await httpRequest(`${BASE_URL}/api/videos`, {
      method: 'POST',
      body: { topic },
    });

    if (status === 201) {
      const jobId = (body as any).jobId;
      info('Job submitted successfully', { jobId, status: (body as any).status });
      return jobId;
    } else {
      error('Failed to submit job', { status, body });
      return null;
    }
  } catch (err) {
    error('Job submission request failed', { error: (err as Error).message });
    return null;
  }
}

async function pollJobStatus(
  jobId: string
): Promise<{ status: string; videoPath?: string; error?: string } | null> {
  step('Polling job status (via DB endpoint)', { jobId });
  const startTime = Date.now();

  while (Date.now() - startTime < POLL_TIMEOUT_MS) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    try {
      const { status, body } = await httpRequest(`${BASE_URL}/api/jobs/${jobId}`);

      if (status !== 200) {
        error('Failed to get job status', { status, body });
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      const jobStatus = (body as any).status;
      info(`Job status: ${jobStatus} (elapsed: ${elapsed}s)`, { body });

      if (jobStatus === 'completed') {
        step('Job completed!', {
          jobId,
          videoPath: (body as any).videoPath,
          elapsed: `${elapsed}s`,
        });
        return {
          status: 'completed',
          videoPath: (body as any).videoPath,
        };
      }

      if (jobStatus === 'failed') {
        error('Job failed', {
          jobId,
          error: (body as any).error,
          elapsed: `${elapsed}s`,
        });
        return {
          status: 'failed',
          error: (body as any).error,
        };
      }

      // Still processing
      await sleep(POLL_INTERVAL_MS);
    } catch (err) {
      error('Polling request failed', { error: (err as Error).message });
      await sleep(POLL_INTERVAL_MS);
    }
  }

  error('Job polling timed out', { jobId, timeoutMs: POLL_TIMEOUT_MS });
  return { status: 'timeout' };
}

function validateVideoFile(videoPath: string): boolean {
  step('Validating video file', { videoPath });

  // Handle relative paths
  const fullPath = path.isAbsolute(videoPath)
    ? videoPath
    : path.join(process.cwd(), videoPath);

  if (!fs.existsSync(fullPath)) {
    error('Video file does not exist', { path: fullPath });
    return false;
  }

  const stats = fs.statSync(fullPath);
  info('Video file exists', {
    path: fullPath,
    size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
  });

  if (stats.size === 0) {
    error('Video file is empty');
    return false;
  }

  // Check it's an MP4 file by magic bytes
  const buffer = Buffer.alloc(12);
  const fd = fs.openSync(fullPath, 'r');
  fs.readSync(fd, buffer, 0, 12);
  fs.closeSync(fd);

  // MP4 files have 'ftyp' at offset 4
  const ftyp = buffer.toString('ascii', 4, 8);
  if (ftyp !== 'ftyp') {
    error('File does not appear to be a valid MP4', { ftyp });
    return false;
  }

  info('Video file is a valid MP4');
  return true;
}

async function checkDatabaseJob(jobId: string): Promise<boolean> {
  step('Checking database for job record');
  try {
    const { status, body } = await httpRequest(`${BASE_URL}/api/jobs/${jobId}`);

    if (status === 200) {
      info('Database job record found', { body });
      return true;
    } else {
      error('Database job record not found', { status, body });
      return false;
    }
  } catch (err) {
    error('Database check failed', { error: (err as Error).message });
    return false;
  }
}

async function listAllJobs(): Promise<void> {
  step('Listing all jobs');
  try {
    const { status, body } = await httpRequest(`${BASE_URL}/api/jobs`);
    if (status === 200) {
      const jobs = body as any[];
      info(`Found ${jobs.length} jobs in database`);
      jobs.forEach((job) => {
        info(`  - ${job.id}: ${job.status} (${job.topic})`);
      });
    }
  } catch (err) {
    error('Failed to list jobs', { error: (err as Error).message });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Main Test Runner ────────────────────────────────────────────────────────

async function runTests(): Promise<boolean> {
  const results: { step: string; passed: boolean; details?: string }[] = [];

  info('='.repeat(60));
  info('E2E Video Creation Test');
  info('='.repeat(60));
  info('Configuration', {
    baseUrl: BASE_URL,
    topic: TEST_TOPIC,
    pollInterval: `${POLL_INTERVAL_MS}ms`,
    pollTimeout: `${POLL_TIMEOUT_MS}ms`,
    startServer: START_SERVER,
    logFile,
  });

  // Step 1: Start server if needed
  if (START_SERVER) {
    step('Starting server');
    try {
      await startServer();
      const serverReady = await waitForServer();
      results.push({
        step: 'Server startup',
        passed: serverReady,
        details: serverReady ? 'Server started successfully' : 'Server failed to start',
      });
      if (!serverReady) {
        error('Aborting tests - server not ready');
        return false;
      }
    } catch (err) {
      error('Server startup failed', { error: (err as Error).message });
      results.push({
        step: 'Server startup',
        passed: false,
        details: (err as Error).message,
      });
      return false;
    }
  } else {
    info('Skipping server start (using existing server)');
  }

  try {
    // Step 2: Health check
    const healthOk = await testHealthCheck();
    results.push({
      step: 'Health check',
      passed: healthOk,
    });
    if (!healthOk) {
      error('Aborting tests - health check failed');
      return false;
    }

    // Step 3: Submit video job
    const jobId = await submitVideoJob(TEST_TOPIC);
    results.push({
      step: 'Job submission',
      passed: jobId !== null,
      details: jobId || 'Failed to get jobId',
    });
    if (!jobId) {
      error('Aborting tests - job submission failed');
      return false;
    }

    // Step 4: Poll for completion
    const jobResult = await pollJobStatus(jobId);
    results.push({
      step: 'Pipeline execution',
      passed: jobResult?.status === 'completed',
      details: jobResult
        ? `Status: ${jobResult.status}${jobResult.error ? ` - ${jobResult.error}` : ''}`
        : 'No result',
    });

    if (jobResult?.status !== 'completed') {
      error('Pipeline did not complete successfully');
    }

    // Step 5: Validate video file
    if (jobResult?.videoPath) {
      const videoOk = validateVideoFile(jobResult.videoPath);
      results.push({
        step: 'Video file validation',
        passed: videoOk,
        details: jobResult.videoPath,
      });
    } else {
      results.push({
        step: 'Video file validation',
        passed: false,
        details: 'No video path returned',
      });
    }

    // Step 6: Check database record
    const dbOk = await checkDatabaseJob(jobId);
    results.push({
      step: 'Database record',
      passed: dbOk,
    });

    // Step 7: List all jobs
    await listAllJobs();

    // Summary
    info('='.repeat(60));
    info('TEST SUMMARY');
    info('='.repeat(60));

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    for (const result of results) {
      const icon = result.passed ? 'PASS' : 'FAIL';
      info(`  [${icon}] ${result.step}${result.details ? ` - ${result.details}` : ''}`);
    }

    info('');
    info(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
    info(`Log file: ${logFile}`);

    return failed === 0;
  } finally {
    if (START_SERVER && serverProcess) {
      await stopServer();
    }
  }
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

runTests()
  .then((success) => {
    logStream.end();
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    error('Unhandled error in test runner', { error: err.message, stack: err.stack });
    logStream.end();
    process.exit(2);
  });
