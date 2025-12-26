# MODULAR DATA PROCESSING MIGRATION GUIDE

## Problem: Monolithic `device-mapper.ts` 

The old `device-mapper.ts` was a **160-line monolithic processor** that:
- Mixed status calculation, hardware extraction, network processing, etc. in one file
- Made simple fixes (like status capitalization) require touching massive files
- Violated the modular architecture principle
- Created dependency hell and testing nightmares

## Solution: Modular Architecture

### NEW STRUCTURE:
```
src/lib/data-processing/
index.ts                     # Export all modules
device-mapper-modular.ts     # NEW: Lightweight orchestrator  
modules/
device-status.ts         # Status calculation logic
hardware-info.ts         # Hardware data extraction
network-info.ts          # Network data extraction  
system-info.ts           # System/OS data extraction
inventory-info.ts        # Inventory/asset data extraction
installs-status.ts       # FIXES: Status capitalization
component-data.ts            # Legacy widget processing
```

## FIXES APPLIED

### 1. Status Capitalization Fixed
**Before:** `status: "installed"` (lowercase)
**After:** `status: "Installed"` (proper capitalization)

**Fixed in:** `modules/installs-status.ts` `standardizeInstallStatus()` function

### 2. Modular Status Processing
**Before:** Status logic mixed with hardware extraction
**After:** Dedicated `modules/device-status.ts` with isolated logic

### 3. Hardware Processing Isolated
**Before:** Hardware logic mixed with networking and status
**After:** Dedicated `modules/hardware-info.ts` with focused extraction

## MIGRATION PATH

### Phase 1: IMMEDIATE (Use Modular Alongside Legacy)
```typescript
// NEW: Import from modular system
import { mapDeviceData } from '@/lib/data-processing/device-mapper-modular'

// Or import specific modules for targeted fixes
import { standardizeInstallStatus } from '@/lib/data-processing/modules/installs-status'
```

### Phase 2: GRADUAL (Replace components)
1. Update installs widgets to use `device.installs` (properly capitalized statuses)
2. Update hardware widgets to use `device.hardware`
3. Update network widgets to use `device.network`
4. Update status indicators to use `device.status`

### Phase 3: COMPLETE (Remove legacy)
1. Replace all `device-mapper.ts` imports with `device-mapper-modular.ts`
2. Remove old monolithic `device-mapper.ts`
3. Update all components to use modular data structure

## IMMEDIATE BENEFITS

### Status Capitalization Fixed
- **Before:** Mixed case statuses caused display issues
- **After:** Standardized `'Installed' | 'Pending' | 'Warning' | 'Error' | 'Removed'`

### Easy Fixes  
- **Before:** Touch 160-line monolith for simple changes
- **After:** Edit specific 30-line module files

### Testing Isolation
- **Before:** Test entire device mapping for status changes
- **After:** Unit test individual modules (e.g., just status logic)

### Future Native App Ready
- **React Native:** Import specific modules (e.g., just hardware extraction)
- **Electron:** Reuse status calculation logic
- **Mobile:** Use network-info module independently

## USAGE EXAMPLES

### Fix Status Display Issues
```typescript
import { standardizeInstallStatus } from '@/lib/data-processing/modules/installs-status'

// Ensures consistent capitalization
const status = standardizeInstallStatus('installed') // 'Installed'
const status2 = standardizeInstallStatus('PENDING') // 'Pending'
```

### Extract Hardware Info Only  
```typescript
import { extractHardwareInfo } from '@/lib/data-processing/modules/hardware-info'

const hardware = extractHardwareInfo(deviceModules)
// { processor: '...', memory: '16 GB', storage: '512 GB SSD 256 GB free' }
```

### Calculate Device Status Only
```typescript
import { calculateDeviceStatus } from '@/lib/data-processing/modules/device-status'

const status = calculateDeviceStatus(lastSeenTimestamp)
// 'active' | 'stale' | 'missing'
```

## RECOMMENDATION

**IMMEDIATE ACTION:** Start using `device-mapper-modular.ts` for new components to get properly capitalized statuses.

**GRADUAL MIGRATION:** Replace widget data access patterns:
- `device.currentStatus` `device.installs.packages[].status` (properly capitalized)
- `device.processor` `device.hardware.processor`  
- `device.ipAddress` `device.network.ipAddress`

This modular approach aligns with ReportMate's end-to-end modular architecture and will eliminate the "stuck on simple fixes" problem.
