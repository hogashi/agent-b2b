# 四つ打ち状態通知システム

四つ打ちが常に流れていて、Claude Code の状態に応じてレイヤーが変化するシステム。

- プロンプト待ち (idle): キック + ベースのみ
- AI 処理中 (thinking): メロディーが加わる

---

## 案の一覧

### A. 状態検出の案

#### A1. Claude Code Hooks

- `UserPromptSubmit` hook → thinking 開始を検出
- 応答完了の検出が課題（`ResponseComplete` 相当の hook があるか要確認）
- hook は設定だけで済むので導入コストが低い
- ただし hook で拾えるイベントの種類に制約がある

#### A2. ターミナル I/O 監視 (PTY proxy)

- `socat` や自前の PTY proxy で Claude Code の入出力を中間キャプチャ
- プロンプト文字列（`❯` や `>` 等）の出現で idle 復帰を判定
- ストリーミング出力中 = thinking と判定
- 双方向 I/O を壊さず中継する必要がある

#### A3. プロセス状態ポーリング

- Claude Code の子プロセスや API コール（ネットワーク接続）を `lsof` / `ps` で監視
- 数秒おきのポーリングなのでレイテンシが大きい
- 精度は低い

#### A4. cmux / ターミナルマルチプレクサ

- cmux のようなツールでターミナルセッションをラップ
- I/O の傍受や内部ブラウザ等で状態検出・オーディオ再生が楽になる可能性がある
- 要調査

#### A5. Claude Code のステータスライン / ステータスバー

- Claude Code が tmux や iTerm2 のステータスバーに状態を出しているなら、それを読む
- 外部プロセスが tmux の変数やファイルを監視する

#### A6. ファイルベースのシグナル

- Claude Code の hook でファイルに状態を書き出す（例: `/tmp/claude-state`）
- オーディオ側がそのファイルを inotify / fswatch で監視
- シンプルだがファイル I/O のレイテンシがある

---

### B. オーディオ再生の案

#### B1. リアルタイム合成 (SuperCollider / Sonic Pi)

- プログラムで音を動的に生成
- 柔軟性は最大だがセットアップが重い
- OSC で外部から制御可能
- ループの同期やクオンタイズが自然にできる

#### B2. 事前録音ループの重ね再生

- 同じ長さの WAV ループを複数用意（kick_bass.wav, melody.wav）
- 常に全トラック再生し、melody のボリュームを 0/1 で切り替え
- 合成エンジン不要でシンプル
- ギャップレスループの実現が課題

#### B3. Python + sounddevice / pyaudio

- WAV を numpy 配列として読み、コールバックでループ再生
- melody チャンネルのゲインをリアルタイムに変更
- ループ位置を見てクオンタイズも可能
- 依存が少ない

#### B4. Web Audio API (ブラウザ)

- `AudioBufferSourceNode` でループ再生、`GainNode` で音量制御
- ブラウザがギャップレスループを処理してくれる
- WebSocket で状態を受け取る
- ブラウザを開いておく必要があるが、外部ブラウザ (Chrome/Safari/Firefox) のタブ1枚で動く
- localhost でポートを開けば CLI 側と通信できるので、特別なターミナル統合は不要

#### B5. Node.js + 何か

- `node-speaker` や `web-audio-api` (npm) でヘッドレス再生
- ブラウザ不要
- ライブラリの成熟度に不安がある

#### B6. CLI オーディオツール (sox / ffplay / mpv)

- `sox` の `play` コマンドでループ再生
- 複数プロセスで重ね再生し、片方を kill / pause で制御
- 最もシンプルだがギャップレスやフェードの制御が荒い
- `mpv --loop` + IPC ソケットでボリューム制御する手もある

#### B7. Pure Data (Pd)

- パッチで音声処理を組む
- OSC / MIDI で制御可能
- GUI なし (pd-vanilla -nogui) でも動く
- オーディオプログラミングの知識が要る

---

### C. シグナル伝達の案

#### C1. OSC (Open Sound Control)

- UDP ベースで低レイテンシ
- `oscsend` (liblo) でシェルから送信可能
- SuperCollider / Sonic Pi / Pd が標準で受信できる

#### C2. UNIX シグナル

- `kill -USR1 <pid>` でオーディオプロセスに通知
- 追加ライブラリ不要
- 2状態（USR1 = on, USR2 = off）程度なら十分

#### C3. UNIX ソケット / named pipe (FIFO)

- ファイルシステム上のソケットやパイプで通信
- `echo 1 > /tmp/claude-audio-pipe` のように使える
- 低レイテンシ

#### C4. ファイル監視 (inotify / fswatch)

- 状態ファイルの変更をオーディオ側が監視
- macOS では `fswatch` が使える
- 若干のレイテンシ

#### C5. HTTP / WebSocket

- オーディオ側が HTTP サーバーを立てて状態を受ける
- Web Audio API 案 (B4) と相性がいい
- オーバーヘッドは大きい

#### C6. stdin / パイプ

- オーディオプロセスの stdin に状態を流す
- `echo 1 | audio_process` 的に使う
- プロセスの起動方法に制約がある

---

### D. 音楽的な工夫の案

#### D1. クオンタイズ

- 状態変化を次の拍頭（または小節頭）まで遅延させて切り替え
- 音楽的に自然になる

#### D2. フェードイン / フェードアウト

- melody のオン・オフをバツッと切り替えず、短いフェード (100-500ms) をかける
- ぶつ切り感を軽減

#### D3. フィルター変化

- melody を常に鳴らしておき、idle 時はローパスフィルタで聞こえなくする
- thinking 時にフィルタを開く → なめらかな遷移

#### D4. 段階的な変化

- thinking が長く続くほど音が厚くなる（パッド追加、ハイハットが入る等）
- tool use 中は別の音色にする

#### D5. ランダム性

- melody のフレーズに適度なランダム性を入れて飽きにくくする
- スケール内の音をランダムに選ぶ等

---

### E. 全体構成の案

#### E1. Sonic Pi 中心

- Sonic Pi で音声生成 + ループ + OSC 受信を全部やる
- Claude Code hooks → oscsend → Sonic Pi
- 最もオールインワン

#### E2. Python スクリプト一本

- Python で WAV ループ再生 + 状態受信 (stdin or UNIX signal) を全部やる
- Claude Code hooks → signal/file → Python
- 依存が少ない

#### E3. ブラウザ UI

- ブラウザで Web Audio API + WebSocket
- 別途 WebSocket サーバーを立てるか、Claude Code hooks がブラウザに直接通知
- ビジュアライザーも付けられる

#### E4. mpv + IPC

- `mpv --loop --input-ipc-server=/tmp/mpv.sock` で WAV ループ再生
- `echo '{"command":["set_property","volume",0]}' | socat - /tmp/mpv.sock` で制御
- 既存ツールの組み合わせだけで済む

#### E5. 複数プロセス + シェルスクリプト

- バックグラウンドで `play kick_bass.wav repeat` を流しつつ
- 状態変化で `play melody.wav` を開始/停止
- 最も雑だが最も早く試せる

---

## 技術的な懸念事項

1. **応答完了の確実な検出** — 最大のボトルネック
2. **ギャップレスループ** — 普通の CLI ツールだと繋ぎ目が途切れがち
3. **レイテンシ** — 状態遷移からオーディオ変化までの遅延
4. **音楽的な自然さ** — 拍に合わない切り替えは不快
5. **リソース消費** — 常時オーディオ再生の CPU / メモリ負荷
6. **環境依存** — macOS / Linux での挙動差

## 未調査事項

- [ ] cmux の拡張ポイント（内部ブラウザ、I/O 傍受等で楽にできるか）
- [ ] Claude Code の hook で応答完了を検出できるイベントがあるか
- [ ] mpv IPC のレイテンシ
- [ ] sounddevice でギャップレスループが可能か
- [ ] macOS での fswatch のレイテンシ
