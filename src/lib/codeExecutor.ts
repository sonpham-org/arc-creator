/**
 * Execute Python code via the Piston API (public code execution engine).
 * Used for the "code" strategy where models generate transform() functions.
 */

const PISTON_URL = 'https://emkc.org/api/v2/piston/execute';
const TIMEOUT_MS = 15000;

interface ExecutionResult {
  success: boolean;
  output?: number[][];
  error?: string;
}

/**
 * Execute a model-generated Python transform function against a test input grid.
 * Wraps the function in a driver script, sends to Piston, parses the JSON output.
 */
export async function executeTransformCode(
  code: string,
  inputGrid: number[][]
): Promise<ExecutionResult> {
  // Build a driver script that calls the transform function and prints JSON
  const driverScript = `
import json
import sys

${code}

input_grid = ${JSON.stringify(inputGrid)}

try:
    result = transform(input_grid)
    if not isinstance(result, list):
        print(json.dumps({"error": "transform() must return a list"}))
        sys.exit(1)
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)
`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(PISTON_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: 'python',
        version: '3.10.0',
        files: [{ name: 'solution.py', content: driverScript }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        success: false,
        error: `Piston API returned ${response.status}`,
      };
    }

    const data = await response.json();
    const stdout = data.run?.stdout?.trim();
    const stderr = data.run?.stderr?.trim();

    if (data.run?.code !== 0 || !stdout) {
      return {
        success: false,
        error: stderr || stdout || 'Code execution failed with no output',
      };
    }

    // Parse the JSON output
    const parsed = JSON.parse(stdout);

    if (parsed.error) {
      return { success: false, error: parsed.error };
    }

    // Validate it's a 2D grid
    if (!Array.isArray(parsed) || !parsed.every((row: any) => Array.isArray(row))) {
      return {
        success: false,
        error: 'transform() did not return a 2D grid',
      };
    }

    return { success: true, output: parsed };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: false, error: 'Code execution timed out' };
    }
    return {
      success: false,
      error: `Execution failed: ${err.message}`,
    };
  }
}
