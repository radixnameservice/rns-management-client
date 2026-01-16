/**
 * RNS Management Client - Manifest Re-exports
 * 
 * This file re-exports all manifests from the organized subdirectories:
 * - rns-core-v2/    : RNS V2 core contract manifests
 * - v1-badge-lockers/ : V1 badge locking contract manifests
 * - common/         : Shared utilities and helpers
 */

// ============================================================================
// RNS Core V2 Contract Manifests
// ============================================================================
export * from "./rns-core-v2/index.js";

// ============================================================================
// V1 Badge Lockers Contract Manifests
// ============================================================================
export * from "./v1-badge-lockers/index.js";

// ============================================================================
// Common Utilities
// ============================================================================
export * from "./common/index.js";

// ============================================================================
// Legacy Exports (for backwards compatibility during migration)
// These re-export the old function names from the new locations
// TODO: Remove after Stage 4 is complete and main.js is fully updated
// ============================================================================

// Legacy V1 Badge Locking exports - now from v1-badge-lockers/operations.js
export { 
  getLockAdminBadgesManifest as getLockV1AdminBadgesManifest,
  getLockUpgradeBadgesManifest as getLockV1UpgradeBadgeManifest,
  getV1LockStatusManifest
} from "./v1-badge-lockers/operations.js";
