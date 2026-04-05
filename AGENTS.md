## AGENTS.md: Operational Gotchas & Agent Mechanics Cheat Sheet

This document outlines the critical "how-to" procedures for controlling agent behavior, command deployment, and state management within the Discord Bot environment.

### 1. Initialization & Core Bootstrapping

*   **Execution Entry Point:** The bot *must* be started by executing `node index.js` (or using the specified dev script).
*   **Service Order Dependency:** Component loading is strictly sequential:
    1.  `index.js` initializes `TradingBot`.
    2.  `TradingBot` calls `CommandHandler.registerCommands()`.
    3.  `InteractionHandler` registers its listeners (handles interactions).
    4.  `onReady()` hook executes *after* initial command registration, running initial state exports (`ChannelManager.exportToReadableFormat()`, `AuthManager.exportToReadableFormat()`).
*   **Mandatory Variable Check:** The process *fails* or operates with degraded security if `DISCORD_OWNER_ID` (read via `config.getOwnerId()`) is not set in the environment/`.env` file.

### 2. Command Deployment (The "API Gotcha")

*   **Deployment Mechanism:** Commands are *not* registered by simply updating documentation; they must be explicitly deployed to Discord's API endpoint.
*   **Required Action:** After any change to a command file (`src/commands/*.js`), the `CommandHandler.registerCommands()` method **must** be executed to call `rest.put(Routes.applicationCommands(...))`.
*   **Command Source:** The structure dictates that all command definitions must be manually instantiated and added to the `commandData` array within `CommandHandler.loadCommands()`. *Adding a new command requires edits in two places: the `require()` block and the `commandData.push()` block.*

### 3. Advanced Multi-Step Workflow: Access Granting

This workflow is the most complex operational sequence and involves three distinct Discord interactions:

1.  **Trigger:** Must start via a pre-built `/select` menu interaction (e.g., `customId='access_script_select'`).
2.  **Step 1 (Initial View):** The `InteractionHandler.handleSelectMenu` intercepts the select change and presents a `ModalBuilder`.
3.  **Step 2 (Data Input):** The user submits the modal, which contains the `username` field.
4.  **Step 3 (Backend Execution):** The `InteractionHandler.handleModalSubmit` intercepts the submission and delegates the core logic to `AccessManager.grantAccess(scriptName, username)`.
    *   **Execution Detail:** The entire process *must* rely on `await interaction.deferReply({ ephemeral: true })` before calling `AccessManager` to prevent API timeouts.

### 4. State Management & State Retrieval

*   **Configuration Source:** The primary, customizable bot settings (Name, Color, etc.) are loaded from `config/config.yml`.
*   **Secret/Credential Source:** API tokens and Owner IDs rely on external environment variables read by `config.js` (i.e., accessing `.env` or `process.env`).
*   **Persistent Context:** The bot maintains two primary persistent states that must be known/read:
    *   **Guild Structure:** Channel list mapping is loaded from `config/channels.json`.
    *   **API Tokens:** The bot uses tokens from `config.js` for all Discord API interactions (`rest.put`, `client.login`).

### 5. Command Structure Breakdown

| Command | Purpose/Gotcha | Dependencies/Mechanic |
| :--- | :--- | :--- |
| `/alert` | Core functionality. Triggers the main trading alert mechanism. | Relies on `config.yml` for alert colors/footers. |
| `/setup` | Operational setup of the bot environment. | Likely responsible for initializing/validating necessary resources (e.g., channel IDs). |
| `/comment` | Handles commenting/pining system. | Relies on structured data and embedding capabilities. |
| `/auth` | Manages user authentication status. | Interacts with `AuthManager` and is central to identity checks. |
| `/access`| **Credential Workflow**: Initiates the secure multi-step process for granting script access. | *Crucially* requires the `SELECT` -> `MODAL` -> `ACCESS_MANAGER` flow. |