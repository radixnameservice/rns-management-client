/**
 * RNS V2 - Dummy Resource Creation Manifest Builder
 * Creates testing resources for Stokenet development
 * 
 * Creates 5 resources using official Radix manifest syntax:
 * 1. fUSD - Fake USD payment token (100,000 tokens, 18 decimals)
 * 2. sUSD - Stable USD payment token (100,000 tokens, 18 decimals)
 * 3. Legacy Domain NFT - Non-fungible collection (1 example NFT)
 * 4. V1 Admin Badge - Admin badges (5 indivisible badges)
 * 5. V1 Upgrade Badge - Upgrade badge (1 indivisible badge)
 * 
 * Uses CREATE_FUNGIBLE_RESOURCE_WITH_INITIAL_SUPPLY and 
 * CREATE_NON_FUNGIBLE_RESOURCE_WITH_INITIAL_SUPPLY instructions
 * with proper resource roles and metadata structure.
 */

/**
 * Create dummy resources for RNS testing
 */
export const getCreateDummyResourcesManifest = ({
  accountAddress,
  networkId = "stokenet"
}) => {
  return `# Create fUSD token
CREATE_FUNGIBLE_RESOURCE_WITH_INITIAL_SUPPLY
    Enum<OwnerRole::None>()
    true
    18u8
    Decimal("100000")
    Tuple(
        Some(Tuple(Some(Enum<AccessRule::AllowAll>()), Some(Enum<AccessRule::DenyAll>()))),
        None, None, None, None, None
    )
    Tuple(
        Map<String, Tuple>(
            "name" => Tuple(Some(Enum<Metadata::String>("Fake USD Token")), true),
            "symbol" => Tuple(Some(Enum<Metadata::String>("fUSD")), true)
        ),
        Map<String, Enum>(
            "metadata_setter" => Some(Enum<AccessRule::AllowAll>()),
            "metadata_setter_updater" => None,
            "metadata_locker" => Some(Enum<AccessRule::DenyAll>()),
            "metadata_locker_updater" => None
        )
    )
    None
;

# Create sUSD token
CREATE_FUNGIBLE_RESOURCE_WITH_INITIAL_SUPPLY
    Enum<OwnerRole::None>()
    true
    18u8
    Decimal("100000")
    Tuple(
        Some(Tuple(Some(Enum<AccessRule::AllowAll>()), Some(Enum<AccessRule::DenyAll>()))),
        None, None, None, None, None
    )
    Tuple(
        Map<String, Tuple>(
            "name" => Tuple(Some(Enum<Metadata::String>("Stable USD Token")), true),
            "symbol" => Tuple(Some(Enum<Metadata::String>("sUSD")), true)
        ),
        Map<String, Enum>(
            "metadata_setter" => Some(Enum<AccessRule::AllowAll>()),
            "metadata_setter_updater" => None,
            "metadata_locker" => Some(Enum<AccessRule::DenyAll>()),
            "metadata_locker_updater" => None
        )
    )
    None
;

# Create Legacy Domain NFT resource
CREATE_NON_FUNGIBLE_RESOURCE_WITH_INITIAL_SUPPLY
    Enum<OwnerRole::None>()
    Enum<NonFungibleIdType::Integer>()
    true
    Enum<0u8>(Enum<0u8>(Tuple(Array<Enum>(), Array<Tuple>(), Array<Enum>())), Enum<0u8>(66u8), Array<String>())
    Map<NonFungibleLocalId, Tuple>(
        NonFungibleLocalId("#1#") => Tuple(Tuple())
    )
    Tuple(
        Some(Tuple(Some(Enum<AccessRule::AllowAll>()), Some(Enum<AccessRule::DenyAll>()))),
        None, None, None, None, None, None
    )
    Tuple(
        Map<String, Tuple>(
            "name" => Tuple(Some(Enum<Metadata::String>("Legacy Domain NFT")), true)
        ),
        Map<String, Enum>(
            "metadata_setter" => Some(Enum<AccessRule::AllowAll>()),
            "metadata_setter_updater" => None,
            "metadata_locker" => Some(Enum<AccessRule::DenyAll>()),
            "metadata_locker_updater" => None
        )
    )
    None
;

# Create V1 Admin Badge
CREATE_FUNGIBLE_RESOURCE_WITH_INITIAL_SUPPLY
    Enum<OwnerRole::None>()
    true
    0u8
    Decimal("5")
    Tuple(
        Some(Tuple(Some(Enum<AccessRule::AllowAll>()), Some(Enum<AccessRule::DenyAll>()))),
        None, None, None, None, None
    )
    Tuple(
        Map<String, Tuple>(
            "name" => Tuple(Some(Enum<Metadata::String>("V1 Admin Badge")), true)
        ),
        Map<String, Enum>(
            "metadata_setter" => Some(Enum<AccessRule::AllowAll>()),
            "metadata_setter_updater" => None,
            "metadata_locker" => Some(Enum<AccessRule::DenyAll>()),
            "metadata_locker_updater" => None
        )
    )
    None
;

# Create V1 Upgrade Badge
CREATE_FUNGIBLE_RESOURCE_WITH_INITIAL_SUPPLY
    Enum<OwnerRole::None>()
    true
    0u8
    Decimal("1")
    Tuple(
        Some(Tuple(Some(Enum<AccessRule::AllowAll>()), Some(Enum<AccessRule::DenyAll>()))),
        None, None, None, None, None
    )
    Tuple(
        Map<String, Tuple>(
            "name" => Tuple(Some(Enum<Metadata::String>("V1 Upgrade Badge")), true)
        ),
        Map<String, Enum>(
            "metadata_setter" => Some(Enum<AccessRule::AllowAll>()),
            "metadata_setter_updater" => None,
            "metadata_locker" => Some(Enum<AccessRule::DenyAll>()),
            "metadata_locker_updater" => None
        )
    )
    None
;

CALL_METHOD
    Address("${accountAddress}")
    "deposit_batch"
    Expression("ENTIRE_WORKTOP")
;`;
};

/**
 * Parse resource creation transaction receipt
 */
export const parseResourceCreationReceipt = (receipt) => {
  const newGlobalEntities = receipt.transaction.receipt.state_updates.new_global_entities || [];
  
  if (newGlobalEntities.length < 5) {
    throw new Error(`Expected 5 resources but got ${newGlobalEntities.length}`);
  }

  const resourceAddresses = newGlobalEntities.map(entity => entity.entity_address);

  return {
    fUSD: resourceAddresses[0],
    sUSD: resourceAddresses[1], 
    legacyDomainResource: resourceAddresses[2],
    v1AdminBadgeResource: resourceAddresses[3],
    v1UpgradeBadgeResource: resourceAddresses[4]
  };
};

/**
 * Validate resource creation parameters
 */
export const validateResourceCreationParams = (params) => {
  const errors = [];

  if (!params.accountAddress) {
    errors.push("Account address is required");
  }

  if (params.networkId === "mainnet") {
    errors.push("Resource creation is only available for Stokenet testing");
  }

  const addressPattern = /^account_(tdx|rdx|sim)(_\d+)?_[a-z0-9]+/;
  if (params.accountAddress && !addressPattern.test(params.accountAddress)) {
    errors.push("Invalid account address format");
  }

  return errors;
};
