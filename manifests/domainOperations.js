/**
 * Domain Operations Manifests
 * These manifests handle domain registration, activation, subdomains, and records.
 */

/**
 * Creates a manifest to register and bond a domain
 * @param {string} componentAddress - RNS V2 component address
 * @param {string} registrarResource - Registrar badge resource address
 * @param {string} registrarId - Registrar badge NFT ID (in format [hex] for Bytes type)
 * @param {string} domainName - Domain name (including TLD, e.g. "example.xrd")
 * @param {string} paymentResource - Payment resource address (whitelisted stablecoin)
 * @param {string} bondAmount - Bond amount (as string)
 * @param {number} basePrice - Base price from pricing tier (what registrar fee is calculated on)
 * @param {string} registrarName - Registrar name for display in transaction message
 * @param {number} registrarFeePercentage - Registrar fee percentage (e.g., 5 for 5%)
 * @param {string} accountAddress - User's account address
 * @param {string} networkId - Network ID (1 for mainnet, 2 for stokenet)
 */
export function getRegisterAndBondDomainManifest({ 
  componentAddress, 
  registrarResource, 
  registrarId, 
  domainName, 
  paymentResource,
  bondAmount,
  basePrice,
  registrarName,
  registrarFeePercentage,
  accountAddress, 
  networkId 
}) {
  // Bond amount equals base price (from pricing tier based on domain length)
  // Registrar fee is calculated as percentage of base price
  const bondAmountNum = parseFloat(bondAmount);
  const registrarFee = basePrice * (registrarFeePercentage / 100);
  const totalAmount = bondAmountNum + registrarFee;

  return `
# ====================================================================
# Domain Registration: ${domainName}
# Registrar: ${registrarName}
# ====================================================================
# Bond Amount (from pricing tier): ${bondAmount}
# Registrar Fee (${registrarFeePercentage}% of base): ${registrarFee.toFixed(2)}
# Total Payment: ${totalAmount.toFixed(2)}
# ====================================================================

# Withdraw bond amount (base price from pricing tier)
CALL_METHOD
    Address("${accountAddress}")
    "withdraw"
    Address("${paymentResource}")
    Decimal("${bondAmount}")
;

# Withdraw registrar fee (${registrarFeePercentage}% of base price)
CALL_METHOD
    Address("${accountAddress}")
    "withdraw"
    Address("${paymentResource}")
    Decimal("${registrarFee.toFixed(6)}")
;

# Take combined payment from worktop (bond + fee)
TAKE_ALL_FROM_WORKTOP
    Address("${paymentResource}")
    Bucket("total_payment")
;

# Register and bond domain (includes base price + registrar fee)
CALL_METHOD
    Address("${componentAddress}")
    "register_and_bond_domain"
    "${domainName}"
    Bucket("total_payment")
    Address("${accountAddress}")
    NonFungibleLocalId("${registrarId}")
;

# Deposit domain NFT and any change to account
CALL_METHOD
    Address("${accountAddress}")
    "deposit_batch"
    Expression("ENTIRE_WORKTOP")
;
`;
}

/**
 * Creates a manifest to activate domain ownership
 * @param {string} componentAddress - RNS V2 component address
 * @param {string} domainResource - Domain NFT resource address
 * @param {string} domainId - Domain NFT ID (in format [hex] for Bytes type)
 * @param {string} ownerAddress - New owner's account address (who will control the domain)
 * @param {string} accountAddress - Current holder's account address (who holds the NFT)
 * @param {string} networkId - Network ID
 */
export function getActivateDomainOwnershipManifest({ 
  componentAddress, 
  domainResource, 
  domainId, 
  ownerAddress, 
  accountAddress, 
  networkId 
}) {
  // Convert Bytes-type NFT ID from [hex] format to hex:value format for RTM
  const formattedDomainId = domainId.startsWith('[') && domainId.endsWith(']')
    ? `hex:${domainId.slice(1, -1)}`
    : domainId;

  return `
# Create proof of domain NFT
CALL_METHOD
  Address("${accountAddress}")
  "create_proof_of_non_fungibles"
  Address("${domainResource}")
  Array<NonFungibleLocalId>(
    NonFungibleLocalId("${formattedDomainId}")
  )
;

POP_FROM_AUTH_ZONE
  Proof("domain_proof")
;

# Activate domain ownership
CALL_METHOD
  Address("${componentAddress}")
  "activate_domain_ownership"
  Proof("domain_proof")
  Address("${ownerAddress}")
;

# Deposit any remaining assets
CALL_METHOD
  Address("${accountAddress}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;
`;
}

/**
 * Creates a manifest to get a domain's subregistry component address
 * @param {string} componentAddress - RNS V2 component address
 * @param {string} domainName - Full domain name (e.g., "example.xrd")
 * @param {string} accountAddress - User's account address
 * @param {string} networkId - Network ID
 */
export function getSubregistryAddressManifest({ 
  componentAddress, 
  domainName, 
  accountAddress, 
  networkId 
}) {
  return `
# Get domain subregistry address
CALL_METHOD
  Address("${componentAddress}")
  "get_domain_subregistry"
  "${domainName}";
`;
}

/**
 * Creates a manifest to create a subdomain
 * @param {string} subregistryAddress - Domain's subregistry component address
 * @param {string} domainResource - Domain NFT resource address
 * @param {string} domainId - Domain NFT ID (in format [hex] for Bytes type)
 * @param {string} subdomainName - Subdomain name (without domain)
 * @param {object} metadata - Metadata key-value pairs
 * @param {string} accountAddress - Domain owner's account address
 * @param {string} networkId - Network ID
 */
export function getCreateSubdomainManifest({ 
  subregistryAddress, 
  domainResource, 
  domainId, 
  subdomainName, 
  metadata, 
  accountAddress, 
  networkId 
}) {
  // Domain ID is already in [hex] format, use as-is for RTM
  const formattedDomainId = domainId;

  // Convert metadata object to manifest format
  let metadataStr = 'Map<String, String>()';
  if (metadata && Object.keys(metadata).length > 0) {
    const entries = Object.entries(metadata).map(([k, v]) => `  "${k}" => "${v}"`).join(',\n');
    metadataStr = `Map<String, String>(\n${entries}\n)`;
  }

  return `
# Create proof of domain NFT
CALL_METHOD
  Address("${accountAddress}")
  "create_proof_of_non_fungibles"
  Address("${domainResource}")
  Array<NonFungibleLocalId>(
    NonFungibleLocalId("${formattedDomainId}")
  )
;

POP_FROM_AUTH_ZONE
  Proof("domain_proof")
;

# Create subdomain
CALL_METHOD
  Address("${subregistryAddress}")
  "create_subdomain"
  Proof("domain_proof")
  "${subdomainName}"
  ${metadataStr}
;

# Deposit any remaining assets
CALL_METHOD
  Address("${accountAddress}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;
`;
}

/**
 * Creates a manifest to delete a subdomain
 * @param {string} subregistryAddress - Domain's subregistry component address
 * @param {string} domainResource - Domain NFT resource address
 * @param {string} domainId - Domain NFT ID (in format [hex] for Bytes type)
 * @param {string} subdomainName - Subdomain name to delete
 * @param {string} accountAddress - Domain owner's account address
 * @param {string} networkId - Network ID
 */
export function getDeleteSubdomainManifest({
  subregistryAddress,
  domainResource,
  domainId,
  subdomainName,
  accountAddress,
  networkId
}) {
  // Domain ID is already in [hex] format, use as-is for RTM
  const formattedDomainId = domainId;

  return `
# Create proof of domain NFT
CALL_METHOD
  Address("${accountAddress}")
  "create_proof_of_non_fungibles"
  Address("${domainResource}")
  Array<NonFungibleLocalId>(
    NonFungibleLocalId("${formattedDomainId}")
  )
;

POP_FROM_AUTH_ZONE
  Proof("domain_proof")
;

# Delete subdomain
CALL_METHOD
  Address("${subregistryAddress}")
  "delete_subdomain"
  Proof("domain_proof")
  "${subdomainName}"
;

# Deposit any remaining assets
CALL_METHOD
  Address("${accountAddress}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;
`;
}

/**
 * Creates a manifest to set a single record
 * @param {string} subregistryAddress - Domain's subregistry component address
 * @param {string} domainResource - Domain NFT resource address
 * @param {string} domainId - Domain NFT ID (in format [hex] for Bytes type)
 * @param {string|null} subdomainName - Subdomain name (null for root domain)
 * @param {string} context - Record context (e.g., "receivers", "social")
 * @param {string} directive - Record directive (e.g., "*", "twitter")
 * @param {string} value - Record value
 * @param {string} accountAddress - Domain owner's account address
 * @param {string} networkId - Network ID
 */
export function getSetRecordManifest({ 
  subregistryAddress, 
  domainResource, 
  domainId, 
  subdomainName, 
  context, 
  directive, 
  value, 
  accountAddress, 
  networkId 
}) {
  // Domain ID is already in [hex] format, use as-is for RTM
  const formattedDomainId = domainId;

  const subdomainOption = subdomainName ? `Some("${subdomainName}")` : 'None';

  return `
# Create proof of domain NFT
CALL_METHOD
  Address("${accountAddress}")
  "create_proof_of_non_fungibles"
  Address("${domainResource}")
  Array<NonFungibleLocalId>(
    NonFungibleLocalId("${formattedDomainId}")
  )
;

POP_FROM_AUTH_ZONE
  Proof("domain_proof")
;

# Set record
CALL_METHOD
  Address("${subregistryAddress}")
  "set_record"
  Proof("domain_proof")
  ${subdomainOption}
  "${context}"
  "${directive}"
  "${value}"
;

# Deposit any remaining assets
CALL_METHOD
  Address("${accountAddress}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;
`;
}

/**
 * Creates a manifest to delete a record from a domain
 * @param {string} subregistryAddress - Subregistry component address
 * @param {string} domainResource - Domain NFT resource address
 * @param {string} domainId - Domain NFT ID (in format [hex] for Bytes type)
 * @param {string} context - Record context (e.g., "radix", "social")
 * @param {string} directive - Record directive (e.g., "address", "twitter")
 * @param {string} accountAddress - User's account address
 * @param {string} networkId - Network ID (1 for mainnet, 2 for stokenet)
 */
export function getDeleteRecordManifest({ 
  subregistryAddress, 
  domainResource, 
  domainId, 
  context, 
  directive, 
  accountAddress, 
  networkId 
}) {
  // Domain ID is already in [hex] format, use as-is for RTM
  const formattedDomainId = domainId;

  return `
# Create proof of domain NFT
CALL_METHOD
  Address("${accountAddress}")
  "create_proof_of_non_fungibles"
  Address("${domainResource}")
  Array<NonFungibleLocalId>(
    NonFungibleLocalId("${formattedDomainId}")
  )
;

POP_FROM_AUTH_ZONE
  Proof("domain_proof")
;

# Delete record
CALL_METHOD
  Address("${subregistryAddress}")
  "delete_record"
  Proof("domain_proof")
  "${context}"
  "${directive}"
;

# Deposit any remaining assets
CALL_METHOD
  Address("${accountAddress}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;
`;
}

/**
 * Creates a manifest to set multiple records in batch
 * @param {string} subregistryAddress - Domain's subregistry component address
 * @param {string} domainResource - Domain NFT resource address
 * @param {string} domainId - Domain NFT ID (in format [hex] for Bytes type)
 * @param {object} records - Records object: { "context": { "directive": "value" } }
 * @param {string} accountAddress - Domain owner's account address
 * @param {string} networkId - Network ID
 */
export function getBatchSetRecordsManifest({ 
  subregistryAddress, 
  domainResource, 
  domainId, 
  records, 
  accountAddress, 
  networkId 
}) {
  // Domain ID is already in [hex] format, use as-is for RTM
  const formattedDomainId = domainId;

  // Convert records object to manifest format
  // records = { "receivers": { "*": "account_..." }, "social": { "twitter": "@..." } }
  let recordsStr = 'Map<String, Map<String, String>>()';
  
  if (records && Object.keys(records).length > 0) {
    const contextEntries = Object.entries(records).map(([context, directives]) => {
      const directiveEntries = Object.entries(directives)
        .map(([directive, value]) => `    "${directive}" => "${value}"`)
        .join(',\n');
      return `  "${context}" => Map<String, String>(\n${directiveEntries}\n  )`;
    }).join(',\n');
    recordsStr = `Map<String, Map<String, String>>(\n${contextEntries}\n)`;
  }

  return `
# Create proof of domain NFT
CALL_METHOD
  Address("${accountAddress}")
  "create_proof_of_non_fungibles"
  Address("${domainResource}")
  Array<NonFungibleLocalId>(
    NonFungibleLocalId("${formattedDomainId}")
  )
;

POP_FROM_AUTH_ZONE
  Proof("domain_proof")
;

# Set records in batch
CALL_METHOD
  Address("${subregistryAddress}")
  "set_records_batch"
  Proof("domain_proof")
  ${recordsStr}
;

# Deposit any remaining assets
CALL_METHOD
  Address("${accountAddress}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;
`;
}

