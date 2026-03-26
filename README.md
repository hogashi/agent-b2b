# agent-b2b

A four-on-the-floor beat system that reacts to Claude Code's state. The beat layers change depending on whether Claude is idle or thinking.

- Idle (waiting for prompt): kick + bass + hihat
- Thinking (AI processing): melody layer kicks in

## Setup

```bash
git clone https://github.com/hogashi/agent-b2b.git
cd agent-b2b
npm install
npm start
```

The browser opens automatically at `http://localhost:43819`.

To use a different port:

```bash
npm start -- --port 12345
```

Add the following to your Claude Code hooks config (`.claude/settings.json`):

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "curl -s -X POST http://localhost:43819/thinking",
            "timeout": 5
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "curl -s -X POST http://localhost:43819/idle",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

All communication stays on localhost. No data is sent to the internet.

## Port

The default port is **43819** (`0xAB2B` for agent-b2b).
