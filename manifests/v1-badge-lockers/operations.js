/**
 * V1 Badge Lockers Operations Manifest Builder
 * Handles permanent locking of RNS V1 badges into V1AuthRelinquishment component
 */

/**
 * Get manifest to lock V1 admin badges
 * @param {Object} params - Operation parameters
 * @param {string} params.componentAddress - V1AuthRelinquishment component address
 * @param {string} params.v1AdminBadgeResource - V1 Admin Badge resource address
 * @param {string} params.badgeAmount - Amount of badges to lock
 * @param {string} params.accountAddress - Account address holding the badges
 * @param {string} params.networkId - Network ID
 * @returns {string} Transaction manifest
 */
export const getLockAdminBadgesManifest = ({
  componentAddress,
  v1AdminBadgeResource,
  badgeAmount,
  accountAddress,
  networkId = "stokenet"
}) => {
  return `# Lock V1 Admin Badges into V1AuthRelinquishment
# WARNING: This action is IRREVERSIBLE - badges cannot be withdrawn

CALL_METHOD
  Address("${accountAddress}")
  "withdraw"
  Address("${v1AdminBadgeResource}")
  Decimal("${badgeAmount}")
;

TAKE_ALL_FROM_WORKTOP
  Address("${v1AdminBadgeResource}")
  Bucket("v1_admin_badges")
;

CALL_METHOD
  Address("${componentAddress}")
  "lock_admin_badges"
  Bucket("v1_admin_badges")
;

CALL_METHOD
  Address("${accountAddress}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;`;
};

/**
 * Get manifest to lock V1 upgrade badges
 * @param {Object} params - Operation parameters
 * @param {string} params.componentAddress - V1AuthRelinquishment component address
 * @param {string} params.v1UpgradeBadgeResource - V1 Upgrade Badge resource address
 * @param {string} params.badgeAmount - Amount of badges to lock
 * @param {string} params.accountAddress - Account address holding the badges
 * @param {string} params.networkId - Network ID
 * @returns {string} Transaction manifest
 */
export const getLockUpgradeBadgesManifest = ({
  componentAddress,
  v1UpgradeBadgeResource,
  badgeAmount,
  accountAddress,
  networkId = "stokenet"
}) => {
  return `# Lock V1 Upgrade Badges into V1AuthRelinquishment
# WARNING: This action is IRREVERSIBLE - badges cannot be withdrawn

CALL_METHOD
  Address("${accountAddress}")
  "withdraw"
  Address("${v1UpgradeBadgeResource}")
  Decimal("${badgeAmount}")
;

TAKE_ALL_FROM_WORKTOP
  Address("${v1UpgradeBadgeResource}")
  Bucket("v1_upgrade_badges")
;

CALL_METHOD
  Address("${componentAddress}")
  "lock_upgrade_badges"
  Bucket("v1_upgrade_badges")
;

CALL_METHOD
  Address("${accountAddress}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;`;
};

/**
 * Get manifest to query V1 lock status
 * @param {Object} params - Query parameters
 * @param {string} params.componentAddress - V1AuthRelinquishment component address
 * @param {string} params.networkId - Network ID
 * @returns {string} Transaction manifest
 */
export const getV1LockStatusManifest = ({
  componentAddress,
  networkId = "stokenet"
}) => {
  return `CALL_METHOD
  Address("${componentAddress}")
  "get_lock_status"
;`;
};

/**
 * Validate V1 badge locking parameters
 * @param {Object} params - Parameters to validate
 * @returns {string[]} Array of error messages (empty if valid)
 */
export const validateV1BadgeLockingParams = (params) => {
  const errors = [];

  if (!params.componentAddress) {
    errors.push("V1 Badge Lockers component address is required");
  }

  if (!params.accountAddress) {
    errors.push("Account address is required");
  }

  if (params.badgeAmount && (isNaN(params.badgeAmount) || parseFloat(params.badgeAmount) < 1)) {
    errors.push("Badge amount must be a positive number");
  }

  // Validate address formats
  const componentPattern = /^component_(tdx|rdx|sim)(_\d+)?_[a-z0-9]+/;
  const resourcePattern = /^resource_(tdx|rdx|sim)(_\d+)?_[a-z0-9]+/;
  const accountPattern = /^account_(tdx|rdx|sim)(_\d+)?_[a-z0-9]+/;

  if (params.componentAddress && !componentPattern.test(params.componentAddress)) {
    errors.push("Invalid V1 Badge Lockers component address format");
  }

  if (params.v1AdminBadgeResource && !resourcePattern.test(params.v1AdminBadgeResource)) {
    errors.push("Invalid V1 admin badge resource address format");
  }

  if (params.v1UpgradeBadgeResource && !resourcePattern.test(params.v1UpgradeBadgeResource)) {
    errors.push("Invalid V1 upgrade badge resource address format");
  }

  if (params.accountAddress && !accountPattern.test(params.accountAddress)) {
    errors.push("Invalid account address format");
  }

  return errors;
};

/**
 * Format V1 lock status result for display
 * @param {Object} statusData - Raw status data from component
 * @returns {Object} Formatted status object
 */
export const formatV1LockStatus = (statusData) => {
  if (!statusData) {
    return {
      adminBadgesLocked: "0",
      upgradeBadgesLocked: "0",
      adminBadgeResource: null,
      upgradeBadgeResource: null,
      isFullyLocked: false
    };
  }

  // Parse the V1LockStatus struct
  // V1LockStatus {
  //   admin_badges_locked: Decimal,
  //   upgrade_badges_locked: Decimal,
  //   admin_badge_resource: ResourceAddress,
  //   upgrade_badge_resource: ResourceAddress,
  // }
  return {
    adminBadgesLocked: statusData.admin_badges_locked || "0",
    upgradeBadgesLocked: statusData.upgrade_badges_locked || "0",
    adminBadgeResource: statusData.admin_badge_resource || null,
    upgradeBadgeResource: statusData.upgrade_badge_resource || null,
    isFullyLocked: parseFloat(statusData.admin_badges_locked || 0) > 0 && 
                   parseFloat(statusData.upgrade_badges_locked || 0) > 0
  };
};

/**
 * Calculate locking progress percentage
 * @param {Object} lockStatus - Formatted lock status
 * @param {Object} totalBadges - Object with totalAdminBadges and totalUpgradeBadges
 * @returns {Object} Progress percentages
 */
export const calculateLockingProgress = (lockStatus, totalBadges = {}) => {
  const { adminBadgesLocked, upgradeBadgesLocked } = lockStatus;
  const { totalAdminBadges = 0, totalUpgradeBadges = 0 } = totalBadges;
  
  const adminLocked = parseFloat(adminBadgesLocked) || 0;
  const upgradeLocked = parseFloat(upgradeBadgesLocked) || 0;
  
  const adminProgress = totalAdminBadges > 0 
    ? Math.min(100, Math.round((adminLocked / totalAdminBadges) * 100))
    : (adminLocked > 0 ? 100 : 0);
    
  const upgradeProgress = totalUpgradeBadges > 0 
    ? Math.min(100, Math.round((upgradeLocked / totalUpgradeBadges) * 100))
    : (upgradeLocked > 0 ? 100 : 0);
  
  return {
    adminProgress,
    upgradeProgress,
    overallProgress: Math.round((adminProgress + upgradeProgress) / 2),
    adminBadgesLocked: adminLocked,
    upgradeBadgesLocked: upgradeLocked
  };
};

// Legacy export names for backwards compatibility during migration
// These can be removed after Stage 2 is complete
export const getLockV1AdminBadgesManifest = getLockAdminBadgesManifest;
export const getLockV1UpgradeBadgeManifest = getLockUpgradeBadgesManifest;
