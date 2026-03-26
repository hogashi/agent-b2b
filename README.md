# agent-b2b

Go back-to-back with your AI agent — a beat system that reacts to Claude Code's state.

### Example

- YOURTURN (waiting for prompt): kick + bass + hihat
- OPPONENT (AI processing): melody layer kicks in

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

Add the following `hooks` to your Claude Code config (`.claude/settings.json`):

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

**Note:** You need to click the power button once to start audio, due to the browser's Web Audio API policy requiring user interaction.

All communication stays on localhost. No data is sent to the internet.

## Port

The default port is **43819** (`0xAB2B` for agent-b2b).
