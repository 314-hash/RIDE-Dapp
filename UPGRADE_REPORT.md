# RIDE TOKENS — GitHub-Assisted Engineering Upgrade Report

**Protocol Network**: Sidra Chain Mainnet  
**Chain ID**: `97453` (`0x17cb5`)  
**RPC URL**: `https://rpc.sidrachain.com`  
**Explorer**: `https://ledger.sidrachain.com`  
**RIDE Token Contract**: `0xe91cAC00C1092611EB598B284a87A623a35aF9b7` (Decimals: 18)  
**WSDA/RIDE Pool**: `0x4a65a79dbC3e0184972e041525eDeeAb481c6027`  
**Git Working Branches**: `upgrade/engineering-hardened`  

---

## Quick Start & Verification

### 1. Run Smart Contract Test Suite
```powershell
node scripts/compile_and_test_contracts.js
```
*Output: 31 tests passed (fare discounts, driver staking tiers, unstaking cooldown, anti-replay).*

### 2. Run Backend Dispatch Test Suite
```powershell
node scripts/test_dispatch_backend.js
```
*Output: 32 tests passed (OSRM routing, atomic acceptance lock, KYC review, emergency SOS).*

### 3. Run Real-Time Dispatch Server
```powershell
node server/index.js
```
*Endpoints: `http://localhost:3001/api/health`, `http://localhost:3001/api/blockchain/protocol`.*

### 4. Run Frontend DApp (Vite)
```powershell
cd ride-token-commons
npm run dev
```
*Frontend URL: `http://localhost:8080/` (Book: `/book`, Drive: `/drive`, Token: `/token`, Safety: `/safety`).*

### 5. Build Production Bundle
```powershell
cd ride-token-commons
npm run build
```
