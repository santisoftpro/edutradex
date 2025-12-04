-- CreateTable
CREATE TABLE "Deposit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "phoneNumber" TEXT,
    "mobileProvider" TEXT,
    "cryptoCurrency" TEXT,
    "walletAddress" TEXT,
    "transactionHash" TEXT,
    "adminNote" TEXT,
    "processedBy" TEXT,
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Deposit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SpreadConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "markupPips" REAL NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Withdrawal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "phoneNumber" TEXT,
    "mobileProvider" TEXT,
    "cryptoCurrency" TEXT,
    "walletAddress" TEXT,
    "adminNote" TEXT,
    "processedBy" TEXT,
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Withdrawal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "cryptoCurrency" TEXT,
    "network" TEXT,
    "walletAddress" TEXT,
    "mobileProvider" TEXT,
    "phoneNumber" TEXT,
    "accountName" TEXT,
    "iconUrl" TEXT,
    "iconBg" TEXT NOT NULL DEFAULT 'bg-gray-500/20',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "minAmount" REAL NOT NULL DEFAULT 10,
    "maxAmount" REAL NOT NULL DEFAULT 10000,
    "processingTime" TEXT NOT NULL DEFAULT '~5 min',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CopyTradingLeader" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "avatarUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalTrades" INTEGER NOT NULL DEFAULT 0,
    "winningTrades" INTEGER NOT NULL DEFAULT 0,
    "totalProfit" REAL NOT NULL DEFAULT 0,
    "winRate" REAL NOT NULL DEFAULT 0,
    "maxFollowers" INTEGER NOT NULL DEFAULT 100,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "adminNote" TEXT,
    "approvedAt" DATETIME,
    "rejectedAt" DATETIME,
    "suspendedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CopyTradingLeader_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CopyTradingFollower" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "followerId" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "copyMode" TEXT NOT NULL DEFAULT 'AUTOMATIC',
    "fixedAmount" REAL NOT NULL,
    "maxDailyTrades" INTEGER NOT NULL DEFAULT 50,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tradesToday" INTEGER NOT NULL DEFAULT 0,
    "lastTradeDate" DATETIME,
    "totalCopied" INTEGER NOT NULL DEFAULT 0,
    "totalProfit" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CopyTradingFollower_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CopyTradingFollower_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "CopyTradingLeader" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CopiedTrade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "followerId" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "originalTradeId" TEXT NOT NULL,
    "copiedTradeId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "profit" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CopiedTrade_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "CopyTradingFollower" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CopiedTrade_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "CopyTradingLeader" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CopiedTrade_originalTradeId_fkey" FOREIGN KEY ("originalTradeId") REFERENCES "Trade" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CopiedTrade_copiedTradeId_fkey" FOREIGN KEY ("copiedTradeId") REFERENCES "Trade" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PendingCopyTrade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "followerId" TEXT NOT NULL,
    "originalTradeId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "suggestedAmount" REAL NOT NULL,
    "entryPrice" REAL NOT NULL,
    "duration" INTEGER NOT NULL,
    "market" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME,
    CONSTRAINT "PendingCopyTrade_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "CopyTradingFollower" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PendingCopyTrade_originalTradeId_fkey" FOREIGN KEY ("originalTradeId") REFERENCES "Trade" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Trade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "entryPrice" REAL NOT NULL,
    "exitPrice" REAL,
    "duration" INTEGER NOT NULL,
    "payoutPercent" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "result" TEXT,
    "profit" REAL,
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    "expiresAt" DATETIME NOT NULL,
    "isCopyTrade" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Trade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Trade" ("amount", "closedAt", "direction", "duration", "entryPrice", "exitPrice", "expiresAt", "id", "market", "openedAt", "payoutPercent", "profit", "result", "status", "symbol", "userId") SELECT "amount", "closedAt", "direction", "duration", "entryPrice", "exitPrice", "expiresAt", "id", "market", "openedAt", "payoutPercent", "profit", "result", "status", "symbol", "userId" FROM "Trade";
DROP TABLE "Trade";
ALTER TABLE "new_Trade" RENAME TO "Trade";
CREATE INDEX "Trade_userId_idx" ON "Trade"("userId");
CREATE INDEX "Trade_status_idx" ON "Trade"("status");
CREATE INDEX "Trade_symbol_idx" ON "Trade"("symbol");
CREATE INDEX "Trade_openedAt_idx" ON "Trade"("openedAt");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "demoBalance" REAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "demoBalance", "email", "id", "isActive", "name", "password", "role", "updatedAt") SELECT "createdAt", "demoBalance", "email", "id", "isActive", "name", "password", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Deposit_userId_idx" ON "Deposit"("userId");

-- CreateIndex
CREATE INDEX "Deposit_status_idx" ON "Deposit"("status");

-- CreateIndex
CREATE INDEX "Deposit_method_idx" ON "Deposit"("method");

-- CreateIndex
CREATE INDEX "Deposit_createdAt_idx" ON "Deposit"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SpreadConfig_symbol_key" ON "SpreadConfig"("symbol");

-- CreateIndex
CREATE INDEX "SpreadConfig_symbol_idx" ON "SpreadConfig"("symbol");

-- CreateIndex
CREATE INDEX "SpreadConfig_isActive_idx" ON "SpreadConfig"("isActive");

-- CreateIndex
CREATE INDEX "Withdrawal_userId_idx" ON "Withdrawal"("userId");

-- CreateIndex
CREATE INDEX "Withdrawal_status_idx" ON "Withdrawal"("status");

-- CreateIndex
CREATE INDEX "Withdrawal_method_idx" ON "Withdrawal"("method");

-- CreateIndex
CREATE INDEX "Withdrawal_createdAt_idx" ON "Withdrawal"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_code_key" ON "PaymentMethod"("code");

-- CreateIndex
CREATE INDEX "PaymentMethod_type_idx" ON "PaymentMethod"("type");

-- CreateIndex
CREATE INDEX "PaymentMethod_isActive_idx" ON "PaymentMethod"("isActive");

-- CreateIndex
CREATE INDEX "PaymentMethod_displayOrder_idx" ON "PaymentMethod"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CopyTradingLeader_userId_key" ON "CopyTradingLeader"("userId");

-- CreateIndex
CREATE INDEX "CopyTradingLeader_userId_idx" ON "CopyTradingLeader"("userId");

-- CreateIndex
CREATE INDEX "CopyTradingLeader_status_idx" ON "CopyTradingLeader"("status");

-- CreateIndex
CREATE INDEX "CopyTradingLeader_winRate_idx" ON "CopyTradingLeader"("winRate");

-- CreateIndex
CREATE INDEX "CopyTradingLeader_totalTrades_idx" ON "CopyTradingLeader"("totalTrades");

-- CreateIndex
CREATE INDEX "CopyTradingFollower_followerId_idx" ON "CopyTradingFollower"("followerId");

-- CreateIndex
CREATE INDEX "CopyTradingFollower_leaderId_idx" ON "CopyTradingFollower"("leaderId");

-- CreateIndex
CREATE INDEX "CopyTradingFollower_isActive_idx" ON "CopyTradingFollower"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CopyTradingFollower_followerId_leaderId_key" ON "CopyTradingFollower"("followerId", "leaderId");

-- CreateIndex
CREATE INDEX "CopiedTrade_followerId_idx" ON "CopiedTrade"("followerId");

-- CreateIndex
CREATE INDEX "CopiedTrade_leaderId_idx" ON "CopiedTrade"("leaderId");

-- CreateIndex
CREATE INDEX "CopiedTrade_originalTradeId_idx" ON "CopiedTrade"("originalTradeId");

-- CreateIndex
CREATE INDEX "CopiedTrade_copiedTradeId_idx" ON "CopiedTrade"("copiedTradeId");

-- CreateIndex
CREATE INDEX "PendingCopyTrade_followerId_idx" ON "PendingCopyTrade"("followerId");

-- CreateIndex
CREATE INDEX "PendingCopyTrade_status_idx" ON "PendingCopyTrade"("status");

-- CreateIndex
CREATE INDEX "PendingCopyTrade_expiresAt_idx" ON "PendingCopyTrade"("expiresAt");
