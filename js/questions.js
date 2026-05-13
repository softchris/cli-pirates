// =============================================================================
// QUIZ QUESTIONS - Drawn from GitHub Copilot CLI for Beginners (Lessons 1-7)
// Each island has 3 questions. Answer correctly to conquer, wrong to fight!
// =============================================================================

const ISLAND_DATA = [
  {
    id: 1,
    name: "First Steps Isle",
    lesson: "Chapter 01: Setup & First Steps",
    color: 0x2ecc71,
    description: "Learn the three interaction modes of Copilot CLI",
    questions: [
      {
        question: "What are the three interaction modes in GitHub Copilot CLI?",
        options: [
          "Interactive, Plan, and Programmatic",
          "Chat, Code, and Debug",
          "Create, Review, and Deploy",
          "Read, Write, and Execute"
        ],
        correct: 0,
        explanation: "Copilot CLI offers Interactive mode (conversation), Plan mode (step-by-step planning), and Programmatic mode (one-shot commands with -p flag)."
      },
      {
        question: "How do you start a Copilot CLI interactive session?",
        options: [
          "gh copilot start",
          "copilot --interactive",
          "copilot",
          "copilot chat"
        ],
        correct: 2,
        explanation: "Simply typing 'copilot' in your terminal starts an interactive session where you can type prompts naturally."
      },
      {
        question: "Which flag is used for Programmatic (one-shot) mode?",
        options: [
          "-r (run)",
          "-p (prompt)",
          "-e (execute)",
          "-q (query)"
        ],
        correct: 1,
        explanation: "The -p flag lets you pass a single prompt: copilot -p \"your question here\" for quick, non-interactive usage."
      }
    ]
  },
  {
    id: 2,
    name: "Context Cove",
    lesson: "Chapter 02: Context & Conversations",
    color: 0x3498db,
    description: "Master the @ syntax and session management",
    questions: [
      {
        question: "What does the @ symbol do in Copilot CLI prompts?",
        options: [
          "Tags another user for collaboration",
          "References files and directories for context",
          "Triggers a special command mode",
          "Creates an annotation in the code"
        ],
        correct: 1,
        explanation: "The @ syntax references files (@file.py) and directories (@folder/) so Copilot CLI can read and understand your code."
      },
      {
        question: "How do you resume the most recent Copilot CLI session?",
        options: [
          "copilot --last",
          "copilot --continue",
          "copilot --resume-last",
          "copilot restart"
        ],
        correct: 1,
        explanation: "copilot --continue picks up the most recent session. You can also use --resume to pick from a list or --resume=name for a specific session."
      },
      {
        question: "What command clears the current context and starts fresh?",
        options: [
          "/reset",
          "/restart",
          "/clear",
          "/new-session"
        ],
        correct: 2,
        explanation: "/clear abandons the current session (no history saved) and starts fresh. /new saves history first, then starts fresh."
      }
    ]
  },
  {
    id: 3,
    name: "Workflow Wharf",
    lesson: "Chapter 03: Development Workflows",
    color: 0xe67e22,
    description: "Code review, refactoring, debugging, testing & git",
    questions: [
      {
        question: "What are the five development workflows covered in Chapter 3?",
        options: [
          "Code Review, Refactoring, Debugging, Test Generation, Git Integration",
          "Planning, Coding, Testing, Deploying, Monitoring",
          "Design, Implement, Test, Review, Release",
          "Analyze, Build, Check, Deploy, Evaluate"
        ],
        correct: 0,
        explanation: "Chapter 3 covers Code Review, Refactoring, Debugging, Test Generation, and Git Integration as the five key workflows."
      },
      {
        question: "Which slash command invokes the built-in code-review agent?",
        options: [
          "/check",
          "/audit",
          "/review",
          "/inspect"
        ],
        correct: 2,
        explanation: "/review invokes the built-in code-review agent, which is optimized for analyzing staged and unstaged git changes."
      },
      {
        question: "When debugging with Copilot CLI, what should you describe?",
        options: [
          "Only the error message",
          "The symptom (what you see) and the expectation (what should happen)",
          "Only the line number where it fails",
          "The entire git history"
        ],
        correct: 1,
        explanation: "Describe the symptom and the expectation. For example: 'Searching for The Hobbit returns no results even though it exists in the data.'"
      }
    ]
  },
  {
    id: 4,
    name: "Agent Atoll",
    lesson: "Chapter 04: Agents & Custom Instructions",
    color: 0x9b59b6,
    description: "Create specialized AI assistants with agent files",
    questions: [
      {
        question: "What file extension is used for custom agent definitions?",
        options: [
          ".ai.md",
          ".copilot.md",
          ".agent.md",
          ".assistant.md"
        ],
        correct: 2,
        explanation: "Agent files use the .agent.md extension and contain YAML frontmatter (metadata) plus markdown instructions."
      },
      {
        question: "Where should project-specific agents be stored?",
        options: [
          ".copilot/agents/",
          ".github/agents/",
          "agents/",
          ".vscode/agents/"
        ],
        correct: 1,
        explanation: ".github/agents/ is for project-specific agents shared with your team. ~/.copilot/agents/ is for personal global agents."
      },
      {
        question: "How do you switch between agents during a session?",
        options: [
          "/switch agent-name",
          "/use agent-name",
          "/agent",
          "/select agent-name"
        ],
        correct: 2,
        explanation: "/agent shows an interactive list of available agents to switch to. You can also use copilot --agent name from the command line."
      }
    ]
  },
  {
    id: 5,
    name: "Skills Shoals",
    lesson: "Chapter 05: Skills System",
    color: 0xe74c3c,
    description: "Auto-loading task-specific instructions",
    questions: [
      {
        question: "How are skills different from agents?",
        options: [
          "Skills change how AI thinks; agents provide task instructions",
          "Agents change how AI thinks; skills provide task-specific instructions that auto-load",
          "There is no difference",
          "Skills are only for testing"
        ],
        correct: 1,
        explanation: "Agents change how Copilot thinks (personas). Skills teach specific ways to complete tasks and auto-load when your prompt matches."
      },
      {
        question: "What is the required file in every skill folder?",
        options: [
          "README.md",
          "config.yaml",
          "SKILL.md",
          "instructions.md"
        ],
        correct: 2,
        explanation: "Each skill folder must contain a SKILL.md file with YAML frontmatter (name, description) and markdown instructions."
      },
      {
        question: "How are skills typically triggered?",
        options: [
          "You must always invoke them manually",
          "They run on a schedule",
          "Automatically when your prompt matches the skill's description",
          "Only through CI/CD pipelines"
        ],
        correct: 2,
        explanation: "Skills auto-trigger based on prompt matching. You can also invoke them directly as slash commands: /skill-name prompt."
      }
    ]
  },
  {
    id: 6,
    name: "MCP Marina",
    lesson: "Chapter 06: MCP Servers",
    color: 0x1abc9c,
    description: "Connect Copilot to GitHub, databases & APIs",
    questions: [
      {
        question: "What does MCP stand for?",
        options: [
          "Multi-Code Protocol",
          "Model Context Protocol",
          "Machine Communication Pipeline",
          "Managed Copilot Platform"
        ],
        correct: 1,
        explanation: "MCP = Model Context Protocol. It connects Copilot to external services like GitHub, file systems, and documentation sources."
      },
      {
        question: "Which MCP server is built-in and requires no setup?",
        options: [
          "Filesystem server",
          "Context7 server",
          "GitHub server",
          "Database server"
        ],
        correct: 2,
        explanation: "The GitHub MCP server is included by default, giving Copilot access to your repos, issues, PRs, and more without configuration."
      },
      {
        question: "Where is the MCP configuration file stored?",
        options: [
          "~/.copilot/mcp-config.json or .mcp.json",
          "~/.config/copilot/mcp.yaml",
          ".vscode/mcp.json",
          "package.json under mcpServers"
        ],
        correct: 0,
        explanation: "MCP servers are configured in ~/.copilot/mcp-config.json (user-level) or .mcp.json (project-level in the repo root)."
      }
    ]
  },
  {
    id: 7,
    name: "Grand Finale Fort",
    lesson: "Chapter 07: Putting It All Together",
    color: 0xf39c12,
    description: "Combine everything: idea to merged PR in one session",
    questions: [
      {
        question: "What is the recommended pattern for combining agents, skills, and MCP?",
        options: [
          "Use only one tool at a time",
          "Gather Context (MCP) → Analyze & Plan (Agents) → Execute (Skills) → Complete (MCP)",
          "Always start with skills, then agents",
          "MCP replaces agents and skills"
        ],
        correct: 1,
        explanation: "The Integration Pattern: Gather context with MCP, analyze with agents, execute with skills, then complete (commit/PR) with MCP."
      },
      {
        question: "What orchestral analogy describes combining all Copilot tools?",
        options: [
          "Solo pianist performing all parts",
          "A conductor directing strings (workflows), brass (agents), woodwinds (skills), percussion (MCP)",
          "A DJ mixing tracks",
          "A choir singing in unison"
        ],
        correct: 1,
        explanation: "Like an orchestra: Strings = core workflows, Brass = agents, Woodwinds = skills, Percussion = MCP. Together they create something magnificent."
      },
      {
        question: "What keyboard shortcut cycles between Interactive, Plan, and Autopilot modes?",
        options: [
          "Ctrl+Tab",
          "Alt+M",
          "Shift+Tab",
          "Ctrl+Shift+M"
        ],
        correct: 2,
        explanation: "Shift+Tab cycles between modes: Interactive → Plan → Autopilot. Press it anytime during a session to switch modes."
      }
    ]
  }
];

export { ISLAND_DATA };
