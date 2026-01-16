/**
 * V1 Badge Lockers Instantiate Manifest Builder
 * Creates the V1AuthRelinquishment component for permanently locking V1 badges
 */

/**
 * Get manifest to instantiate the V1 Badge Lockers component
 * @param {Object} params - Instantiation parameters
 * @param {string} params.packageAddress - V1 Badge Lockers package address
 * @param {string} params.v1AdminBadgeResource - V1 Admin Badge resource address
 * @param {string} params.v1UpgradeBadgeResource - V1 Upgrade Badge resource address
 * @param {string} params.accountAddress - Account address to receive any returns
 * @param {string} params.networkId - Network ID (stokenet or mainnet)
 * @returns {string} Transaction manifest
 */
export const getV1BadgeLockersInstantiateManifest = ({
  packageAddress,
  v1AdminBadgeResource,
  v1UpgradeBadgeResource,
  accountAddress,
  networkId = "stokenet"
}) => {
  return `# Instantiate V1 Auth Relinquishment Contract
# This creates a permanent vault for V1 badge locking

CALL_FUNCTION
  Address("${packageAddress}")
  "V1AuthRelinquishment"
  "instantiate"
  Address("${v1AdminBadgeResource}")
  Address("${v1UpgradeBadgeResource}")
;

CALL_METHOD
  Address("${accountAddress}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;`;
};

/**
 * Validate V1 Badge Lockers instantiation parameters
 * @param {Object} params - Parameters to validate
 * @returns {string[]} Array of error messages (empty if valid)
 */
export const validateV1BadgeLockersInstantiateParams = (params) => {
  const errors = [];

  if (!params.packageAddress) {
    errors.push("Package address is required");
  }

  if (!params.v1AdminBadgeResource) {
    errors.push("V1 Admin Badge resource address is required");
  }

  if (!params.v1UpgradeBadgeResource) {
    errors.push("V1 Upgrade Badge resource address is required");
  }

  if (!params.accountAddress) {
    errors.push("Account address is required");
  }

  // Validate address formats
  const packagePattern = /^package_(tdx|rdx|sim)(_\d+)?_[a-z0-9]+/;
  const resourcePattern = /^resource_(tdx|rdx|sim)(_\d+)?_[a-z0-9]+/;
  const accountPattern = /^account_(tdx|rdx|sim)(_\d+)?_[a-z0-9]+/;

  if (params.packageAddress && !packagePattern.test(params.packageAddress)) {
    errors.push("Invalid package address format");
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
 * Get default placeholder addresses for V1 Badge Lockers
 * @param {string} networkId - Network ID
 * @returns {Object} Default placeholder addresses
 */
export const getV1BadgeLockersDefaults = (networkId = "stokenet") => {
  if (networkId === "mainnet") {
    return {
      placeholders: {
        packageAddress: "package_rdx1...",
        v1AdminBadgeResource: "resource_rdx1...",
        v1UpgradeBadgeResource: "resource_rdx1...",
        componentAddress: "component_rdx1..."
      }
    };
  } else {
    return {
      placeholders: {
        packageAddress: "package_tdx_2_1...",
        v1AdminBadgeResource: "resource_tdx_2_1...",
        v1UpgradeBadgeResource: "resource_tdx_2_1...",
        componentAddress: "component_tdx_2_1..."
      }
    };
  }
};
