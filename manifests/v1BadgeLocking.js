/**
 * V1 Badge Locking Manifest Builder
 * Handles permanent locking of RNS V1 badges into V2 component
 */

export const getLockV1AdminBadgesManifest = ({
  componentAddress,
  v1AdminBadgeResource,
  badgeAmount,
  accountAddress,
  networkId = "stokenet"
}) => {
  // Note: Fee locking is handled by the wallet automatically
  // We don't need an explicit lock_fee call in the manifest
  
  return `CALL_METHOD
  Address("${accountAddress}")
  "withdraw"
  Address("${v1AdminBadgeResource}")
  Decimal("${badgeAmount}");

TAKE_ALL_FROM_WORKTOP
  Address("${v1AdminBadgeResource}")
  Bucket("v1_admin_badges");

CALL_METHOD
  Address("${componentAddress}")
  "lock_v1_admin_badges"
  Bucket("v1_admin_badges");

CALL_METHOD
  Address("${accountAddress}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP");`;
};

export const getLockV1UpgradeBadgeManifest = ({
  componentAddress,
  v1UpgradeBadgeResource,
  badgeAmount,
  accountAddress,
  networkId = "stokenet"
}) => {
  // Note: Fee locking is handled by the wallet automatically
  // We don't need an explicit lock_fee call in the manifest
  
  return `CALL_METHOD
  Address("${accountAddress}")
  "withdraw"
  Address("${v1UpgradeBadgeResource}")
  Decimal("${badgeAmount}");

TAKE_ALL_FROM_WORKTOP
  Address("${v1UpgradeBadgeResource}")
  Bucket("v1_upgrade_badge");

CALL_METHOD
  Address("${componentAddress}")
  "lock_v1_upgrade_badge"
  Bucket("v1_upgrade_badge");

CALL_METHOD
  Address("${accountAddress}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP");`;
};

export const getV1LockStatusManifest = ({
  componentAddress,
  accountAddress,
  networkId = "stokenet"
}) => {
  // Note: Fee locking is handled by the wallet automatically
  // We don't need an explicit lock_fee call in the manifest
  
  return `CALL_METHOD
  Address("${componentAddress}")
  "get_v1_lock_status";`;
};

/**
 * Validate V1 badge locking parameters
 */
export const validateV1BadgeLockingParams = (params) => {
  const errors = [];

  if (!params.componentAddress) {
    errors.push("Component address is required");
  }

  if (!params.accountAddress) {
    errors.push("Account address is required");
  }

  if (params.badgeAmount && (isNaN(params.badgeAmount) || params.badgeAmount < 1)) {
    errors.push("Badge amount must be a positive number");
  }

  // Validate address formats
  const componentPattern = /^component_(tdx|rdx|sim)1[a-z0-9]+/;
  const resourcePattern = /^resource_(tdx|rdx|sim)1[a-z0-9]+/;
  const accountPattern = /^account_(tdx|rdx|sim)1[a-z0-9]+/;

  if (params.componentAddress && !componentPattern.test(params.componentAddress)) {
    errors.push("Invalid component address format");
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
 */
export const formatV1LockStatus = (statusData) => {
  if (!statusData) {
    return {
      adminBadgesLocked: 0,
      upgradeBadgesLocked: 0,
      totalAdminBadges: 0,
      totalUpgradeBadges: 0,
      lockingActive: false
    };
  }

  return {
    adminBadgesLocked: statusData.admin_badges_locked || 0,
    upgradeBadgesLocked: statusData.upgrade_badges_locked || 0,
    totalAdminBadges: statusData.total_admin_badges || 0,
    totalUpgradeBadges: statusData.total_upgrade_badges || 0,
    lockingActive: statusData.locking_active || false,
    lastLockTimestamp: statusData.last_lock_timestamp || null
  };
};

/**
 * Calculate locking progress percentage
 */
export const calculateLockingProgress = (lockStatus) => {
  const { adminBadgesLocked, totalAdminBadges, upgradeBadgesLocked, totalUpgradeBadges } = lockStatus;
  
  const adminProgress = totalAdminBadges > 0 ? (adminBadgesLocked / totalAdminBadges) * 100 : 0;
  const upgradeProgress = totalUpgradeBadges > 0 ? (upgradeBadgesLocked / totalUpgradeBadges) * 100 : 0;
  
  return {
    adminProgress: Math.round(adminProgress),
    upgradeProgress: Math.round(upgradeProgress),
    overallProgress: Math.round((adminProgress + upgradeProgress) / 2)
  };
};
