/**
 * dApp Definition Creator Manifest
 * 
 * Sets metadata on an existing account to make it a dApp definition following Radix standards.
 * A dApp definition is a special account that links websites, components, and packages
 * to a unified dApp identity.
 * 
 * Note: The user must create the account first (e.g. in their wallet), then provide its
 * address to be converted into a dApp definition.
 */

/**
 * Generate a manifest to create a dApp definition from an existing account
 * @param {Object} params - dApp definition parameters
 * @param {string} params.dappAccountAddress - Account address to become the dApp definition
 * @param {string} params.name - dApp name
 * @param {string} params.description - dApp description
 * @param {string} params.iconUrl - Icon URL
 * @param {string[]} params.tags - Array of tags (e.g., ["defi", "nft"])
 * @param {string[]} params.claimedWebsites - Array of website URLs
 * @param {string[]} params.claimedEntities - Array of component/package addresses (optional)
 * @param {string} params.networkId - Network ID (mainnet or stokenet)
 * @returns {string} Transaction manifest
 */
export function getDappDefinitionManifest({
  dappAccountAddress,
  name,
  description,
  iconUrl,
  tags = [],
  claimedWebsites = [],
  claimedEntities = [],
  networkId = 'stokenet'
}) {
  // Store networkId for helper functions to use
  if (typeof window !== 'undefined') {
    window._currentManifestNetwork = networkId;
  }
  
  // Build claimed websites array (as Array<String>)
  const websitesArray = claimedWebsites.length > 0
    ? `Array<String>(${claimedWebsites.map(url => `"${url}"`).join(', ')})`
    : `Array<String>()`;

  // Build claimed entities array (as Array<Address>)
  const entitiesArray = claimedEntities.length > 0
    ? `Array<Address>(${claimedEntities.map(addr => `Address("${addr}")`).join(', ')})`
    : `Array<Address>()`;
  
  // Build tags array
  const tagsArray = tags.length > 0
    ? `Array<String>(${tags.map(tag => `"${tag}"`).join(', ')})`
    : `Array<String>()`;

  const manifest = `
# dApp Definition Creator
# This manifest sets metadata on an existing account to make it a dApp definition

SET_METADATA 
  Address("${dappAccountAddress}")
  "account_type"
  Enum<Metadata::String>("dapp definition")
;

SET_METADATA 
  Address("${dappAccountAddress}")
  "name"
  Enum<Metadata::String>("${name}")
;

SET_METADATA 
  Address("${dappAccountAddress}")
  "description"
  Enum<Metadata::String>("${description}")
;

${tags.length > 0 ? `SET_METADATA 
  Address("${dappAccountAddress}")
  "tags"
  Enum<Metadata::StringArray>(
    ${tagsArray}
  )
;
` : '# No tags provided'}

${iconUrl ? `SET_METADATA 
  Address("${dappAccountAddress}")
  "icon_url"
  Enum<Metadata::Url>("${iconUrl}")
;
` : '# Icon URL not provided'}

${claimedEntities.length > 0 ? `SET_METADATA 
  Address("${dappAccountAddress}")
  "claimed_entities"
  Enum<Metadata::AddressArray>(
    ${entitiesArray}
  )
;
` : '# No claimed entities provided'}

REMOVE_METADATA
  Address("${dappAccountAddress}")
  "account_locker"
;

SET_METADATA 
  Address("${dappAccountAddress}")
  "claimed_websites"
  Enum<Metadata::OriginArray>(
    ${websitesArray}
  )
;

REMOVE_METADATA
  Address("${dappAccountAddress}")
  "dapp_definitions"
;
`;

  return manifest.trim();
}

/**
 * Validate dApp definition parameters
 * @param {Object} params - Parameters to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateDappDefinitionParams({
  dappAccountAddress,
  name,
  description,
  iconUrl,
  tags = [],
  claimedWebsites = [],
  claimedEntities = []
}) {
  const errors = [];

  // Validate dApp account address
  if (!dappAccountAddress || dappAccountAddress.trim().length === 0) {
    errors.push('dApp account address is required');
  } else if (!dappAccountAddress.match(/^account_[a-z0-9_]+$/)) {
    errors.push('dApp account address must be a valid account address');
  }

  // Validate name
  if (!name || name.trim().length === 0) {
    errors.push('dApp name is required');
  } else if (name.length > 100) {
    errors.push('dApp name must be less than 100 characters');
  }

  // Validate description
  if (!description || description.trim().length === 0) {
    errors.push('dApp description is required');
  } else if (description.length > 500) {
    errors.push('Description must be less than 500 characters');
  }

  // Validate icon URL (if provided)
  if (iconUrl && iconUrl.trim().length > 0) {
    try {
      new URL(iconUrl);
      if (!iconUrl.match(/^https?:\/\//)) {
        errors.push('Icon URL must use HTTP or HTTPS protocol');
      }
    } catch (e) {
      errors.push('Icon URL is not a valid URL');
    }
  }

  // Validate claimed websites (optional - empty array is valid for universal access)
  if (claimedWebsites && claimedWebsites.length > 0) {
    claimedWebsites.forEach((url, index) => {
      try {
        new URL(url);
        if (!url.match(/^https?:\/\//)) {
          errors.push(`Website #${index + 1} must use HTTP or HTTPS protocol`);
        }
      } catch (e) {
        errors.push(`Website #${index + 1} is not a valid URL: ${url}`);
      }
    });
  }

  // Validate claimed entities (optional)
  if (claimedEntities && claimedEntities.length > 0) {
    claimedEntities.forEach((address, index) => {
      if (!isValidRadixAddress(address)) {
        errors.push(`Entity #${index + 1} is not a valid Radix address: ${address}`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if a string is a valid Radix address
 * @param {string} address - Address to validate
 * @returns {boolean}
 */
function isValidRadixAddress(address) {
  // Check for component, package, or resource addresses
  const patterns = [
    /^component_rdx1[a-z0-9]+$/,
    /^component_tdx_[12]_1[a-z0-9]+$/,
    /^package_rdx1[a-z0-9]+$/,
    /^package_tdx_[12]_1[a-z0-9]+$/,
    /^resource_rdx1[a-z0-9]+$/,
    /^resource_tdx_[12]_1[a-z0-9]+$/,
  ];

  return patterns.some(pattern => pattern.test(address));
}
