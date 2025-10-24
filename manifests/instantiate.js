/**
 * RNS V2 Instantiate Manifest Builder
 * Based on the patterns from RNS V2 README.md
 */

export const getRNSInstantiateManifest = ({
  packageAddress,
  paymentResources = [],
  legacyDomainResource,
  v1AdminBadgeResource,
  v1UpgradeBadgeResource,
  domainIconUrl,
  adminBadgeIconUrl,
  configBadgeIconUrl,
  registrarBadgeIconUrl,
  accountAddress,
  networkId = "stokenet" // "stokenet" or "mainnet"
}) => {
  // Format payment resources array
  const paymentResourcesArray = paymentResources.length > 0 
    ? `Array<Address>(${paymentResources.map(addr => `Address("${addr}")`).join(', ')})`
    : "Array<Address>()";

  return `CALL_FUNCTION
  Address("${packageAddress}")
  "RNSV2"
  "instantiate"
  ${paymentResourcesArray}
  Address("${legacyDomainResource}")
  Address("${v1AdminBadgeResource}")
  Address("${v1UpgradeBadgeResource}")
  "${domainIconUrl}"
  "${adminBadgeIconUrl}"
  "${configBadgeIconUrl}"
  "${registrarBadgeIconUrl}";

CALL_METHOD
  Address("${accountAddress}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP");`;
};

/**
 * Get default resource addresses based on network
 */
export const getDefaultResources = (networkId = "stokenet") => {
  if (networkId === "mainnet") {
    return {
      faucetAddress: "component_rdx1cptxxxxxxxxxfaucetxxxxxxxxx000527798379xxxxxxxxxtxtm7m",
      defaultPaymentResources: [
        // Add mainnet fUSD/sUSD addresses when available
      ],
      placeholders: {
        packageAddress: "package_rdx1pk...",
        paymentResource: "resource_rdx1t4...",
        legacyDomainResource: "resource_rdx1tk...",
        v1AdminBadgeResource: "resource_rdx1th...",
        v1UpgradeBadgeResource: "resource_rdx1tj...",
        componentAddress: "component_rdx1cp...",
        accountAddress: "account_rdx1c8..."
      }
    };
  } else {
    return {
      faucetAddress: "component_tdx_2_1cptxxxxxxxxxfaucetxxxxxxxxx000527798379xxxxxxxxxtxtm7m",
      defaultPaymentResources: [
        "", // fUSD
        ""  // sUSD
      ],
      placeholders: {
        packageAddress: "package_tdx_2_1pk...",
        paymentResource: "resource_tdx_2_1t4...",
        legacyDomainResource: "resource_tdx_2_1tk...",
        v1AdminBadgeResource: "resource_tdx_2_1th...",
        v1UpgradeBadgeResource: "resource_tdx_2_1tj...",
        componentAddress: "component_tdx_2_1cp...",
        accountAddress: "account_tdx_2_1c8..."
      }
    };
  }
};

/**
 * Validate RNS instantiate parameters
 */
export const validateInstantiateParams = (params) => {
  const errors = [];

  if (!params.packageAddress) {
    errors.push("Package address is required");
  }

  if (!params.legacyDomainResource) {
    errors.push("Legacy domain resource address is required");
  }

  if (!params.v1AdminBadgeResource) {
    errors.push("V1 admin badge resource address is required");
  }

  if (!params.v1UpgradeBadgeResource) {
    errors.push("V1 upgrade badge resource address is required");
  }

  if (!params.domainIconUrl || !isValidUrl(params.domainIconUrl)) {
    errors.push("Valid domain icon URL is required");
  }

  if (!params.adminBadgeIconUrl || !isValidUrl(params.adminBadgeIconUrl)) {
    errors.push("Valid admin badge icon URL is required");
  }

  if (!params.configBadgeIconUrl || !isValidUrl(params.configBadgeIconUrl)) {
    errors.push("Valid config badge icon URL is required");
  }

  if (!params.registrarBadgeIconUrl || !isValidUrl(params.registrarBadgeIconUrl)) {
    errors.push("Valid registrar badge icon URL is required");
  }

  if (!params.accountAddress) {
    errors.push("Account address is required");
  }

  // Validate resource addresses format
  const addressPattern = /^(resource_|component_|account_)(tdx|rdx|sim)(_\d+)?_[a-z0-9]+/;
  
  if (params.legacyDomainResource && !addressPattern.test(params.legacyDomainResource)) {
    errors.push("Invalid legacy domain resource address format");
  }

  if (params.v1AdminBadgeResource && !addressPattern.test(params.v1AdminBadgeResource)) {
    errors.push("Invalid V1 admin badge resource address format");
  }

  if (params.v1UpgradeBadgeResource && !addressPattern.test(params.v1UpgradeBadgeResource)) {
    errors.push("Invalid V1 upgrade badge resource address format");
  }

  // Validate payment resources
  if (params.paymentResources && params.paymentResources.length > 0) {
    params.paymentResources.forEach((address, index) => {
      if (!addressPattern.test(address)) {
        errors.push(`Invalid payment resource address format at index ${index}`);
      }
    });
  }

  return errors;
};

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}
