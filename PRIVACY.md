# Privacy Policy

**Last Updated:** 2026-09-04

---

## Our Commitment to Privacy

Your privacy is important to us. This Privacy Policy explains what information Ledger ("the Game" or "the Service") collects, how it's used, and your rights regarding your data.

**Short version: Single-player saves stay in your browser. Multiplayer rooms send your nickname and room state to the room service. Ledger currently has no account feature and does not promise cloud history.**

---

## 1. Information We Collect

### 1.1 Single-player and multiplayer

Single-player game state, settings, and history stay in your browser. Multiplayer rooms process the nickname you enter and the room/game state needed to connect and synchronize the game. Do not put real names, contact details, or other sensitive information in a nickname.

### 1.2 Local Storage

All game data is stored **locally in your browser** using:
- `localStorage` — for game state and settings
- `IndexedDB` — for game history records

Single-player data remains local. Multiplayer room data is sent to the room service for the multiplayer session.

You can delete this data at any time by clearing your browser's storage for the Ledger website.

---

## 2. Cookies and Tracking

### 2.1 No Cookies for Tracking

Ledger does not use cookies for tracking, advertising, or analytics purposes.

The game may use browser storage mechanisms (localStorage, IndexedDB) purely for game functionality — saving your progress and game history. These are not used for tracking across websites.

### 2.2 No Analytics

Ledger does not use any third-party analytics tools. We do not track:
- Page views
- User behavior
- Click patterns
- Session duration
- Any user activity metrics

---

## 3. Room Service and Third-Party Services

### 3.1 Room service

The room service receives multiplayer nicknames, room identifiers, session credentials, and room/game state needed to create rooms, reconnect players, and synchronize turns. We do not promise cloud saves, cross-device sync, or long-term history retention.

### 3.2 Third-Party Libraries

Ledger uses open-source software libraries. These libraries:
- Run locally in your browser
- Do not collect or transmit your data
- Are listed in `THIRD_PARTY_NOTICES.md`

### 3.3 AI Features

If AI features are enabled in the future:
- Only fictional game state data will be sent to AI providers
- No personal information will be included
- The specific AI provider and data practices will be disclosed
- You will have the option to opt out

Currently, all AI decision logic runs locally in your browser using deterministic algorithms — no external AI API calls are made.

See `docs/legal/AI_DATA_POLICY.md` for more details.

---

## 4. Data Retention

Single-player data is stored **only on your device** and persists until:
- You delete it from within the game
- You clear your browser storage
  - You uninstall the browser or clear browsing data

Multiplayer room state is handled by the room service for the session. Cloud history retention is not promised.

---

## 5. Your Data Rights

For single-player data, your browser provides the controls:

- **Access**: Your game data is in your browser's local storage
- **Deletion**: Clear your browser storage for the Ledger website, or use the in-game "clear history" feature
- **Export**: Game history is stored locally — you can view it within the game
- **Portability**: Cloud export and cloud history are not currently provided

---

## 6. Children's Privacy

Ledger is a general audience educational game. Multiplayer rooms process the nickname and room state provided by the player. Avoid entering real personal information, including a child's name or contact details.

---

## 7. Security

While no data transmission over the internet can be guaranteed 100% secure, Ledger's architecture minimizes risk:

- Single-player saves stay in the local browser
- Multiplayer rooms send nicknames and room state to the room service
- No account feature is currently available
- Cloud history is not promised

---

## 8. Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by updating the "Last Updated" date at the top of this page.

If we ever introduce data collection in the future, we will:
- Clearly disclose what data is collected
- Explain why it's collected
- Provide opt-out options where possible
- Update this policy before implementation

---

## 9. Contact Us

If you have questions about this Privacy Policy, please:
- Open an issue on the Ledger GitHub repository
- Refer to the project documentation

---

## 中文版简述

以下为隐私政策要点摘要（以英文完整版为准）：

- **单机存档**：单机游戏状态和历史仅保存在你的浏览器本地（localStorage / IndexedDB）。
- **多人房间**：加入房间会向房间服务发送昵称和房间状态。
- **账户与云端历史**：当前没有账户功能，也不承诺云端历史。
- **不使用 Cookie 追踪**：不使用任何分析工具或追踪技术。
- **AI 功能**：当前版本的 AI 逻辑完全在本地运行，不调用外部 API。
- **你的权利**：你可以随时通过清除浏览器存储来删除所有游戏数据。
