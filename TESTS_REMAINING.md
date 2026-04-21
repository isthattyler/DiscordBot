# Test Coverage Roadmap

## Current Status (as of 2026-04-21)

**Overall Coverage: 82.94%** (316 tests, 15 suites)

| Module | Coverage | Status |
|--------|----------|--------|
| Commands | 96.91% | ✅ Complete |
| Embeds | 96.72% | ✅ Complete |
| ConfigLoader | 89.47% | ✅ Good |
| ChannelManager | 96.99% | ✅ Complete |
| EarningsCalendar | 97.14% | ✅ Complete |
| AuthManager | 100% | ✅ Complete |
| **AccessManager** | 12.19% | 🔴 Remaining |
| **CommandHandler** | 0% | 🔴 Remaining |
| **InteractionHandler** | 0% | 🔴 Remaining |
| **EarningsCalendar (bot integration)** | ~40% | 🟡 Partial |

---

## Remaining Work

### 1. AccessManager Tests (~15 tests) — Highest Priority

**File:** `tests/unit/utils/accessManager.test.js`  
**Target:** 70%+ coverage  
**Estimated Effort:** 45 minutes

#### Why It's Hard
- Uses raw `http.request` / `https.request` (not axios)
- Constructor calls `loadPineScripts()` synchronously via `fs.readFileSync`
- Requires mocking Node's `http` and `https` modules
- API calls involve callbacks and event emitters

#### Test Cases Needed

| # | Test Case | Lines Covered |
|---|-----------|---------------|
| 1 | `init loads pine scripts from file` | 14-22 |
| 2 | `init skips if already initialized` | Guard clause |
| 3 | `loadPineScripts handles ENOENT` | 19-22 |
| 4 | `loadPineScripts handles parse error` | JSON.parse fail |
| 5 | `getAvailableScripts returns script names` | 25-27 |
| 6 | `getPineIds returns IDs for valid script` | 29-31 |
| 7 | `getPineIds returns empty for unknown` | 29-31 |
| 8 | `grantAccess rejects unknown script` | 33-41 |
| 9 | `grantAccess calls API for valid script` | 33-58 |
| 10 | `grantAccess handles API error` | 52-58 |
| 11 | `processResponse handles Success` | 131-136 |
| 12 | `processResponse handles Not Applied` | 137-142 |
| 13 | `processResponse handles Failure` | 143-148 |
| 14 | `processResponse handles mixed results` | 149-156 |
| 15 | `processResponse handles empty array` | 118-123 |
| 16 | `processResponse handles non-array` | 118-123 |
| 17 | `getApiUrl returns configured URL` | 159-165 |
| 18 | `getApiUrl throws if missing` | 159-165 |
| 19 | `reset clears state` | New method |
| 20 | `setPineScripts sets directly` | New method |

#### Recommended Approach
```javascript
// Use AccessManager class export (already added in refactor)
const { AccessManager } = require('../../../src/utils/AccessManager');
const manager = new AccessManager();

// Mock fs.promises for loadPineScripts
jest.mock('fs', () => ({
  promises: { readFile: jest.fn() }
}));

// Mock http/https for makePostRequest
jest.mock('http');
jest.mock('https');

// For HTTP tests, mock the request/response pattern:
http.request.mockImplementation((options, cb) => {
  const mockRes = { on: jest.fn(), statusCode: 200 };
  cb(mockRes);
  return { on: jest.fn(), write: jest.fn(), end: jest.fn() };
});
```

---

### 2. CommandHandler Tests (~10 tests) — Medium Priority

**File:** `tests/unit/handlers/commandHandler.test.js`  
**Target:** 70%+ coverage  
**Estimated Effort:** 30 minutes

#### Why It's Hard
- Imports all command classes in constructor
- Uses `discord.js` REST and Routes for command registration
- Command execution requires mock interactions

#### Test Cases Needed

| # | Test Case | Lines Covered |
|---|-----------|---------------|
| 1 | `constructor loads all 7 commands` | 11-16 |
| 2 | `loadCommands registers commands in map` | 18-45 |
| 3 | `registerCommands calls REST.put` | 47-62 |
| 4 | `registerCommands handles error` | 59-61 |
| 5 | `handleInteraction ignores non-chat input` | 64-65 |
| 6 | `handleInteraction executes command` | 67-76 |
| 7 | `handleInteraction handles missing command` | 69-72 |
| 8 | `handleInteraction catches error and replies` | 76-89 |
| 9 | `handleInteraction catches error and followUp` | 84-86 |
| 10 | `handleInteraction catches error with deferred` | 84-86 |

#### Recommended Approach
```javascript
// Mock all command classes
jest.mock('../../../src/commands/LongCommand');
jest.mock('../../../src/commands/ShortCommand');
// ... mock all 7 commands

// Mock discord.js REST
jest.mock('discord.js', () => ({
  REST: jest.fn().mockImplementation(() => ({
    setToken: jest.fn().mockReturnThis(),
    put: jest.fn().mockResolvedValue()
  })),
  Routes: { applicationCommands: jest.fn() }
}));

// Mock ConfigLoader
jest.mock('../../../src/utils/ConfigLoader', () => ({
  getToken: () => 'mock-token',
  getClientId: () => 'mock-client-id'
}));

// Create handler with mocked commands
const handler = new CommandHandler();

// Test interaction handling
const mockInteraction = {
  isChatInputCommand: jest.fn().mockReturnValue(true),
  commandName: 'long',
  replied: false,
  deferred: false,
  reply: jest.fn().mockResolvedValue(),
  followUp: jest.fn().mockResolvedValue()
};

await handler.handleInteraction(mockInteraction);
```

---

### 3. InteractionHandler Tests (~10 tests) — Medium Priority

**File:** `tests/unit/handlers/interactionHandler.test.js`  
**Target:** 80%+ coverage  
**Estimated Effort:** 25 minutes

#### Why It's Hard
- Singleton export pattern (already refactored to class + instance)
- Uses Discord.js ModalBuilder, TextInputBuilder
- Calls AccessManager.grantAccess()

#### Test Cases Needed

| # | Test Case | Lines Covered |
|---|-----------|---------------|
| 1 | `handleSelectMenu shows modal for access_script_select` | 10-31 |
| 2 | `handleSelectMenu ignores other customIds` | No-op path |
| 3 | `handleModalSubmit processes access_modal` | 33-69 |
| 4 | `handleModalSubmit ignores other modals` | No-op path |
| 5 | `handleModalSubmit includes details in response` | 49-56 |
| 6 | `handleModalSubmit defers reply first` | Line 40 |
| 7 | `modal has correct customId with script name` | Line 16 |
| 8 | `modal has correct title` | Line 17 |
| 9 | `text input has required=true` | Line 24 |
| 10 | `text input has maxLength=50` | Line 26 |

#### Recommended Approach
```javascript
// Mock discord.js components
jest.mock('discord.js', () => ({
  ModalBuilder: jest.fn().mockImplementation(() => ({
    setCustomId: jest.fn().mockReturnThis(),
    setTitle: jest.fn().mockReturnThis(),
    addComponents: jest.fn().mockReturnThis(),
    data: {}
  })),
  TextInputBuilder: jest.fn().mockImplementation(() => ({
    setCustomId: jest.fn().mockReturnThis(),
    setLabel: jest.fn().mockReturnThis(),
    setStyle: jest.fn().mockReturnThis(),
    setPlaceholder: jest.fn().mockReturnThis(),
    setRequired: jest.fn().mockReturnThis(),
    setMaxLength: jest.fn().mockReturnThis()
  })),
  TextInputStyle: { Short: 1 },
  ActionRowBuilder: jest.fn().mockImplementation(() => ({
    addComponents: jest.fn().mockReturnThis()
  }))
}));

// Mock AccessManager
jest.mock('../../../src/utils/AccessManager', () => ({
  grantAccess: jest.fn().mockResolvedValue({
    message: 'Access granted',
    details: []
  })
}));

// Use the exported class (already refactored)
const InteractionHandler = require('../../../src/handlers/InteractionHandler');
const handler = new InteractionHandler();
```

---

### 4. EarningsCalendar Bot Integration Tests (~5 tests) — Low Priority

**Target:** Cover lines 42, 203, 225 (the remaining 2.86% gap)

These are edge cases in the bot integration path:
- Line 42: Error logging in `loadIndexLists()`
- Line 203: Sunday skip in `getTomorrowEarnings()`
- Line 225: Empty return in `getWeekEarnings()` when no cache.earnings

These require mocking `Date` or testing specific weekend scenarios. Low impact on overall coverage.

---

## Projected Final Coverage

| Module | Current | After Tests | Tests Needed |
|--------|---------|-------------|--------------|
| AccessManager | 12.19% | 70% | ~20 |
| CommandHandler | 0% | 70% | ~10 |
| InteractionHandler | 0% | 80% | ~10 |
| EarningsCalendar edge cases | 97.14% | ~98% | ~5 |
| **Overall** | **82.94%** | **~88%** | **~45** |

---

## Testing Patterns to Follow

### Singleton Testing Pattern (Already Working)
```javascript
beforeEach(async () => {
  jest.resetModules();
  jest.clearAllMocks();
  
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  
  fsMock = require('fs').promises;
  fsMock.readFile.mockResolvedValue(...);
  fsMock.writeFile.mockResolvedValue();
  
  const module = require('../../../src/utils/ModuleName');
  instance = module.ModuleName; // Use exported class
  manager = new module.ModuleName(); // Create fresh instance
  await manager.init();
});

afterEach(() => {
  jest.restoreAllMocks();
});
```

### HTTP Mocking Pattern (For AccessManager)
```javascript
jest.mock('http');
jest.mock('https');

const http = require('http');

// Success response
http.request.mockImplementation((options, cb) => {
  const mockRes = {
    on: jest.fn((event, handler) => {
      if (event === 'data') handler('{"status":"Success"}');
      if (event === 'end') handler();
    }),
    statusCode: 200,
    statusMessage: 'OK'
  };
  cb(mockRes);
  return {
    on: jest.fn(),
    write: jest.fn(),
    end: jest.fn()
  };
});
```

---

## Quick Start Commands

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific module tests
npm test -- accessManager
npm test -- commandHandler
npm test -- interactionHandler

# Run in watch mode
npm run test:watch

# Check coverage for specific file
npm test -- --coverage -- accessManager
```

---

## Notes

- **AccessManager** is the hardest remaining module due to raw HTTP usage. Consider refactoring to use axios (like EarningsCalendar does) for easier testing.
- **CommandHandler** and **InteractionHandler** are straightforward once you mock discord.js properly.
- All remaining work is estimated at ~1.5-2 hours total.
- After completing AccessManager + handlers, overall coverage should reach ~88%.
