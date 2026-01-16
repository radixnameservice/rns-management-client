/**
 * Reserved Domains Management Manifest Builder
 * Handles bulk upload of reserved domains to RNS V2
 */

export const getReservedDomainsBulkUploadManifest = ({
  componentAddress,
  reservedDomains = [], // Array of {domain: "example.xrd", claimant: "account_xxx"}
  adminBadgeResource,
  accountAddress,
  networkId = "stokenet"
}) => {
  // Note: Fee locking is handled by the wallet automatically
  // We don't need an explicit lock_fee call in the manifest

  // Build the vector of tuples (ComponentAddress, String) - order matters!
  const tuples = reservedDomains
    .map(({ domain, claimant }) => `    Tuple(Address("${claimant}"), "${domain}")`)
    .join(',\n');
  
  // Build manifest (wallet handles fee locking automatically)
  const manifest = `CALL_METHOD
  Address("${accountAddress}")
  "create_proof_of_amount"
  Address("${adminBadgeResource}")
  Decimal("1");

POP_FROM_AUTH_ZONE
  Proof("admin_badge_proof");

CALL_METHOD
  Address("${componentAddress}")
  "admin_insert_reserved_domains"
  Proof("admin_badge_proof")
  Array<Tuple>(
${tuples}
  );

CALL_METHOD
  Address("${accountAddress}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP");`;

  return manifest;
};

/**
 * Single reserved domain manifest
 */
export const getSingleReservedDomainManifest = ({
  componentAddress,
  domain,
  claimantAddress,
  accountAddress,
  adminBadgeResource,
  networkId = "stokenet"
}) => {
  const faucetAddress = networkId === "mainnet" 
    ? "component_rdx1cptxxxxxxxxxfaucetxxxxxxxxx000527798379xxxxxxxxxtxtm7m"
    : "component_tdx1cptxxxxxxxxxfaucetxxxxxxxxx000527798379xxxxxxxxxtxtm7m";

  return `CALL_METHOD
  Address("${faucetAddress}")
  "lock_fee"
  Decimal("20");

CALL_METHOD
  Address("${accountAddress}")
  "create_proof_of_amount"
  Address("${adminBadgeResource}")
  Decimal("1");

CALL_METHOD
  Address("${componentAddress}")
  "admin_insert_reserved_domains"
  Map<String, ComponentAddress>(
    "${domain}" => Address("${claimantAddress}")
  );

CALL_METHOD
  Address("${accountAddress}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP");`;
};

/**
 * Parse reserved domains from text input
 * Format: "domain.xrd,account_address" (one per line)
 */
export const parseReservedDomainsText = (text) => {
  const lines = text.trim().split('\n').filter(line => line.trim());
  const domains = [];
  const errors = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmedLine = line.trim();
    
    if (!trimmedLine) return;
    
    const parts = trimmedLine.split(',');
    if (parts.length !== 2) {
      errors.push(`Line ${lineNumber}: Invalid format. Expected "domain.xrd,account_address"`);
      return;
    }

    const domain = parts[0].trim();
    const claimant = parts[1].trim();

    // Validate domain format
    if (!domain.endsWith('.xrd')) {
      errors.push(`Line ${lineNumber}: Domain "${domain}" must end with .xrd`);
    } else if (!isValidDomainName(domain)) {
      errors.push(`Line ${lineNumber}: Invalid domain name "${domain}"`);
    }

    // Validate claimant address format
    if (!isValidAccountAddress(claimant)) {
      errors.push(`Line ${lineNumber}: Invalid account address "${claimant}"`);
    }

    // Check for duplicates
    if (domains.some(d => d.domain === domain)) {
      errors.push(`Line ${lineNumber}: Duplicate domain "${domain}"`);
    }

    if (errors.length === 0) {
      domains.push({ domain, claimant });
    }
  });

  return { domains, errors };
};

/**
 * Validate domain name format
 */
function isValidDomainName(domain) {
  // Remove .xrd extension for validation
  const name = domain.replace('.xrd', '');
  
  // Check length (1-65 characters)
  if (name.length < 1 || name.length > 65) {
    return false;
  }

  // Check characters (alphanumeric and hyphens, no hyphens at start/end)
  const validChars = /^[a-z0-9-]+$/;
  if (!validChars.test(name)) {
    return false;
  }

  // No hyphens at start or end
  if (name.startsWith('-') || name.endsWith('-')) {
    return false;
  }

  return true;
}

/**
 * Validate account address format
 */
function isValidAccountAddress(address) {
  // Support both old format (account_tdx1...) and new format (account_tdx_2_1...)
  const accountPattern = /^account_(tdx|rdx|sim)(_\d+)?_[a-z0-9]+/;
  return accountPattern.test(address);
}

/**
 * Estimate transaction cost for reserved domains upload
 */
export const estimateReservedDomainsCost = (domainCount) => {
  const baseFee = 10; // Base transaction fee
  const perDomainFee = 2; // Fee per domain
  const totalFee = baseFee + (domainCount * perDomainFee);
  
  return {
    baseFee,
    perDomainFee,
    totalFee,
    domainCount
  };
};

/**
 * Validate reserved domains list before upload
 */
export const validateReservedDomainsList = (domains) => {
  const errors = [];
  const seenDomains = new Set();
  const seenClaimants = new Set();

  if (!Array.isArray(domains) || domains.length === 0) {
    errors.push("No domains provided");
    return errors;
  }

  if (domains.length > 1000) {
    errors.push("Too many domains (maximum 1000 per upload)");
  }

  domains.forEach((item, index) => {
    if (!item.domain || !item.claimant) {
      errors.push(`Item ${index + 1}: Missing domain or claimant`);
      return;
    }

    // Check for duplicate domains
    if (seenDomains.has(item.domain)) {
      errors.push(`Duplicate domain: ${item.domain}`);
    } else {
      seenDomains.add(item.domain);
    }

    // Validate formats
    if (!isValidDomainName(item.domain)) {
      errors.push(`Invalid domain name: ${item.domain}`);
    }

    if (!isValidAccountAddress(item.claimant)) {
      errors.push(`Invalid claimant address: ${item.claimant}`);
    }
  });

  return errors;
};
