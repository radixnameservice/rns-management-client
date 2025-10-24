// npm i @radixdlt/radix-engine-toolkit
import { ManifestBuilder, NetworkId } from "@radixdlt/radix-engine-toolkit";

/**
 * Helper: browser/File -> Uint8Array
 */
async function fileToBytes(file) {
  // Works for <input type="file"> File or Blob
  const buf = await file.arrayBuffer();
  return new Uint8Array(buf);
}

/**
 * Build an ownerless publish manifest with RET and return:
 * {
 *   manifestString,   // the text manifest to show/submit
 *   blobs             // [{ hash, bytes }] to pass to RDT
 * }
 */
function buildOwnerlessPublishWithRET({ wasmBytes, rpdBytes, networkId, name, description }) {
  const builder = new ManifestBuilder();

  // Prefer the canonical alias; fall back to older name if needed
  const publishAdvanced =
    (typeof builder.package_publish_advanced === "function" && builder.package_publish_advanced.bind(builder)) ||
    (typeof builder.packagePublishAdvanced === "function" && builder.packagePublishAdvanced.bind(builder));

  if (!publishAdvanced) {
    throw new Error(
      "RET ManifestBuilder is missing package_publish_advanced/packagePublishAdvanced. Update @radixdlt/radix-engine-toolkit."
    );
  }

  // Ownerless (OwnerRole::None), raw rpd/wasm bytes, initial metadata, no reservation
  publishAdvanced(
    { kind: "OwnerRoleNone" },
    rpdBytes,
    wasmBytes,
    {
      name: name || "My Package",
      description: description || "",
    },
    null
  );

  const ret = builder.build(networkId);

  if (!ret || !ret.instructions || typeof ret.instructions.value !== "string") {
    throw new Error("RET build() did not return a manifest with instructions.value");
  }

  // RET >= 1.0.x exposes blobs with { hash, bytes } (or sometimes { hash, value })
  const blobs = (ret.blobs || []).map((b) => ({
    hash: b.hash,
    bytes: b.bytes ?? b.value, // normalize
  }));

  return {
    manifestString: ret.instructions.value,
    blobs,
  };
}

/**
 * Main entry — wallet handoff via RDT.
 * rdt: an initialized Radix Dapp Toolkit instance (browser)
 * wasmFile/rpdFile: File objects picked by user (input type="file")
 * network: "stokenet" | "mainnet"
 * returns { transactionHash }
 */
export async function deployPackageWithRETandRDT({
  rdt,
  wasmFile,
  rpdFile,
  network = "stokenet",
  packageName = "RNS V2 Package",
  packageDescription = "RNS V2 - Radix Name Service Package",
}) {
  if (!rdt || !rdt.walletApi || !rdt.walletApi.sendTransaction) {
    throw new Error("RDT (walletApi) not provided/initialized");
  }
  if (!wasmFile || !rpdFile) {
    throw new Error("Please provide both .wasm and .rpd files");
  }

  const networkId = network === "mainnet" ? NetworkId.Mainnet : NetworkId.Stokenet;

  // 1) Read artifacts as raw bytes
  const [wasmBytes, rpdBytes] = await Promise.all([fileToBytes(wasmFile), fileToBytes(rpdFile)]);

  // 2) Build ownerless publish manifest with RET (no fee instructions!)
  const { manifestString, blobs } = buildOwnerlessPublishWithRET({
    wasmBytes,
    rpdBytes,
    networkId,
    name: `${packageName} (${network === "mainnet" ? "Mainnet" : "Stokenet"})`,
    description: packageDescription,
  });

  // 3) Handoff to wallet via RDT — IMPORTANT: include blobs so the WASM is uploaded
  const resp = await rdt.walletApi.sendTransaction({
    transactionManifest: manifestString,
    blobs, // <- without this, publish will fail
    version: 1,
  });

  // RDT result can be a Result-like or plain object; handle both
  const isErr = typeof resp?.isErr === "function" ? resp.isErr() : !!resp?.error;
  if (isErr) {
    const errorObj = resp?.error ?? resp;
    const msg = typeof errorObj === "object" ? JSON.stringify(errorObj, null, 2) : String(errorObj);
    throw new Error(`Wallet submission failed: ${msg}`);
  }

  const val = resp?.value ?? resp;
  const transactionHash = val?.transactionIntentHash || val?.transactionHash || val?.intentHash;
  if (!transactionHash) {
    throw new Error("Wallet did not return a transaction hash");
  }

  return { transactionHash };
}

/**
 * Optional helpers you can reuse
 */

// Basic front-end validation (same spirit as your previous utilities)
export function validateAddresses({ accountAddress, packageAddress } = {}) {
  const problems = [];

  if (accountAddress) {
    const accountPattern = /^account_(tdx_2_|rdx|sim)[a-z0-9_]+$/;
    if (!accountPattern.test(accountAddress)) problems.push("Invalid account address format");
  }
  if (packageAddress) {
    const packagePattern = /^package_(tdx_2_|rdx|sim)[a-z0-9_]+$/;
    if (!packagePattern.test(packageAddress)) problems.push("Invalid package address format");
  }
  return problems;
}

export function estimatePackageDeploymentCost({ wasmSize = 0, rpdSize = 0 } = {}) {
  // Heuristic only — actual fee depends on size/complexity
  const baseCost = 100;
  const perKbCost = 0.1;
  const wasmCost = (wasmSize / 1024) * perKbCost;
  const rpdCost = (rpdSize / 1024) * perKbCost;
  const totalCost = baseCost + wasmCost + rpdCost;

  return {
    baseCost,
    wasmCost: Math.round(wasmCost * 100) / 100,
    rpdCost: Math.round(rpdCost * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    currency: "XRD",
  };
}

/**
 * Get package deployment instructions
 */
export const getPackageDeploymentInstructions = (networkId = "stokenet") => {
  const consoleUrl = networkId === "mainnet"
    ? "https://console.radixdlt.com/deploy-package"
    : "https://stokenet-console.radixdlt.com/deploy-package";

  return {
    steps: [
      "Build your Scrypto package using `scrypto build`",
      "Locate the generated files in `target/wasm32-unknown-unknown/release/`:",
      "  - rns-core-v2.wasm",
      "  - rns-core-v2.rpd",
      `Open the Radix Developer Console: ${consoleUrl}`,
      "Connect your Radix Wallet",
      "Upload both .wasm and .rpd files",
      "Set owner role to 'None' (recommended for RNS V2)",
      "Sign the deployment transaction in your wallet",
      "Copy the resulting package address for use in instantiation"
    ],
    consoleUrl,
    requiredFiles: ["rns-core-v2.wasm", "rns-core-v2.rpd"],
    network: networkId
  };
};

/**
 * Check if package address is valid and deployed
 */
export const validatePackageAddress = (packageAddress) => {
  // Support both old and new Radix address formats
  // Old format: package_tdx1abcd... or package_rdx1abcd...
  // New format: package_tdx_2_1abcd... or package_rdx_2_1abcd...
  const packagePattern = /^package_(tdx|rdx|sim)(_\d+_)?[a-z0-9]+$/;
  return packagePattern.test(packageAddress);
};
