# agent-b2b

Go back-to-back with your AI agent — a beat system that reacts to Claude Code's state.

### Example

- YOURTURN (waiting for prompt): kick + bass + hihat
- OPPONENT (AI processing): melody layer kicks in

## Setup

```bash
npx agent-b2b
```

The browser opens automatically at `http://localhost:43819`.

To use a different port:

```bash
npx agent-b2b --port 12345
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

You can optionally add `PreToolUse` and `PostToolUse` hooks to detect tool approval prompts. This switches the state to YOURTURN while waiting for approval and back to OPPONENT once approved. Add or remove these based on your preference:

```json
{
  "PreToolUse": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "curl -s -X POST http://localhost:43819/idle",
          "timeout": 5
        }
      ]
    }
  ],
  "PostToolUse": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "curl -s -X POST http://localhost:43819/thinking",
          "timeout": 5
        }
      ]
    }
  ]
}
```

All communication stays on localhost after installation. No data is sent to the internet.

### Alternative: clone and run

```bash
git clone https://github.com/hogashi/agent-b2b.git
cd agent-b2b
npm install
npm start
```

## Usage

1. **Power on** — Click the power button to start audio. This is required each time the page loads.
2. **Use Claude Code** — While Claude is thinking, the melody layer kicks in. When it's your turn, only kick, bass, and hihat play. You can customize which tracks play in each state using the checkboxes.
3. (Optional) **Adjust** — Change the volume of each track, tweak the BPM, or edit the beat pattern in the sequencer.
4. (Optional) **Share** — Export your settings as JSON to back up or share with friends. You can also reset everything to defaults.

## Troubleshooting

**No sound**
Click the power button to start audio. This is required every time the page loads due to the browser's Web Audio API policy.

**PLUGGED indicator is red**
The server is not running. Run `npm start` and check that the port is not in use by another process.

**State does not change (stuck on YOURTURN/OPPONENT)**
Make sure the Claude Code hooks are configured in `.claude/settings.json`. See the Setup section above.

## Port

The default port is **43819** (`0xAB2B` for agent-b2b).
