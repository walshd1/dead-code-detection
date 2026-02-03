const core = require('@actions/core');
const fs = require('fs');
const PROMPT = `You are a Dead Code Detector. Your task is to analyze the provided code snippet and identify potentially dead code. Dead code is code that is never executed under any possible execution path. This can include unused functions, variables, classes, or code blocks.

**Input:**

{code_snippet}

**Instructions:**

1.  Analyze the code snippet provided in the 'Input' section.
2.  Identify any code that appears to be unreachable or unused. Consider factors such as:
    *   Functions or methods that are never called.
    *   Variables that are declared but never used.
    *   Code blocks that are always skipped due to conditional statements.
    *   Classes that are never instantiated.
3.  For each piece of potentially dead code, provide the following information:
    *   **Location:** Specify the line number(s) or code block where the dead code is located.
    *   **Type:** Indicate the type of dead code (e.g., unused function, unused variable, unreachable code block).
    *   **Reasoning:** Explain why you believe this code is dead. Provide specific details about why it is never executed or used.
    *   **Confidence:** Rate your confidence level (Low, Medium, High) that the code is truly dead. Low confidence means there's a possibility the code is used in a way you haven't detected. High confidence means you are very sure the code is never executed.
4.  Present your findings in a structured format, such as a list or table.

**Output Format:**

[
    {
        "Location": "{location_of_dead_code}",
        "Type": "{type_of_dead_code}",
        "Reasoning": "{reasoning_for_dead_code}",
        "Confidence": "{confidence_level}"
    },
    ...
]

**Example:**

If you identify an unused function named 'calculate_area' on lines 10-20, your output might include:

{
    "Location": "Lines 10-20",
    "Type": "Unused Function",
    "Reasoning": "The function 'calculate_area' is defined but never called anywhere in the codebase.",
    "Confidence": "High"
}

**Important Consider`;
async function run() {
  try {
    const key = core.getInput('gemini_api_key');
    const token = core.getInput('service_token');
    const ctx = { repoName: process.env.GITHUB_REPOSITORY || '', event: process.env.GITHUB_EVENT_NAME || '' };
    try { Object.assign(ctx, JSON.parse(fs.readFileSync('package.json', 'utf8'))); } catch {}
    let prompt = PROMPT;
    for (const [k, v] of Object.entries(ctx)) prompt = prompt.replace(new RegExp('{' + k + '}', 'g'), String(v || ''));
    let result;
    if (key) {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + key, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 2000 } })
      });
      result = (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (token) {
      const r = await fetch('https://action-factory.walshd1.workers.dev/generate/dead-code-detection', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(ctx)
      });
      result = (await r.json()).content || '';
    } else throw new Error('Need gemini_api_key or service_token');
    console.log(result);
    core.setOutput('result', result);
  } catch (e) { core.setFailed(e.message); }
}
run();
