/**
 * Admin Actions Manifest Builder
 * Handles admin-only operations for RNS V2
 */

export const getBurnAdminBadgeManifest = ({
  componentAddress,
  adminBadgeResource,
  accountAddress,
  networkId = "stokenet"
}) => {
  // Note: Fee locking is handled by the wallet automatically
  // The admin_burn method requires a Bucket (actual badge), not a Proof
  return `CALL_METHOD
  Address("${accountAddress}")
  "withdraw"
  Address("${adminBadgeResource}")
  Decimal("1");

TAKE_FROM_WORKTOP
  Address("${adminBadgeResource}")
  Decimal("1")
  Bucket("admin_badge");

CALL_METHOD
  Address("${componentAddress}")
  "admin_burn"
  Bucket("admin_badge");

CALL_METHOD
  Address("${accountAddress}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP");`;
};

export const getComponentInfoManifest = ({
  componentAddress,
  networkId = "stokenet"
}) => {
  const faucetAddress = networkId === "mainnet" 
    ? "component_rdx1cptxxxxxxxxxfaucetxxxxxxxxx000527798379xxxxxxxxxtxtm7m"
    : "component_tdx1cptxxxxxxxxxfaucetxxxxxxxxx000527798379xxxxxxxxxtxtm7m";

  return `CALL_METHOD
  Address("${faucetAddress}")
  "lock_fee"
  Decimal("10");

CALL_METHOD
  Address("${componentAddress}")
  "get_component_info";`;
};

export const getDomainDetailsManifest = ({
  componentAddress,
  domainName,
  networkId = "stokenet"
}) => {
  const faucetAddress = networkId === "mainnet" 
    ? "component_rdx1cptxxxxxxxxxfaucetxxxxxxxxx000527798379xxxxxxxxxtxtm7m"
    : "component_tdx1cptxxxxxxxxxfaucetxxxxxxxxx000527798379xxxxxxxxxtxtm7m";

  return `CALL_METHOD
  Address("${faucetAddress}")
  "lock_fee"
  Decimal("10");

CALL_METHOD
  Address("${componentAddress}")
  "get_domain_details"
  "${domainName}";`;
};

export const getRegistrationStatusManifest = ({
  componentAddress,
  networkId = "stokenet"
}) => {
  const faucetAddress = networkId === "mainnet" 
    ? "component_rdx1cptxxxxxxxxxfaucetxxxxxxxxx000527798379xxxxxxxxxtxtm7m"
    : "component_tdx1cptxxxxxxxxxfaucetxxxxxxxxx000527798379xxxxxxxxxtxtm7m";

  return `CALL_METHOD
  Address("${faucetAddress}")
  "lock_fee"
  Decimal("10");

CALL_METHOD
  Address("${componentAddress}")
  "is_registration_active";`;
};

/**
 * Test domain registration manifest (for testing after admin badge burn)
 * Note: Requires a registrar ID - use after creating a test registrar
 */
export const getTestDomainRegistrationManifest = ({
  componentAddress,
  domainName,
  paymentResource,
  paymentAmount,
  registrarId,
  accountAddress,
  networkId = "stokenet"
}) => {
  const faucetAddress = networkId === "mainnet" 
    ? "component_rdx1cptxxxxxxxxxfaucetxxxxxxxxx000527798379xxxxxxxxxtxtm7m"
    : "component_tdx1cptxxxxxxxxxfaucetxxxxxxxxx000527798379xxxxxxxxxtxtm7m";

  return `CALL_METHOD
  Address("${faucetAddress}")
  "lock_fee"
  Decimal("100");

CALL_METHOD
  Address("${accountAddress}")
  "withdraw"
  Address("${paymentResource}")
  Decimal("${paymentAmount}");

TAKE_FROM_WORKTOP
  Address("${paymentResource}")
  Decimal("${paymentAmount}")
  Bucket("payment");

CALL_METHOD
  Address("${componentAddress}")
  "register_and_bond_domain"
  "${domainName}"
  Bucket("payment")
  Address("${accountAddress}")
  NonFungibleLocalId("${registrarId}");

CALL_METHOD
  Address("${accountAddress}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP");`;
};

/**
 * Claim reserved domain manifest
 */
export const getClaimReservedDomainManifest = ({
  componentAddress,
  domainName,
  paymentResource,
  paymentAmount,
  claimantAccount,
  accountAddress,
  networkId = "stokenet"
}) => {
  const faucetAddress = networkId === "mainnet" 
    ? "component_rdx1cptxxxxxxxxxfaucetxxxxxxxxx000527798379xxxxxxxxxtxtm7m"
    : "component_tdx1cptxxxxxxxxxfaucetxxxxxxxxx000527798379xxxxxxxxxtxtm7m";

  return `CALL_METHOD
  Address("${faucetAddress}")
  "lock_fee"
  Decimal("100");

CALL_METHOD
  Address("${accountAddress}")
  "withdraw"
  Address("${paymentResource}")
  Decimal("${paymentAmount}");

TAKE_FROM_WORKTOP
  Address("${paymentResource}")
  Decimal("${paymentAmount}")
  Bucket("payment");

CALL_METHOD
  Address("${componentAddress}")
  "claim_reserved_domain"
  "${domainName}"
  Bucket("payment")
  Address("${claimantAccount}");

CALL_METHOD
  Address("${accountAddress}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP");`;
};

/**
 * Update dApp Definition on RNS Component
 * REQUIRED before burning admin badge
 */
export const getUpdateDappDefinitionManifest = ({
  componentAddress,
  adminBadgeResource,
  dappDefinitionAddress,
  accountAddress,
  networkId = "stokenet"
}) => {
  return `CALL_METHOD
  Address("${accountAddress}")
  "create_proof_of_amount"
  Address("${adminBadgeResource}")
  Decimal("1");

POP_FROM_AUTH_ZONE
  Proof("admin_badge_proof");

CALL_METHOD
  Address("${componentAddress}")
  "update_dapp_definition"
  Proof("admin_badge_proof")
  Address("${dappDefinitionAddress}");`;
};

/**
 * Validate admin action parameters
 */
export const validateAdminActionParams = (params) => {
  const errors = [];

  if (!params.componentAddress) {
    errors.push("Component address is required");
  }

  if (!params.accountAddress) {
    errors.push("Account address is required");
  }

  // Validate address formats
  const componentPattern = /^component_(tdx|rdx|sim)1[a-z0-9]+/;
  const resourcePattern = /^resource_(tdx|rdx|sim)1[a-z0-9]+/;
  const accountPattern = /^account_(tdx|rdx|sim)1[a-z0-9]+/;

  if (params.componentAddress && !componentPattern.test(params.componentAddress)) {
    errors.push("Invalid component address format");
  }

  if (params.adminBadgeResource && !resourcePattern.test(params.adminBadgeResource)) {
    errors.push("Invalid admin badge resource address format");
  }

  if (params.accountAddress && !accountPattern.test(params.accountAddress)) {
    errors.push("Invalid account address format");
  }

  if (params.claimantAccount && !accountPattern.test(params.claimantAccount)) {
    errors.push("Invalid claimant account address format");
  }

  // Validate domain name if provided
  if (params.domainName && !isValidDomainName(params.domainName)) {
    errors.push("Invalid domain name format");
  }

  // Validate payment amount if provided
  if (params.paymentAmount && (isNaN(params.paymentAmount) || params.paymentAmount <= 0)) {
    errors.push("Payment amount must be a positive number");
  }

  return errors;
};

function isValidDomainName(domain) {
  if (!domain.endsWith('.xrd')) {
    return false;
  }
  
  const name = domain.replace('.xrd', '');
  
  if (name.length < 1 || name.length > 65) {
    return false;
  }

  const validChars = /^[a-z0-9-]+$/;
  if (!validChars.test(name)) {
    return false;
  }

  if (name.startsWith('-') || name.endsWith('-')) {
    return false;
  }

  return true;
}

/**
 * Format component info for display
 */
export const formatComponentInfo = (componentData) => {
  if (!componentData) {
    return {
      registrationActive: false,
      domainCount: 0,
      reservedDomainCount: 0,
      v1BadgesLocked: false
    };
  }

  return {
    registrationActive: componentData.is_registration_active || false,
    domainCount: componentData.domain_count || 0,
    reservedDomainCount: componentData.reserved_domain_count || 0,
    v1BadgesLocked: componentData.v1_badges_locked || false,
    adminBadgeExists: componentData.admin_badge_exists || false,
    totalBondedValue: componentData.total_bonded_value || "0",
    supportedPaymentResources: componentData.payment_resources || []
  };
};
