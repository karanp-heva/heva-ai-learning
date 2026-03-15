import { useState, useCallback, useMemo, useRef, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   CLAUDE CERTIFIED ARCHITECT — FOUNDATIONS EXAM PREP
   A gamified learning + practice app
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── Design Tokens ────────────────────────────────────────────────────────────
const T = {
  bg: "#0b0b14", surface: "rgba(255,255,255,0.04)", surfaceHover: "rgba(255,255,255,0.07)",
  border: "rgba(255,255,255,0.07)", borderHover: "rgba(255,255,255,0.14)",
  text: "#e2e8f0", textMuted: "#8896ab", textDim: "#5a6577",
  accent: "#7c3aed", accentGlow: "rgba(124,58,237,0.25)",
  green: "#10b981", red: "#ef4444", amber: "#f59e0b", blue: "#3b82f6", cyan: "#06b6d4",
  radius: 14, radiusSm: 10, radiusXs: 6,
  font: "'Inter', system-ui, -apple-system, sans-serif",
  transition: "all 0.2s cubic-bezier(.4,0,.2,1)",
};

const card = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius };
const btnBase = { border: "none", cursor: "pointer", fontFamily: T.font, transition: T.transition };

// ─── Domain Metadata ──────────────────────────────────────────────────────────
const DOMAINS = {
  D1: { name: "Agentic Architecture & Orchestration", short: "Agentic Arch.", weight: 27, color: "#7c3aed", icon: "🏗️" },
  D2: { name: "Tool Design & MCP Integration", short: "Tool & MCP", weight: 18, color: "#3b82f6", icon: "🔧" },
  D3: { name: "Claude Code Config & Workflows", short: "Claude Code", weight: 20, color: "#059669", icon: "⚙️" },
  D4: { name: "Prompt Engineering & Structured Output", short: "Prompt Eng.", weight: 20, color: "#d97706", icon: "✍️" },
  D5: { name: "Context Management & Reliability", short: "Context Mgmt.", weight: 15, color: "#dc2626", icon: "📊" },
};

// ─── Study Content: Lessons per Domain ────────────────────────────────────────
const LESSONS = {
  D1: [
    {
      id: "d1-1", title: "Agentic Loop Fundamentals", xp: 30, minutes: 5,
      sections: [
        { heading: "What Is an Agentic Loop?", body: "An agentic loop is the core execution cycle: the model receives input, decides on an action (tool call or text response), executes it, observes the result, and repeats until the task is complete. Think of it as a while-loop where each iteration is one model turn." },
        { heading: "Loop Control: stop_reason", body: "The single most important concept: always check the API response's `stop_reason` field to control the loop.\n\n• `end_turn` — model finished voluntarily\n• `tool_use` — model wants to call a tool\n• `max_tokens` — context limit hit\n\n⚠️ ANTI-PATTERN: Parsing the model's natural language output (e.g. looking for \"I'm done\") is unreliable. Never use it for loop control." },
        { heading: "Safety Nets vs. Primary Control", body: "An iteration limit (e.g. max 10 loops) is a valid safety net, but it should never be the primary termination mechanism. If your loop relies on hitting a counter to stop, that's a design smell — the model should signal completion via `stop_reason`." },
        { heading: "Key Exam Tip", body: "If a question asks about terminating an agentic loop, the answer is almost always: check `stop_reason` programmatically. Every other approach (parsing text, iteration limits, special tokens) is an anti-pattern for primary control." }
      ]
    },
    {
      id: "d1-2", title: "Multi-Agent Orchestration", xp: 35, minutes: 6,
      sections: [
        { heading: "Hub-and-Spoke Architecture", body: "The dominant pattern on the exam. A coordinator agent receives the task, decomposes it into subtasks, dispatches them to specialized subagents, collects results, and synthesizes a final output.\n\nKey properties:\n• Central coordination — one agent makes all routing decisions\n• Parallel execution — subagents can run concurrently\n• No peer communication — subagents never talk to each other directly" },
        { heading: "Context Propagation (Critical!)", body: "Context is NEVER automatically inherited by subagents. You must explicitly include all relevant context in each subagent's prompt.\n\nThis is one of the most tested concepts on the exam. If you see a question about passing information between agents, the answer involves explicit context in prompts — not shared memory, not automatic inheritance." },
        { heading: "Error Handling in Multi-Agent Systems", body: "When a subagent fails:\n\n✅ Retry with exponential backoff, then return structured error context\n✅ Include: error category, whether it's retryable, what context was available, any partial results\n\n❌ Silent suppression (skipping the failed agent quietly)\n❌ Generic error messages (\"An error occurred\")\n❌ Aborting the entire operation for one failure" },
        { heading: "Chain vs. Hub-and-Spoke", body: "Chain: Agent A → Agent B → Agent C (sequential, each passes to next)\nHub-and-spoke: Coordinator → dispatches to A, B, C → aggregates\n\nHub-and-spoke is preferred when tasks can be parallelized and need centralized aggregation. Chain is simpler for linear, dependent workflows." }
      ]
    },
    {
      id: "d1-3", title: "Escalation & Enforcement Patterns", xp: 35, minutes: 6,
      sections: [
        { heading: "The Enforcement Decision Framework", body: "This is a critical exam decision framework:\n\n• Safety/financial/compliance rules → Programmatic hooks (guaranteed enforcement)\n• Best-effort guidelines → Prompt instructions (might be bypassed)\n\nExample: \"Never refund > $500 without approval\" MUST be a hook that intercepts the refund tool call. Putting this in a prompt alone is an anti-pattern — the model might comply 99% of the time, but 1% failures in financial rules are unacceptable." },
        { heading: "Escalation Triggers", body: "Reliable escalation triggers:\n✅ Customer explicitly requests a human\n✅ Programmatic rules: ticket category, failed attempts, business rules\n✅ Tool calls that exceed defined thresholds\n\nUnreliable triggers (anti-patterns):\n❌ Sentiment analysis of customer tone\n❌ Model self-reported confidence scores\n❌ Arbitrary conversation length limits" },
        { heading: "Human-in-the-Loop Pattern", body: "Correct implementation: A programmatic hook intercepts specific tool calls (e.g. delete, refund, deploy) and pauses execution until a human approves.\n\nWrong: Asking the LLM to decide which actions need human review, or running all actions and reviewing afterward." },
        { heading: "Agent Tool Count", body: "Optimal: 4-5 focused tools per agent.\n18+ tools significantly degrades performance — the agent struggles to select the right tool.\n\nIf you need many tools, split into specialized subagents with focused tool sets." }
      ]
    },
    {
      id: "d1-4", title: "Error Handling & Reliability", xp: 30, minutes: 5,
      sections: [
        { heading: "Structured Error Format", body: "Every error response should include:\n\n{\n  category: 'API_TIMEOUT',\n  retryable: true,\n  context: 'Payment gateway unreachable after 3 attempts',\n  partial_results: null\n}\n\nThis enables programmatic retry decisions, meaningful debugging, and proper user communication." },
        { heading: "Anti-Patterns in Error Handling", body: "The exam tests several error anti-patterns:\n\n❌ Generic messages: \"An error occurred. Please try again.\"\n❌ Silent suppression: Catching errors and returning success\n❌ Boolean-only errors: { error: true } with no context\n❌ Logging errors but not surfacing them to the calling system" },
        { heading: "Same-Session Self-Review Bias", body: "When an agent generates content and then reviews it in the same session, the review retains reasoning bias from generation. The agent is more likely to approve its own work.\n\nSolution: Use a separate session/agent for review, or implement multi-pass review with different prompts." },
        { heading: "Sync vs. Async Decision", body: "Synchronous: When the next step depends on the current result (blocking workflow)\nBatch/Async: When results are needed eventually but not immediately (latency-tolerant)\n\nThis is about workflow dependencies, not task complexity." }
      ]
    }
  ],
  D2: [
    {
      id: "d2-1", title: "Tool Definitions & Selection", xp: 30, minutes: 5,
      sections: [
        { heading: "Anatomy of a Tool Definition", body: "A tool definition includes:\n• name — the identifier Claude uses to call it\n• description — explains when/why to use it (this heavily influences selection)\n• input_schema — JSON Schema defining accepted parameters\n\nThe description is the most important part for correct tool selection. Vague descriptions = wrong tool choices." },
        { heading: "tool_choice Options", body: "This is heavily tested:\n\n• `auto` — Claude decides whether to use a tool (default)\n• `{ type: 'any' }` — Forces Claude to use SOME tool (guaranteed tool call)\n• `{ type: 'tool', name: 'specific_tool' }` — Forces a specific tool\n\n⚠️ `required` is NOT a valid option — this is a common exam trap." },
        { heading: "Forced Tool Execution Warning", body: "When you force a specific tool, Claude WILL call it regardless of whether the input matches. This can result in incorrect parameters.\n\nAlways validate parameters programmatically when using forced tool selection." },
        { heading: "Tool Description Best Practices", body: "✅ Explain what the tool does AND when to use it\n✅ Include parameter constraints and valid ranges\n✅ Describe what the tool returns\n\n❌ Minimal descriptions (just the name)\n❌ Ambiguous overlap between tool descriptions\n❌ Missing constraint information" }
      ]
    },
    {
      id: "d2-2", title: "Model Context Protocol (MCP)", xp: 35, minutes: 6,
      sections: [
        { heading: "What Is MCP?", body: "Model Context Protocol is an open standard for connecting AI agents to external tools and data sources. It handles authentication and API calls automatically, so you don't need to write custom integration code for each service (Slack, GitHub, databases, etc.)." },
        { heading: "MCP Configuration", body: "Two ways to configure MCP servers:\n\n1. `.mcp.json` file — Declarative config the SDK loads automatically\n2. Programmatically — Pass config when calling `query()`\n\nBoth are valid. The .mcp.json approach is preferred for project-level defaults." },
        { heading: "MCP Security Model", body: "Critical security principle: MCP tools require explicit permission before Claude can use them.\n\nNever auto-approve destructive actions (file deletion, database writes, deployments). Always implement approval workflows for high-impact tools." },
        { heading: "MCP vs. Custom Tools", body: "Use MCP when: A standardized connector exists for your service\nUse custom tools when: You need custom business logic, proprietary integrations, or fine-grained control\n\nMCP saves development time but may not cover every edge case of your specific integration needs." }
      ]
    },
    {
      id: "d2-3", title: "Validation & Retry Patterns", xp: 30, minutes: 5,
      sections: [
        { heading: "The Validation-Retry Loop", body: "The standard pattern for handling tool failures:\n\n1. Claude calls a tool with parameters\n2. Your code validates the parameters against the schema\n3. If invalid: return a structured error describing what's wrong\n4. Claude reads the error and corrects its parameters\n5. Retry the tool call\n\nThis is more reliable than hoping the model gets it right the first time." },
        { heading: "Structured Validation Errors", body: "Good validation error:\n{ error: 'INVALID_DATE_FORMAT', field: 'start_date', expected: 'YYYY-MM-DD', received: 'March 15', suggestion: '2026-03-15' }\n\nBad validation error:\n{ error: 'Invalid input' }\n\nSpecific, actionable feedback lets the model self-correct effectively." },
        { heading: "JSON Schema for Output Conformity", body: "The most reliable way to get structured output:\n\n1. Define a tool with a JSON schema describing the desired output structure\n2. Claude calls the tool with schema-conformant parameters\n3. Validate the output against the schema\n4. If non-conformant, retry with specific error feedback\n\nThis is more reliable than asking for JSON in a prompt or using regex post-processing." },
        { heading: "When to Use Each Output Strategy", body: "Tool + JSON Schema: Highest reliability, best for production\nFew-shot examples: Good supplement, handles edge cases\nPrefilled assistant turn (starting with '{'): Quick and pragmatic\nRegex post-processing: Fragile — avoid in production" }
      ]
    }
  ],
  D3: [
    {
      id: "d3-1", title: "CLAUDE.md Configuration", xp: 30, minutes: 5,
      sections: [
        { heading: "What Is CLAUDE.md?", body: "CLAUDE.md is the primary configuration file for Claude Code. It tells Claude about your project: coding conventions, architecture decisions, important context, file organization, and any project-specific rules to follow." },
        { heading: "Configuration Hierarchy", body: "Most general → most specific (later overrides earlier):\n\n1. Enterprise policy (org-wide rules)\n2. User settings (personal preferences)\n3. Project CLAUDE.md (repo root)\n4. Directory-level CLAUDE.md (subdirectory overrides)\n\nMore specific settings win. A directory-level CLAUDE.md can override project-level instructions for that specific directory." },
        { heading: "What to Put in CLAUDE.md", body: "✅ Coding standards and conventions\n✅ Architecture decisions and patterns used\n✅ Testing requirements and commands\n✅ File organization and naming conventions\n✅ Environment setup and build commands\n✅ Important context about the codebase\n\n❌ API keys or secrets\n❌ Model configuration (temperature, version)\n❌ Log output or debug information" },
        { heading: "Exam Tip", body: "Questions about CLAUDE.md often test whether you understand the hierarchy — particularly that directory-level files override project-level ones, and that enterprise policy sits at the top." }
      ]
    },
    {
      id: "d3-2", title: "Plan Mode vs. Direct Execution", xp: 30, minutes: 5,
      sections: [
        { heading: "The Execution Mode Decision", body: "This is a key exam decision framework:\n\n🔵 Plan Mode: Multi-file changes, architectural decisions, unfamiliar codebases, complex refactors\n🟢 Direct Execution: Single-file fixes, obvious bugs, simple additions, well-understood changes\n\nMatch the mode to the scope and risk of the change." },
        { heading: "Plan Mode in Detail", body: "Plan mode makes Claude think through the approach before writing code:\n• Analyzes the full scope of changes needed\n• Identifies files that will be affected\n• Considers architectural implications\n• Proposes a step-by-step implementation plan\n\nUse it when getting the approach wrong would be costly." },
        { heading: "Plan Mode in CI/CD", body: "The `--plan` flag enables non-interactive analysis in CI/CD pipelines:\n• Code review: Analyze diffs without making changes\n• Architecture assessment: Evaluate PRs for design concerns\n• Documentation: Generate descriptions of changes\n\nCombine with structured output for machine-parseable results." },
        { heading: "Direct Execution", body: "Direct execution is for confident, scoped changes:\n• Bug fix where you know the exact file and issue\n• Adding a well-defined function to an existing module\n• Updating a config value\n\nDon't over-plan simple changes — it wastes tokens and time." }
      ]
    },
    {
      id: "d3-3", title: "Claude Code Tools & CI/CD", xp: 35, minutes: 6,
      sections: [
        { heading: "Built-in Tools", body: "Claude Code provides 6 core tools:\n\n• Read — View file contents\n• Write — Create new files\n• Edit — Modify existing files (surgical edits)\n• Bash — Execute shell commands\n• Glob — Find files by name/pattern\n• Grep — Search file contents by regex\n\nEach tool is optimized for its purpose. Use Glob instead of `find`, Grep instead of `grep`, Read instead of `cat`." },
        { heading: "Hooks", body: "Hooks intercept tool calls at specific points:\n\n• Before execution: Validate inputs, enforce rules, require approval\n• After execution: Validate outputs, log actions, trigger side effects\n\nHooks are the enforcement mechanism for hard constraints. They're programmatic, so they can't be bypassed by clever prompting." },
        { heading: "Slash Commands", body: "Built-in interactive commands for common actions:\n• /help — Show available commands\n• /clear — Clear conversation context\n• /review — Review recent changes\n• /compact — Summarize and compact context\n\nThese are interactive features, not available in non-interactive/CI modes." },
        { heading: "CI/CD Integration", body: "Three key capabilities for CI/CD:\n\n1. `--plan` flag — Non-interactive analysis (no changes made)\n2. Structured output — JSON responses for automation\n3. Batch API — Cost-effective bulk operations (50% cheaper)\n\nMulti-pass review pattern: Run per-file analysis first, then integration-level review for cross-file concerns." }
      ]
    }
  ],
  D4: [
    {
      id: "d4-1", title: "Prompt Engineering Fundamentals", xp: 30, minutes: 5,
      sections: [
        { heading: "System vs. User Messages", body: "System prompt: Persistent context — role, constraints, coding standards, rules\nUser messages: Specific tasks, queries, data to process\n\nKeep persistent instructions in the system prompt so they don't need repeating. Put task-specific content in user messages." },
        { heading: "Few-Shot Prompting", body: "Include 2-4 diverse, representative examples that cover:\n• The expected output format\n• Edge cases and tricky inputs\n• Both clean and messy data (if applicable)\n\n2-4 examples is the sweet spot. Too many (10+) waste context without adding much value." },
        { heading: "Chain-of-Thought", body: "Encouraging the model to show its reasoning improves accuracy on multi-step problems:\n• \"Think step by step before answering\"\n• \"Explain your reasoning\"\n\nTrade-off: More tokens used, but better accuracy. Worth it for complex reasoning; unnecessary for simple lookups." },
        { heading: "Prefilled Assistant Turn", body: "You can start the assistant's response by providing the beginning:\n\nassistant: {\n\nThis nudges Claude toward JSON output. A practical technique for format control, though tool definitions with schemas are more reliable for production." }
      ]
    },
    {
      id: "d4-2", title: "Structured Output Mastery", xp: 35, minutes: 6,
      sections: [
        { heading: "Reliability Hierarchy", body: "From most to least reliable:\n\n1. Tool definitions with JSON schema (constrained + validated)\n2. Tool definitions + few-shot examples (constrained + demonstrated)\n3. Few-shot examples alone (demonstrated but unconstrained)\n4. Prefilled assistant turn (nudged but unconstrained)\n5. Text instructions (\"return JSON\") — least reliable\n\nFor production, always use option 1 or 2." },
        { heading: "Validation-Retry for Output", body: "Even with schemas, outputs can be imperfect. The standard flow:\n\n1. Claude outputs structured data via tool call\n2. Validate against your schema\n3. If invalid: return specific field-level errors\n4. Claude corrects and retries\n\nThis loop typically converges in 1-2 retries." },
        { heading: "Batch Processing Accuracy", body: "When processing many documents:\n\n⚠️ CRITICAL ANTI-PATTERN: Reporting only aggregate accuracy (e.g., \"95% accurate\")\n\nAggregate metrics hide per-document-type failures. Always decompose:\n• Invoice Type A: 99% accurate\n• Invoice Type B: 98% accurate\n• Handwritten invoices: 42% accurate ← hidden by aggregate!\n\nPer-type tracking reveals where the system actually fails." },
        { heading: "Structured Data Extraction Pattern", body: "The complete extraction pipeline:\n\n1. Define a tool with JSON schema matching your target structure\n2. Provide 2-3 few-shot examples (including messy inputs)\n3. Claude extracts data via tool call\n4. Validate against schema\n5. Flag low-confidence extractions for human review\n6. Track accuracy per-document-type, not just aggregate" }
      ]
    },
    {
      id: "d4-3", title: "Hard Rules vs. Soft Guidelines", xp: 30, minutes: 5,
      sections: [
        { heading: "The Enforcement Spectrum", body: "Every rule falls somewhere on this spectrum:\n\nHARD (programmatic hooks) ←————→ SOFT (prompt instructions)\n\nFinancial limits, safety constraints, compliance rules → HOOKS\nFormatting preferences, tone, best practices → PROMPTS\n\nIf a rule violation would cause real harm, it must be a hook." },
        { heading: "Prompt-Based Guidelines", body: "Prompts are for best-effort guidance:\n✅ \"Use a professional, friendly tone\"\n✅ \"Prefer shorter responses when possible\"\n✅ \"Organize output with headers\"\n\nThese might occasionally be imperfect, and that's acceptable because the stakes are low." },
        { heading: "Hook-Based Enforcement", body: "Hooks are for guaranteed enforcement:\n✅ \"Never process refunds over $500\"\n✅ \"Always validate email format before sending\"\n✅ \"Require manager approval for account deletions\"\n\nHooks intercept tool calls programmatically — the model can't bypass them regardless of prompt injection or edge cases." },
        { heading: "Exam Application", body: "When a question presents a rule and asks how to enforce it, ask yourself: \"What happens if this rule is violated 1% of the time?\"\n\n• Mild inconvenience → Prompt is fine\n• Financial loss, safety issue, compliance violation → Must be a hook" }
      ]
    }
  ],
  D5: [
    {
      id: "d5-1", title: "Context Window Management", xp: 30, minutes: 5,
      sections: [
        { heading: "Context Window Degradation", body: "Performance degrades gradually as context fills up — it's not a cliff edge at the limit. The \"lost in the middle\" effect means information in the center of very long contexts receives less attention than information at the start or end.\n\nPractical threshold: Start managing context actively around 70-80% capacity." },
        { heading: "Context Management Strategies", body: "1. Summarization: Periodically summarize older conversation turns\n2. Pruning: Remove irrelevant context (resolved sub-tasks, failed attempts)\n3. Checkpointing: Save important state explicitly rather than relying on conversation history\n4. Explicit references: Never assume context is \"remembered\" — reference it explicitly" },
        { heading: "Multi-Agent Context Distribution", body: "For large document processing, distribute across subagents:\n\nCoordinator: \"Analyze documents 1-50 for X\" → Subagent A\nCoordinator: \"Analyze documents 51-100 for X\" → Subagent B\nCoordinator: Aggregates results from A and B\n\nThis prevents any single context window from overloading." },
        { heading: "Context and Reliability", body: "Context overload is a reliability problem, not just a performance one. An overloaded context can lead to:\n• Missed instructions\n• Hallucinated details\n• Inconsistent behavior\n\nTreat context as a finite, precious resource." }
      ]
    },
    {
      id: "d5-2", title: "Information Provenance & Reliability", xp: 35, minutes: 6,
      sections: [
        { heading: "What Is Information Provenance?", body: "Tracking where every piece of data came from throughout your pipeline. In a multi-agent system, this means:\n\n• Which agent produced this information?\n• What source data did it use?\n• What tools were called?\n• What was the confidence level?\n\nProvenance enables debugging, auditing, and trust." },
        { heading: "Why Provenance Matters", body: "Without provenance:\n• Hallucinations are undetectable\n• Errors can't be traced to their source\n• Auditors can't verify the system's decisions\n• Users can't trust the output\n\nWith provenance:\n• Every claim can be traced to source data\n• Failed agents can be identified and fixed\n• Compliance requirements are met" },
        { heading: "Hallucination Mitigation", body: "Multi-layered approach:\n\n1. Constrained schemas — reduce free-form generation\n2. Source validation — check outputs against source data\n3. Confidence flagging — flag uncertain extractions for human review\n4. Per-type accuracy tracking — identify failure modes\n\nTemperature=0 alone does NOT prevent hallucination. It makes outputs more deterministic, but deterministic can still be wrong." },
        { heading: "Long-Running Session Reliability", body: "For sessions that run for many turns:\n\n1. Periodic summarization of older context\n2. Checkpoint important state (don't rely on \"remembering\")\n3. Explicit references to prior context\n4. Monitor context usage and trigger management at 70-80%\n\nSimply increasing the context window delays but doesn't solve degradation." }
      ]
    }
  ]
};

// ─── Anti-Patterns Reference ──────────────────────────────────────────────────
const ANTI_PATTERNS = [
  { pattern: "Parsing natural language for loop control", correct: "Check `stop_reason` field programmatically", domain: "D1", severity: "high" },
  { pattern: "Arbitrary iteration limits as primary termination", correct: "Use `stop_reason`; iteration limits are safety nets only", domain: "D1", severity: "high" },
  { pattern: "Prompt-only enforcement of critical rules", correct: "Programmatic hooks for financial/safety rules", domain: "D1", severity: "high" },
  { pattern: "Self-reported confidence for escalation", correct: "Programmatic rules based on objective criteria", domain: "D1", severity: "high" },
  { pattern: "Sentiment analysis for escalation", correct: "Explicit customer request + business rules", domain: "D1", severity: "medium" },
  { pattern: "Generic error messages", correct: "Structured errors with category, retry flag, context, partial results", domain: "D1", severity: "high" },
  { pattern: "Silent error suppression", correct: "Surface errors with full context to calling system", domain: "D1", severity: "high" },
  { pattern: "18+ tools per agent", correct: "4-5 focused tools per agent; split into subagents if more needed", domain: "D2", severity: "medium" },
  { pattern: "Same-session self-review", correct: "Separate agent/session for review to avoid reasoning bias", domain: "D1", severity: "medium" },
  { pattern: "Aggregate-only accuracy metrics", correct: "Per-document-type accuracy to reveal hidden failure modes", domain: "D5", severity: "high" },
  { pattern: "Assuming automatic context inheritance", correct: "Always explicitly pass context in subagent prompts", domain: "D1", severity: "high" },
  { pattern: "Auto-approving destructive MCP tool calls", correct: "Require explicit permission for high-impact actions", domain: "D2", severity: "high" },
  { pattern: "Using `tool_choice: 'required'`", correct: "`{ type: 'any' }` for guaranteed tool call; 'required' is invalid", domain: "D2", severity: "medium" },
  { pattern: "Waiting for context limit to manage context", correct: "Start managing at 70-80% capacity; degradation is gradual", domain: "D5", severity: "medium" },
];

// ─── Decision Frameworks Reference ────────────────────────────────────────────
const FRAMEWORKS = [
  { name: "Enforcement", question: "How should this rule be enforced?", options: [
    { condition: "Financial, safety, compliance-critical", answer: "Programmatic hook" },
    { condition: "Best-effort guideline, low-stakes", answer: "Prompt instruction" }
  ]},
  { name: "Execution Mode", question: "Plan mode or direct execution?", options: [
    { condition: "Multi-file, architectural, unfamiliar codebase", answer: "Plan mode" },
    { condition: "Single-file, obvious fix, well-understood", answer: "Direct execution" }
  ]},
  { name: "Tool Choice", question: "Which tool_choice setting?", options: [
    { condition: "Let model decide when to use tools", answer: "auto (default)" },
    { condition: "Guarantee a tool call happens", answer: "{ type: 'any' }" },
    { condition: "Force a specific tool", answer: "{ type: 'tool', name: '...' }" }
  ]},
  { name: "API Mode", question: "Synchronous or batch/async?", options: [
    { condition: "Next step depends on result (blocking)", answer: "Synchronous" },
    { condition: "Results needed eventually, not immediately", answer: "Batch/Async" }
  ]},
  { name: "Error Response", question: "How to handle this error?", options: [
    { condition: "Transient failure (rate limit, timeout)", answer: "Retry with backoff + structured error if exhausted" },
    { condition: "Invalid input from model", answer: "Validation-retry loop with specific field errors" },
    { condition: "Unrecoverable failure", answer: "Structured error with context + partial results" }
  ]},
  { name: "Review Architecture", question: "Single-pass or multi-pass review?", options: [
    { condition: "Large changes, multiple files", answer: "Multi-pass: per-file + integration review" },
    { condition: "Small, focused edit", answer: "Single-pass review" }
  ]},
  { name: "Escalation", question: "Should the agent escalate?", options: [
    { condition: "Customer explicitly requests human", answer: "Immediate escalation" },
    { condition: "Within agent's defined capability", answer: "Resolve locally" },
    { condition: "Exceeds business rule threshold", answer: "Programmatic escalation via hook" }
  ]},
  { name: "Context Passing", question: "How to share context with subagent?", options: [
    { condition: "Always", answer: "Explicitly in subagent prompt — never automatic" }
  ]}
];

// ─── Question Bank ────────────────────────────────────────────────────────────
const QUESTIONS = [
  { id:1,domain:"D1",scenario:"Customer Support Resolution Agent",question:"A customer support agent needs to decide whether to escalate a ticket to a human. Which approach is most reliable?",options:["Use sentiment analysis on the customer's messages to detect frustration","Ask the LLM to self-report a confidence score and escalate below a threshold","Use programmatic rules based on ticket category, failed resolution attempts, and explicit customer request","Set a timer and escalate if the issue isn't resolved within 5 minutes"],correct:2,explanation:"Programmatic rules based on objective criteria (category, attempts, explicit requests) are reliable. Self-reported confidence and sentiment analysis are unreliable anti-patterns."},
  { id:2,domain:"D1",scenario:"Multi-Agent Research System",question:"In a hub-and-spoke multi-agent architecture, how should context be passed from the coordinator to subagents?",options:["Subagents automatically inherit the coordinator's full conversation history","Context must be explicitly included in each subagent's prompt","Use a shared global memory store that all agents read from","Pass only the agent ID and let subagents fetch their own context"],correct:1,explanation:"Context is never automatically inherited — it must be explicitly passed in subagent prompts. Always assume explicit context propagation."},
  { id:3,domain:"D1",scenario:"Customer Support Resolution Agent",question:"What is the recommended way to control an agentic loop's termination?",options:["Parse the model's natural language output for phrases like 'I'm done'","Set an arbitrary maximum iteration limit (e.g., max 10 loops)","Check the API response's stop_reason field programmatically","Ask the model to output a special token like [COMPLETE]"],correct:2,explanation:"Checking stop_reason is the correct programmatic approach. Parsing natural language or special tokens are anti-patterns. Iteration limits are safety nets, not primary control."},
  { id:4,domain:"D1",scenario:"Multi-Agent Research System",question:"A coordinator agent dispatches 3 research subagents. One fails with a rate limit error. What's the best error handling?",options:["Silently skip the failed subagent and return results from the other two","Retry with exponential backoff, return structured error context if still fails","Abort the entire operation and ask the user to try again","Replace output with a generic 'No results found' message"],correct:1,explanation:"Structured error handling with retry logic and meaningful error context is best. Silent suppression and generic messages are anti-patterns."},
  { id:5,domain:"D1",scenario:"Customer Support Resolution Agent",question:"A financial chatbot must enforce: 'Never process refunds over $500 without manager approval.' Where should this be enforced?",options:["In the system prompt with strong emphasis","Via a programmatic hook that intercepts the refund tool call","By training the model on examples of refusing large refunds","In the tool description, stating the $500 limit"],correct:1,explanation:"Financial/safety-critical rules MUST be enforced programmatically via hooks — never via prompts alone."},
  { id:6,domain:"D1",scenario:"Multi-Agent Research System",question:"How many tools should optimally be assigned to a single agent?",options:["As many as possible (15-20+) for flexibility","Exactly 1 tool per agent","4-5 focused tools per agent","10-12 tools covering all likely use cases"],correct:2,explanation:"4-5 tools per agent is optimal. 18+ tools significantly degrades performance."},
  { id:7,domain:"D1",scenario:"Customer Support Resolution Agent",question:"When should an agent immediately escalate to a human?",options:["When the customer uses negative language","When the model's confidence drops below 70%","When the customer explicitly requests to speak with a human","After more than 3 back-and-forth exchanges"],correct:2,explanation:"Explicit customer request always triggers immediate escalation. Sentiment and confidence-based escalation are unreliable."},
  { id:8,domain:"D1",scenario:"Multi-Agent Research System",question:"What is the primary advantage of hub-and-spoke over chain architecture?",options:["Less compute since subagents share context","Coordinator can dynamically route tasks and aggregate results from parallel subagents","Subagents communicate directly for faster resolution","Eliminates need for error handling"],correct:1,explanation:"Hub-and-spoke enables dynamic routing and parallel execution. Subagents don't share context or communicate directly."},
  { id:9,domain:"D1",scenario:"Customer Support Resolution Agent",question:"An agent encounters an API error. Which response format is best?",options:["'An error occurred. Please try again later.'","{ error: true }","{ category: 'API_TIMEOUT', retryable: true, context: 'Payment gateway unreachable after 3 attempts', partial_results: null }","Suppress the error and try an alternative silently"],correct:2,explanation:"Structured errors with category, retry flags, context, and partial results enable proper debugging. Generic messages and silent suppression are anti-patterns."},
  { id:10,domain:"D1",scenario:"Multi-Agent Research System",question:"An agent generates AND reviews its own output in the same session. What's the risk?",options:["Review is faster but less thorough","Agent retains reasoning bias, making self-review unreliable","No risk — self-review is efficient","Agent produces duplicate output"],correct:1,explanation:"Same-session self-review retains reasoning bias. Use separate agents or sessions for reliable review."},
  { id:11,domain:"D1",scenario:"Customer Support Resolution Agent",question:"How should 'human-in-the-loop' be correctly implemented?",options:["Agent pauses and waits for human input before critical actions","Agent proceeds and generates a report for review afterward","A programmatic hook intercepts tool calls, pauses execution, requires human approval","The LLM decides which actions require human approval"],correct:2,explanation:"Programmatic hooks intercepting tool calls are correct. The LLM deciding what needs approval defeats the safety purpose."},
  { id:12,domain:"D1",scenario:"Multi-Agent Research System",question:"What determines synchronous vs. asynchronous API calls?",options:["Always use synchronous for consistency","Synchronous for blocking workflows; batch/async for latency-tolerant operations","Always use asynchronous for performance","Synchronous for simple, async for complex tasks"],correct:1,explanation:"The decision is about workflow dependencies, not task complexity."},
  { id:13,domain:"D2",scenario:"Structured Data Extraction",question:"Which tool_choice setting guarantees Claude will use a tool?",options:["tool_choice: 'auto'","tool_choice: 'required'","tool_choice: { type: 'any' }","tool_choice: 'force'"],correct:2,explanation:"'any' guarantees a tool call. 'auto' lets the model decide. 'required' is NOT valid — common exam trap."},
  { id:14,domain:"D2",scenario:"Developer Productivity",question:"What is MCP primarily designed for?",options:["Encrypting data between Claude and external services","Providing a standardized interface for connecting agents to external tools and data sources","Managing conversation history and context windows","Optimizing model inference speed"],correct:1,explanation:"MCP is an open standard for connecting AI agents to external tools and data, handling auth and API calls automatically."},
  { id:15,domain:"D2",scenario:"Structured Data Extraction",question:"When designing tool descriptions, which approach leads to best selection?",options:["Minimal descriptions — just the function name","Detailed descriptions explaining when/why to use the tool, with parameter constraints","Include example conversations showing usage","Use XML tags for structured parsing"],correct:1,explanation:"Detailed descriptions with clear use cases and constraints help Claude select and use tools correctly."},
  { id:16,domain:"D2",scenario:"Developer Productivity",question:"How are MCP servers configured for Claude Code?",options:["Only through environment variables","Through a .mcp.json file or programmatically when calling query()","Only through the Anthropic Console UI","By importing them in the system prompt"],correct:1,explanation:"MCP servers can be configured via .mcp.json (auto-loaded) or programmatically via query()."},
  { id:17,domain:"D2",scenario:"Structured Data Extraction",question:"A tool call fails with invalid parameters. What validation pattern should be used?",options:["Let the model retry on its own","Validation-retry loop: validate inputs, return structured errors, let model correct and retry","Reject and ask the user to reformulate","Use a fallback tool with permissive parameters"],correct:1,explanation:"Validation-retry with structured error feedback is the recommended approach."},
  { id:18,domain:"D2",scenario:"Structured Data Extraction",question:"When forcing a specific tool, what happens if parameters don't match the request?",options:["The API returns an error","Claude will call the tool with its best guess at parameters, which may be incorrect","Claude skips the tool and responds with text","Request is retried with auto"],correct:1,explanation:"Forced tool execution means Claude WILL call it regardless, potentially with wrong parameters. Always validate programmatically."},
  { id:19,domain:"D2",scenario:"Developer Productivity",question:"What's the key security consideration for MCP tools?",options:["MCP tools are auto-sandboxed, no additional security needed","Tools require explicit permission — never auto-approve destructive actions","Only use tools from Anthropic's official registry","Disable all MCP tools in production"],correct:1,explanation:"MCP tools require explicit permission. Auto-approving destructive actions is a critical security risk."},
  { id:20,domain:"D2",scenario:"Structured Data Extraction",question:"Which approach most reliably ensures output matches a schema?",options:["Ask the model to output JSON and parse with try/catch","Use tool definitions with JSON schema, then validate","Provide multiple few-shot examples of desired format","Post-process text output with regex"],correct:1,explanation:"Tool definitions with JSON schemas + validation are the most reliable. Schemas constrain output; validation catches errors."},
  { id:21,domain:"D3",scenario:"Code Generation with Claude Code",question:"What is the CLAUDE.md file used for?",options:["Storing API keys and auth tokens","Defining project-specific instructions, conventions, and context","Logging Claude Code's actions for audit","Configuring model version and temperature"],correct:1,explanation:"CLAUDE.md provides project-level instructions, conventions, and context for Claude Code."},
  { id:22,domain:"D3",scenario:"Code Generation with Claude Code",question:"When should you use plan mode vs. direct execution?",options:["Plan mode for all tasks to ensure quality","Plan mode for multi-file architectural decisions; direct for single-file obvious fixes","Direct execution for everything","Plan mode for simple tasks; direct for complex ones"],correct:1,explanation:"Plan mode for multi-file/architectural work; direct execution for single-file/obvious changes."},
  { id:23,domain:"D3",scenario:"Claude Code for CI/CD",question:"How can Claude Code be used in CI/CD?",options:["It can't — only for interactive use","Using --plan flag, structured output for parsing, and batch API for cost-effective operations","As a background daemon on the CI server","Only through Anthropic's hosted CI integration"],correct:1,explanation:"Claude Code supports CI/CD via plan flag (non-interactive), structured output (JSON), and batch API (cost-effective)."},
  { id:24,domain:"D3",scenario:"Code Generation with Claude Code",question:"What is the CLAUDE.md configuration hierarchy?",options:["Only one global file","Enterprise policy → User settings → Project CLAUDE.md → Directory-level CLAUDE.md","Project CLAUDE.md overrides everything","User settings always take highest priority"],correct:1,explanation:"Hierarchical: enterprise > user > project > directory. More specific settings override general ones."},
  { id:25,domain:"D3",scenario:"Claude Code for CI/CD",question:"For code review in CI/CD, which approach is most thorough?",options:["Single-pass review of entire diff","Multi-pass: per-file analysis followed by integration-level review","Only review files with most lines changed","Random sampling of changed files"],correct:1,explanation:"Multi-pass (per-file + integration) catches both local issues and cross-file concerns."},
  { id:26,domain:"D3",scenario:"Developer Productivity",question:"Which built-in tools does Claude Code provide?",options:["Only a file reader","Read, Write, Edit, Bash, Glob (file search), and Grep (content search)","Just Bash","Read and Write only"],correct:1,explanation:"Claude Code provides Read, Write, Edit, Bash, Glob, and Grep — each optimized for its purpose."},
  { id:27,domain:"D3",scenario:"Code Generation with Claude Code",question:"What are slash commands in Claude Code?",options:["Shell commands executed on your behalf","Built-in interactive commands (/help, /clear, /review) for specific features","Custom commands defined in CLAUDE.md","API endpoints for programmatic access"],correct:1,explanation:"Slash commands are built-in interactive features of Claude Code's interface."},
  { id:28,domain:"D3",scenario:"Claude Code for CI/CD",question:"What format does Claude Code's structured output use?",options:["Plain text requiring regex parsing","JSON directly parseable by CI/CD tools","XML for enterprise compatibility","YAML matching CI/CD config formats"],correct:1,explanation:"Structured output returns parseable JSON, ideal for CI/CD automation."},
  { id:29,domain:"D3",scenario:"Developer Productivity",question:"What role do hooks play in Claude Code?",options:["Callbacks after model inference","They intercept tool calls to enforce rules, validate, or require approval","Logging for debugging","Chaining multiple sessions"],correct:1,explanation:"Hooks intercept tool calls for enforcement, validation, and approval gating."},
  { id:30,domain:"D4",scenario:"Structured Data Extraction",question:"For few-shot structured extraction, how many examples?",options:["As many as possible (10+)","2-4 diverse examples covering edge cases and expected format","One is always sufficient","Don't use examples — instructions are better"],correct:1,explanation:"2-4 diverse examples is optimal. Covers edge cases without wasting context."},
  { id:31,domain:"D4",scenario:"Structured Data Extraction",question:"Claude's structured output doesn't match the schema. What do?",options:["Increase temperature","Validation-retry loop: validate, return specific errors, have Claude fix","Switch to a larger model","Add more few-shot examples"],correct:1,explanation:"Validation-retry is the standard pattern: validate → specific errors → retry."},
  { id:32,domain:"D4",scenario:"Code Generation with Claude Code",question:"What system prompt strategy is most effective for code generation?",options:["Keep system prompt minimal, put everything in user messages","Use system prompt for persistent context (role, constraints, standards), user messages for specific tasks","Duplicate in both for emphasis","System prompts don't affect quality"],correct:1,explanation:"System prompts for persistent context, user messages for specific tasks."},
  { id:33,domain:"D4",scenario:"Structured Data Extraction",question:"Most reliable way to get JSON output from Claude?",options:["Say 'respond in JSON'","Tool definition with JSON schema","Provide a JSON template to fill in","Regex post-processing"],correct:1,explanation:"Tool definitions with JSON schemas are the most reliable structured output method."},
  { id:34,domain:"D4",scenario:"Customer Support Resolution Agent",question:"A prompt needs hard rules AND soft guidelines. How to structure?",options:["Mix together for readability","Hard rules in ALL CAPS first, then guidelines","Hard rules via programmatic hooks; soft guidelines in prompt with priority ordering","Everything in system prompt with equal emphasis"],correct:2,explanation:"Hard rules in hooks (guaranteed); soft guidelines in prompts with clear priority."},
  { id:35,domain:"D4",scenario:"Claude Code for CI/CD",question:"For batch-processing many documents, which accuracy approach?",options:["Single aggregate accuracy score","Per-document-type accuracy (aggregate metrics hide gaps in specific types)","Accuracy on a random sample only","Model's self-reported confidence"],correct:1,explanation:"Per-document-type tracking reveals hidden failure modes that aggregate metrics mask."},
  { id:36,domain:"D4",scenario:"Structured Data Extraction",question:"Extracting data from inconsistently formatted documents. Best prompting strategy?",options:["Provide strict regex patterns","Examples of both clean AND messy inputs with expected structured output","Ask Claude to clean first, then extract","Single example of perfect formatting"],correct:1,explanation:"Showing messy inputs mapped to correct outputs teaches handling format variation."},
  { id:37,domain:"D4",scenario:"Code Generation with Claude Code",question:"Chain-of-thought prompting is most useful for?",options:["Reducing token usage","Improving reasoning on complex, multi-step problems","Making responses faster","Bypassing content safety filters"],correct:1,explanation:"Chain-of-thought improves accuracy on complex reasoning by showing intermediate steps."},
  { id:38,domain:"D4",scenario:"Structured Data Extraction",question:"When should you use prefilled assistant responses?",options:["Never — confuses the model","To guide output format by starting the response (e.g., starting with '{')","Only for debugging","To reduce token costs"],correct:1,explanation:"Prefilling the assistant turn nudges Claude toward desired output format."},
  { id:39,domain:"D5",scenario:"Multi-Agent Research System",question:"As context approaches the window limit, what happens?",options:["Performance constant until hard limit","Graceful degradation — middle information may be missed ('lost in the middle')","Only recent messages affected","Claude auto-summarizes old context"],correct:1,explanation:"Context degradation is gradual. 'Lost in the middle' effect means center content gets less attention."},
  { id:40,domain:"D5",scenario:"Multi-Agent Research System",question:"How to manage context for large document corpus processing?",options:["Load all into a single agent's context","Distribute across subagents with focused queries, aggregate at coordinator","Use largest context window and hope","Summarize everything to one paragraph first"],correct:1,explanation:"Distributing across subagents with focused queries prevents context overload."},
  { id:41,domain:"D5",scenario:"Customer Support Resolution Agent",question:"How should information provenance be maintained?",options:["Not necessary — Claude tracks sources","Track source of each piece of information through the pipeline","Only track provenance for external API data","Log raw API responses for users to search"],correct:1,explanation:"Provenance means tracking every piece of data's origin throughout the pipeline."},
  { id:42,domain:"D5",scenario:"Developer Productivity",question:"When does context usage become a reliability concern?",options:["Only when completely full","At ~70-80% capacity — degradation is gradual","Never affects reliability","Only with documents >100 pages"],correct:1,explanation:"Performance degrades gradually. Manage actively at 70-80% capacity."},
  { id:43,domain:"D5",scenario:"Claude Code for CI/CD",question:"500 invoices processed, 95% accuracy reported. Deploy?",options:["Yes — 95% is excellent","No — check per-type accuracy; 5% errors may be concentrated in one type","Yes, but add disclaimer","No — only 100% is acceptable"],correct:1,explanation:"Aggregate accuracy masks systematic failures. Always decompose by document type."},
  { id:44,domain:"D5",scenario:"Multi-Agent Research System",question:"Best approach for long-running agent session reliability?",options:["Restart every 10 interactions","Periodic summarization, checkpoint state, explicit context references","Increase context window to maximum","Disable tools to save context"],correct:1,explanation:"Active context management: summarize, checkpoint, reference explicitly."},
  { id:45,domain:"D5",scenario:"Structured Data Extraction",question:"Claude hallucinates in data extraction. Most effective mitigation?",options:["Lower temperature to 0","Add 'don't hallucinate' to prompt","Validation against source data, constrained schemas, flag low-confidence for human review","Switch to larger model"],correct:2,explanation:"Multi-layered: constrained schemas + source validation + human review for edge cases. Temperature alone doesn't prevent hallucination."},
];

// ─── Levels & Achievements ────────────────────────────────────────────────────
const LEVELS = [
  { name: "Novice", minXP: 0, badge: "🌱" },
  { name: "Apprentice", minXP: 200, badge: "📘" },
  { name: "Practitioner", minXP: 500, badge: "⚡" },
  { name: "Specialist", minXP: 1000, badge: "🔥" },
  { name: "Expert", minXP: 1800, badge: "💎" },
  { name: "Architect", minXP: 2800, badge: "👑" },
  { name: "Certified!", minXP: 4000, badge: "🏆" },
];

const ACHIEVEMENTS = [
  { id:"first_correct",name:"First Blood",desc:"Answer your first question correctly",icon:"🎯",check:s=>s.totalCorrect>=1 },
  { id:"streak_5",name:"On Fire",desc:"Get a 5-question streak",icon:"🔥",check:s=>s.bestStreak>=5 },
  { id:"streak_10",name:"Unstoppable",desc:"Get a 10-question streak",icon:"⚡",check:s=>s.bestStreak>=10 },
  { id:"d1_master",name:"Orchestrator",desc:"Score 80%+ in D1",icon:"🏗️",check:s=>domAcc(s,"D1")>=80 },
  { id:"d2_master",name:"Toolsmith",desc:"Score 80%+ in D2",icon:"🔧",check:s=>domAcc(s,"D2")>=80 },
  { id:"d3_master",name:"Code Whisperer",desc:"Score 80%+ in D3",icon:"⚙️",check:s=>domAcc(s,"D3")>=80 },
  { id:"d4_master",name:"Prompt Sage",desc:"Score 80%+ in D4",icon:"✍️",check:s=>domAcc(s,"D4")>=80 },
  { id:"d5_master",name:"Reliability Guard",desc:"Score 80%+ in D5",icon:"📊",check:s=>domAcc(s,"D5")>=80 },
  { id:"all_domains",name:"Full Stack Architect",desc:"80%+ in ALL domains",icon:"🏆",check:s=>Object.keys(DOMAINS).every(d=>domAcc(s,d)>=80) },
  { id:"perfect_exam",name:"Flawless",desc:"100% on a practice exam",icon:"💯",check:s=>s.perfectExam },
  { id:"scholar",name:"Scholar",desc:"Complete all lessons",icon:"🎓",check:s=>s.lessonsCompleted>=Object.values(LESSONS).flat().length },
  { id:"fifty_q",name:"Dedicated",desc:"Answer 50 questions",icon:"📚",check:s=>s.totalAnswered>=50 },
  { id:"hundred_q",name:"Centurion",desc:"Answer 100 questions",icon:"💪",check:s=>s.totalAnswered>=100 },
];

function domAcc(s,d){const a=s.domainStats[d]?.answered||0,c=s.domainStats[d]?.correct||0;return a===0?0:Math.round(c/a*100)}
function getLevel(xp){let l=LEVELS[0];for(const v of LEVELS)if(xp>=v.minXP)l=v;return l}
function getNextLevel(xp){for(const v of LEVELS)if(xp<v.minXP)return v;return null}
function shuffle(a){const s=[...a];for(let i=s.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[s[i],s[j]]=[s[j],s[i]]}return s}

// ─── Components ───────────────────────────────────────────────────────────────
function NavBar({ view, setView, stats }) {
  const level = getLevel(stats.xp);
  const tabs = [
    { id: "home", label: "Home", icon: "🏠" },
    { id: "learn", label: "Learn", icon: "📖" },
    { id: "practice", label: "Practice", icon: "⚡" },
    { id: "reference", label: "Reference", icon: "📋" },
    { id: "achievements", label: "Trophies", icon: "🏅" },
  ];
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(11,11,20,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${T.border}` }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", gap: 2 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setView(t.id)}
              style={{ ...btnBase, background: view === t.id ? "rgba(124,58,237,0.18)" : "transparent", color: view === t.id ? T.accent : T.textMuted, padding: "8px 14px", borderRadius: T.radiusSm, fontSize: 13, fontWeight: view === t.id ? 600 : 400, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 15 }}>{t.icon}</span>
              <span className="nav-label">{t.label}</span>
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
          <span style={{ color: T.amber }}>🔥{stats.currentStreak}</span>
          <span style={{ background: "rgba(124,58,237,0.15)", padding: "4px 10px", borderRadius: 20, color: T.accent, fontWeight: 700 }}>{level.badge} {stats.xp} XP</span>
        </div>
      </div>
    </div>
  );
}

function ProgressRing({ pct, size = 56, stroke = 5, color = T.accent, children }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>
    </div>
  );
}

function AchievementToast({ achievement }) {
  if (!achievement) return null;
  return (
    <div style={{ position: "fixed", top: 70, right: 20, background: `linear-gradient(135deg, ${T.amber}, #b45309)`, color: "#000", padding: "14px 22px", borderRadius: T.radius, zIndex: 200, boxShadow: `0 8px 40px rgba(245,158,11,0.5)`, maxWidth: 320 }}>
      <div style={{ fontWeight: 800, fontSize: 15 }}>{achievement.icon} Achievement Unlocked!</div>
      <div style={{ fontSize: 13, marginTop: 2 }}>{achievement.name} — {achievement.desc}</div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("home");
  const [stats, setStats] = useState({
    xp: 0, totalAnswered: 0, totalCorrect: 0, currentStreak: 0, bestStreak: 0,
    domainStats: { D1:{answered:0,correct:0}, D2:{answered:0,correct:0}, D3:{answered:0,correct:0}, D4:{answered:0,correct:0}, D5:{answered:0,correct:0} },
    unlockedAchievements: [], perfectExam: false, examsTaken: 0, bestExamScore: 0,
    lessonsCompleted: 0, completedLessons: [],
  });
  const [quizQ, setQuizQ] = useState([]);
  const [curQ, setCurQ] = useState(0);
  const [selAns, setSelAns] = useState(null);
  const [showRes, setShowRes] = useState(false);
  const [quizResults, setQuizResults] = useState([]);
  const [quizMode, setQuizMode] = useState(null);
  const [selDomain, setSelDomain] = useState(null);
  const [newAch, setNewAch] = useState(null);
  const [xpGained, setXpGained] = useState(0);
  const [activeLesson, setActiveLesson] = useState(null);
  const [lessonSection, setLessonSection] = useState(0);
  const [refTab, setRefTab] = useState("antipatterns");

  const level = getLevel(stats.xp);
  const nextLvl = getNextLevel(stats.xp);
  const xpProg = nextLvl ? ((stats.xp - level.minXP) / (nextLvl.minXP - level.minXP)) * 100 : 100;
  const estScore = stats.totalAnswered > 0 ? Math.round(stats.totalCorrect / stats.totalAnswered * 1000) : 0;
  const totalLessons = Object.values(LESSONS).flat().length;

  const checkAch = useCallback((ns) => {
    for (const a of ACHIEVEMENTS) {
      if (!ns.unlockedAchievements.includes(a.id) && a.check(ns)) {
        ns.unlockedAchievements.push(a.id);
        setNewAch(a);
        setTimeout(() => setNewAch(null), 3500);
      }
    }
    return ns;
  }, []);

  const startQuiz = (mode, domain = null) => {
    let qs;
    if (mode === "exam") qs = shuffle(QUESTIONS).slice(0, 20);
    else if (mode === "domain" && domain) qs = shuffle(QUESTIONS.filter(q => q.domain === domain));
    else qs = shuffle(QUESTIONS).slice(0, 10);
    setQuizQ(qs); setCurQ(0); setSelAns(null); setShowRes(false); setQuizResults([]); setQuizMode(mode); setSelDomain(domain); setView("quiz");
  };

  const handleAnswer = (idx) => {
    if (showRes) return;
    setSelAns(idx); setShowRes(true);
    const q = quizQ[curQ];
    const ok = idx === q.correct;
    const earned = (ok ? 25 : 5) + (ok ? Math.min(stats.currentStreak * 5, 25) : 0);
    setXpGained(earned);
    setStats(prev => {
      const ns = { ...prev, xp: prev.xp + earned, totalAnswered: prev.totalAnswered + 1, totalCorrect: prev.totalCorrect + (ok?1:0),
        currentStreak: ok ? prev.currentStreak + 1 : 0, bestStreak: ok ? Math.max(prev.bestStreak, prev.currentStreak + 1) : prev.bestStreak,
        domainStats: { ...prev.domainStats, [q.domain]: { answered: prev.domainStats[q.domain].answered+1, correct: prev.domainStats[q.domain].correct+(ok?1:0) } },
        unlockedAchievements: [...prev.unlockedAchievements], completedLessons: [...prev.completedLessons] };
      return checkAch(ns);
    });
    setQuizResults(prev => [...prev, { question: q, selected: idx, correct: ok }]);
  };

  const nextQuestion = () => {
    if (curQ + 1 < quizQ.length) { setCurQ(curQ + 1); setSelAns(null); setShowRes(false); setXpGained(0); }
    else {
      const cc = quizResults.filter(r => r.correct).length + (selAns === quizQ[curQ].correct ? 1 : 0);
      if (quizMode === "exam") {
        setStats(prev => {
          const ns = { ...prev, examsTaken: prev.examsTaken+1, bestExamScore: Math.max(prev.bestExamScore, Math.round(cc/quizQ.length*1000)),
            perfectExam: prev.perfectExam || cc===quizQ.length, unlockedAchievements:[...prev.unlockedAchievements], completedLessons:[...prev.completedLessons] };
          return checkAch(ns);
        });
      }
      setView("results");
    }
  };

  const completeLesson = (lessonId) => {
    if (stats.completedLessons.includes(lessonId)) { setActiveLesson(null); setLessonSection(0); return; }
    const lesson = Object.values(LESSONS).flat().find(l => l.id === lessonId);
    setStats(prev => {
      const ns = { ...prev, xp: prev.xp + (lesson?.xp || 30), lessonsCompleted: prev.lessonsCompleted + 1,
        completedLessons: [...prev.completedLessons, lessonId], unlockedAchievements: [...prev.unlockedAchievements] };
      return checkAch(ns);
    });
    setActiveLesson(null); setLessonSection(0);
  };

  // ─── QUIZ VIEW ──────────────────────────────────────────────────────────────
  if (view === "quiz" && quizQ.length > 0) {
    const q = quizQ[curQ];
    const dm = DOMAINS[q.domain];
    return (
      <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: T.font }}>
        <AchievementToast achievement={newAch} />
        <div style={{ maxWidth: 780, margin: "0 auto", padding: "24px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <button onClick={() => setView("practice")} style={{ ...btnBase, background: T.surface, color: T.textMuted, padding: "8px 16px", borderRadius: T.radiusSm, fontSize: 13 }}>← Exit</button>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <span style={{ color: T.amber, fontWeight: 600, fontSize: 14 }}>🔥 {stats.currentStreak}</span>
              <span style={{ background: dm.color + "22", color: dm.color, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{dm.icon} {q.domain}</span>
              <span style={{ color: T.textDim, fontSize: 13 }}>{curQ + 1}/{quizQ.length}</span>
            </div>
          </div>
          <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, marginBottom: 28 }}>
            <div style={{ height: "100%", width: `${((curQ + (showRes?1:0))/quizQ.length)*100}%`, background: dm.color, borderRadius: 3, transition: "width 0.4s ease" }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <span style={{ background: T.surface, padding: "5px 12px", borderRadius: 20, fontSize: 12, color: T.textMuted }}>📋 {q.scenario}</span>
          </div>
          <div style={{ ...card, padding: "28px 24px", marginBottom: 20 }}>
            <h2 style={{ fontSize: 19, lineHeight: 1.55, fontWeight: 500, margin: 0 }}>{q.question}</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {q.options.map((opt, idx) => {
              let bg = T.surface, border = `1px solid ${T.border}`, op = 1;
              if (showRes) {
                if (idx === q.correct) { bg = "rgba(16,185,129,0.12)"; border = `2px solid ${T.green}`; }
                else if (idx === selAns) { bg = "rgba(239,68,68,0.12)"; border = `2px solid ${T.red}`; }
                else op = 0.45;
              }
              return (
                <button key={idx} onClick={() => handleAnswer(idx)}
                  style={{ ...btnBase, background: bg, border, borderRadius: T.radiusSm, padding: "15px 18px", color: T.text, fontSize: 14, textAlign: "left", opacity: op, lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 700, marginRight: 10, color: T.textMuted }}>{String.fromCharCode(65+idx)}.</span>{opt}
                </button>
              );
            })}
          </div>
          {showRes && (
            <>
              <div style={{ background: selAns===q.correct ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${selAns===q.correct ? T.green+"44" : T.red+"44"}`, borderRadius: T.radius, padding: "18px 20px", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, color: selAns===q.correct ? T.green : T.red }}>{selAns===q.correct ? "✅ Correct!" : "❌ Incorrect"}</span>
                  <span style={{ color: T.amber, fontWeight: 700, fontSize: 14 }}>+{xpGained} XP</span>
                </div>
                <p style={{ margin: 0, color: "#b0bec5", lineHeight: 1.6, fontSize: 14 }}>{q.explanation}</p>
              </div>
              <button onClick={nextQuestion}
                style={{ ...btnBase, width: "100%", padding: 14, background: `linear-gradient(135deg, ${T.accent}, #5b21b6)`, borderRadius: T.radius, color: "#fff", fontSize: 15, fontWeight: 700 }}>
                {curQ+1 < quizQ.length ? "Next Question →" : "View Results 📊"}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── RESULTS VIEW ───────────────────────────────────────────────────────────
  if (view === "results") {
    const correct = quizResults.filter(r=>r.correct).length;
    const total = quizResults.length;
    const scaled = Math.round(correct/total*1000);
    const passed = scaled >= 720;
    const domBreak = {};
    quizResults.forEach(r => { const d=r.question.domain; if(!domBreak[d])domBreak[d]={c:0,t:0}; domBreak[d].t++; if(r.correct)domBreak[d].c++ });
    return (
      <div style={{ minHeight:"100vh", background:T.bg, color:T.text, fontFamily:T.font }}>
        <div style={{ maxWidth:700, margin:"0 auto", padding:"40px 16px" }}>
          <div style={{ textAlign:"center", marginBottom:36 }}>
            <div style={{ fontSize:56, marginBottom:12 }}>{passed?"🎉":"📖"}</div>
            <h1 style={{ fontSize:24, fontWeight:700, marginBottom:8 }}>{quizMode==="exam"?"Practice Exam Results":"Quiz Complete!"}</h1>
            <div style={{ fontSize:44, fontWeight:800, color:passed?T.green:T.amber }}>{scaled}/1000</div>
            <div style={{ fontSize:15, color:passed?T.green:T.red, fontWeight:600, marginTop:4 }}>{passed?"✅ PASSING (720+ needed)":"❌ Below passing (need 720)"}</div>
            <div style={{ color:T.textMuted, marginTop:6 }}>{correct}/{total} correct ({Math.round(correct/total*100)}%)</div>
          </div>
          <div style={{ ...card, padding:20, marginBottom:20 }}>
            <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:600, color:T.textMuted }}>Domain Breakdown</h3>
            {Object.entries(domBreak).map(([d,v])=>(
              <div key={d} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:3 }}>
                  <span>{DOMAINS[d].icon} {DOMAINS[d].short}</span>
                  <span style={{ color:v.c/v.t>=0.72?T.green:T.red, fontWeight:600 }}>{v.c}/{v.t}</span>
                </div>
                <div style={{ height:5, background:"rgba(255,255,255,0.08)", borderRadius:3 }}>
                  <div style={{ height:"100%", width:`${v.c/v.t*100}%`, background:DOMAINS[d].color, borderRadius:3 }} />
                </div>
              </div>
            ))}
          </div>
          {quizResults.filter(r=>!r.correct).length > 0 && (
            <div style={{ background:"rgba(239,68,68,0.04)", border:`1px solid rgba(239,68,68,0.12)`, borderRadius:T.radius, padding:20, marginBottom:20 }}>
              <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:600, color:T.red }}>📝 Review Missed Questions</h3>
              {quizResults.filter(r=>!r.correct).map((r,i)=>(
                <div key={i} style={{ marginBottom:14, paddingBottom:14, borderBottom:`1px solid rgba(255,255,255,0.04)` }}>
                  <p style={{ fontSize:13, fontWeight:500, marginBottom:6, lineHeight:1.5 }}>{r.question.question}</p>
                  <p style={{ fontSize:12, color:T.red, margin:"3px 0" }}>Your answer: {r.question.options[r.selected]}</p>
                  <p style={{ fontSize:12, color:T.green, margin:"3px 0" }}>Correct: {r.question.options[r.question.correct]}</p>
                  <p style={{ fontSize:12, color:T.textMuted, margin:"3px 0", lineHeight:1.5 }}>{r.question.explanation}</p>
                </div>
              ))}
            </div>
          )}
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={()=>setView("home")} style={{ ...btnBase, flex:1, padding:13, background:T.surface, borderRadius:T.radius, color:T.text, fontSize:14, fontWeight:600 }}>🏠 Home</button>
            <button onClick={()=>startQuiz(quizMode,selDomain)} style={{ ...btnBase, flex:1, padding:13, background:`linear-gradient(135deg,${T.accent},#5b21b6)`, borderRadius:T.radius, color:"#fff", fontSize:14, fontWeight:600 }}>🔄 Retry</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── LESSON VIEW ────────────────────────────────────────────────────────────
  if (view === "lesson" && activeLesson) {
    const lesson = Object.values(LESSONS).flat().find(l => l.id === activeLesson);
    if (!lesson) { setView("learn"); return null; }
    const sec = lesson.sections[lessonSection];
    const isLast = lessonSection === lesson.sections.length - 1;
    const completed = stats.completedLessons.includes(lesson.id);
    const dm = DOMAINS[lesson.id.split("-")[0].toUpperCase()];
    return (
      <div style={{ minHeight:"100vh", background:T.bg, color:T.text, fontFamily:T.font }}>
        <div style={{ maxWidth:720, margin:"0 auto", padding:"24px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <button onClick={()=>{setActiveLesson(null);setLessonSection(0);setView("learn")}} style={{ ...btnBase, background:T.surface, color:T.textMuted, padding:"8px 16px", borderRadius:T.radiusSm, fontSize:13 }}>← Back</button>
            <span style={{ background:dm?.color+"22", color:dm?.color, padding:"4px 12px", borderRadius:20, fontSize:12, fontWeight:700 }}>{dm?.icon} {lesson.id.split("-")[0].toUpperCase()}</span>
          </div>
          {/* Progress dots */}
          <div style={{ display:"flex", gap:6, marginBottom:24, justifyContent:"center" }}>
            {lesson.sections.map((_,i) => (
              <div key={i} onClick={()=>setLessonSection(i)} style={{ width: i===lessonSection?28:10, height:10, borderRadius:5, background: i<lessonSection?"rgba(16,185,129,0.5)":i===lessonSection?T.accent:"rgba(255,255,255,0.1)", cursor:"pointer", transition:T.transition }} />
            ))}
          </div>
          <div style={{ marginBottom:8 }}>
            <h1 style={{ fontSize:22, fontWeight:700, margin:"0 0 4px" }}>{lesson.title}</h1>
            <span style={{ fontSize:12, color:T.textMuted }}>{lesson.minutes} min read · {lesson.xp} XP</span>
          </div>
          {/* Content card */}
          <div style={{ ...card, padding:"28px 24px", marginBottom:20, minHeight:280 }}>
            <h2 style={{ fontSize:17, fontWeight:700, margin:"0 0 16px", color:dm?.color }}>{sec.heading}</h2>
            {sec.body.split("\n\n").map((para, i) => (
              <p key={i} style={{ margin:"0 0 14px", lineHeight:1.7, fontSize:14.5, color:"#c8d0dc", whiteSpace:"pre-wrap" }}>{para}</p>
            ))}
          </div>
          {/* Navigation */}
          <div style={{ display:"flex", gap:10 }}>
            {lessonSection > 0 && (
              <button onClick={()=>setLessonSection(lessonSection-1)} style={{ ...btnBase, flex:1, padding:13, background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radius, color:T.text, fontSize:14, fontWeight:600 }}>← Previous</button>
            )}
            {!isLast ? (
              <button onClick={()=>setLessonSection(lessonSection+1)} style={{ ...btnBase, flex:2, padding:13, background:`linear-gradient(135deg,${T.accent},#5b21b6)`, borderRadius:T.radius, color:"#fff", fontSize:14, fontWeight:700 }}>Continue →</button>
            ) : (
              <button onClick={()=>completeLesson(lesson.id)} style={{ ...btnBase, flex:2, padding:13, background:`linear-gradient(135deg,${T.green},#047857)`, borderRadius:T.radius, color:"#fff", fontSize:14, fontWeight:700 }}>
                {completed ? "✅ Already Completed — Close" : `✅ Complete Lesson (+${lesson.xp} XP)`}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── WRAPPED VIEWS ──────────────────────────────────────────────────────────
  const Shell = ({ children }) => (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: T.font }}>
      <NavBar view={view} setView={setView} stats={stats} />
      <AchievementToast achievement={newAch} />
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "28px 16px 60px" }}>{children}</div>
    </div>
  );

  // ─── HOME ───────────────────────────────────────────────────────────────────
  if (view === "home") {
    const readiness = stats.totalAnswered > 0 ? Math.min(100, Math.round(
      (Math.min(estScore, 1000) / 1000 * 40) +
      (stats.lessonsCompleted / totalLessons * 40) +
      (stats.unlockedAchievements.length / ACHIEVEMENTS.length * 20)
    )) : 0;
    return (
      <Shell>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <h1 style={{ fontSize:26, fontWeight:800, margin:"0 0 4px", background:`linear-gradient(135deg,${T.accent},${T.blue},${T.cyan})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Claude Architect Prep</h1>
          <p style={{ color:T.textMuted, margin:0, fontSize:13 }}>Certified Architect — Foundations</p>
        </div>
        {/* Level card */}
        <div style={{ background:`linear-gradient(135deg,rgba(124,58,237,0.12),rgba(37,99,235,0.1))`, borderRadius:18, padding:"22px 24px", marginBottom:18, border:"1px solid rgba(124,58,237,0.15)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:30 }}>{level.badge}</span>
              <div>
                <div style={{ fontSize:18, fontWeight:700 }}>{level.name}</div>
                {nextLvl && <div style={{ fontSize:11, color:T.textMuted }}>{nextLvl.minXP - stats.xp} XP to {nextLvl.name}</div>}
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:24, fontWeight:800, color:T.amber }}>{stats.xp} XP</div>
            </div>
          </div>
          <div style={{ height:8, background:"rgba(255,255,255,0.08)", borderRadius:4 }}>
            <div style={{ height:"100%", width:`${xpProg}%`, background:`linear-gradient(90deg,${T.accent},${T.blue})`, borderRadius:4, transition:"width 0.5s" }} />
          </div>
        </div>
        {/* Exam Readiness */}
        <div style={{ ...card, padding:"20px 24px", marginBottom:18, display:"flex", alignItems:"center", gap:20 }}>
          <ProgressRing pct={readiness} size={64} stroke={6} color={readiness>=72?T.green:readiness>=50?T.amber:T.red}>
            <span style={{ fontSize:15, fontWeight:800, color:readiness>=72?T.green:readiness>=50?T.amber:T.red }}>{readiness}%</span>
          </ProgressRing>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>Exam Readiness</div>
            <div style={{ fontSize:12, color:T.textMuted, lineHeight:1.5 }}>
              {readiness < 30 ? "Just getting started — hit the Learn tab to build foundations!" :
               readiness < 60 ? "Good progress! Keep learning and practicing to build confidence." :
               readiness < 80 ? "Strong foundation! Focus on weak domains and take practice exams." :
               "Looking great! You're well-prepared for the certification exam."}
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:12, color:T.textMuted }}>Est. Score</div>
            <div style={{ fontSize:22, fontWeight:800, color:estScore>=720?T.green:T.amber }}>{estScore || "—"}</div>
            <div style={{ fontSize:10, color:T.textDim }}>/ 1000</div>
          </div>
        </div>
        {/* Stats grid */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, marginBottom:18 }}>
          {[
            { label:"Lessons", value:`${stats.lessonsCompleted}/${totalLessons}`, color:T.accent },
            { label:"Questions", value:stats.totalAnswered, color:T.blue },
            { label:"Accuracy", value:stats.totalAnswered>0?Math.round(stats.totalCorrect/stats.totalAnswered*100)+"%":"—", color:T.green },
            { label:"Streak", value:stats.bestStreak, color:T.amber },
          ].map((s,i) => (
            <div key={i} style={{ ...card, padding:"12px 10px", textAlign:"center" }}>
              <div style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:10, color:T.textDim, marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>
        {/* Domain mastery */}
        <div style={{ ...card, padding:"18px 20px", marginBottom:18 }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.textMuted, marginBottom:12 }}>Domain Mastery</div>
          {Object.entries(DOMAINS).map(([k,d]) => {
            const acc = domAcc(stats,k);
            return (
              <div key={k} style={{ marginBottom:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:2 }}>
                  <span style={{ color:T.textMuted }}>{d.icon} {k} <span style={{ color:T.textDim }}>({d.weight}%)</span></span>
                  <span style={{ color:acc>=80?T.green:acc>0?T.amber:T.textDim, fontWeight:600 }}>{acc>0?acc+"%":"—"}</span>
                </div>
                <div style={{ height:4, background:"rgba(255,255,255,0.06)", borderRadius:2 }}>
                  <div style={{ height:"100%", width:`${acc}%`, background:d.color, borderRadius:2 }} />
                </div>
              </div>
            );
          })}
        </div>
        {/* Quick actions */}
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={()=>setView("learn")} style={{ ...btnBase, flex:1, padding:14, background:`linear-gradient(135deg,${T.accent},#5b21b6)`, borderRadius:T.radius, color:"#fff", fontSize:15, fontWeight:700 }}>📖 Start Learning</button>
          <button onClick={()=>startQuiz("practice")} style={{ ...btnBase, flex:1, padding:14, background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radius, color:T.text, fontSize:15, fontWeight:700 }}>⚡ Quick Quiz</button>
        </div>
      </Shell>
    );
  }

  // ─── LEARN ──────────────────────────────────────────────────────────────────
  if (view === "learn") {
    return (
      <Shell>
        <div style={{ marginBottom:24 }}>
          <h1 style={{ fontSize:22, fontWeight:800, margin:"0 0 6px" }}>📖 Study Modules</h1>
          <p style={{ color:T.textMuted, margin:0, fontSize:13, lineHeight:1.5 }}>Master each domain with guided lessons. Complete lessons earn XP and count toward your readiness score.</p>
        </div>
        {/* Progress overview */}
        <div style={{ ...card, padding:"16px 20px", marginBottom:22, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <ProgressRing pct={totalLessons>0?stats.lessonsCompleted/totalLessons*100:0} size={48} stroke={4} color={T.green}>
              <span style={{ fontSize:12, fontWeight:700, color:T.green }}>{stats.lessonsCompleted}</span>
            </ProgressRing>
            <div>
              <div style={{ fontSize:14, fontWeight:600 }}>{stats.lessonsCompleted} / {totalLessons} lessons completed</div>
              <div style={{ fontSize:11, color:T.textMuted }}>{totalLessons - stats.lessonsCompleted} remaining</div>
            </div>
          </div>
          <div style={{ fontSize:13, color:T.amber, fontWeight:600 }}>
            {Object.values(LESSONS).flat().reduce((a,l)=>a+l.xp,0)} XP available
          </div>
        </div>
        {Object.entries(LESSONS).map(([domKey, lessons]) => {
          const dm = DOMAINS[domKey];
          const completed = lessons.filter(l => stats.completedLessons.includes(l.id)).length;
          return (
            <div key={domKey} style={{ marginBottom:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <span style={{ fontSize:22 }}>{dm.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                    <span style={{ fontSize:15, fontWeight:700 }}>{domKey}: {dm.name}</span>
                    <span style={{ fontSize:12, color:dm.color, fontWeight:600 }}>{completed}/{lessons.length}</span>
                  </div>
                  <div style={{ height:3, background:"rgba(255,255,255,0.06)", borderRadius:2, marginTop:4 }}>
                    <div style={{ height:"100%", width:`${lessons.length>0?completed/lessons.length*100:0}%`, background:dm.color, borderRadius:2 }} />
                  </div>
                </div>
                <span style={{ background:dm.color+"22", color:dm.color, padding:"3px 8px", borderRadius:12, fontSize:11, fontWeight:700 }}>{dm.weight}%</span>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {lessons.map((lesson, li) => {
                  const done = stats.completedLessons.includes(lesson.id);
                  return (
                    <button key={lesson.id} onClick={() => { setActiveLesson(lesson.id); setLessonSection(0); setView("lesson"); }}
                      style={{ ...btnBase, ...card, padding:"14px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", textAlign:"left", width:"100%", borderLeft:`3px solid ${done?T.green:dm.color+"66"}` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ width:28, height:28, borderRadius:14, background:done?"rgba(16,185,129,0.15)":"rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:done?T.green:T.textMuted }}>
                          {done ? "✓" : li+1}
                        </div>
                        <div>
                          <div style={{ fontSize:14, fontWeight:600, color:T.text }}>{lesson.title}</div>
                          <div style={{ fontSize:11, color:T.textMuted }}>{lesson.minutes} min · {lesson.sections.length} sections · {lesson.xp} XP</div>
                        </div>
                      </div>
                      <span style={{ fontSize:18, color:T.textDim }}>→</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </Shell>
    );
  }

  // ─── PRACTICE ───────────────────────────────────────────────────────────────
  if (view === "practice") {
    return (
      <Shell>
        <div style={{ marginBottom:24 }}>
          <h1 style={{ fontSize:22, fontWeight:800, margin:"0 0 6px" }}>⚡ Practice</h1>
          <p style={{ color:T.textMuted, margin:0, fontSize:13 }}>Test your knowledge with scenario-based questions matching the real exam format.</p>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:24 }}>
          <button onClick={()=>startQuiz("practice")}
            style={{ ...btnBase, ...card, padding:"20px 22px", display:"flex", justifyContent:"space-between", alignItems:"center", borderLeft:`3px solid ${T.accent}` }}>
            <div><div style={{ fontSize:16, fontWeight:700, color:T.text }}>⚡ Quick Practice</div><div style={{ fontSize:12, color:T.textMuted, marginTop:2 }}>10 random questions across all domains</div></div>
            <span style={{ color:T.textDim, fontSize:20 }}>→</span>
          </button>
          <button onClick={()=>startQuiz("exam")}
            style={{ ...btnBase, ...card, padding:"20px 22px", display:"flex", justifyContent:"space-between", alignItems:"center", borderLeft:`3px solid ${T.red}` }}>
            <div><div style={{ fontSize:16, fontWeight:700, color:T.text }}>🎯 Practice Exam</div><div style={{ fontSize:12, color:T.textMuted, marginTop:2 }}>20 questions · Scored /1000 · Pass at 720</div></div>
            <span style={{ color:T.textDim, fontSize:20 }}>→</span>
          </button>
        </div>
        <h2 style={{ fontSize:16, fontWeight:700, margin:"0 0 12px", color:T.textMuted }}>📚 Domain Drill</h2>
        <p style={{ color:T.textDim, fontSize:12, marginBottom:14 }}>Focus on a single domain to strengthen weak areas.</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {Object.entries(DOMAINS).map(([k,d]) => {
            const acc = domAcc(stats,k);
            const qc = QUESTIONS.filter(q=>q.domain===k).length;
            return (
              <button key={k} onClick={()=>startQuiz("domain",k)}
                style={{ ...btnBase, ...card, padding:16, textAlign:"left", borderTop:`3px solid ${d.color}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:18 }}>{d.icon}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:d.color }}>{d.weight}%</span>
                </div>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:2 }}>{k}</div>
                <div style={{ fontSize:11, color:T.textMuted, marginBottom:8 }}>{d.short}</div>
                <div style={{ height:3, background:"rgba(255,255,255,0.06)", borderRadius:2, marginBottom:4 }}>
                  <div style={{ height:"100%", width:`${acc}%`, background:d.color, borderRadius:2 }} />
                </div>
                <div style={{ fontSize:10, color:T.textDim }}>{qc} questions · {acc>0?acc+"% mastery":"Not started"}</div>
              </button>
            );
          })}
        </div>
        {stats.examsTaken > 0 && (
          <div style={{ ...card, padding:16, marginTop:18, textAlign:"center" }}>
            <div style={{ fontSize:12, color:T.textMuted }}>Best Practice Exam Score</div>
            <div style={{ fontSize:28, fontWeight:800, color:stats.bestExamScore>=720?T.green:T.amber }}>{stats.bestExamScore}/1000</div>
            <div style={{ fontSize:11, color:T.textDim }}>{stats.examsTaken} exam{stats.examsTaken>1?"s":""} taken</div>
          </div>
        )}
      </Shell>
    );
  }

  // ─── REFERENCE ──────────────────────────────────────────────────────────────
  if (view === "reference") {
    return (
      <Shell>
        <div style={{ marginBottom:20 }}>
          <h1 style={{ fontSize:22, fontWeight:800, margin:"0 0 6px" }}>📋 Quick Reference</h1>
          <p style={{ color:T.textMuted, margin:0, fontSize:13 }}>Key anti-patterns and decision frameworks to memorize.</p>
        </div>
        <div style={{ display:"flex", gap:6, marginBottom:20 }}>
          {[{id:"antipatterns",label:"Anti-Patterns",icon:"⚠️"},{id:"frameworks",label:"Decision Frameworks",icon:"🧭"},{id:"exam",label:"Exam Info",icon:"📝"}].map(t=>(
            <button key={t.id} onClick={()=>setRefTab(t.id)}
              style={{ ...btnBase, padding:"8px 14px", borderRadius:T.radiusSm, fontSize:13, fontWeight:refTab===t.id?600:400,
                background:refTab===t.id?"rgba(124,58,237,0.15)":"transparent", color:refTab===t.id?T.accent:T.textMuted }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        {refTab === "antipatterns" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {ANTI_PATTERNS.map((ap,i) => (
              <div key={i} style={{ ...card, padding:"14px 18px", borderLeft:`3px solid ${ap.severity==="high"?T.red:T.amber}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:T.red }}>❌ {ap.pattern}</div>
                  <span style={{ background:DOMAINS[ap.domain]?.color+"22", color:DOMAINS[ap.domain]?.color, padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:700, whiteSpace:"nowrap" }}>{ap.domain}</span>
                </div>
                <div style={{ fontSize:13, color:T.green }}>✅ {ap.correct}</div>
              </div>
            ))}
          </div>
        )}
        {refTab === "frameworks" && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {FRAMEWORKS.map((fw,i) => (
              <div key={i} style={{ ...card, padding:"18px 20px" }}>
                <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>🧭 {fw.name}</div>
                <div style={{ fontSize:13, color:T.textMuted, marginBottom:12, fontStyle:"italic" }}>"{fw.question}"</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {fw.options.map((o,j) => (
                    <div key={j} style={{ display:"flex", gap:10, fontSize:13, background:"rgba(255,255,255,0.03)", padding:"8px 12px", borderRadius:T.radiusXs }}>
                      <span style={{ color:T.textMuted, minWidth:180 }}>{o.condition}</span>
                      <span style={{ color:T.green, fontWeight:600 }}>→ {o.answer}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {refTab === "exam" && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ ...card, padding:"20px 22px" }}>
              <h3 style={{ margin:"0 0 12px", fontSize:16, fontWeight:700 }}>Exam Format</h3>
              <div style={{ fontSize:14, color:T.textMuted, lineHeight:1.8 }}>
                Format: Multiple-choice, scenario-based<br/>
                Questions: 4 of 6 random scenarios, ~50-65 questions<br/>
                Scoring: Scaled score 100–1000<br/>
                Passing: 720 / 1000<br/>
                Proctored: Yes
              </div>
            </div>
            <div style={{ ...card, padding:"20px 22px" }}>
              <h3 style={{ margin:"0 0 12px", fontSize:16, fontWeight:700 }}>Domain Weights</h3>
              {Object.entries(DOMAINS).map(([k,d]) => (
                <div key={k} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                  <span style={{ fontSize:16 }}>{d.icon}</span>
                  <span style={{ flex:1, fontSize:13, color:T.textMuted }}>{k}: {d.name}</span>
                  <div style={{ width:120, height:6, background:"rgba(255,255,255,0.06)", borderRadius:3 }}>
                    <div style={{ height:"100%", width:`${d.weight*100/27}%`, background:d.color, borderRadius:3 }} />
                  </div>
                  <span style={{ fontSize:13, fontWeight:700, color:d.color, minWidth:32, textAlign:"right" }}>{d.weight}%</span>
                </div>
              ))}
            </div>
            <div style={{ ...card, padding:"20px 22px" }}>
              <h3 style={{ margin:"0 0 12px", fontSize:16, fontWeight:700 }}>6 Core Scenarios</h3>
              {["Customer Support Resolution Agent", "Code Generation with Claude Code", "Multi-Agent Research System", "Developer Productivity with Claude", "Claude Code for CI/CD", "Structured Data Extraction"].map((s,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, fontSize:13, color:T.textMuted }}>
                  <span style={{ color:T.accent, fontWeight:700 }}>{i+1}.</span> {s}
                </div>
              ))}
              <p style={{ fontSize:12, color:T.textDim, marginTop:10, marginBottom:0 }}>You'll face 4 of these 6 randomly selected on exam day.</p>
            </div>
          </div>
        )}
      </Shell>
    );
  }

  // ─── ACHIEVEMENTS ───────────────────────────────────────────────────────────
  if (view === "achievements") {
    return (
      <Shell>
        <div style={{ marginBottom:20 }}>
          <h1 style={{ fontSize:22, fontWeight:800, margin:"0 0 6px" }}>🏅 Achievements</h1>
          <p style={{ color:T.textMuted, margin:0, fontSize:13 }}>{stats.unlockedAchievements.length} / {ACHIEVEMENTS.length} unlocked</p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {ACHIEVEMENTS.map(a => {
            const unlocked = stats.unlockedAchievements.includes(a.id);
            return (
              <div key={a.id} style={{ ...card, padding:16, opacity:unlocked?1:0.45, borderColor:unlocked?"rgba(245,158,11,0.25)":T.border }}>
                <div style={{ fontSize:26, marginBottom:6 }}>{unlocked?a.icon:"🔒"}</div>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:3 }}>{a.name}</div>
                <div style={{ fontSize:11, color:T.textMuted, lineHeight:1.4 }}>{a.desc}</div>
              </div>
            );
          })}
        </div>
      </Shell>
    );
  }

  return <Shell><p>Loading...</p></Shell>;
}
