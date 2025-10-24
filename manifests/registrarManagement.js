/**
 * Registrar Management Manifests
 * These manifests handle all registrar-related operations for the RNS V2 component.
 */

/**
 * Creates a manifest to register as a new registrar
 */
export function getRegisterAsRegistrarManifest({ componentAddress, registrarName, iconUrl, websiteUrl, feePercentage, accountAddress, networkId }) {
  // Note: Fee locking is handled by the wallet automatically
  // The method is public and returns a NonFungibleBucket with the registrar badge
  return `
CALL_METHOD
  Address("${componentAddress}")
  "register_as_registrar"
  "${registrarName}"
  "${iconUrl}"
  "${websiteUrl}"
  Decimal("${feePercentage}");

CALL_METHOD
  Address("${accountAddress}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP");
`;
}

/**
 * Creates a manifest to update registrar metadata (name, icon, website, fees)
 */
export function getUpdateRegistrarMetadataManifest({ componentAddress, registrarResource, registrarId, newName, newIconUrl, newWebsiteUrl, newFeePercentage, accountAddress, networkId }) {
  // For Bytes-type NFT IDs, keep the [hex] format
  return `
CALL_METHOD
  Address("${accountAddress}")
  "create_proof_of_non_fungibles"
  Address("${registrarResource}")
  Array<NonFungibleLocalId>(
    NonFungibleLocalId("${registrarId}")
  );

POP_FROM_AUTH_ZONE
  Proof("registrar_proof");

CALL_METHOD
  Address("${componentAddress}")
  "update_registrar_metadata"
  Proof("registrar_proof")
  ${newName ? `Some("${newName}")` : 'None'}
  ${newIconUrl ? `Some("${newIconUrl}")` : 'None'}
  ${newWebsiteUrl ? `Some("${newWebsiteUrl}")` : 'None'}
  ${newFeePercentage ? `Some(Decimal("${newFeePercentage}"))` : 'None'};
`;
}

/**
 * Creates a manifest to withdraw accumulated registrar fees
 */
export function getWithdrawRegistrarFeesManifest({ componentAddress, registrarResource, registrarId, feeResource, accountAddress, networkId }) {
  // For Bytes-type NFT IDs, keep the [hex] format
  return `
CALL_METHOD
  Address("${accountAddress}")
  "create_proof_of_non_fungibles"
  Address("${registrarResource}")
  Array<NonFungibleLocalId>(
    NonFungibleLocalId("${registrarId}")
  );

POP_FROM_AUTH_ZONE
  Proof("registrar_proof");

CALL_METHOD
  Address("${componentAddress}")
  "withdraw_registrar_fees"
  Proof("registrar_proof")
  Address("${feeResource}");

CALL_METHOD
  Address("${accountAddress}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP");
`;
}

/**
 * Creates a manifest to burn a registrar badge
 */
export function getBurnRegistrarBadgeManifest({ componentAddress, registrarResource, registrarId, accountAddress, networkId }) {
  // For Bytes-type NFT IDs, keep the [hex] format
  return `
CALL_METHOD
  Address("${accountAddress}")
  "withdraw_non_fungibles"
  Address("${registrarResource}")
  Array<NonFungibleLocalId>(
    NonFungibleLocalId("${registrarId}")
  );

TAKE_NON_FUNGIBLES_FROM_WORKTOP
  Address("${registrarResource}")
  Array<NonFungibleLocalId>(
    NonFungibleLocalId("${registrarId}")
  )
  Bucket("registrar_badge");

CALL_METHOD
  Address("${componentAddress}")
  "burn_registrar_badge"
  Bucket("registrar_badge");
`;
}

/**
 * Get registrar info manifest (read-only query)
 */
export function getRegistrarInfoManifest({ componentAddress, registrarId, networkId }) {
  // For Bytes-type NFT IDs, keep the [hex] format
  return `
CALL_METHOD
  Address("${componentAddress}")
  "get_registrar_info"
  NonFungibleLocalId("${registrarId}");
`;
}

/**
 * Get registrar stats manifest (read-only query)
 */
export function getRegistrarStatsManifest({ componentAddress, registrarId, networkId }) {
  // For Bytes-type NFT IDs, keep the [hex] format
  return `
CALL_METHOD
  Address("${componentAddress}")
  "get_registrar_stats"
  NonFungibleLocalId("${registrarId}");
`;
}

