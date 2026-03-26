# 四つ打ち状態通知システム

四つ打ちが常に流れていて、Claude Code の状態に応じてレイヤーが変化するシステム。

- プロンプト待ち (idle): キック + ベースのみ
- AI 処理中 (thinking): メロディーが加わる

## アーキテクチャ

```
┌─────────────┐     OSC      ┌──────────────┐
│ State       │──────────────▶│ Audio Engine  │──▶ 🔊
│ Detector    │  melody on/off│ (Sonic Pi /   │
│             │               │  SuperCollider)│
└──────┬──────┘               └──────────────┘
       │ PTY proxy / hooks
       │
┌──────┴──────┐
│ Claude Code │
│ (terminal)  │
└─────────────┘
```

## 構成要素

### 1. 状態検出

Claude Code の idle / processing を区別する。

**方法A: Claude Code Hooks**

- `UserPromptSubmit` hook → melody ON の OSC を送信
- 応答完了の検出が課題（`ResponseComplete` 相当の hook があるか要確認）

**方法B: ターミナル I/O 監視**

- PTY proxy (`socat` 等) で Claude Code の出力をキャプチャ
- プロンプト文字列の出現で状態遷移を判定

**方法C: プロセス状態監視**

- ネットワーク I/O やプロセスツリーのポーリング
- 精度は低い

### 2. オーディオエンジン

常時再生 + リアルタイムにレイヤーを on/off する。

| 選択肢 | 特徴 |
|---|---|
| SuperCollider | 最も柔軟。OSC で外部から制御可能 |
| Sonic Pi | SuperCollider ベースで書きやすい。`live_loop` でレイヤー管理が直感的 |
| Pure Data (Pd) | OSC/MIDI で制御可。GUI なしでも動く |
| Web Audio API + Node.js | Tone.js でシーケンス管理。ブラウザが必要 |
| TidalCycles | パターン操作が強力だが外部制御はやや面倒 |

Sonic Pi が最も手軽な選択肢。

### 3. シグナル伝達

- OSC (Open Sound Control) でシェルからオーディオエンジンへ状態を送る
- `oscsend` (liblo) を使う

```bash
# melody ON
oscsend localhost 4560 /agent/state i 1
# melody OFF
oscsend localhost 4560 /agent/state i 0
```

## Sonic Pi サンプルコード

```ruby
live_loop :kick do
  sample :bd_haus
  sleep 0.5
end

live_loop :bass do
  use_synth :tb303
  play :e1, release: 0.3, cutoff: 80
  sleep 0.5
end

live_loop :melody do
  if get(:agent_thinking)
    use_synth :prophet
    play scale(:e3, :minor_pentatonic).choose, release: 0.2
    sleep 0.25
  else
    sleep 0.5
  end
end

live_loop :state_listener do
  use_real_time
  msg = sync "/osc*/agent/state"
  if msg[0] == 1
    set :agent_thinking, true
  else
    set :agent_thinking, false
  end
end
```

## Claude Code Hook 設定例

```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "command": "oscsend localhost 4560 /agent/state i 1" }
    ]
  }
}
```

## 技術的課題

1. **応答完了の確実な検出** — 最大のボトルネック。hook がなければ PTY proxy でプロンプト復帰を検出する
2. **レイテンシ** — 状態遷移からオーディオ変化までの遅延を最小化する
3. **音楽的な自然さ** — レイヤーの on/off が拍に合うようクオンタイズする

## 次のステップ

- [ ] Claude Code の hook で `ResponseComplete` 相当があるか調査
- [ ] Sonic Pi / SuperCollider の環境構築
- [ ] oscsend の導入確認
- [ ] 最小プロトタイプの作成（状態検出 + OSC + オーディオ）
