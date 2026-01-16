/**
 * RNS V2 Instantiate Manifest Builder
 * Based on the patterns from RNS V2 README.md
 */

export const getRNSInstantiateManifest = ({
  packageAddress,
  paymentResources = [],
  legacyDomainResource,
  // V1 badge resources removed - now handled by separate V1 Badge Lockers contract
  domainIconUrl,
  adminBadgeIconUrl,
  configBadgeIconUrl,
  registrarBadgeIconUrl,
  componentName = "",
  componentDescription = "",
  componentTags = [],
  componentInfoUrl = "",
  componentIconUrl = "",
  subregistryName = "",
  subregistryDescription = "",
  subregistryTags = [],
  subregistryIconUrl = "",
  dappDefinitionName = "",
  dappDefinitionDescription = "",
  dappDefinitionInfoUrl = "",
  dappDefinitionIconUrl = "",
  accountAddress,
  networkId = "stokenet" // "stokenet" or "mainnet"
}) => {
  // Format payment resources array
  const paymentResourcesArray = paymentResources.length > 0 
    ? `Array<Address>(${paymentResources.map(addr => `Address("${addr}")`).join(', ')})`
    : "Array<Address>()";
  
  // Format component tags array
  const componentTagsArray = componentTags.length > 0
    ? `Array<String>(${componentTags.map(tag => `"${tag}"`).join(', ')})`
    : "Array<String>()";
    
  // Format subregistry tags array
  const subregistryTagsArray = subregistryTags.length > 0
    ? `Array<String>(${subregistryTags.map(tag => `"${tag}"`).join(', ')})`
    : "Array<String>()";

  // RNS Core V2 instantiation - 16 parameters
  // V1 badge resources are now handled by the separate V1 Badge Lockers contract
  return `CALL_FUNCTION
  Address("${packageAddress}")
  "RNSV2"
  "instantiate"
  ${paymentResourcesArray}
  Address("${legacyDomainResource}")
  "${domainIconUrl}"
  "${adminBadgeIconUrl}"
  "${configBadgeIconUrl}"
  "${registrarBadgeIconUrl}"
  "${componentName}"
  "${componentDescription}"
  ${componentTagsArray}
  "${componentInfoUrl}"
  "${componentIconUrl}"
  "${subregistryName}"
  "${subregistryDescription}"
  ${subregistryTagsArray}
  "${subregistryIconUrl}"
  Tuple(
    "${dappDefinitionName}",
    "${dappDefinitionDescription}",
    "${dappDefinitionInfoUrl}",
    "${dappDefinitionIconUrl}"
  );

CALL_METHOD
  Address("${accountAddress}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP");`;
};

/**
 * Get default resource addresses based on network
 * Note: V1 badge resources are now handled by the separate V1 Badge Lockers contract
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
        componentAddress: "component_tdx_2_1cp...",
        accountAddress: "account_tdx_2_1c8..."
      }
    };
  }
};

/**
 * Validate RNS instantiate parameters
 * Note: V1 badge resources are no longer required - they're handled by the separate V1 Badge Lockers contract
 */
export const validateInstantiateParams = (params) => {
  const errors = [];

  if (!params.packageAddress) {
    errors.push("Package address is required");
  }

  if (!params.legacyDomainResource) {
    errors.push("Legacy domain resource address is required");
  }

  // V1 badge resources removed - now handled by separate V1 Badge Lockers contract

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
