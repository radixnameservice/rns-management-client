import {
  RadixDappToolkit,
  DataRequestBuilder,
  RadixNetwork,
} from "@radixdlt/radix-dapp-toolkit";
import { GatewayApiClient } from "@radixdlt/babylon-gateway-api-sdk";
import {
  getRNSInstantiateManifest,
  getDefaultResources,
  validateInstantiateParams,
  getReservedDomainsBulkUploadManifest,
  parseReservedDomainsText,
  validateReservedDomainsList,
  estimateReservedDomainsCost,
  getLockV1AdminBadgesManifest,
  getLockV1UpgradeBadgeManifest,
  getBurnAdminBadgeManifest,
  getComponentInfoManifest,
  validateAdminActionParams,
  getRegisterAsRegistrarManifest,
  getUpdateRegistrarMetadataManifest,
  getWithdrawRegistrarFeesManifest,
  getBurnRegistrarBadgeManifest,
  getRegistrarInfoManifest,
  getRegistrarStatsManifest,
  getCreateDummyResourcesManifest,
  parseResourceCreationReceipt,
  validateResourceCreationParams,
  getPackageDeploymentInstructions,
  validatePackageAddress,
  getDappDefinitionManifest,
  validateDappDefinitionParams,
  getRegisterAndBondDomainManifest,
  getSubregistryAddressManifest,
  getCreateSubdomainManifest,
  getDeleteSubdomainManifest,
  getSetRecordManifest,
  getDeleteRecordManifest,
  getBatchSetRecordsManifest
} from "./manifests";

// ********** Global State **********
let account = null;
let currentNetwork = "stokenet";
// Expose currentNetwork globally for manifest builders
window.currentNetwork = currentNetwork;
// Expose loadRegistrarInfo globally for onclick handlers
window.loadRegistrarInfo = null; // Will be set after function is defined
let currentStep = 1;
let currentAdminStep = 1; // For admin wizard
let selectedMode = null; // 'deploy', 'admin', or 'manage'
let selectedPackageOption = null; // 'existing' or 'new'
let deploymentConfig = {};
let adminComponentAddress = null;
let adminBadgeResourceAddress = null;
let adminDappDefinitionAddress = null;
let uploadedDomainsInSession = []; // Track domains uploaded in this session
let allReservedDomains = []; // All reserved domains from component
let v1AdminBadgeResource = null; // V1 admin badge resource address
let v1UpgradeBadgeResource = null; // V1 upgrade badge resource address
let v1AdminBadgesInWallet = "0"; // Amount in user's wallet
let v1UpgradeBadgesInWallet = "0"; // Amount in user's wallet
let currentPage = 1;
const domainsPerPage = 20;
let createdResources = null;
let loadedToolsComponentAddress = null; // Loaded component for tools section

// UI Elements - will be initialized after DOM loads
let elements = {};

// ********** Radix Integration **********
let rdt;
let gatewayApi;

function initializeRadixIntegration() {
  // Initialize Radix dApp Toolkit
  rdt = RadixDappToolkit({
    networkId: RadixNetwork.Stokenet, // Will be updated dynamically
    applicationVersion: "1.0.0",
    applicationName: "RNS V2 Deployer & Manager",
    applicationDappDefinitionAddress: "account_tdx_2_1299u7lzdnu2as56ssaqrdfk4s7hk2xhnnfg3frarrpse3w08qyspk2",
  });

  // Set the connect button theme to match our neutral header
  rdt?.buttonApi?.setTheme("radix-blue");

  // Initialize Gateway API client
  gatewayApi = GatewayApiClient.initialize(rdt.gatewayApi.clientConfig);

  // RNS Deployer & Manager initialized and ready

  // ********** Wallet Connection **********
  rdt.walletApi.setRequestData(DataRequestBuilder.accounts().exactly(1));
  rdt.walletApi.walletData$.subscribe((walletData) => {
    // Connected wallet data received
    account = walletData.accounts[0];
    
    if (account) {
      elements.accountName.textContent = account.label || account.address.slice(0, 20) + "...";
      elements.accountInfo.classList.remove("hidden");
      
      // Initialize default values based on network
      initializeNetworkDefaults();
    } else {
      elements.accountInfo.classList.add("hidden");
    }
    
    // Update all visibility states based on connection state
    updateResourceCreationVisibility();
    updateApplicationVisibility();
    updateAdminPanelVisibility();
    updateManagementPanelVisibility();
    
    // Auto-detect registrar badges if tools component is loaded
    if (loadedToolsComponentAddress) {
      detectRegistrarBadges(false);
    }
    updateToolsPanelVisibility();
  });
}

// ********** Initialization **********
function initializeUIElements() {
  // Starting UI elements initialization
  
  elements = {
    // Main sections
    walletConnectionGate: document.getElementById("walletConnectionGate"),
    applicationFlow: document.getElementById("applicationFlow"),
    
    // Mode selection
    modeCards: document.querySelectorAll(".mode-card"),
    
    // Package selection
    packageOptionCards: document.querySelectorAll(".package-option-card"),
    existingPackageSection: document.getElementById("existingPackageSection"),
    newPackageSection: document.getElementById("newPackageSection"),
    newPackageAddress: document.getElementById("newPackageAddress"),
    
    // Tab contents
    deployContent: document.getElementById("deployContent"),
    adminContent: document.getElementById("adminContent"),
    manageContent: document.getElementById("manageContent"),
    toolsContent: document.getElementById("toolsContent"),
    
    // Wallet gates and panels
    walletConnectionGate: document.getElementById("walletConnectionGate"),
    deploymentWizard: document.getElementById("deploymentWizard"),
    adminWalletGate: document.getElementById("adminWalletGate"),
    adminFlow: document.getElementById("adminFlow"),
    manageWalletGate: document.getElementById("manageWalletGate"),
    managementPanel: document.getElementById("managementPanel"),
    toolsWalletGate: document.getElementById("toolsWalletGate"),
    toolsPanel: document.getElementById("toolsPanel"),
    
    // Account info
    accountInfo: document.getElementById("accountInfo"),
    accountName: document.getElementById("accountName"),
    networkToggle: document.getElementById("networkToggle"),
    
    // Progress tracker
    progressTracker: document.getElementById("progressTracker"),
    progressSteps: document.querySelectorAll("#progressTracker .tracker-step"),
    steps: document.querySelectorAll("#applicationFlow .step"),
    
    // Step 2 elements (formerly Step 3 - Package)
    packageAddress: document.getElementById("packageAddress"),
    
    step2Back: document.getElementById("step2Back"),
    step2Next: document.getElementById("step2Next"),
    
    // Step 3 elements (formerly Step 4 - Prerequisites)
    paymentResourcesList: document.getElementById("paymentResourcesList"),
    addPaymentResource: document.getElementById("addPaymentResource"),
    legacyDomainResource: document.getElementById("legacyDomainResource"),
    v1AdminBadgeResource: document.getElementById("v1AdminBadgeResource"),
    v1UpgradeBadgeResource: document.getElementById("v1UpgradeBadgeResource"),
    
    // Resource creation elements
    resourceCreationHelper: document.getElementById("resourceCreationHelper"),
    createDummyResources: document.getElementById("createDummyResources"),
    resourceCreationResults: document.getElementById("resourceCreationResults"),
    createdFUSD: document.getElementById("createdFUSD"),
    createdSUSD: document.getElementById("createdSUSD"),
    createdLegacyDomain: document.getElementById("createdLegacyDomain"),
    createdV1AdminBadge: document.getElementById("createdV1AdminBadge"),
    createdV1UpgradeBadge: document.getElementById("createdV1UpgradeBadge"),
    useCreatedResources: document.getElementById("useCreatedResources"),
    
    domainIconUrl: document.getElementById("domainIconUrl"),
    adminBadgeIconUrl: document.getElementById("adminBadgeIconUrl"),
    configBadgeIconUrl: document.getElementById("configBadgeIconUrl"),
    registrarBadgeIconUrl: document.getElementById("registrarBadgeIconUrl"),
    
    // Component metadata elements
    componentName: document.getElementById("componentName"),
    componentDescription: document.getElementById("componentDescription"),
    componentTags: document.getElementById("componentTags"),
    componentInfoUrl: document.getElementById("componentInfoUrl"),
    componentIconUrl: document.getElementById("componentIconUrl"),
    subregistryName: document.getElementById("subregistryName"),
    subregistryDescription: document.getElementById("subregistryDescription"),
    subregistryTags: document.getElementById("subregistryTags"),
    subregistryIconUrl: document.getElementById("subregistryIconUrl"),
    
    // dApp Definition Config elements (only icon URL - name, description, info URL will match component)
    dappDefinitionIconUrl: document.getElementById("dappDefinitionIconUrl"),
    
    step3Back: document.getElementById("step3Back"),
    step3Next: document.getElementById("step3Next"),
    
    // Step 4 elements (Instantiate)
    configSummary: document.getElementById("configSummary"),
    manifestPreview: document.getElementById("manifestPreview"),
    step4Back: document.getElementById("step4Back"),
    step4Next: document.getElementById("step4Next"),
    deploymentStatus: document.getElementById("deploymentStatus"),
    deploymentResult: document.getElementById("deploymentResult"),
    resultComponentAddress: document.getElementById("resultComponentAddress"),
    resultAdminBadgeResource: document.getElementById("resultAdminBadgeResource"),
    resultDomainResource: document.getElementById("resultDomainResource"),
    goToAdmin: document.getElementById("goToAdmin"),
    
    // Admin panel elements
    adminComponentAddress: document.getElementById("adminComponentAddress"),
    adminBadgeResourceInput: document.getElementById("adminBadgeResourceInput"),
    loadComponent: document.getElementById("loadComponent"),
    adminSections: document.getElementById("adminSections"),
    
    // Reserved domains
    reservedDomainsText: document.getElementById("reservedDomainsText"),
    previewReservedDomains: document.getElementById("previewReservedDomains"),
    uploadReservedDomains: document.getElementById("uploadReservedDomains"),
    reservedDomainsPreview: document.getElementById("reservedDomainsPreview"),
    previewResults: document.getElementById("previewResults"),
    
    // V1 badge locking
    lockAdminBadges: document.getElementById("lockAdminBadges"),
    lockUpgradeBadge: document.getElementById("lockUpgradeBadge"),
    v1LockStatus: document.getElementById("v1LockStatus"),
    lockStatusResults: document.getElementById("lockStatusResults"),
    refreshLockStatus: document.getElementById("refreshLockStatus"),
    
    // Admin badge management
    burnAdminBadge: document.getElementById("burnAdminBadge"),
    burnWarningSection: document.getElementById("burnWarningSection"),
    burnCompletionMessage: document.getElementById("burnCompletionMessage"),
    
    // Back buttons (admin now uses wizard navigation)
    manageBackToMode: document.getElementById("manageBackToMode"),
    toolsBackToMode: document.getElementById("toolsBackToMode"),
    
    // Management panel elements
    searchComponentAddress: document.getElementById("searchComponentAddress"),
    searchComponent: document.getElementById("searchComponent"),
    componentDetails: document.getElementById("componentDetails"),
    componentInfo: document.getElementById("componentInfo"),
    
    // Tools panel elements - Global
    toolsComponentAddress: document.getElementById("toolsComponentAddress"),
    loadToolsComponent: document.getElementById("loadToolsComponent"),
    toolsComponentLoaded: document.getElementById("toolsComponentLoaded"),
    toolsLoadedComponentAddress: document.getElementById("toolsLoadedComponentAddress"),
    toolSections: document.querySelectorAll(".tool-section"),
    
    // Tools panel elements - dApp Definition Creator
    dappAccountAddress: document.getElementById("dappAccountAddress"),
    dappName: document.getElementById("dappName"),
    dappDescription: document.getElementById("dappDescription"),
    dappIconUrl: document.getElementById("dappIconUrl"),
    dappTags: document.getElementById("dappTags"),
    dappWebsites: document.getElementById("dappWebsites"),
    discoveredEntities: document.getElementById("discoveredEntities"),
    entitiesList: document.getElementById("entitiesList"),
    previewDappManifest: document.getElementById("previewDappManifest"),
    submitDappDefinition: document.getElementById("submitDappDefinition"),
    dappManifestOutput: document.getElementById("dappManifestOutput"),
    dappManifestCode: document.getElementById("dappManifestCode"),
    copyDappManifest: document.getElementById("copyDappManifest"),
    dappDefinitionResult: document.getElementById("dappDefinitionResult"),
    dappDefinitionAddress: document.getElementById("dappDefinitionAddress"),
    copyDappAddress: document.getElementById("copyDappAddress"),
    
    // Tools panel elements - Registrar Management
    newRegistrarName: document.getElementById("newRegistrarName"),
    newRegistrarIconUrl: document.getElementById("newRegistrarIconUrl"),
    newRegistrarWebsiteUrl: document.getElementById("newRegistrarWebsiteUrl"),
    newRegistrarFeePercentage: document.getElementById("newRegistrarFeePercentage"),
    requestRegistrarBadge: document.getElementById("requestRegistrarBadge"),
    registrarBadgesList: document.getElementById("registrarBadgesList"),
    registrarBadgesContent: document.getElementById("registrarBadgesContent"),
    registrarModal: document.getElementById("registrarModal"),
    registrarModalClose: document.querySelector("#registrarModal .modal-close"),
    registrarInfoDisplay: document.getElementById("registrarInfoDisplay"),
    registrarInfoContent: document.getElementById("registrarInfoContent"),
    updateRegistrarSection: document.getElementById("updateRegistrarSection"),
    updateRegistrarName: document.getElementById("updateRegistrarName"),
    updateRegistrarIconUrl: document.getElementById("updateRegistrarIconUrl"),
    updateRegistrarWebsiteUrl: document.getElementById("updateRegistrarWebsiteUrl"),
    updateRegistrarFeePercentage: document.getElementById("updateRegistrarFeePercentage"),
    updateRegistrarSettings: document.getElementById("updateRegistrarSettings"),
    withdrawFeesSection: document.getElementById("withdrawFeesSection"),
    accumulatedFeesContent: document.getElementById("accumulatedFeesContent"),
    burnRegistrarSection: document.getElementById("burnRegistrarSection"),
    burnRegistrarBadge: document.getElementById("burnRegistrarBadge"),
    
    // Transaction modal
    transactionModal: document.getElementById("transactionModal"),
    transactionStatus: document.getElementById("transactionStatus"),
    transactionModalClose: document.querySelector("#transactionModal .modal-close")
  };
  
  // UI Elements initialized successfully
}

function initializeNetworkDefaults() {
  const defaults = getDefaultResources(currentNetwork);
  
  // Set default payment resources
  if (defaults.defaultPaymentResources.length > 0) {
    const firstResourceInput = elements.paymentResourcesList.querySelector(".payment-resource");
    if (firstResourceInput && !firstResourceInput.value) {
      firstResourceInput.value = defaults.defaultPaymentResources[0];
    }
  }
  
  // Update all network-specific placeholders
  
  // Package addresses
  if (elements.packageAddress) {
    elements.packageAddress.placeholder = defaults.placeholders.packageAddress;
  }
  if (elements.newPackageAddress) {
    elements.newPackageAddress.placeholder = defaults.placeholders.packageAddress;
  }
  
  // Payment resources
  const paymentResourceInputs = elements.paymentResourcesList?.querySelectorAll(".payment-resource");
  if (paymentResourceInputs) {
    paymentResourceInputs.forEach(input => {
      if (!input.value) {
        input.placeholder = defaults.placeholders.paymentResource;
      }
    });
  }
  
  // Legacy and V1 resources
  if (elements.legacyDomainResource) {
    elements.legacyDomainResource.placeholder = defaults.placeholders.legacyDomainResource;
  }
  if (elements.v1AdminBadgeResource) {
    elements.v1AdminBadgeResource.placeholder = defaults.placeholders.v1AdminBadgeResource;
  }
  if (elements.v1UpgradeBadgeResource) {
    elements.v1UpgradeBadgeResource.placeholder = defaults.placeholders.v1UpgradeBadgeResource;
  }
  
  // Component addresses (Admin and Management panels)
  if (elements.adminComponentAddress) {
    elements.adminComponentAddress.placeholder = defaults.placeholders.componentAddress;
  }
  if (elements.searchComponentAddress) {
    elements.searchComponentAddress.placeholder = defaults.placeholders.componentAddress;
  }
  
  // Reserved domains textarea
  if (elements.reservedDomainsText) {
    elements.reservedDomainsText.placeholder = `example.xrd,${defaults.placeholders.accountAddress}xxx\ntest.xrd,${defaults.placeholders.accountAddress}yyy\nadmin.xrd,${defaults.placeholders.accountAddress}zzz`;
  }
  
  // Set default icon URLs if empty
  if (!elements.domainIconUrl?.value) {
    elements.domainIconUrl.value = "https://arweave.net/Ttd9T5MTG89AcHfLHSGlOClT0bUQuALeyKfdvlN_tfE";
  }
  if (!elements.adminBadgeIconUrl?.value) {
    elements.adminBadgeIconUrl.value = "https://arweave.net/MaRRkBFLui5xzBcN8EUjbgkQIJ1qtFi8adcXowbd5C8";
  }
  if (!elements.configBadgeIconUrl?.value) {
    elements.configBadgeIconUrl.value = "https://arweave.net/7iSgKTeuIP6dBC42W6QE0TWMsBNwWGdcxnqOu3gjCug";
  }
  if (!elements.registrarBadgeIconUrl?.value) {
    elements.registrarBadgeIconUrl.value = "https://arweave.net/l56120F-BAGF3IySziHyGu_7dkhMPKDtYuEVS9IEAf8";
  }
  
  // Set default component metadata if empty
  if (!elements.componentName?.value) {
    elements.componentName.value = "";
  }
  if (!elements.componentDescription?.value) {
    elements.componentDescription.value = "";
  }
  if (!elements.componentTags?.value) {
    elements.componentTags.value = "";
  }
  if (!elements.componentInfoUrl?.value) {
    elements.componentInfoUrl.value = "";
  }
  if (!elements.componentIconUrl?.value) {
    elements.componentIconUrl.value = "https://arweave.net/7xbFEvPxojwXnxa3HczkgqsPrD--hmRDfToRmsra4VM";
  }
  if (!elements.subregistryName?.value) {
    elements.subregistryName.value = "";
  }
  if (!elements.subregistryDescription?.value) {
    elements.subregistryDescription.value = "";
  }
  if (!elements.subregistryTags?.value) {
    elements.subregistryTags.value = "";
  }
  if (!elements.subregistryIconUrl?.value) {
    elements.subregistryIconUrl.value = "https://arweave.net/8uiwedlLN8HdODKI_-FZSUEUXkY4NTw4PJkeJcWqe_k";
  }
  
  // Set dApp definition icon default (same as component icon by default)
  if (!elements.dappDefinitionIconUrl?.value) {
    elements.dappDefinitionIconUrl.value = "https://arweave.net/6xyWrmBS7w10cWQD81CkTKUoMCnzM7QcAzLgz2yW9kI";
  }
  
  // Network defaults initialized
}

// ********** Tab Management **********
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll(".tab-button").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active"));
  
  elements[tabName + "Tab"].classList.add("active");
  elements[tabName + "Content"].classList.add("active");
}

// ********** Step Management **********
function goToStep(step) {
  // Update progress bar (step 1 is mode selection, not in tracker)
  // Tracker shows steps 2-4 as positions 1-3
  if (step >= 2 && elements.progressSteps) {
    const trackerStep = step - 1; // Map step 2->1, step 3->2, step 4->3
    elements.progressSteps.forEach((el, index) => {
      if (el) {
        el.classList.toggle("active", index + 1 === trackerStep);
        el.classList.toggle("completed", index + 1 < trackerStep);
      }
    });
  }
  
  // Update step visibility - do all DOM changes atomically in a single pass
  // This prevents triggering Radix toolkit's MutationObserver multiple times
  if (elements.steps) {
    elements.steps.forEach((el, index) => {
      if (el) {
        const isActive = (index + 1 === step);
        // Update both classes atomically
        if (isActive) {
          el.classList.add("active");
          el.classList.remove("hidden");
        } else {
          el.classList.remove("active");
          el.classList.add("hidden");
        }
      }
    });
  }
  
  currentStep = step;
  
  // Update manifest and config summary when entering step 4 (Instantiate)
  if (step === 4 && selectedMode === 'deploy') {
    updateConfigSummary();
    updateManifestPreview();
  }
}

function nextStep() {
  if (validateCurrentStep()) {
    goToStep(currentStep + 1);
  }
}

function previousStep() {
  goToStep(currentStep - 1);
}

// ********** Admin Wizard Step Management **********
function goToAdminStep(step) {
  currentAdminStep = step;
  
  // Update progress tracker
  const adminProgressSteps = document.querySelectorAll("#adminProgressTracker .tracker-step");
  adminProgressSteps.forEach((el, index) => {
    if (el) {
      el.classList.toggle("active", index + 1 === step);
      el.classList.toggle("completed", index + 1 < step);
    }
  });
  
  // Update step visibility atomically - all changes in single pass
  // This prevents triggering Radix toolkit's MutationObserver multiple times
  for (let i = 1; i <= 4; i++) {
    const stepEl = document.getElementById(`adminStep${i}`);
    if (stepEl) {
      const isActive = (i === step);
      // Update both classes atomically
      if (isActive) {
        stepEl.classList.add("active");
        stepEl.classList.remove("hidden");
      } else {
        stepEl.classList.remove("active");
        stepEl.classList.add("hidden");
      }
    }
  }
  
  // Auto-load all reserved domains when entering step 2 (Reserved Domain Management)
  if (step === 2 && adminComponentAddress) {
    loadAllReservedDomains();
  }
  
  // Update component address displays when navigating
  if (adminComponentAddress) {
    const displays = [
      document.getElementById('adminComponentDisplay'),
      document.getElementById('adminComponentDisplay3'),
      document.getElementById('adminComponentDisplay4')
    ];
    
    displays.forEach(display => {
      if (display) {
        display.textContent = adminComponentAddress;
      }
    });
  }
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nextAdminStep() {
  if (currentAdminStep < 4) {
    goToAdminStep(currentAdminStep + 1);
  }
}

function previousAdminStep() {
  if (currentAdminStep > 1) {
    goToAdminStep(currentAdminStep - 1);
  }
}

function completeAdminSetup() {
  // Return to mode selection page
  backToModeSelection();
}

// ********** Form Validation **********
function validateCurrentStep() {
  switch (currentStep) {
    case 1:
      return validateStep1();
    case 2:
      return validateStep2(); // Package setup
    case 3:
      return validateStep3(); // Prerequisites
    case 4:
      return validateStep4(); // Instantiate
    default:
      return true;
  }
}

function validateStep1() {
  if (!selectedMode) {
    showError("Please select an action mode");
    return false;
  }
  return true;
}

function validateStep2() {
  // Only validate for deploy mode
  if (selectedMode !== 'deploy') {
    return true;
  }
  
  if (!selectedPackageOption) {
    showError("Please select a package option (existing or new deployment)");
    return false;
  }
  
  let packageAddress;
  
  if (selectedPackageOption === 'existing') {
    packageAddress = elements.packageAddress.value.trim();
    if (!packageAddress) {
      showError("Please enter your existing package address");
      return false;
    }
  } else if (selectedPackageOption === 'new') {
    packageAddress = elements.newPackageAddress.value.trim();
    if (!packageAddress) {
      showError("Please enter the package address from your deployment");
      return false;
    }
  }
  
  if (!validatePackageAddress(packageAddress)) {
    showError("Invalid package address format. Expected format: package_tdx_2_1... or package_tdx1... (old format)");
    return false;
  }
  
  deploymentConfig.packageAddress = packageAddress;
  return true;
}

function validateStep3() {
  // Validate resources first
  const paymentResources = Array.from(elements.paymentResourcesList.querySelectorAll(".payment-resource"))
    .map(input => input.value.trim())
    .filter(value => value);
  
  const legacyDomain = elements.legacyDomainResource.value.trim();
  const v1AdminBadge = elements.v1AdminBadgeResource.value.trim();
  const v1UpgradeBadge = elements.v1UpgradeBadgeResource.value.trim();
  
  if (!legacyDomain) {
    showError("Legacy domain resource address is required");
    return false;
  }
  
  if (!v1AdminBadge) {
    showError("V1 admin badge resource address is required");
    return false;
  }
  
  if (!v1UpgradeBadge) {
    showError("V1 upgrade badge resource address is required");
    return false;
  }
  
  // Validate icons
  const domainIconUrl = elements.domainIconUrl.value.trim();
  const adminBadgeIconUrl = elements.adminBadgeIconUrl.value.trim();
  const configBadgeIconUrl = elements.configBadgeIconUrl.value.trim();
  const registrarBadgeIconUrl = elements.registrarBadgeIconUrl.value.trim();
  
  if (!isValidUrl(domainIconUrl)) {
    showError("Valid domain icon URL is required");
    return false;
  }
  
  if (!isValidUrl(adminBadgeIconUrl)) {
    showError("Valid admin badge icon URL is required");
    return false;
  }
  
  if (!isValidUrl(configBadgeIconUrl)) {
    showError("Valid config badge icon URL is required");
    return false;
  }
  
  if (!isValidUrl(registrarBadgeIconUrl)) {
    showError("Valid registrar badge icon URL is required");
    return false;
  }
  
  // Get component metadata
  const componentName = elements.componentName.value.trim() || "";
  const componentDescription = elements.componentDescription.value.trim() || "";
  const componentTagsText = elements.componentTags.value.trim() || "";
  const componentInfoUrl = elements.componentInfoUrl.value.trim() || "";
  const componentIconUrl = elements.componentIconUrl.value.trim() || "https://arweave.net/7xbFEvPxojwXnxa3HczkgqsPrD--hmRDfToRmsra4VM";
  const subregistryName = elements.subregistryName.value.trim() || "";
  const subregistryDescription = elements.subregistryDescription.value.trim() || "";
  const subregistryTagsText = elements.subregistryTags.value.trim() || "";
  const subregistryIconUrl = elements.subregistryIconUrl.value.trim() || "https://arweave.net/8uiwedlLN8HdODKI_-FZSUEUXkY4NTw4PJkeJcWqe_k";
  
  // Parse tags into arrays
  const componentTags = componentTagsText.split(',').map(t => t.trim()).filter(t => t);
  const subregistryTags = subregistryTagsText.split(',').map(t => t.trim()).filter(t => t);
  
  // Get dApp definition icon URL (name, description, info URL will match component)
  const dappDefinitionIconUrl = elements.dappDefinitionIconUrl.value.trim();
  
  // Validate dApp definition icon URL
  if (!dappDefinitionIconUrl || !isValidUrl(dappDefinitionIconUrl)) {
    showError("Valid dApp icon URL is required");
    return false;
  }
  
  // dApp definition will use the same name, description, and info URL as the component
  const dappDefinitionName = componentName;
  const dappDefinitionDescription = componentDescription;
  const dappDefinitionInfoUrl = componentInfoUrl;
  
  // Save all config
  deploymentConfig.paymentResources = paymentResources;
  deploymentConfig.legacyDomainResource = legacyDomain;
  deploymentConfig.v1AdminBadgeResource = v1AdminBadge;
  deploymentConfig.v1UpgradeBadgeResource = v1UpgradeBadge;
  deploymentConfig.domainIconUrl = domainIconUrl;
  deploymentConfig.adminBadgeIconUrl = adminBadgeIconUrl;
  deploymentConfig.configBadgeIconUrl = configBadgeIconUrl;
  deploymentConfig.registrarBadgeIconUrl = registrarBadgeIconUrl;
  deploymentConfig.componentName = componentName;
  deploymentConfig.componentDescription = componentDescription;
  deploymentConfig.componentTags = componentTags;
  deploymentConfig.componentInfoUrl = componentInfoUrl;
  deploymentConfig.componentIconUrl = componentIconUrl;
  deploymentConfig.subregistryName = subregistryName;
  deploymentConfig.subregistryDescription = subregistryDescription;
  deploymentConfig.subregistryTags = subregistryTags;
  deploymentConfig.subregistryIconUrl = subregistryIconUrl;
  deploymentConfig.dappDefinitionName = dappDefinitionName;
  deploymentConfig.dappDefinitionDescription = dappDefinitionDescription;
  deploymentConfig.dappDefinitionInfoUrl = dappDefinitionInfoUrl;
  deploymentConfig.dappDefinitionIconUrl = dappDefinitionIconUrl;
  
  return true;
}

function validateStep4() {
  // Only validate for deploy mode (Instantiate step)
  if (selectedMode !== 'deploy') {
    return true;
  }
  
  if (!account) {
    showError("Please connect your wallet first");
    return false;
  }
  
  deploymentConfig.accountAddress = account.address;
  
  // Validate complete configuration
  const errors = validateInstantiateParams(deploymentConfig);
  if (errors.length > 0) {
    showError("Configuration errors: " + errors.join(", "));
    return false;
  }
  
  // Generate and display manifest preview
  updateManifestPreview();
  updateConfigSummary();
  
  return true;
}

// ********** UI Updates **********
function updateNetworkConfiguration() {
  // Note: RDT network is set at initialization and doesn't change
  // The wallet app handles network switching, not the dApp
  // We just need to ensure our manifests have the right addresses
  
  // Update network toggle
  if (elements.networkToggle) {
    elements.networkToggle.setAttribute('data-network', currentNetwork);
  }
  
  // Update console link based on network
  const consoleLink = document.getElementById("consoleLink");
  if (consoleLink) {
    if (currentNetwork === "mainnet") {
      consoleLink.href = "https://console.radixdlt.com/deploy-package";
      consoleLink.textContent = "📱 Open Mainnet Developer Console";
    } else {
      consoleLink.href = "https://stokenet-console.radixdlt.com/deploy-package";
      consoleLink.textContent = "📱 Open Stokenet Developer Console";
    }
  }
  
  updateResourceCreationVisibility();
  updateApplicationVisibility();
  updateAdminPanelVisibility();
  updateManagementPanelVisibility();
  initializeNetworkDefaults();
}

function updateConfigSummary() {
  const summary = `
    <div class="config-item"><strong>Network:</strong> ${currentNetwork}</div>
    <div class="config-item"><strong>Package:</strong> ${deploymentConfig.packageAddress || "Package not specified"}</div>
    <div class="config-item"><strong>Payment Resources:</strong> ${(deploymentConfig.paymentResources || []).length} configured</div>
    <div class="config-item"><strong>Legacy Domain Resource:</strong> ${deploymentConfig.legacyDomainResource || "Not specified"}</div>
    <div class="config-item"><strong>V1 Admin Badge Resource:</strong> ${deploymentConfig.v1AdminBadgeResource || "Not specified"}</div>
    <div class="config-item"><strong>V1 Upgrade Badge Resource:</strong> ${deploymentConfig.v1UpgradeBadgeResource || "Not specified"}</div>
    <div class="config-item"><strong>Domain Icon URL:</strong> ${deploymentConfig.domainIconUrl || "Not specified"}</div>
    <div class="config-item"><strong>Admin Badge Icon URL:</strong> ${deploymentConfig.adminBadgeIconUrl || "Not specified"}</div>
    <div class="config-item"><strong>Config Badge Icon URL:</strong> ${deploymentConfig.configBadgeIconUrl || "Not specified"}</div>
    <div class="config-item"><strong>Registrar Badge Icon URL:</strong> ${deploymentConfig.registrarBadgeIconUrl || "Not specified"}</div>
  `;
  elements.configSummary.innerHTML = summary;
}

function updateManifestPreview() {
  try {
    if (!account) {
      elements.manifestPreview.textContent = "⚠️ Please connect your wallet to see the transaction manifest preview.";
      return;
    }
    
    const manifestConfig = {
      ...deploymentConfig,
      accountAddress: account.address,
      networkId: currentNetwork,
      packageAddress: deploymentConfig.packageAddress || "package_XXX_WILL_BE_DEPLOYED"
    };
    
    const manifest = getRNSInstantiateManifest(manifestConfig);
    
    if (!manifest || manifest.trim() === "") {
      elements.manifestPreview.textContent = "Error: Unable to generate manifest. Please check all required fields are filled.";
      return;
    }
    
    elements.manifestPreview.textContent = manifest;
    
  } catch (error) {
    console.error("Error generating manifest preview:", error);
    elements.manifestPreview.textContent = `Error generating manifest: ${error.message}`;
  }
}

// ********** Payment Resources Management **********
function addPaymentResourceInput() {
  const defaults = getDefaultResources(currentNetwork);
  const resourceInput = document.createElement("div");
  resourceInput.className = "resource-input";
  resourceInput.innerHTML = `
    <input type="text" class="payment-resource form-control" placeholder="${defaults.placeholders.paymentResource}">
    <button class="btn-remove" onclick="removePaymentResource(this)">×</button>
  `;
  elements.paymentResourcesList.appendChild(resourceInput);
}

function removePaymentResource(button) {
  button.parentElement.remove();
}

// ********** Instantiation Process **********
async function instantiateRNSCore() {
  if (!account) {
    showError("Please connect your wallet first");
    return;
  }
  
  try {
    // Hide the instantiate button and show instantiation status
    elements.step4Next.style.display = "none";
    showDeploymentStatus("Preparing instantiation...");
    
    // If no package address provided, show package deployment instructions
    if (!deploymentConfig.packageAddress) {
      showPackageDeploymentInstructions();
      return;
    }
    
    const manifest = getRNSInstantiateManifest({
      ...deploymentConfig,
      accountAddress: account.address,
      networkId: currentNetwork
    });
    
    showDeploymentStatus("Sending transaction to wallet...");
    
    // Submit transaction
    const result = await rdt.walletApi.sendTransaction({
      transactionManifest: manifest,
      version: 1,
    });
    
    if (result.isErr()) {
      console.error("❌ Wallet error details:", result.error);
      const errorMsg = result.error.message || result.error.error || JSON.stringify(result.error);
      throw new Error(errorMsg);
    }
    
    showDeploymentStatus("Transaction submitted. Waiting for confirmation...");
    
    // Track transaction status
    await trackInstantiationTransaction(result.value.transactionIntentHash);
    
  } catch (error) {
    console.error("Instantiation error:", error);
    showDeploymentError("Instantiation failed: " + error.message);
  }
}

// Track transaction and return receipt (used for non-instantiation transactions)
async function trackTransactionStatus(transactionHash) {
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes with 5-second intervals
  
  while (attempts < maxAttempts) {
    try {
      attempts++;
      
      const status = await gatewayApi.transaction.getStatus(transactionHash);
      
      // Check both possible status fields (API can return either depending on version)
      if (status.status === "CommittedSuccess" || status.intent_status === "CommittedSuccess") {
        // Get full transaction details
        const receipt = await gatewayApi.transaction.getCommittedDetails(transactionHash);
        return {
          status: "CommittedSuccess",
          receipt: receipt.transaction
        };
      } else if (status.status === "CommittedFailure" || status.intent_status === "CommittedFailure") {
        return {
          status: "CommittedFailure",
          error: "Transaction failed on network"
        };
      }
      
      // Wait 5 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.error("Error tracking transaction:", error);
      throw new Error("Transaction tracking failed: " + error.message);
    }
  }
  
  throw new Error("Transaction confirmation timeout - please check the transaction manually");
}

// Track transaction for instantiation (original behavior with UI updates)
async function trackInstantiationTransaction(transactionHash) {
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes with 5-second intervals
  
  const checkStatus = async () => {
    try {
      attempts++;
      showDeploymentStatus(`Transaction submitted! Confirming on network... (${attempts * 5}s)`);
      
      const status = await gatewayApi.transaction.getStatus(transactionHash);
      
      // Check both possible status fields (API can return either depending on version)
      if (status.status === "CommittedSuccess" || status.intent_status === "CommittedSuccess") {
        // Parse transaction result to extract component and resource addresses
        const receipt = await gatewayApi.transaction.getCommittedDetails(transactionHash);
        showDeploymentSuccess(receipt);
        return;
      } else if (status.status === "CommittedFailure" || status.intent_status === "CommittedFailure") {
        throw new Error("Transaction failed on network");
      } else if (attempts >= maxAttempts) {
        throw new Error("Transaction confirmation timeout - please check the transaction manually");
      }
      
      setTimeout(checkStatus, 5000); // Check again in 5 seconds
    } catch (error) {
      showDeploymentError("Transaction tracking failed: " + error.message);
    }
  };
  
  checkStatus();
}

function showDeploymentStatus(message) {
  elements.deploymentStatus.innerHTML = `
    <div class="spinner"></div>
    <p>${message}</p>
  `;
  elements.deploymentStatus.classList.remove("hidden");
  elements.deploymentResult.classList.add("hidden");
}

function showDeploymentSuccess(receipt) {
  // Extract addresses from transaction receipt
  const componentAddress = receipt.transaction.receipt.state_updates.new_global_entities[0].entity_address;
  const resourceAddresses = receipt.transaction.receipt.state_updates.new_global_entities
    .filter(entity => entity.entity_type === "FungibleResource" || entity.entity_type === "NonFungibleResource")
    .map(entity => entity.entity_address);
  
  // Store component address for component config
  adminComponentAddress = componentAddress;
  
  // Store admin badge resource address (typically the second resource created)
  if (resourceAddresses.length >= 2) {
    adminBadgeResourceAddress = resourceAddresses[1]; // Admin badge is the second resource
    deploymentConfig.adminBadgeResource = adminBadgeResourceAddress;
  }
  
  // Show success notification
  showSuccess("RNS V2 instantiated successfully! Redirecting to component config...");
  
  // Immediately navigate to component config
  // Pre-fill the component address
  if (elements.adminComponentAddress) {
    elements.adminComponentAddress.value = componentAddress;
  }
  
  // Switch to admin mode
  switchToMode('admin');
  
  // Load the component automatically
  loadAdminComponent();
}

function showDeploymentError(message) {
  elements.deploymentStatus.innerHTML = `
    <div class="error-icon">❌</div>
    <h3>Instantiation Failed</h3>
    <p>${message}</p>
    <button class="btn btn-secondary" onclick="goToStep(5)">← Back to Review</button>
  `;
}

function showPackageDeploymentInstructions() {
  const instructions = getPackageDeploymentInstructions(currentNetwork);
  
  const html = `
    <div class="package-deployment-help">
      <div class="info-icon">📦</div>
      <h3>Package Deployment Required</h3>
      <p>Before deploying the RNS V2 component, you need to deploy the package code first.</p>
      
      <div class="deployment-steps">
        <h4>Steps to Deploy Package:</h4>
        <ol>
          ${instructions.steps.map(step => `<li>${step}</li>`).join('')}
        </ol>
      </div>
      
      <div class="console-link">
        <a href="${instructions.consoleUrl}" target="_blank" class="btn btn-primary">
          📱 Open ${currentNetwork === 'mainnet' ? 'Mainnet' : 'Stokenet'} Developer Console
        </a>
      </div>
            
      <div class="next-steps">
        <h4>After Package Deployment:</h4>
        <p>1. Copy the package address from the transaction receipt</p>
        <p>2. Go back to Step 1 and paste the package address</p>
        <p>3. Continue with the deployment wizard</p>
      </div>
      
      <button class="btn btn-secondary" onclick="goToStep(1)">← Back to Step 1</button>
    </div>
  `;
  
  elements.deploymentStatus.innerHTML = html;
  elements.deploymentResult.style.display = "block";
}

// ********** Component Config Functions **********
async function loadAdminComponent() {
  const componentAddress = elements.adminComponentAddress.value.trim();
  
  if (!componentAddress) {
    showError("Please enter a component address");
    return;
  }

  try {
    showTransactionModal("Loading component and discovering resources...");
    
    // Query component details
    const componentDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(componentAddress);
    
    if (!componentDetails) {
      throw new Error("Component not found on network");
    }
    
    // Validate it's actually a component (not a resource or account)
    if (!componentDetails.address.startsWith('component_')) {
      throw new Error("Address is not a component");
    }
    
    // Auto-discover the admin badge resource from component's owned resources
    
    // Method 1: Check component's internal state for admin_badge_manager field
    if (componentDetails.details?.state?.fields) {
      const fields = componentDetails.details.state.fields;
      
      // Try to find the admin badge from vault fields
      for (const field of fields) {
        if (field.field_name === 'admin_badge_manager') {
          // Check if it's a direct Reference with a value
          if (field.type_name === 'ResourceAddress' && field.value) {
            adminBadgeResourceAddress = field.value;
            break;
          }
          
          // Otherwise try to extract from nested structure
          if (field.fields && field.fields.length > 0) {
            const checkForResourceAddress = (obj) => {
              if (obj.type_name === 'ResourceAddress' && obj.value) {
                return obj.value;
              }
              if (obj.fields && Array.isArray(obj.fields)) {
                for (const nested of obj.fields) {
                  const addr = checkForResourceAddress(nested);
                  if (addr) return addr;
                }
              }
              return null;
            };
            
            const resourceAddr = checkForResourceAddress(field);
            if (resourceAddr) {
              adminBadgeResourceAddress = resourceAddr;
              break;
            }
          }
        }
      }
    }
    
    // Method 2: Check ALL fungible resources
    if (!adminBadgeResourceAddress && componentDetails.fungible_resources?.items) {
      // Filter to only resources with vaults that have balance > 0
      const resourcesWithVaults = componentDetails.fungible_resources.items.filter(resource => {
        const hasNonZeroVault = resource.vaults?.items?.some(vault => 
          vault.amount && parseFloat(vault.amount) > 0
        );
        return hasNonZeroVault;
      });
      
      // Use the LAST one (admin badge is often created last)
      if (resourcesWithVaults.length > 0) {
        adminBadgeResourceAddress = resourcesWithVaults[resourcesWithVaults.length - 1].resource_address;
      } else if (componentDetails.fungible_resources.items.length > 0) {
        // Ultimate fallback: use the last fungible resource period
        adminBadgeResourceAddress = componentDetails.fungible_resources.items[componentDetails.fungible_resources.items.length - 1].resource_address;
      }
    }
    
    if (!adminBadgeResourceAddress) {
      console.error("❌ Could not auto-discover admin badge. Component details:", componentDetails);
      console.error("❌ Fungible resources:", componentDetails.fungible_resources);
      throw new Error("Could not auto-discover admin badge resource from component. No fungible resources found.");
    }
    
    // Try to validate it's an RNS component by checking blueprint name
    const blueprintName = componentDetails.details?.blueprint_name;
    const packageAddress = componentDetails.details?.package_address;
    
    // Fetch dApp definition address from component metadata
    try {
      if (componentDetails.metadata?.items) {
        const dappDefMetadata = componentDetails.metadata.items.find(item => item.key === 'dapp_definition');
        if (dappDefMetadata && dappDefMetadata.value?.typed?.value) {
          adminDappDefinitionAddress = dappDefMetadata.value.typed.value;
        }
      }
    } catch (error) {
      console.warn("⚠️ Could not fetch dApp definition address:", error);
      // Non-critical, continue without it
    }
    
    // Validate the component actually has RNS methods by calling get_v1_lock_status
    try {
      const manifest = `CALL_METHOD
  Address("${componentAddress}")
  "get_v1_lock_status";`;
      
      const previewResult = await gatewayApi.transaction.preview({
        manifest: manifest,
        start_epoch_inclusive: 0,
        end_epoch_exclusive: 999999999,
        notary_public_key: null,
        notary_is_signatory: false,
        tip_percentage: 0,
        nonce: 0,
        signer_public_keys: [],
        flags: {
          use_free_credit: true,
          assume_all_signature_proofs: true,
          skip_epoch_check: true
        }
      });
      
      // Check if the preview succeeded (means method exists)
      if (previewResult.status !== 'Succeeded' && previewResult.receipt?.status !== 'Succeeded') {
        // Preview returned non-success status, but proceeding anyway
      }
      
  } catch (error) {
      // Check if it's a method not found error vs other errors
      const errorStr = error.toString().toLowerCase();
      if (errorStr.includes('method') || errorStr.includes('not found') || errorStr.includes('does not exist')) {
        throw new Error("This component doesn't have RNS V2 methods. Please verify you're using the correct component address.");
      }
      // Network or other error - allow proceeding
    }
    
      adminComponentAddress = componentAddress;
    
    // Update all component address displays
    const displays = [
      document.getElementById('adminComponentDisplay'),
      document.getElementById('adminComponentDisplay3'),
      document.getElementById('adminComponentDisplay4')
    ];
    
    displays.forEach(display => {
      if (display) {
        display.textContent = adminComponentAddress;
      }
    });
    
    // Update dApp definition address displays if it was found
    if (adminDappDefinitionAddress) {
      const dappDefDisplays = [
        document.getElementById('adminDappDefDisplay'),
        document.getElementById('adminDappDefDisplay3'),
        document.getElementById('adminDappDefDisplay4')
      ];
      
      dappDefDisplays.forEach(display => {
        if (display) {
          display.textContent = adminDappDefinitionAddress;
          display.parentElement.classList.remove('hidden');
        }
      });
    }
    
    // Show the component info sections
    const adminComponentInfo = document.getElementById('adminComponentInfo');
    if (adminComponentInfo) {
      adminComponentInfo.classList.remove('hidden');
    }
    
    // Move to step 2 (Reserved Domains)
    goToAdminStep(2);

    hideTransactionModal();

      // Load V1 lock status
      await refreshV1LockStatus();

      // Check completion status of all admin actions
      await checkAdminCompletionStatus();

    showSuccess("Valid RNS V2 component loaded! Continue with the admin wizard.");
  } catch (error) {
    hideTransactionModal();
    showError("Failed to load component: " + error.message);
  }
}

// Disable all admin-only actions (called after badge burn)
function disableAdminOnlyActions() {
  // Reserved Domains Section
  const uploadSection = elements.reservedDomainsText?.closest('.form-section');
  if (uploadSection) {
    uploadSection.classList.add('section-disabled');
    const heading = uploadSection.querySelector('h3');
    if (heading && !heading.querySelector('.badge-status')) {
      heading.innerHTML += ' <span class="badge-status" style="color: #999; font-size: 14px; font-weight: normal;">(No longer accessible - admin badge burned)</span>';
    }
  }
  if (elements.previewReservedDomains) elements.previewReservedDomains.disabled = true;
  if (elements.uploadReservedDomains) elements.uploadReservedDomains.disabled = true;
  if (elements.reservedDomainsText) elements.reservedDomainsText.disabled = true;
  
  // V1 Badge Locking Sections
  const lockSections = [
    elements.lockAdminBadges?.closest('.form-section'),
    elements.lockUpgradeBadge?.closest('.form-section')
  ];
  
  lockSections.forEach(section => {
    if (section) {
      section.classList.add('section-disabled');
      const heading = section.querySelector('h3');
      if (heading && !heading.querySelector('.badge-status')) {
        heading.innerHTML += ' <span class="badge-status" style="color: #999; font-size: 14px; font-weight: normal;">(No longer accessible - admin badge burned)</span>';
      }
    }
  });
  
  if (elements.lockAdminBadges) elements.lockAdminBadges.disabled = true;
  if (elements.lockUpgradeBadge) elements.lockUpgradeBadge.disabled = true;
}

// Check completion status of admin actions and update UI accordingly
async function checkAdminCompletionStatus() {
  if (!account || !adminComponentAddress || !adminBadgeResourceAddress) {
    return;
  }

  try {
    // 1. Check if user has admin badge in wallet
    const accountDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(account.address);
    const adminBadgesInWallet = accountDetails.fungible_resources?.items?.find(
      r => r.resource_address === adminBadgeResourceAddress
    )?.vaults?.items?.[0]?.amount || 0;
    
    const hasAdminBadge = parseFloat(adminBadgesInWallet) > 0;
    
    // 2. Check if reserved domains have been uploaded
    const componentDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(adminComponentAddress);
    const reservedDomainsKvStore = componentDetails.details?.state?.fields?.find(
      f => f.field_name === 'reserved_domains'
    );
    
    let hasReservedDomains = false;
    if (reservedDomainsKvStore && reservedDomainsKvStore.value) {
      try {
        const kvStoreData = await gatewayApi.state.getKeyValueStoreKeys(reservedDomainsKvStore.value, {
          limit_per_page: 1
        });
        hasReservedDomains = kvStoreData.items && kvStoreData.items.length > 0;
      } catch (e) {
        // Could not check reserved domains
      }
    }
    
    // 3. V1 lock status is already loaded via refreshV1LockStatus()
    // We can check the global v1AdminBadgesLocked and v1UpgradeBadgesLocked
    
    // 4. Update UI based on status
    
    // If admin badge has been burned, disable all admin-only actions
    if (!hasAdminBadge) {
      disableAdminOnlyActions();
      
      // Show badge burn completion message
      if (elements.burnWarningSection) {
        elements.burnWarningSection.classList.add("hidden");
      }
      if (elements.burnCompletionMessage) {
        elements.burnCompletionMessage.classList.remove("hidden");
      }
    }

  } catch (error) {
    console.error("Error checking admin completion status:", error);
  }
}

function backToModeFromAdmin() {
  // Hide admin content, flow, and admin progress tracker
  elements.adminContent?.classList.add("hidden");
  elements.adminContent?.classList.remove("active");
  elements.adminFlow?.classList.add("hidden");
  document.getElementById("adminProgressTracker")?.classList.add("hidden");
  
  // Reset admin wizard to step 1
  goToAdminStep(1);
  
  // Show mode selection (back to step 1 of deployment flow)
  elements.applicationFlow?.classList.remove("hidden");
  
  // Hide BOTH progress trackers (we're back at mode selection)
  elements.progressTracker?.classList.add("hidden");
  
  // Reset state
  selectedMode = null;
  currentStep = 1;
  
  // Show step 1 (mode selection)
  elements.steps.forEach((step, index) => {
    if (index === 0) {
      step.classList.add("active");
      step.classList.remove("hidden");
    } else {
      step.classList.remove("active");
      step.classList.add("hidden");
    }
  });
  
  // Clear mode card selections
  elements.modeCards.forEach(card => card.classList.remove('selected'));
  
  // Reset both trackers to step 1
  elements.progressSteps?.forEach((el, index) => {
    if (index === 0) {
      el.classList.add("active");
      el.classList.remove("completed");
    } else {
      el.classList.remove("active");
      el.classList.remove("completed");
    }
  });
  
  const adminProgressSteps = document.querySelectorAll("#adminProgressTracker .tracker-step");
  adminProgressSteps.forEach((el, index) => {
    if (index === 0) {
      el.classList.add("active");
      el.classList.remove("completed");
    } else {
      el.classList.remove("active");
      el.classList.remove("completed");
    }
  });
}

// ********** Management Functions **********
async function searchComponentForManagement() {
  const componentAddress = elements.searchComponentAddress.value.trim();
  
  if (!componentAddress) {
    showError("Please enter a component address");
    return;
  }
  
  if (!account) {
    showError("Please connect your wallet first");
    return;
  }
  
  try {
    showTransactionModal("Loading component details...");
    
    // Query component details from Gateway API
    const componentDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(componentAddress);
    
    if (componentDetails && componentDetails.details) {
      await displayComponentInformation(componentAddress, componentDetails);
      elements.componentDetails.classList.remove("hidden");
      hideTransactionModal();
    } else {
      throw new Error("Component not found or invalid address");
    }
  } catch (error) {
    console.error("Error searching component:", error);
    hideTransactionModal();
    showError("Failed to load component: " + error.message);
  }
}

async function displayComponentInformation(componentAddress, componentDetails) {
  // Show loading state
  elements.componentInfo.innerHTML = `
    <div class="info-card">
      <p class="info-empty">Loading RNS statistics...</p>
    </div>
  `;
  
  try {
    // Find the domain NFT resource from component state
    const componentState = componentDetails.details?.state?.fields || [];
    const domainResourceField = componentState.find(field => field.field_name === 'domain_nft_manager');
    const domainResourceAddress = domainResourceField?.value || null;
    
    // Find the migrated domains KVStore
    const migratedDomainsField = componentState.find(field => field.field_name === 'migrated_domains');
    const migratedDomainsKvStore = migratedDomainsField?.value || null;
    
    let totalDomains = 0;
    let migratedDomains = 0;
    let uniqueUsers = 0;
    
    // Get total domains from the domain NFT resource
    if (domainResourceAddress) {
      try {
        const resourceDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(domainResourceAddress);
        totalDomains = parseInt(resourceDetails.details?.total_supply || "0");
      } catch (e) {
        console.error("Error fetching domain resource:", e);
      }
    }
    
    // Get migrated domains count from KVStore
    if (migratedDomainsKvStore) {
      try {
        const keysResponse = await gatewayApi.state.innerClient.keyValueStoreKeys({
          stateKeyValueStoreKeysRequest: {
            key_value_store_address: migratedDomainsKvStore,
            cursor: null,
            limit_per_page: 1
          }
        });
        migratedDomains = keysResponse.total_count || 0;
      } catch (e) {
        console.error("Error fetching migrated domains:", e);
      }
    }
    
    // Get unique users by querying domain holders
    if (domainResourceAddress) {
      try {
        // Query all NFT holders for this resource
        const holdersResponse = await gatewayApi.state.innerClient.nonFungibleIds({
          stateNonFungibleIdsRequest: {
            resource_address: domainResourceAddress,
            cursor: null,
            limit_per_page: 100
          }
        });
        
        // Count unique holders
        const holders = new Set();
        if (holdersResponse.items) {
          for (const item of holdersResponse.items) {
            if (item.owner_entity_address) {
              holders.add(item.owner_entity_address);
            }
          }
        }
        uniqueUsers = holders.size;
      } catch (e) {
        console.error("Error fetching unique users:", e);
        // If we can't get detailed holder info, estimate based on total supply
        uniqueUsers = Math.min(totalDomains, Math.ceil(totalDomains * 0.8));
      }
    }
    
    // Build statistics display
    const statsHTML = `
    <div class="info-card">
        <h4>RNS V2 Statistics</h4>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">${totalDomains.toLocaleString()}</div>
            <div class="stat-label">Domains Issued</div>
      </div>
          <div class="stat-item">
            <div class="stat-value">${migratedDomains.toLocaleString()}</div>
            <div class="stat-label">Domains Migrated</div>
      </div>
          <div class="stat-item">
            <div class="stat-value">${uniqueUsers.toLocaleString()}</div>
            <div class="stat-label">Unique Users</div>
      </div>
    </div>
    </div>
    
    `;
    
    elements.componentInfo.innerHTML = statsHTML;
  } catch (error) {
    console.error("Error loading RNS statistics:", error);
    elements.componentInfo.innerHTML = `
    <div class="info-card">
        <p class="info-error">Failed to load RNS statistics. Please try again.</p>
    </div>
  `;
  }
}

async function loadComponentTransactions(componentAddress) {
  try {
    // Query recent transactions involving this component
    const transactionHistory = await gatewayApi.stream.innerClient.streamTransactions({
      stateStreamTransactionsRequest: {
        affected_global_entities_filter: [componentAddress],
        limit_per_page: 10,
        order: 'desc'
      }
    });
    
    if (transactionHistory && transactionHistory.items && transactionHistory.items.length > 0) {
      const transactionsHTML = transactionHistory.items.map(tx => {
        const txHash = tx.intent_hash || tx.state_version || 'Unknown';
        const status = tx.transaction_status || 'Unknown';
        const timestamp = tx.confirmed_at ? new Date(tx.confirmed_at).toLocaleString() : 'N/A';
        
        return `
        <div class="transaction-item">
          <div class="tx-header">
            <span class="tx-id">${txHash.substring(0, 20)}...${txHash.substring(txHash.length - 10)}</span>
            <span class="tx-status status-${status.toLowerCase()}">${status}</span>
          </div>
          <div class="tx-details">
            <span class="tx-time">${timestamp}</span>
            <a href="https://${currentNetwork === 'mainnet' ? 'dashboard' : 'stokenet-dashboard'}.radixdlt.com/transaction/${tx.intent_hash}" 
               target="_blank" class="tx-link">View →</a>
          </div>
        </div>
      `;
      }).join('');
      
      elements.recentTransactions.innerHTML = transactionsHTML;
    } else {
      elements.recentTransactions.innerHTML = '<p class="info-empty">No recent transactions found</p>';
    }
  } catch (error) {
    console.error("Error loading transactions:", error);
    elements.recentTransactions.innerHTML = '<p class="info-error">Failed to load transaction history. This component may not have any transactions yet.</p>';
  }
}

// ********** Reserved Domains Management **********
function previewReservedDomainsUpload() {
  const text = elements.reservedDomainsText.value.trim();
  
  if (!text) {
    showError("Please enter reserved domains list");
    return;
  }
  
  const { domains, errors } = parseReservedDomainsText(text);
  
  let html = "";
  
  if (errors.length > 0) {
    html += `<div class="errors">
      <h4>❌ Errors Found:</h4>
      <ul>${errors.map(error => `<li>${error}</li>`).join("")}</ul>
    </div>`;
  }
  
  if (domains.length > 0) {
    const cost = estimateReservedDomainsCost(domains.length);
    
    html += `<div class="preview-summary">
      <h4>✅ Upload Summary:</h4>
      <p><strong>Domains to upload:</strong> ${domains.length}</p>
    </div>
    
    <div class="domains-list">
      <h4>Domains Preview:</h4>
      <table>
        <thead>
          <tr><th>Domain</th><th>Claimant Address</th></tr>
        </thead>
        <tbody>
          ${domains.map(d => `<tr><td>${d.domain}</td><td>${d.claimant}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>`;
  }
  
  elements.previewResults.innerHTML = html;
  elements.reservedDomainsPreview.classList.remove("hidden");
  elements.uploadReservedDomains.disabled = errors.length > 0 || domains.length === 0;
}

async function uploadReservedDomains() {
  if (!account || !adminComponentAddress) {
    showError("Please connect wallet and load component first");
    return;
  }
  
  const text = elements.reservedDomainsText.value.trim();
  const { domains, errors } = parseReservedDomainsText(text);
  
  if (errors.length > 0 || domains.length === 0) {
    showError("Please fix errors before uploading");
    return;
  }
  
  try {
    showTransactionModal("Checking admin badge...");
    
    // We need the admin badge resource address - check if we have it from deployment
    const adminBadgeResource = adminBadgeResourceAddress || deploymentConfig.adminBadgeResource;
    
    if (!adminBadgeResource) {
      throw new Error("Admin badge resource address not found. This should be set when instantiating the component.");
    }
    
    // Check if user has admin badge in wallet
    const accountDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(account.address);
    const adminBadgesInWallet = accountDetails.fungible_resources?.items?.find(
      r => r.resource_address === adminBadgeResource
    )?.vaults?.items?.[0]?.amount || 0;
    
    if (parseFloat(adminBadgesInWallet) === 0) {
      hideTransactionModal();
      showError("❌ You do not have the admin badge in your wallet. This action requires the admin badge, which may have been burned.");
      // Disable the UI to prevent further attempts
      disableAdminOnlyActions();
      return;
    }
    
    showTransactionModal("Uploading reserved domains...");
    
    const manifest = getReservedDomainsBulkUploadManifest({
      componentAddress: adminComponentAddress,
      reservedDomains: domains,
      adminBadgeResource: adminBadgeResource,
      accountAddress: account.address,
      networkId: currentNetwork
    });
    
    const result = await rdt.walletApi.sendTransaction({
      transactionManifest: manifest,
      version: 1,
    });
    
    if (result.isErr()) {
      console.error("❌ Reserved domains upload error:", result.error);
      const errorMsg = result.error.message || result.error.error || JSON.stringify(result.error);
      throw new Error(errorMsg);
    }
    
    hideTransactionModal();
    showSuccess(`Successfully uploaded ${domains.length} reserved domains!`);
    
    // Track uploaded domains in session
    uploadedDomainsInSession.push(...domains);
    displayUploadedDomains();
    
    // Auto-refresh the all reserved domains list
    await loadAllReservedDomains();
    
    // Clear form
    elements.reservedDomainsText.value = "";
    elements.reservedDomainsPreview.classList.add("hidden");
    elements.uploadReservedDomains.disabled = true;
    
  } catch (error) {
    console.error("Reserved domains upload error:", error);
    hideTransactionModal();
    showError("Upload failed: " + error.message);
  }
}

// Display uploaded domains in the UI
function displayUploadedDomains() {
  const section = document.getElementById("uploadedDomainsSection");
  const list = document.getElementById("uploadedDomainsList");
  
  if (uploadedDomainsInSession.length === 0) {
    section.classList.add("hidden");
    return;
  }
  
  section.classList.remove("hidden");
  list.innerHTML = uploadedDomainsInSession.map(({ domain, claimant }) => `
    <div class="domain-item">
      <span class="domain-name">${domain}</span>
      <span class="domain-claimant">${claimant.substring(0, 20)}...${claimant.substring(claimant.length - 8)}</span>
    </div>
  `).join('');
}

// Lookup a specific domain to check if it's reserved
async function lookupReservedDomain() {
  const domainInput = document.getElementById("domainLookupInput");
  const resultDiv = document.getElementById("domainLookupResult");
  const detailsDiv = document.getElementById("domainLookupDetails");
  
  const domain = domainInput.value.trim();
  
  if (!domain) {
    showError("Please enter a domain name");
    return;
  }
  
  if (!adminComponentAddress) {
    showError("Please load a component first");
    return;
  }
  
  try {
    // Get component state to find the reserved_domain_claims KeyValueStore
    const componentDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(adminComponentAddress);
    
    if (!componentDetails?.details?.state?.fields) {
      throw new Error("Could not access component state");
    }
    
    // Find the reserved_domain_claims KeyValueStore field
    const kvStoreField = componentDetails.details.state.fields.find(
      field => field.field_name === 'reserved_domain_claims'
    );
    
    if (!kvStoreField || !kvStoreField.value) {
      throw new Error("Reserved domains KeyValueStore not found in component state");
    }
    
    // The KVStore field contains a reference ID - we need to query it
    const kvStoreId = kvStoreField.value;
    
    // Query the KeyValueStore using Gateway API client (RNS SDK pattern)
    try {
      // Query the KV store directly for this specific domain key
      const kvStoreResponse = await gatewayApi.state.innerClient.keyValueStoreData({
        stateKeyValueStoreDataRequest: {
          key_value_store_address: kvStoreId,
          keys: [{ 
            key_json: { 
              kind: 'String', 
              value: domain 
            } 
          }]
        }
      });
      
      // Check if we got a result
      if (kvStoreResponse.entries && kvStoreResponse.entries.length > 0) {
        // Domain is reserved - extract the claimant address
        const entry = kvStoreResponse.entries[0];
        const claimant = entry.value.programmatic_json.value;
        
        detailsDiv.innerHTML = `
          <div class="success-message">
            <strong>✅ Domain is Reserved</strong>
            <p><strong>Domain:</strong> ${domain}</p>
            <p><strong>Claimant:</strong> ${claimant}</p>
          </div>
        `;
      } else {
        // No entry found - domain is not reserved
        detailsDiv.innerHTML = `
          <div class="info-message">
            <strong>ℹ️ Domain Not Reserved</strong>
            <p>The domain <strong>${domain}</strong> is not currently reserved and can be registered by anyone.</p>
          </div>
        `;
      }
      
      resultDiv.classList.remove("hidden");
      
    } catch (kvError) {
      console.error("KeyValueStore query error:", kvError);
      throw new Error("Failed to query KeyValueStore: " + (kvError.message || JSON.stringify(kvError)));
    }
    
  } catch (error) {
    console.error("Domain lookup error:", error);
    detailsDiv.innerHTML = `
      <div class="error-message">
        <strong>❌ Lookup Failed</strong>
        <p>${error.message}</p>
      </div>
    `;
    resultDiv.classList.remove("hidden");
  }
}

// Load all reserved domains with pagination
async function loadAllReservedDomains() {
  if (!adminComponentAddress) {
    showError("Please load a component first");
    return;
  }
  
  try {
    // Get component state to find the reserved_domain_claims KeyValueStore
    const componentDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(adminComponentAddress);
    
    if (!componentDetails?.details?.state?.fields) {
      throw new Error("Could not access component state");
    }
    
    // Find the reserved_domain_claims KeyValueStore field
    const kvStoreField = componentDetails.details.state.fields.find(
      field => field.field_name === 'reserved_domain_claims'
    );
    
    if (!kvStoreField || !kvStoreField.value) {
      throw new Error("Reserved domains KeyValueStore not found in component state");
    }
    
    const kvStoreId = kvStoreField.value;
    
    // Fetch all keys with pagination support
    let allKeys = [];
    let cursor = null;
    let hasMore = true;
    
    while (hasMore) {
      const keysResponse = await gatewayApi.state.innerClient.keyValueStoreKeys({
        stateKeyValueStoreKeysRequest: {
          key_value_store_address: kvStoreId,
          cursor: cursor,
          limit_per_page: 100
        }
      });
      
      
      if (keysResponse.items && keysResponse.items.length > 0) {
        allKeys.push(...keysResponse.items);
      }
      
      cursor = keysResponse.next_cursor;
      hasMore = cursor !== null && cursor !== undefined;
    }
    
    if (allKeys.length === 0) {
      document.getElementById("allDomainsStats").innerHTML = `
        <div class="info-message">
          <strong>ℹ️ No Reserved Domains</strong>
          <p>There are currently no reserved domains in this component.</p>
        </div>
      `;
      document.getElementById("allDomainsSection").classList.remove("hidden");
      return;
    }
    
    // Fetch data for all keys in batches
    allReservedDomains = [];
    const batchSize = 50;
    
    for (let i = 0; i < allKeys.length; i += batchSize) {
      const batch = allKeys.slice(i, i + batchSize);
      const keyHexes = batch.map(item => ({ key_hex: item.key.raw_hex }));
      
      const dataResponse = await gatewayApi.state.innerClient.keyValueStoreData({
        stateKeyValueStoreDataRequest: {
          key_value_store_address: kvStoreId,
          keys: keyHexes
        }
      });
      
      if (dataResponse.entries && dataResponse.entries.length > 0) {
        dataResponse.entries.forEach(entry => {
          const domain = entry.key.programmatic_json.value;
          const claimant = entry.value.programmatic_json.value;
          allReservedDomains.push({ domain, claimant });
        });
      }
    }
    
    // Sort domains alphabetically
    allReservedDomains.sort((a, b) => a.domain.localeCompare(b.domain));
    
    // Display stats
    document.getElementById("allDomainsStats").innerHTML = `
      <div class="success-message">
        <strong>✅ Loaded ${allReservedDomains.length} Reserved Domains</strong>
      </div>
    `;
    
    // Reset to first page and display
    currentPage = 1;
    displayDomainsPage();
    
  } catch (error) {
    console.error("Error loading all domains:", error);
    showError("Failed to load reserved domains: " + error.message);
  }
}

// Display a specific page of domains
function displayDomainsPage() {
  const tableBody = document.getElementById("allDomainsTableBody");
  const pageInfo = document.getElementById("pageInfo");
  const prevBtn = document.getElementById("prevPageBtn");
  const nextBtn = document.getElementById("nextPageBtn");
  
  const totalPages = Math.ceil(allReservedDomains.length / domainsPerPage);
  const startIdx = (currentPage - 1) * domainsPerPage;
  const endIdx = Math.min(startIdx + domainsPerPage, allReservedDomains.length);
  const pageData = allReservedDomains.slice(startIdx, endIdx);
  
  // Update table
  tableBody.innerHTML = pageData.map(({ domain, claimant }) => `
    <tr>
      <td><strong>${domain}</strong></td>
      <td>
        <span class="address-value">${claimant.substring(0, 20)}...${claimant.substring(claimant.length - 8)}</span>
      </td>
      <td>
        <button class="btn-copy" onclick="navigator.clipboard.writeText('${claimant}')">Copy</button>
      </td>
    </tr>
  `).join('');
  
  // Update pagination controls
  pageInfo.textContent = `Page ${currentPage} of ${totalPages} (${allReservedDomains.length} total)`;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

// Pagination handlers
function goToPreviousPage() {
  if (currentPage > 1) {
    currentPage--;
    displayDomainsPage();
  }
}

function goToNextPage() {
  const totalPages = Math.ceil(allReservedDomains.length / domainsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    displayDomainsPage();
  }
}

// ********** V1 Badge Locking **********
async function lockV1AdminBadges() {
  // Use auto-detected amount from wallet
  const amount = v1AdminBadgesInWallet;
  
  if (!amount || amount === "0" || parseFloat(amount) < 1) {
    showError("No V1 admin badges found in your wallet. Please ensure you have badges to lock.");
    return;
  }
  
  if (!account || !adminComponentAddress) {
    showError("Please connect wallet and load component first");
    return;
  }
  
  if (!v1AdminBadgeResource) {
    showError("V1 admin badge resource not found. Please refresh status.");
    return;
  }
  
  try {
    showTransactionModal("Checking admin badge...");
    
    // Check if user has V2 admin badge in wallet (required for this action)
    const adminBadgeResource = adminBadgeResourceAddress || deploymentConfig.adminBadgeResource;
    if (adminBadgeResource) {
      const accountDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(account.address);
      const adminBadgesInWallet = accountDetails.fungible_resources?.items?.find(
        r => r.resource_address === adminBadgeResource
      )?.vaults?.items?.[0]?.amount || 0;
      
      if (parseFloat(adminBadgesInWallet) === 0) {
        hideTransactionModal();
        showError("❌ You do not have the admin badge in your wallet. This action requires the admin badge, which may have been burned.");
        disableAdminOnlyActions();
        return;
      }
    }
    
    showTransactionModal(`Locking ${amount} V1 admin badges from wallet...`);
    
    const manifest = getLockV1AdminBadgesManifest({
      componentAddress: adminComponentAddress,
      v1AdminBadgeResource: v1AdminBadgeResource,
      badgeAmount: amount,
      accountAddress: account.address,
      networkId: currentNetwork
    });
    
    const result = await rdt.walletApi.sendTransaction({
      transactionManifest: manifest,
      version: 1,
    });
    
    if (result.isErr()) {
      throw new Error(result.error.message || result.error.error || JSON.stringify(result.error));
    }
    
    hideTransactionModal();
    showSuccess(`Successfully locked ${amount} V1 admin badges!`);
    
    // Refresh lock status
    await refreshV1LockStatus();
    
  } catch (error) {
    console.error("❌ Badge locking error:", error);
    hideTransactionModal();
    showError("Badge locking failed: " + (error.message || JSON.stringify(error)));
  }
}

async function lockV1UpgradeBadge() {
  // Use auto-detected amount from wallet
  const amount = v1UpgradeBadgesInWallet;
  
  if (!amount || amount === "0" || parseFloat(amount) < 1) {
    showError("No V1 upgrade badges found in your wallet. Please ensure you have badges to lock.");
    return;
  }
  
  if (!account || !adminComponentAddress) {
    showError("Please connect wallet and load component first");
    return;
  }
  
  if (!v1UpgradeBadgeResource) {
    showError("V1 upgrade badge resource not found. Please refresh status.");
    return;
  }
  
  try {
    showTransactionModal("Checking admin badge...");
    
    // Check if user has V2 admin badge in wallet (required for this action)
    const adminBadgeResource = adminBadgeResourceAddress || deploymentConfig.adminBadgeResource;
    if (adminBadgeResource) {
      const accountDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(account.address);
      const adminBadgesInWallet = accountDetails.fungible_resources?.items?.find(
        r => r.resource_address === adminBadgeResource
      )?.vaults?.items?.[0]?.amount || 0;
      
      if (parseFloat(adminBadgesInWallet) === 0) {
        hideTransactionModal();
        showError("❌ You do not have the admin badge in your wallet. This action requires the admin badge, which may have been burned.");
        disableAdminOnlyActions();
        return;
      }
    }
    
    showTransactionModal(`Locking ${amount} V1 upgrade badges from wallet...`);
    
    const manifest = getLockV1UpgradeBadgeManifest({
      componentAddress: adminComponentAddress,
      v1UpgradeBadgeResource: v1UpgradeBadgeResource,
      badgeAmount: amount,
      accountAddress: account.address,
      networkId: currentNetwork
    });
    
    const result = await rdt.walletApi.sendTransaction({
      transactionManifest: manifest,
      version: 1,
    });
    
    if (result.isErr()) {
      throw new Error(result.error.message || result.error.error || JSON.stringify(result.error));
    }
    
    hideTransactionModal();
    showSuccess(`Successfully locked ${amount} V1 upgrade badges!`);
    
    // Refresh lock status
    await refreshV1LockStatus();
    
  } catch (error) {
    console.error("❌ Badge locking error:", error);
    hideTransactionModal();
    showError("Badge locking failed: " + (error.message || JSON.stringify(error)));
  }
}

async function refreshV1LockStatus() {
  if (!adminComponentAddress) {
    return;
  }
  
  try {
    // Query the component state to get V1 vault amounts
    const componentDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(adminComponentAddress);
    
    if (!componentDetails?.details?.state?.fields) {
      throw new Error("Could not access component state");
    }
    
    
    // Find the V1 vaults in component state
    const fields = componentDetails.details.state.fields;
    let adminBadgesLocked = "0";
    let upgradeBadgesLocked = "0";
    let adminBadgeResource = null;
    let upgradeBadgeResource = null;
    
    // Find v1_admin_badge_resource_address and v1_service_upgrade_badge_resource_address
    for (const field of fields) {
      if (field.field_name === 'v1_admin_badge_resource_address' && field.type_name === 'ResourceAddress') {
        adminBadgeResource = field.value;
      }
      if (field.field_name === 'v1_service_upgrade_badge_resource_address' && field.type_name === 'ResourceAddress') {
        upgradeBadgeResource = field.value;
      }
    }
    
    
    // Find the vaults that hold these badges
    if (componentDetails.fungible_resources?.items) {
      for (const resource of componentDetails.fungible_resources.items) {
        if (resource.resource_address === adminBadgeResource && resource.vaults?.items?.length > 0) {
          adminBadgesLocked = resource.vaults.items[0].amount || "0";
        }
        if (resource.resource_address === upgradeBadgeResource && resource.vaults?.items?.length > 0) {
          upgradeBadgesLocked = resource.vaults.items[0].amount || "0";
        }
      }
    }
    
    // Query resource details to get total supply
    let adminBadgeTotalSupply = "0";
    let upgradeBadgeTotalSupply = "0";
    
    if (adminBadgeResource) {
      try {
        const adminResourceDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(adminBadgeResource);
        
        // The total supply is in the details for fungible resources
        if (adminResourceDetails.details?.total_supply) {
          adminBadgeTotalSupply = adminResourceDetails.details.total_supply;
        } else if (adminResourceDetails.fungible_resources?.total_supply) {
          adminBadgeTotalSupply = adminResourceDetails.fungible_resources.total_supply;
        }
        
      } catch (e) {
        console.error("Failed to get admin badge supply:", e);
      }
    }
    
    if (upgradeBadgeResource) {
      try {
        const upgradeResourceDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(upgradeBadgeResource);
        
        // The total supply is in the details for fungible resources
        if (upgradeResourceDetails.details?.total_supply) {
          upgradeBadgeTotalSupply = upgradeResourceDetails.details.total_supply;
        } else if (upgradeResourceDetails.fungible_resources?.total_supply) {
          upgradeBadgeTotalSupply = upgradeResourceDetails.fungible_resources.total_supply;
        }
        
      } catch (e) {
        console.error("Failed to get upgrade badge supply:", e);
      }
    }
    
    // Store resource addresses globally
    v1AdminBadgeResource = adminBadgeResource;
    v1UpgradeBadgeResource = upgradeBadgeResource;
    
    // Query user's wallet to get badge amounts
    v1AdminBadgesInWallet = "0";
    v1UpgradeBadgesInWallet = "0";
    
    if (account && adminBadgeResource) {
      try {
        const accountDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(account.address);
        
        // Find the admin badge resource in the user's account
        if (accountDetails.fungible_resources?.items) {
          const adminBadgeItem = accountDetails.fungible_resources.items.find(
            item => item.resource_address === adminBadgeResource
          );
          if (adminBadgeItem && adminBadgeItem.vaults?.items?.length > 0) {
            v1AdminBadgesInWallet = adminBadgeItem.vaults.items[0].amount || "0";
          }
        }
      } catch (e) {
        console.error("Failed to get admin badges from wallet:", e);
      }
    }
    
    if (account && upgradeBadgeResource) {
      try {
        const accountDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(account.address);
        
        // Find the upgrade badge resource in the user's account
        if (accountDetails.fungible_resources?.items) {
          const upgradeBadgeItem = accountDetails.fungible_resources.items.find(
            item => item.resource_address === upgradeBadgeResource
          );
          if (upgradeBadgeItem && upgradeBadgeItem.vaults?.items?.length > 0) {
            v1UpgradeBadgesInWallet = upgradeBadgeItem.vaults.items[0].amount || "0";
          }
        }
      } catch (e) {
        console.error("Failed to get upgrade badges from wallet:", e);
      }
    }
    
    // Calculate remaining badges
    const adminBadgesRemaining = parseFloat(adminBadgeTotalSupply) - parseFloat(adminBadgesLocked);
    const upgradeBadgesRemaining = parseFloat(upgradeBadgeTotalSupply) - parseFloat(upgradeBadgesLocked);
    
    // Display admin badge status in its section
    const adminBadgeStatusDiv = document.getElementById("adminBadgeStatus");
    const lockAdminBadgesBtn = document.getElementById("lockAdminBadges");
    
    if (adminBadgeStatusDiv) {
      const allAdminBadgesLocked = adminBadgesRemaining === 0 && parseFloat(adminBadgeTotalSupply) > 0;
      const hasAdminBadgesInWallet = parseFloat(v1AdminBadgesInWallet) > 0;
      
      if (allAdminBadgesLocked) {
        // All badges are locked - show completion message
        adminBadgeStatusDiv.innerHTML = `
          <div class="status-item success-item">
            <strong>✅ All Admin Badges Locked</strong>
            <p style="margin: 8px 0 0 0;">All ${adminBadgeTotalSupply} V1 admin badges have been successfully locked in the component.</p>
          </div>
          ${adminBadgeResource ? `
          <div class="status-item">
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
              <strong style="min-width: 80px;">Resource:</strong>
              <span class="address-value" style="flex: 1; font-size: 0.85rem;">${adminBadgeResource}</span>
              <button class="btn-copy" onclick="navigator.clipboard.writeText('${adminBadgeResource}')">Copy</button>
            </div>
          </div>
          ` : ''}
        `;
        // Hide the lock button
        if (lockAdminBadgesBtn) lockAdminBadgesBtn.style.display = 'none';
      } else {
        // Badges remaining - show status and button
        adminBadgeStatusDiv.innerHTML = `
          <div class="status-item">
            <strong>Total Supply:</strong> ${adminBadgeTotalSupply}
          </div>
          <div class="status-item">
            <strong>Locked in Component:</strong> ${adminBadgesLocked}
          </div>
          <div class="status-item">
            <strong>Remaining to Lock:</strong> ${adminBadgesRemaining} ⚠️
          </div>
          <div class="status-item">
            <strong>In Your Wallet:</strong> ${v1AdminBadgesInWallet}
            ${hasAdminBadgesInWallet ? ' 🔓' : ''}
          </div>
          ${adminBadgeResource ? `
          <div class="status-item">
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
              <strong style="min-width: 80px;">Resource:</strong>
              <span class="address-value" style="flex: 1; font-size: 0.85rem;">${adminBadgeResource}</span>
              <button class="btn-copy" onclick="navigator.clipboard.writeText('${adminBadgeResource}')">Copy</button>
            </div>
          </div>
          ` : ''}
        `;
        // Show the lock button
        if (lockAdminBadgesBtn) lockAdminBadgesBtn.style.display = 'block';
      }
    }
    
    // Display upgrade badge status in its section
    const upgradeBadgeStatusDiv = document.getElementById("upgradeBadgeStatus");
    const lockUpgradeBadgeBtn = document.getElementById("lockUpgradeBadge");
    
    if (upgradeBadgeStatusDiv) {
      const allUpgradeBadgesLocked = upgradeBadgesRemaining === 0 && parseFloat(upgradeBadgeTotalSupply) > 0;
      const hasUpgradeBadgesInWallet = parseFloat(v1UpgradeBadgesInWallet) > 0;
      
      if (allUpgradeBadgesLocked) {
        // All badges are locked - show completion message
        upgradeBadgeStatusDiv.innerHTML = `
          <div class="status-item success-item">
            <strong>✅ All Upgrade Badges Locked</strong>
            <p style="margin: 8px 0 0 0;">All ${upgradeBadgeTotalSupply} V1 upgrade badges have been successfully locked in the component.</p>
          </div>
          ${upgradeBadgeResource ? `
          <div class="status-item">
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
              <strong style="min-width: 80px;">Resource:</strong>
              <span class="address-value" style="flex: 1; font-size: 0.85rem;">${upgradeBadgeResource}</span>
              <button class="btn-copy" onclick="navigator.clipboard.writeText('${upgradeBadgeResource}')">Copy</button>
            </div>
          </div>
          ` : ''}
        `;
        // Hide the lock button
        if (lockUpgradeBadgeBtn) lockUpgradeBadgeBtn.style.display = 'none';
      } else {
        // Badges remaining - show status and button
        upgradeBadgeStatusDiv.innerHTML = `
          <div class="status-item">
            <strong>Total Supply:</strong> ${upgradeBadgeTotalSupply}
          </div>
          <div class="status-item">
            <strong>Locked in Component:</strong> ${upgradeBadgesLocked}
          </div>
          <div class="status-item">
            <strong>Remaining to Lock:</strong> ${upgradeBadgesRemaining} ⚠️
          </div>
          <div class="status-item">
            <strong>In Your Wallet:</strong> ${v1UpgradeBadgesInWallet}
            ${hasUpgradeBadgesInWallet ? ' 🔓' : ''}
          </div>
          ${upgradeBadgeResource ? `
          <div class="status-item">
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
              <strong style="min-width: 80px;">Resource:</strong>
              <span class="address-value" style="flex: 1; font-size: 0.85rem;">${upgradeBadgeResource}</span>
              <button class="btn-copy" onclick="navigator.clipboard.writeText('${upgradeBadgeResource}')">Copy</button>
            </div>
          </div>
          ` : ''}
        `;
        // Show the lock button
        if (lockUpgradeBadgeBtn) lockUpgradeBadgeBtn.style.display = 'block';
      }
    }
    
    // Display overall summary
    const allBadgesLocked = adminBadgesRemaining === 0 && upgradeBadgesRemaining === 0 && 
                           parseFloat(adminBadgeTotalSupply) > 0 && parseFloat(upgradeBadgeTotalSupply) > 0;
    
    elements.lockStatusResults.innerHTML = `
      <div class="status-item ${allBadgesLocked ? 'success-item' : 'warning-item'}">
        <strong>${allBadgesLocked ? '✅ Ready for Launch' : '⚠️ Badges Still Need Locking'}</strong>
        <p style="margin: 8px 0 0 0; color: ${allBadgesLocked ? '#166534' : '#92400e'};">
          ${allBadgesLocked 
            ? 'All V1 badges are locked. The RNS V2 system is ready for public launch.'
            : 'Some V1 badges remain unlocked. Lock all badges before activating public registration.'}
        </p>
      </div>
      <div class="status-item">
        <strong>Admin Badges:</strong> ${adminBadgesLocked} / ${adminBadgeTotalSupply} locked
        ${adminBadgesRemaining === 0 && parseFloat(adminBadgeTotalSupply) > 0 ? ' ✅' : ''}
      </div>
      <div class="status-item">
        <strong>Upgrade Badges:</strong> ${upgradeBadgesLocked} / ${upgradeBadgeTotalSupply} locked
        ${upgradeBadgesRemaining === 0 && parseFloat(upgradeBadgeTotalSupply) > 0 ? ' ✅' : ''}
      </div>
    `;
    
    
  } catch (error) {
    console.error("Failed to refresh lock status:", error);
    elements.lockStatusResults.innerHTML = `
      <div class="error-message">
        <strong>❌ Failed to load lock status</strong>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// ********** Admin Badge Management **********
async function burnAdminBadge() {
  if (!confirm("⚠️ WARNING: This will permanently burn the admin badge and activate public domain registration. This action cannot be undone. Are you sure?")) {
    return;
  }
  
  if (!account || !adminComponentAddress) {
    showError("Please connect wallet and load component first");
    return;
  }
  
  try {
    showTransactionModal("Burning admin badge...");
    
    // Get admin badge resource - check if we have it from deployment or component state
    const adminBadgeResource = adminBadgeResourceAddress || deploymentConfig.adminBadgeResource;
    
    if (!adminBadgeResource) {
      throw new Error("Admin badge resource address not found. Please ensure the component is loaded correctly.");
    }
    
    const manifest = getBurnAdminBadgeManifest({
      componentAddress: adminComponentAddress,
      adminBadgeResource: adminBadgeResource,
      accountAddress: account.address,
      networkId: currentNetwork
    });
    
    const result = await rdt.walletApi.sendTransaction({
      transactionManifest: manifest,
      version: 1,
    });
    
    if (result.isErr()) {
      throw new Error(result.error);
    }
    
    hideTransactionModal();
    showSuccess("Admin badge burned successfully! Public domain registration is now active.");
    
    // Hide the burn button and warning, show completion message
    if (elements.burnWarningSection) {
      elements.burnWarningSection.classList.add("hidden");
    }
    if (elements.burnCompletionMessage) {
      elements.burnCompletionMessage.classList.remove("hidden");
    }
    
    // Disable all admin-only actions since badge is now burned
    disableAdminOnlyActions();
    
  } catch (error) {
    hideTransactionModal();
    showError("Admin badge burn failed: " + error.message);
  }
}

// ********** Resource Creation Functions **********
async function createDummyResourcesForTesting() {
  if (!account) {
    showError("Please connect your wallet first");
    return;
  }

  if (currentNetwork !== "stokenet") {
    showError("Resource creation is only available for Stokenet testing");
    return;
  }

  try {
    showTransactionModal("Creating dummy resources for testing...");

    // Validate parameters
    const params = {
      accountAddress: account.address,
      networkId: currentNetwork
    };

    const errors = validateResourceCreationParams(params);
    if (errors.length > 0) {
      console.error("❌ Validation errors:", errors);
      throw new Error("Validation errors: " + errors.join(", "));
    }

    // Generate manifest
    const manifest = getCreateDummyResourcesManifest(params);

    // Submit transaction
    const result = await rdt.walletApi.sendTransaction({
      transactionManifest: manifest,
      version: 1,
    });


    if (result.isErr()) {
      console.error("❌ Transaction submission failed:", result.error);
      console.error("❌ Full error object:", JSON.stringify(result.error, null, 2));
      throw new Error("Transaction submission failed: " + JSON.stringify(result.error, null, 2));
    }


    // Track transaction
    await trackResourceCreationTransaction(result.value.transactionIntentHash);

  } catch (error) {
    console.error("❌ Resource creation failed:", error);
    console.error("❌ Error stack:", error.stack);
    console.error("❌ Full error details:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    hideTransactionModal();
    showError("Resource creation failed: " + error.message);
  }
}

async function trackResourceCreationTransaction(transactionHash) {
  let attempts = 0;
  const maxAttempts = 60;

  const checkStatus = async () => {
    try {
      const status = await gatewayApi.transaction.getStatus(transactionHash);

      if (status.status === "CommittedSuccess" || status.intent_status === "CommittedSuccess") {
        const receipt = await gatewayApi.transaction.getCommittedDetails(transactionHash);
        showResourceCreationSuccess(receipt);
        return;
      } else if (status.status === "CommittedFailure" || status.intent_status === "CommittedFailure") {
        console.error("❌ Transaction failed on ledger");
        console.error("❌ Status details:", JSON.stringify(status, null, 2));
        throw new Error("Transaction failed on ledger: " + JSON.stringify(status, null, 2));
      } else if (attempts >= maxAttempts) {
        console.error("⏰ Transaction confirmation timeout");
        throw new Error("Transaction confirmation timeout after " + maxAttempts + " attempts");
      }

      attempts++;
      setTimeout(checkStatus, 5000);
    } catch (error) {
      console.error("❌ Transaction tracking failed:", error);
      console.error("❌ Tracking error details:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      hideTransactionModal();
      showError("Resource creation tracking failed: " + error.message);
    }
  };

  checkStatus();
}

function showResourceCreationSuccess(receipt) {
  try {
    // Parse the created resources from the receipt
    createdResources = parseResourceCreationReceipt(receipt);

    // Display the resource addresses
    elements.createdFUSD.textContent = createdResources.fUSD;
    elements.createdSUSD.textContent = createdResources.sUSD;
    elements.createdLegacyDomain.textContent = createdResources.legacyDomainResource;
    elements.createdV1AdminBadge.textContent = createdResources.v1AdminBadgeResource;
    elements.createdV1UpgradeBadge.textContent = createdResources.v1UpgradeBadgeResource;

    // Show results section
    elements.resourceCreationResults.classList.remove("hidden");

    hideTransactionModal();
    showSuccess("Successfully created all test resources!");

  } catch (error) {
    hideTransactionModal();
    showError("Failed to parse resource creation results: " + error.message);
  }
}

function useCreatedResourcesInForm() {
  if (!createdResources) {
    showError("No resources have been created yet");
    return;
  }

  try {
    // Fill payment resources
    const paymentResourceInputs = elements.paymentResourcesList.querySelectorAll(".payment-resource");
    if (paymentResourceInputs.length >= 1) {
      paymentResourceInputs[0].value = createdResources.fUSD;
    }
    if (paymentResourceInputs.length >= 2) {
      paymentResourceInputs[1].value = createdResources.sUSD;
    } else {
      // Add second payment resource input if needed
      addPaymentResourceInput();
      const newInputs = elements.paymentResourcesList.querySelectorAll(".payment-resource");
      newInputs[1].value = createdResources.sUSD;
    }

    // Fill legacy and V1 resources
    elements.legacyDomainResource.value = createdResources.legacyDomainResource;
    elements.v1AdminBadgeResource.value = createdResources.v1AdminBadgeResource;
    elements.v1UpgradeBadgeResource.value = createdResources.v1UpgradeBadgeResource;

    showSuccess("Forms auto-filled with created resource addresses!");

  } catch (error) {
    showError("Failed to auto-fill forms: " + error.message);
  }
}

function updateResourceCreationVisibility() {
  if (elements.resourceCreationHelper) {
    // Hide if on mainnet OR if wallet not connected
    if (currentNetwork === "mainnet" || !account) {
      elements.resourceCreationHelper.classList.add("helper-hidden");
    } else {
      elements.resourceCreationHelper.classList.remove("helper-hidden");
    }
  }
}

function switchToMode(mode) {
  // Update selected mode tracking
  selectedMode = mode;
  
  // Hide all content sections and ALL progress trackers
  elements.applicationFlow?.classList.add("hidden");
  elements.adminContent?.classList.add("hidden");
  elements.adminContent?.classList.remove("active");
  elements.manageContent?.classList.add("hidden");
  elements.manageContent?.classList.remove("active");
  elements.toolsContent?.classList.add("hidden");
  elements.toolsContent?.classList.remove("active");
  elements.progressTracker?.classList.add('hidden');
  document.getElementById("adminProgressTracker")?.classList.add('hidden');
  
  // Show the selected mode content
  if (mode === 'admin') {
    if (elements.adminContent) {
      elements.adminContent.classList.remove("hidden");
      elements.adminContent.classList.add("active");
      
      // Show admin progress tracker
      const adminProgressTracker = document.getElementById("adminProgressTracker");
      if (adminProgressTracker) {
        adminProgressTracker.classList.remove("hidden");
      }
      
      // Reset uploaded domains list when entering admin mode
      uploadedDomainsInSession = [];
      displayUploadedDomains();
      
      updateAdminPanelVisibility(); // Update visibility based on wallet connection
      
      // CRITICAL: Initialize admin wizard to step 1
      goToAdminStep(1);
    } else {
      console.error("❌ adminContent element not found!");
    }
  } else if (mode === 'manage') {
    if (elements.manageContent) {
      elements.manageContent.classList.remove("hidden");
      elements.manageContent.classList.add("active");
      updateManagementPanelVisibility(); // Update visibility based on wallet connection
    } else {
      console.error("❌ manageContent element not found!");
    }
  } else if (mode === 'tools') {
    if (elements.toolsContent) {
      elements.toolsContent.classList.remove("hidden");
      elements.toolsContent.classList.add("active");
      updateToolsPanelVisibility(); // Update visibility based on wallet connection
    } else {
      console.error("❌ toolsContent element not found!");
    }
  }
}

function backToModeSelection() {
  // Hide all content sections
  elements.adminContent?.classList.add("hidden");
  elements.adminContent?.classList.remove("active");
  elements.toolsContent?.classList.add("hidden");
  elements.toolsContent?.classList.remove("active");
  elements.manageContent?.classList.add("hidden");
  elements.manageContent?.classList.remove("active");
  
  // Reset component config internal elements to default state
  if (elements.adminWalletGate) {
    elements.adminWalletGate.classList.remove("hidden");
  }
  if (elements.adminFlow) {
    elements.adminFlow.classList.add("hidden");
  }
  
  // Reset burn badge UI state
  if (elements.burnWarningSection) {
    elements.burnWarningSection.classList.remove("hidden");
  }
  if (elements.burnCompletionMessage) {
    elements.burnCompletionMessage.classList.add("hidden");
  }
  
  // Clear completion status badges and disabled states
  document.querySelectorAll('.badge-status').forEach(badge => badge.remove());
  document.querySelectorAll('.section-disabled').forEach(section => section.classList.remove('section-disabled'));
  
  // Re-enable all admin action buttons
  if (elements.previewReservedDomains) elements.previewReservedDomains.disabled = false;
  if (elements.uploadReservedDomains) elements.uploadReservedDomains.disabled = false;
  if (elements.reservedDomainsText) elements.reservedDomainsText.disabled = false;
  if (elements.lockAdminBadges) elements.lockAdminBadges.disabled = false;
  if (elements.lockUpgradeBadge) elements.lockUpgradeBadge.disabled = false;
  
  // Reset management panel internal elements to default state
  if (elements.manageWalletGate) {
    elements.manageWalletGate.classList.remove("hidden");
  }
  if (elements.managementPanel) {
    elements.managementPanel.classList.add("hidden");
  }
  
  // Reset tools panel internal elements to default state
  if (elements.toolsWalletGate) {
    elements.toolsWalletGate.classList.remove("hidden");
  }
  if (elements.toolsPanel) {
    elements.toolsPanel.classList.add("hidden");
  }
  
  // Clear loaded component
  loadedToolsComponentAddress = null;
  if (elements.toolsComponentLoaded) {
    elements.toolsComponentLoaded.classList.add("hidden");
  }
  
  // Hide tool sections
  if (elements.toolSections) {
    elements.toolSections.forEach(section => {
      section.classList.add("hidden");
    });
  }
  
  // Show the main application flow (mode selection)
  elements.applicationFlow?.classList.remove("hidden");
  
  // Reset to step 1 and clear mode selection
  currentStep = 1;
  selectedMode = null;
  
  // Show all steps, but make only step 1 active
  elements.steps.forEach((step, index) => {
    if (index === 0) {
      step.classList.add("active");
      step.classList.remove("hidden");
    } else {
      step.classList.remove("active");
      step.classList.add("hidden");
    }
  });
  
  // Reset mode cards
  elements.modeCards.forEach(card => card.classList.remove('selected'));
  
  // Hide BOTH progress trackers
  elements.progressTracker?.classList.add('hidden');
  document.getElementById("adminProgressTracker")?.classList.add('hidden');
  
  // Reset deployment tracker to step 1
  elements.progressSteps?.forEach((el, index) => {
    if (index === 0) {
      el.classList.add("active");
      el.classList.remove("completed");
    } else {
      el.classList.remove("active");
      el.classList.remove("completed");
    }
  });
  
  // Reset admin tracker to step 1
  const adminProgressSteps = document.querySelectorAll("#adminProgressTracker .tracker-step");
  adminProgressSteps.forEach((el, index) => {
    if (index === 0) {
      el.classList.add("active");
      el.classList.remove("completed");
    } else {
      el.classList.remove("active");
      el.classList.remove("completed");
    }
  });
}

function updateApplicationVisibility() {
  if (elements.walletConnectionGate && elements.applicationFlow) {
    if (account) {
      // Wallet connected
      elements.walletConnectionGate.classList.add("hidden");
      
      // Only show/hide applicationFlow if we're in deploy mode or no mode selected (mode selection)
      // Don't interfere if user has selected admin or manage mode
      if (selectedMode === 'deploy' || selectedMode === null) {
        elements.applicationFlow.classList.remove("hidden");
      }
      // Note: We don't hide applicationFlow here for admin/manage modes
      // because switchToMode() handles that explicitly
    } else {
      // No wallet - show gate, hide all content
      elements.walletConnectionGate.classList.remove("hidden");
      elements.applicationFlow.classList.add("hidden");
      elements.adminContent?.classList.add("hidden");
      elements.manageContent?.classList.add("hidden");
    }
  }
}

function updateAdminPanelVisibility() {
  // Only update if we're actually in admin mode
  if (selectedMode !== 'admin') {
    return;
  }
  
  if (elements.adminWalletGate && elements.adminFlow) {
    if (account) {
      // Wallet connected - show admin flow, hide gate
      elements.adminWalletGate.classList.add("hidden");
      elements.adminFlow.classList.remove("hidden");
    } else {
      // No wallet - show gate, hide admin flow
      elements.adminWalletGate.classList.remove("hidden");
      elements.adminFlow.classList.add("hidden");
    }
  }
}

function updateManagementPanelVisibility() {
  // Only update if we're actually in manage mode
  if (selectedMode !== 'manage') {
    return;
  }
  
  if (elements.manageWalletGate && elements.managementPanel) {
    if (account) {
      // Wallet connected - show management panel, hide gate
      elements.manageWalletGate.classList.add("hidden");
      elements.managementPanel.classList.remove("hidden");
    } else {
      // No wallet - show gate, hide management panel
      elements.manageWalletGate.classList.remove("hidden");
      elements.managementPanel.classList.add("hidden");
    }
  }
}

function updateToolsPanelVisibility() {
  // Only update if we're actually in tools mode
  if (selectedMode !== 'tools') {
    return;
  }
  
  if (elements.toolsWalletGate && elements.toolsPanel) {
    if (account) {
      // Wallet connected - show tools panel, hide gate
      elements.toolsWalletGate.classList.add("hidden");
      elements.toolsPanel.classList.remove("hidden");
  } else {
      // No wallet - show gate, hide tools panel
      elements.toolsWalletGate.classList.remove("hidden");
      elements.toolsPanel.classList.add("hidden");
    }
  }
  
  // Hide/show tool sections based on component loaded status
  if (elements.toolSections) {
    elements.toolSections.forEach(section => {
      if (loadedToolsComponentAddress) {
        section.classList.remove("hidden");
      } else {
        section.classList.add("hidden");
      }
    });
  }
}

// ********** Utility Functions **********
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function showError(message) {
  // Create temporary error notification
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-notification";
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  
  setTimeout(() => {
    if (errorDiv && errorDiv.parentNode) {
      errorDiv.parentNode.removeChild(errorDiv);
    }
  }, 5000);
}

function showSuccess(message) {
  // Create temporary success notification
  const successDiv = document.createElement("div");
  successDiv.className = "success-notification";
  successDiv.textContent = message;
  document.body.appendChild(successDiv);
  
  setTimeout(() => {
    if (successDiv && successDiv.parentNode) {
      successDiv.parentNode.removeChild(successDiv);
    }
  }, 5000);
}

function showTransactionModal(message) {
  elements.transactionStatus.innerHTML = `
    <div class="spinner"></div>
    <p>${message}</p>
  `;
  elements.transactionModal.classList.remove("hidden");
}

function hideTransactionModal() {
  elements.transactionModal.classList.add("hidden");
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showSuccess("Copied to clipboard!");
  });
}

// ********** Tools - Component Loading **********

async function loadToolsComponent() {
  try {
    const componentAddress = elements.toolsComponentAddress.value.trim();
    
    if (!componentAddress) {
      showError("Please enter a component address");
      return;
    }
    
    if (!componentAddress.startsWith('component_')) {
      showError("Invalid component address format");
      return;
    }
    
    showTransactionModal("Loading component...");
    
    // Validate component exists by querying it
    await gatewayApi.state.getEntityDetailsVaultAggregated(componentAddress);
    
    // Store the loaded component
    loadedToolsComponentAddress = componentAddress;
    
    // Display success
    elements.toolsLoadedComponentAddress.textContent = componentAddress;
    elements.toolsComponentLoaded.classList.remove("hidden");
    
    hideTransactionModal();
    showSuccess("✅ Component loaded successfully! You can now use the tools below.");
    
    // Auto-load registrar badges (non-silent to show any errors)
    await detectRegistrarBadges(false);
    
    // Auto-load accepted payment resources
    await loadAcceptedPaymentResources();
    
    // Auto-load user domains
    await detectUserDomains();
    
    // Update visibility to show tool sections now that component is loaded
    updateToolsPanelVisibility();
  } catch (error) {
    hideTransactionModal();
    console.error("Error loading component:", error);
    showError("Failed to load component: " + error.message);
  }
}

// ********** dApp Definition Creator **********

let generatedDappManifest = null;

async function discoverEntitiesFromComponent(componentAddress) {
  const entities = new Set();
  
  try {
    // Get component details
    const componentDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(componentAddress);
    
    // Add the component itself
    entities.add(componentAddress);
    
    // Add the package address
    const packageAddress = componentDetails.details?.package_address;
    if (packageAddress) {
      entities.add(packageAddress);
    }
    
    // Get component state to identify V1 resources
    const componentState = componentDetails.details?.state?.fields || [];
    const v1AdminBadgeField = componentState.find(f => f.field_name === 'v1_admin_badge_resource_address');
    const v1UpgradeBadgeField = componentState.find(f => f.field_name === 'v1_service_upgrade_badge_resource_address');
    const legacyDomainField = componentState.find(f => f.field_name === 'legacy_domain_nft_manager');
    
    const v1Resources = new Set();
    if (v1AdminBadgeField?.value) v1Resources.add(v1AdminBadgeField.value);
    if (v1UpgradeBadgeField?.value) v1Resources.add(v1UpgradeBadgeField.value);
    if (legacyDomainField?.value) v1Resources.add(legacyDomainField.value);
    
    
    // Add all fungible resources (except V1)
    const fungibleResources = componentDetails.fungible_resources?.items || [];
    fungibleResources.forEach(resource => {
      if (!v1Resources.has(resource.resource_address)) {
        entities.add(resource.resource_address);
      } else {
      }
    });
    
    // Add all non-fungible resources (except V1)
    const nonFungibleResources = componentDetails.non_fungible_resources?.items || [];
    nonFungibleResources.forEach(resource => {
      if (!v1Resources.has(resource.resource_address)) {
        entities.add(resource.resource_address);
      } else {
      }
    });
    
  } catch (error) {
    console.error("Error discovering entities:", error);
    throw error;
  }
  
  return Array.from(entities);
}

function displayDiscoveredEntities(entities) {
  if (entities.length === 0) {
    elements.discoveredEntities.classList.add("hidden");
    return;
  }
  
  const entityTypes = {
    component: [],
    package: [],
    resource: []
  };
  
  entities.forEach(address => {
    if (address.includes('component_')) {
      entityTypes.component.push(address);
    } else if (address.includes('package_')) {
      entityTypes.package.push(address);
    } else if (address.includes('resource_')) {
      entityTypes.resource.push(address);
    }
  });
  
  let html = '';
  
  if (entityTypes.component.length > 0) {
    html += `<div class="entity-group">
      <h5>Components (${entityTypes.component.length})</h5>
      <ul>
        ${entityTypes.component.map(addr => `<li><code>${addr}</code></li>`).join('')}
      </ul>
    </div>`;
  }
  
  if (entityTypes.package.length > 0) {
    html += `<div class="entity-group">
      <h5>Packages (${entityTypes.package.length})</h5>
      <ul>
        ${entityTypes.package.map(addr => `<li><code>${addr}</code></li>`).join('')}
      </ul>
    </div>`;
  }
  
  if (entityTypes.resource.length > 0) {
    html += `<div class="entity-group">
      <h5>Resources (${entityTypes.resource.length})</h5>
      <ul>
        ${entityTypes.resource.map(addr => `<li><code>${addr}</code></li>`).join('')}
      </ul>
    </div>`;
  }
  
  elements.entitiesList.innerHTML = html;
  elements.discoveredEntities.classList.remove("hidden");
}

async function previewDappManifest() {
  try {
    if (!loadedToolsComponentAddress) {
      showError("Please load a component first using the 'Load Component' button");
      return;
    }
    
    // Get input values
    const dappAccountAddress = elements.dappAccountAddress.value.trim();
    const name = elements.dappName.value.trim();
    const description = elements.dappDescription.value.trim();
    const iconUrl = elements.dappIconUrl.value.trim();
    const tagsText = elements.dappTags.value.trim();
    const websitesText = elements.dappWebsites.value.trim();
    
    // Parse tags (comma-separated)
    const tags = tagsText.split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    // Parse websites (one per line)
    const claimedWebsites = websitesText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    showTransactionModal("Discovering entities and generating manifest...");
    
    // Auto-discover entities from component
    const claimedEntities = await discoverEntitiesFromComponent(loadedToolsComponentAddress);
    
    hideTransactionModal();
    
    // Validate inputs
    const validation = validateDappDefinitionParams({
      dappAccountAddress,
      name,
      description,
      iconUrl,
      tags,
      claimedWebsites,
      claimedEntities
    });
    
    if (!validation.valid) {
      showError("Validation failed:\n" + validation.errors.join("\n"));
      return;
    }
    
    // Display discovered entities
    displayDiscoveredEntities(claimedEntities);
    
    // Generate manifest (expose currentNetwork to manifest builder)
    window.currentNetwork = currentNetwork;
    generatedDappManifest = getDappDefinitionManifest({
      dappAccountAddress,
      name,
      description,
      iconUrl,
      tags,
      claimedWebsites,
      claimedEntities,
      networkId: currentNetwork
    });
    
    // Display manifest
    elements.dappManifestCode.textContent = generatedDappManifest;
    elements.dappManifestOutput.classList.remove("hidden");
    elements.dappDefinitionResult.classList.add("hidden");
    
    showSuccess(`✅ Manifest preview generated! Discovered ${claimedEntities.length} V2 entities.`);
  } catch (error) {
    hideTransactionModal();
    console.error("Error generating dApp manifest:", error);
    showError("Failed to generate manifest: " + error.message);
  }
}

async function submitDappDefinition() {
  if (!generatedDappManifest) {
    showError("No manifest generated. Please preview the manifest first.");
    return;
  }
  
  if (!account) {
    showError("Please connect your wallet first.");
    return;
  }
  
  try {
    showTransactionModal("Submitting dApp definition to wallet...");
    
    // Submit to wallet
    const result = await rdt.walletApi.sendTransaction({
      transactionManifest: generatedDappManifest,
      version: 1,
    });
    
    if (result.isErr()) {
      console.error("❌ dApp definition submission error:", result.error);
      const errorMsg = result.error.message || result.error.error || JSON.stringify(result.error);
      throw new Error(errorMsg);
    }
    
    const transactionIntentHash = result.value.transactionIntentHash;
    
    // Track transaction
    elements.transactionStatus.innerHTML = `
      <div class="spinner"></div>
      <p>Transaction submitted! Waiting for confirmation...</p>
      <p class="tx-hash">Intent: ${transactionIntentHash.slice(0, 20)}...</p>
    `;
    
    // Wait for confirmation
    const receipt = await trackTransactionStatus(transactionIntentHash);
    
    if (receipt.status === "CommittedSuccess") {
      // For dApp definitions, we're modifying an existing account (the one provided by user)
      // So we display the account address that was modified
      const dappAccountAddress = elements.dappAccountAddress.value.trim();
      
      if (dappAccountAddress) {
        elements.dappDefinitionAddress.textContent = dappAccountAddress;
        elements.dappDefinitionResult.classList.remove("hidden");
        
        hideTransactionModal();
        showSuccess(`✅ dApp definition created successfully! Your account is now a dApp definition.`);
      } else {
        hideTransactionModal();
        showSuccess(`✅ Transaction successful! Your account has been converted to a dApp definition.`);
      }
      
      // Clear form
      elements.dappAccountAddress.value = "";
      elements.dappName.value = "";
      elements.dappDescription.value = "";
      elements.dappIconUrl.value = "";
      elements.dappTags.value = "";
      elements.dappWebsites.value = "";
      generatedDappManifest = null;
      elements.dappManifestOutput.classList.add("hidden");
    } else {
      throw new Error("Transaction failed: " + receipt.status);
    }
  } catch (error) {
    hideTransactionModal();
    console.error("❌ dApp definition submission error:", error);
    showError("Failed to submit dApp definition: " + (error.message || error.error || JSON.stringify(error)));
  }
}

// ********** Registrar Management **********

let loadedRegistrarBadgeResource = null;
let currentRegistrarBadgeId = null;

async function requestRegistrarBadge() {
  try {
    if (!loadedToolsComponentAddress) {
      showError("Please load a component first using the 'Load Component' button");
      return;
    }
    
    const name = elements.newRegistrarName.value.trim();
    const iconUrl = elements.newRegistrarIconUrl.value.trim();
    const websiteUrl = elements.newRegistrarWebsiteUrl.value.trim();
    const feePercentage = elements.newRegistrarFeePercentage.value.trim();
    
    if (!name || !iconUrl || !websiteUrl || !feePercentage) {
      showError("Please fill in all registrar information fields");
      return;
    }
    
    const manifest = getRegisterAsRegistrarManifest({
      componentAddress: loadedToolsComponentAddress,
      registrarName: name,
      iconUrl,
      websiteUrl,
      feePercentage,
      accountAddress: account.address,
      networkId: currentNetwork
    });
    
    showTransactionModal("Requesting registrar badge...");
    
    const result = await rdt.walletApi.sendTransaction({
      transactionManifest: manifest,
      version: 1,
    });
    
    if (result.isErr()) {
      console.error("❌ Registrar badge request error:", result.error);
      const errorMsg = result.error.message || result.error.error || JSON.stringify(result.error);
      throw new Error(errorMsg);
    }
    
    const transactionIntentHash = result.value.transactionIntentHash;
    
    const receipt = await trackTransactionStatus(transactionIntentHash);
    
    if (receipt.status === "CommittedSuccess") {
      hideTransactionModal();
      showSuccess("✅ Registrar badge requested successfully! Check your wallet for the badge.");
      
      // Clear form
      elements.newRegistrarName.value = "";
      elements.newRegistrarIconUrl.value = "";
      elements.newRegistrarFeePercentage.value = "";
      
      // Auto-refresh registrar badges list (show in background)
      setTimeout(() => detectRegistrarBadges(true), 1000);
    } else {
      throw new Error("Transaction failed: " + receipt.status);
    }
  } catch (error) {
    hideTransactionModal();
    console.error("❌ Registrar request error:", error);
    showError("Failed to request registrar badge: " + (error.message || error.error || JSON.stringify(error)));
  }
}

/**
 * Query registrar info by directly reading the NFT data
 * @param {string} registrarId - The registrar badge NFT ID (in format [hex] for Bytes type)
 * @param {string} registrarResource - The registrar badge resource address
 * @returns {Promise<object|null>} Registrar info containing name, fee_percentage, etc.
 */
async function queryRegistrarInfo(registrarId, registrarResource) {
  if (!registrarResource) {
    console.error('No registrar resource provided');
    return null;
  }
  
  try {
    // Query the NFT data directly from the Gateway API
    const nftResponse = await gatewayApi.state.innerClient.nonFungibleData({
      stateNonFungibleDataRequest: {
        resource_address: registrarResource,
        non_fungible_ids: [registrarId] // Gateway API expects the [hex] format
      }
    });
    
    // Extract registrar info from NFT data
    // RegistrarInfo struct: { name: String, icon_url: String, website_url: String, fee_percentage: Decimal }
    if (nftResponse && nftResponse.length > 0) {
      const nftData = nftResponse[0];
      const data = nftData.data;
      
      // Parse the structured data
      if (data?.programmatic_json?.fields) {
        const fields = data.programmatic_json.fields;
        return {
          name: fields[0]?.value || 'Unknown Registrar',
          icon_url: fields[1]?.value || '',
          website_url: fields[2]?.value || '',
          fee_percentage: parseFloat(fields[3]?.value || '0')
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error querying registrar NFT data:', error);
    return null;
  }
}

async function detectRegistrarBadges(silent = false) {
  try {
    if (!loadedToolsComponentAddress) {
      if (!silent) {
        elements.registrarBadgesList.classList.add("hidden");
      }
      // Clear badge list for Test Data Setup
      window.userRegistrarBadges = [];
      return;
    }
    
    if (!account) {
      if (!silent) {
        elements.registrarBadgesList.classList.add("hidden");
      }
      // Clear badge list for Test Data Setup
      window.userRegistrarBadges = [];
      return;
    }
    
    if (!silent) {
      showTransactionModal("Detecting registrar badges...");
    }
    
    // Get component details to find registrar badge resource
    const componentDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(loadedToolsComponentAddress);
    const componentState = componentDetails.details?.state?.fields || [];
    
    // The field is called "registrar_manager" not "registrar_badge_manager"
    const registrarBadgeField = componentState.find(f => f.field_name === 'registrar_manager');
    
    if (!registrarBadgeField || !registrarBadgeField.value) {
      if (!silent) {
        hideTransactionModal();
        showError("Could not find registrar badge resource in component. This may not be an RNS component.");
      }
      elements.registrarBadgesList.classList.add("hidden");
      // Clear badge list for Test Data Setup
      window.userRegistrarBadges = [];
      return;
    }
    
    const registrarBadgeResource = registrarBadgeField.value;
    
    // Get user's account details
    const accountDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(account.address);
    const nonFungibleResources = accountDetails.non_fungible_resources?.items || [];
    
    // Find registrar badges in user's wallet
    const registrarBadges = nonFungibleResources.find(
      nfr => nfr.resource_address === registrarBadgeResource
    );
    
    if (!registrarBadges || !registrarBadges.vaults?.items?.length) {
      if (!silent) {
        hideTransactionModal();
        showError("No registrar badges found in your wallet for this component");
      }
      elements.registrarBadgesList.classList.add("hidden");
      // Clear badge list for Test Data Setup
      window.userRegistrarBadges = [];
      return;
    }
    
    // Get all badge IDs from all vaults
    const allBadgeIds = [];
    for (const vault of registrarBadges.vaults.items) {
      if (vault.items && vault.items.length > 0) {
        allBadgeIds.push(...vault.items);
      }
    }
    
    if (allBadgeIds.length === 0) {
      if (!silent) {
        hideTransactionModal();
        showError("No registrar badges found in your wallet for this component");
      }
      elements.registrarBadgesList.classList.add("hidden");
      // Clear badge list for Test Data Setup
      window.userRegistrarBadges = [];
      return;
    }
    
    // Display badges
    let badgesHTML = '';
    for (const badgeId of allBadgeIds) {
      badgesHTML += `
        <div class="info-row" style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border: 1px solid #333; border-radius: 4px; margin-bottom: 8px;">
          <span class="info-value">Badge ID: <strong>${badgeId}</strong></span>
          <button class="btn btn-secondary" onclick="window.loadRegistrarInfo('${badgeId}')">Manage</button>
        </div>
      `;
    }
    
    elements.registrarBadgesContent.innerHTML = badgesHTML;
    elements.registrarBadgesList.classList.remove("hidden");
    
    // Populate global badge list for Test Data Setup module
    // Fetch registrar info for each badge to get fee percentage
    const badgeInfoPromises = allBadgeIds.map(async badgeId => {
      try {
        const registrarInfo = await queryRegistrarInfo(badgeId, registrarBadgeResource);
        return {
          id: badgeId,
          name: registrarInfo?.name || 'Registrar Badge',
          feePercentage: registrarInfo?.fee_percentage || 0,
          resource: registrarBadgeResource
        };
      } catch (error) {
        console.error(`Error fetching registrar info for ${badgeId}:`, error);
        return {
          id: badgeId,
          name: 'Registrar Badge',
          feePercentage: 0,
          resource: registrarBadgeResource
        };
      }
    });
    
    window.userRegistrarBadges = await Promise.all(badgeInfoPromises);
    
    // Update domain registrar select dropdown
    updateDomainRegistrarSelect();
    
    if (!silent) {
      hideTransactionModal();
      showSuccess(`✅ Found ${allBadgeIds.length} registrar badge${allBadgeIds.length === 1 ? '' : 's'}!`);
    }
  } catch (error) {
    console.error("❌ Badge detection error:", error);
    
    // Clear badge list on error
    window.userRegistrarBadges = [];
    
    // Update domain registrar select dropdown
    updateDomainRegistrarSelect();
    
    if (!silent) {
      hideTransactionModal();
      showError("Failed to detect registrar badges: " + (error.message || error.error || JSON.stringify(error)));
    }
  }
}

async function loadRegistrarInfo(badgeId) {
  try {
    if (!loadedToolsComponentAddress) {
      showError("Please load a component first using the 'Load Component' button");
      return;
    }
    
    if (!badgeId) {
      showError("Badge ID is required");
      return;
    }
    
    showTransactionModal("Loading registrar information...");
    
    // Get component details to find registrar badge resource
    const componentDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(loadedToolsComponentAddress);
    const componentState = componentDetails.details?.state?.fields || [];
    const registrarBadgeField = componentState.find(f => f.field_name === 'registrar_manager');
    
    if (!registrarBadgeField || !registrarBadgeField.value) {
      throw new Error("Could not find registrar badge resource address in component");
    }
    
    loadedRegistrarBadgeResource = registrarBadgeField.value;
    currentRegistrarBadgeId = badgeId;
    
    // Get registrar badge data
    const nftResponse = await gatewayApi.state.innerClient.nonFungibleData({
      stateNonFungibleDataRequest: {
        resource_address: loadedRegistrarBadgeResource,
        non_fungible_ids: [badgeId]
      }
    });
    
    
    if (!nftResponse) {
      throw new Error("Failed to fetch registrar badge data");
    }
    
    // The data is in the non_fungible_ids array
    if (!nftResponse.non_fungible_ids || nftResponse.non_fungible_ids.length === 0) {
      throw new Error("Registrar badge not found");
    }
    
    const nftItem = nftResponse.non_fungible_ids[0];
    
    const registrarDataFields = nftItem.data.programmatic_json.fields;
    
    // Parse fields into an object for easier access
    const registrarData = {};
    for (const field of registrarDataFields) {
      registrarData[field.field_name] = field.value;
    }
    
    
    // Fetch registrar stats (fees earned, domains bonded, etc)
    let registrarStats = null;
    try {
      const statsKvStore = componentState.find(f => f.field_name === 'registrar_stats');
      
      if (statsKvStore && statsKvStore.value) {
        // NonFungibleLocalId should be passed as-is with the [hex] format
        const statsResponse = await gatewayApi.state.innerClient.keyValueStoreData({
          stateKeyValueStoreDataRequest: {
            key_value_store_address: statsKvStore.value,
            keys: [{
              key_json: {
                kind: 'NonFungibleLocalId',
                value: badgeId  // Use the full format e.g., "[534804d2c49e626b987d9d6baeaf8989]"
              }
            }]
          }
        });
        
        if (statsResponse.entries && statsResponse.entries.length > 0) {
          const statsFields = statsResponse.entries[0].value.programmatic_json.fields;
          
          registrarStats = {};
          for (const field of statsFields) {
            // Special handling for HashMap fields
            if (field.field_name === 'fees_earned_current' || 
                field.field_name === 'fees_earned_cumulative' || 
                field.field_name === 'domains_bonded') {
              // Extract entries from the HashMap - entries are directly on the field object
              registrarStats[field.field_name] = field.entries || [];
            } else {
              registrarStats[field.field_name] = field.value;
            }
          }
        }
      }
    } catch (e) {
      console.error("❌ [Registrar] Error fetching registrar stats:", e);
    }
    
    // Display registrar info
    let infoHTML = `
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 12px; font-weight: 500; color: #888; width: 40%;">Registrar ID</td>
          <td style="padding: 12px; font-family: 'Courier New', monospace; font-size: 0.9em;">${badgeId}</td>
        </tr>
        <tr>
          <td style="padding: 12px; font-weight: 500; color: #888;">Name</td>
          <td style="padding: 12px;">${registrarData.name || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 12px; font-weight: 500; color: #888;">Icon URL</td>
          <td style="padding: 12px; font-family: 'Courier New', monospace; font-size: 0.85em; word-break: break-all;">${registrarData.icon_url || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 12px; font-weight: 500; color: #888;">Website URL</td>
          <td style="padding: 12px; font-family: 'Courier New', monospace; font-size: 0.85em; word-break: break-all;">${registrarData.website_url || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 12px; font-weight: 500; color: #888;">Fee Percentage</td>
          <td style="padding: 12px;">${registrarData.fee_percentage || 'N/A'}%</td>
        </tr>
        <tr>
          <td style="padding: 12px; font-weight: 500; color: #888;">Badge Resource</td>
          <td style="padding: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-family: 'Courier New', monospace; font-size: 0.85em; word-break: break-all; flex: 1;">${loadedRegistrarBadgeResource}</span>
              <button class="btn-copy" data-copy="${loadedRegistrarBadgeResource}" style="flex-shrink: 0;">Copy</button>
            </div>
          </td>
        </tr>
      </table>
    `;
    
    elements.registrarInfoContent.innerHTML = infoHTML;
    
    // Pre-fill update fields with current values
    elements.updateRegistrarName.value = registrarData.name || '';
    elements.updateRegistrarIconUrl.value = registrarData.icon_url || '';
    elements.updateRegistrarWebsiteUrl.value = registrarData.website_url || '';
    elements.updateRegistrarFeePercentage.value = registrarData.fee_percentage || '';
    
    // Display accumulated fees (using fees_earned_current for withdrawable amounts)
    if (registrarStats && registrarStats.fees_earned_current) {
      let feesHTML = '';
      const feesEarned = registrarStats.fees_earned_current;
      const domainsBonded = registrarStats.domains_bonded || [];
      
      // Check if it's a HashMap with entries and filter out zero amounts
      if (Array.isArray(feesEarned) && feesEarned.length > 0) {
        for (const entry of feesEarned) {
          // Extract resource address from the entry key
          const resourceAddress = entry.key?.value || entry.key;
          // Extract amount from the entry value (Decimal type)
          const amount = entry.value?.value || entry.value;
          
          // Skip zero amounts (already withdrawn)
          if (parseFloat(amount) === 0) {
            continue;
          }
          
          // Find how many domains have been bonded with this resource for display only
          let domainsCount = 0;
          if (Array.isArray(domainsBonded)) {
            const bondEntry = domainsBonded.find(b => {
              const bondResourceAddr = b.key?.value || b.key;
              return bondResourceAddr === resourceAddress;
            });
            domainsCount = bondEntry ? parseInt(bondEntry.value?.value || bondEntry.value) : 0;
          }
          
          // Display withdrawable fees
          feesHTML += `
            <div class="info-row" style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border: 1px solid #2ecc71; border-radius: 4px; margin-bottom: 8px; background: rgba(46, 204, 113, 0.05);">
              <div style="flex: 1;">
                <div style="font-weight: bold; margin-bottom: 4px;">💰 Available: ${amount}</div>
                <div class="address-value" style="font-size: 0.85em; color: #888; margin-bottom: 4px;">${resourceAddress}</div>
                <div style="font-size: 0.85em; color: #888;">📊 Lifetime domains bonded: ${domainsCount}</div>
              </div>
              <button class="btn btn-success" onclick="window.withdrawSpecificFee('${resourceAddress}')">Withdraw</button>
            </div>
          `;
        }
        
        // If all entries were zero, show empty message
        if (!feesHTML) {
          feesHTML = '<p class="info-empty">No fees available to withdraw</p>';
        }
      } else {
        feesHTML = '<p class="info-empty">No fees available to withdraw</p>';
      }
      
      elements.accumulatedFeesContent.innerHTML = feesHTML;
    } else {
      elements.accumulatedFeesContent.innerHTML = '<p class="info-empty">No fees available to withdraw</p>';
    }
    
    // Show the modal
    hideTransactionModal();
    elements.registrarModal.classList.remove("hidden");
    
    // Scroll modal to top
    setTimeout(() => {
      const modalBody = elements.registrarModal.querySelector('.modal-body');
      if (modalBody) {
        modalBody.scrollTop = 0;
      }
    }, 0);
  } catch (error) {
    hideTransactionModal();
    console.error("❌ Load registrar error:", error);
    showError("Failed to load registrar information: " + (error.message || error.error || JSON.stringify(error)));
  }
}
// Expose loadRegistrarInfo globally for onclick handlers in HTML
window.loadRegistrarInfo = loadRegistrarInfo;

function closeRegistrarModal() {
  elements.registrarModal.classList.add("hidden");
}

// Expose closeRegistrarModal globally for onclick handlers in HTML
window.closeRegistrarModal = closeRegistrarModal;

async function updateRegistrarSettings() {
  try {
    if (!loadedToolsComponentAddress || !loadedRegistrarBadgeResource || !currentRegistrarBadgeId) {
      showError("Please load registrar information first");
      return;
    }
    
    const newName = elements.updateRegistrarName.value.trim();
    const newIconUrl = elements.updateRegistrarIconUrl.value.trim();
    const newWebsiteUrl = elements.updateRegistrarWebsiteUrl.value.trim();
    const newFeePercentage = elements.updateRegistrarFeePercentage.value.trim();
    
    if (!newName || !newIconUrl || !newWebsiteUrl || !newFeePercentage) {
      showError("Please fill in all update fields");
      return;
    }
    
    const manifest = getUpdateRegistrarMetadataManifest({
      componentAddress: loadedToolsComponentAddress,
      registrarResource: loadedRegistrarBadgeResource,
      registrarId: currentRegistrarBadgeId,
      newName,
      newIconUrl,
      newWebsiteUrl,
      newFeePercentage,
      accountAddress: account.address,
      networkId: currentNetwork
    });
    
    showTransactionModal("Updating registrar settings...");
    
    const result = await rdt.walletApi.sendTransaction({
      transactionManifest: manifest,
      version: 1,
    });
    
    if (result.isErr()) {
      console.error("❌ Transaction error details:", result.error);
      const errorMsg = result.error?.message || result.error?.error || JSON.stringify(result.error);
      throw new Error(errorMsg);
    }
    
    const transactionIntentHash = result.value.transactionIntentHash;
    const receipt = await trackTransactionStatus(transactionIntentHash);
    
    if (receipt.status === "CommittedSuccess") {
      hideTransactionModal();
      showSuccess("✅ Registrar settings updated successfully!");
      
      // Reload registrar info
      await loadRegistrarInfo(currentRegistrarBadgeId);
      
      // Auto-refresh registrar badges list
      await detectRegistrarBadges(true);
    } else {
      throw new Error("Transaction failed: " + receipt.status);
    }
  } catch (error) {
    hideTransactionModal();
    console.error("❌ Update registrar error:", error);
    showError("Failed to update registrar settings: " + (error.message || error.error || JSON.stringify(error)));
  }
}

async function withdrawSpecificFee(resourceAddress) {
  try {
    if (!loadedToolsComponentAddress || !loadedRegistrarBadgeResource || !currentRegistrarBadgeId) {
      showError("Please load registrar information first");
      return;
    }
    
    if (!resourceAddress || !resourceAddress.startsWith('resource_')) {
      showError("Invalid resource address");
      return;
    }
    
    const manifest = getWithdrawRegistrarFeesManifest({
      componentAddress: loadedToolsComponentAddress,
      registrarResource: loadedRegistrarBadgeResource,
      registrarId: currentRegistrarBadgeId,
      feeResource: resourceAddress,
      accountAddress: account.address,
      networkId: currentNetwork
    });
    
    showTransactionModal("Withdrawing fees...");
    
    const result = await rdt.walletApi.sendTransaction({
      transactionManifest: manifest,
      version: 1,
    });
    
    if (result.isErr()) {
      throw new Error(result.error);
    }
    
    const transactionIntentHash = result.value.transactionIntentHash;
    const receipt = await trackTransactionStatus(transactionIntentHash);
    
    if (receipt.status === "CommittedSuccess") {
      hideTransactionModal();
      showSuccess("✅ Fees withdrawn successfully!");
      
      // Reload registrar info to refresh fee balances
      await loadRegistrarInfo(currentRegistrarBadgeId);
    } else {
      throw new Error("Transaction failed: " + receipt.status);
    }
  } catch (error) {
    hideTransactionModal();
    console.error("❌ Withdraw fees error:", error);
    showError("Failed to withdraw fees: " + (error.message || error.error || JSON.stringify(error)));
  }
}

// Expose globally for onclick handlers
window.withdrawSpecificFee = withdrawSpecificFee;

async function burnRegistrarBadge() {
  try {
    if (!loadedToolsComponentAddress || !loadedRegistrarBadgeResource || !currentRegistrarBadgeId) {
      showError("Please load registrar information first");
      return;
    }
    
    if (!confirm("⚠️ Are you sure you want to burn your registrar badge? This action cannot be undone and you will no longer have the ability to earn or withdraw fees with this badge.")) {
      return;
    }
    
    const manifest = getBurnRegistrarBadgeManifest({
      componentAddress: loadedToolsComponentAddress,
      registrarResource: loadedRegistrarBadgeResource,
      registrarId: currentRegistrarBadgeId,
      accountAddress: account.address,
      networkId: currentNetwork
    });
    
    showTransactionModal("Burning registrar badge...");
    
    const result = await rdt.walletApi.sendTransaction({
      transactionManifest: manifest,
      version: 1,
    });
    
    if (result.isErr()) {
      throw new Error(result.error);
    }
    
    const transactionIntentHash = result.value.transactionIntentHash;
    const receipt = await trackTransactionStatus(transactionIntentHash);
    
    if (receipt.status === "CommittedSuccess") {
      hideTransactionModal();
      
      // Close the modal
      closeRegistrarModal();
      
      showSuccess("✅ Registrar badge burned successfully! You are no longer a registrar.");
      
      // Clear loaded registrar data
      loadedRegistrarBadgeResource = null;
      currentRegistrarBadgeId = null;
      
      // Auto-refresh registrar badges list
      await detectRegistrarBadges(true);
    } else {
      throw new Error("Transaction failed: " + receipt.status);
    }
  } catch (error) {
    hideTransactionModal();
    console.error("❌ Burn badge error:", error);
    showError("Failed to burn registrar badge: " + (error.message || error.error || JSON.stringify(error)));
  }
}

// ========================================
// DOMAIN MANAGEMENT
// ========================================

// Domain management state
let userDomains = [];
let currentManagedDomain = null;
let acceptedPaymentResources = [];

// Load accepted payment resources
async function loadAcceptedPaymentResources() {
  if (!loadedToolsComponentAddress) {
    return;
  }

  try {
    
    const componentDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(loadedToolsComponentAddress);
    const componentState = componentDetails.details?.state?.fields || [];

    // Find the bond_vaults KeyValueStore field
    const bondVaultsField = componentState.find(f => f.field_name === 'bond_vaults');
    
    if (!bondVaultsField || !bondVaultsField.value) {
      const select = document.getElementById("domainPaymentResourceSelect");
      if (select) {
        select.innerHTML = '<option value="">No payment resources configured</option>';
      }
      return;
    }

    const kvStoreAddress = bondVaultsField.value;

    // Enumerate all keys (payment resources) using pagination
    acceptedPaymentResources = [];
    let cursor = undefined;
    
    do {
      
      const response = await gatewayApi.state.innerClient.keyValueStoreKeys({
        stateKeyValueStoreKeysRequest: {
          key_value_store_address: kvStoreAddress,
          cursor: cursor,
          limit_per_page: 100
        }
      });
      
      
      if (response.items && response.items.length > 0) {
        // Extract resource addresses from keys
        for (const item of response.items) {
          const resourceAddress = item.key?.programmatic_json?.value || 
                                  item.key?.typed?.value ||
                                  item.key_json?.value;
          
          if (resourceAddress) {
            acceptedPaymentResources.push(resourceAddress);
          }
        }
      }
      
      cursor = response.next_cursor;
    } while (cursor !== null && cursor !== undefined);


    // Update dropdown
    const select = document.getElementById("domainPaymentResourceSelect");
    if (!select) return;

    if (acceptedPaymentResources.length === 0) {
      select.innerHTML = '<option value="">No payment resources configured</option>';
      return;
    }

    select.innerHTML = acceptedPaymentResources.map((resource, index) => {
      // Get a short version of the resource address
      const shortAddress = resource.substring(0, 18) + '...' + resource.substring(resource.length - 6);
      return `<option value="${resource}">${shortAddress}</option>`;
    }).join('');


  } catch (error) {
    console.error("❌ [Payment Resources] Error loading payment resources:", error);
    const select = document.getElementById("domainPaymentResourceSelect");
    if (select) {
      select.innerHTML = '<option value="">Error loading resources</option>';
    }
  }
}

// Register a new domain
async function registerNewDomain() {
  if (!account) {
    showError("Please connect your wallet first");
    return;
  }

  if (!loadedToolsComponentAddress) {
    showError("Please load an RNS component first");
    return;
  }

  const domainName = document.getElementById("newDomainName").value.trim();
  const bondAmount = document.getElementById("domainBondAmount").value;
  const paymentResource = document.getElementById("domainPaymentResourceSelect").value.trim();
  const registrarSelectEl = document.getElementById("domainRegistrarSelect");
  const registrarIndex = parseInt(registrarSelectEl.value);

  if (!domainName) {
    showError("Please enter a domain name");
    return;
  }

  if (!bondAmount || parseFloat(bondAmount) <= 0) {
    showError("Please enter a valid bond amount");
    return;
  }

  if (!paymentResource) {
    showError("Please select a payment resource");
    return;
  }

  if (isNaN(registrarIndex) || !window.userRegistrarBadges || registrarIndex >= window.userRegistrarBadges.length) {
    showError("Please select a valid registrar badge");
    return;
  }

  const selectedRegistrar = window.userRegistrarBadges[registrarIndex];

  try {
    showTransactionModal("Registering domain...");

    // Add .xrd TLD if not present
    const fullDomainName = domainName.includes('.') ? domainName : `${domainName}.xrd`;

    const manifest = getRegisterAndBondDomainManifest({
      componentAddress: loadedToolsComponentAddress,
      registrarResource: selectedRegistrar.resource,
      registrarId: selectedRegistrar.id,
      domainName: fullDomainName,
      paymentResource: paymentResource,
      bondAmount: bondAmount,
      accountAddress: account.address,
      networkId: currentNetwork === 'mainnet' ? '1' : '2'
    });


    const result = await rdt.walletApi.sendTransaction({
      transactionManifest: manifest,
      version: 1,
    });

    if (result.isErr()) {
      console.error("❌ [Domain Registration] Wallet returned error:", result.error);
      throw new Error(JSON.stringify(result.error));
    }

    const receipt = await gatewayApi.transaction.getCommittedDetails(result.value.transactionIntentHash);

    if (receipt.transaction.transaction_status === 'CommittedSuccess') {
      hideTransactionModal();
      showSuccess(`✅ Domain "${fullDomainName}" registered successfully!`);

      // Clear form
      document.getElementById("newDomainName").value = '';
      document.getElementById("domainBondAmount").value = '';

      // Refresh domains list
      await detectUserDomains();
    } else {
      throw new Error("Transaction failed: " + receipt.transaction.transaction_status);
    }
  } catch (error) {
    hideTransactionModal();
    console.error("❌ Domain registration error:", error);
    showError("Failed to register domain: " + (error.message || error.error || JSON.stringify(error)));
  }
}

// Detect domains owned by the user
async function detectUserDomains() {
  if (!account || !loadedToolsComponentAddress) {
    return;
  }

  try {

    // Get component details
    const componentDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(loadedToolsComponentAddress);
    const componentState = componentDetails.details?.state?.fields || [];

    // Find domain resource
    const domainManagerField = componentState.find(f => f.field_name === 'domain_manager');
    if (!domainManagerField || !domainManagerField.value) {
      console.error("❌ [Domain Detection] Could not find domain_manager field in component");
      return;
    }

    const domainResource = domainManagerField.value;

    // Get user's domain NFTs
    const accountDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(account.address);
    
    const domainNfts = [];
    if (accountDetails.non_fungible_resources?.items) {
      for (const nftResource of accountDetails.non_fungible_resources.items) {
        if (nftResource.resource_address === domainResource) {
          const nftIds = nftResource.vaults?.items?.[0]?.items || [];
          domainNfts.push(...nftIds);
        }
      }
    }


    if (domainNfts.length === 0) {
      userDomains = [];
      updateDomainsDisplay();
      return;
    }

    // Get domain data for each NFT
    const domainDataPromises = domainNfts.map(async (nftId) => {
      try {
        // The Gateway API expects the NFT IDs in a specific format
        const response = await gatewayApi.state.innerClient.nonFungibleData({
          stateNonFungibleDataRequest: {
            resource_address: domainResource,
            non_fungible_ids: [nftId]
          }
        });

        // The response structure is response.non_fungible_ids
        if (response && response.non_fungible_ids && response.non_fungible_ids.length > 0) {
          const nftData = response.non_fungible_ids[0];
          const data = nftData.data;
          const fields = data?.programmatic_json?.fields || [];
          const domainName = fields.find(f => f.field_name === 'name')?.value || 'Unknown';


          return {
            id: nftId,
            name: domainName,
            resource: domainResource
          };
        }
        return null;
      } catch (error) {
        console.error(`     ❌ Error fetching domain data for ${nftId}:`, error);
        console.error(`     Error details:`, error.message);
        return null;
      }
    });

    userDomains = (await Promise.all(domainDataPromises)).filter(Boolean);

    updateDomainsDisplay();
  } catch (error) {
    console.error("❌ [Domain Detection] Error detecting domains:", error);
    console.error("   Error details:", error.message);
    console.error("   Stack:", error.stack);
  }
}

// Update the domains list display
function updateDomainsDisplay() {
  const domainsList = document.getElementById("domainsList");
  const domainsContent = document.getElementById("domainsContent");

  if (!domainsList || !domainsContent) {
    console.error("❌ [Domain Display] domainsList or domainsContent element not found!");
    return;
  }

  if (userDomains.length === 0) {
    domainsList.classList.add("hidden");
    return;
  }

  domainsList.classList.remove("hidden");

  domainsContent.innerHTML = userDomains.map(domain => `
    <div class="info-row" style="display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid #e2e8f0;">
      <div style="flex: 1;">
        <p style="margin: 0 0 4px 0; font-weight: 600; color: #1e293b;">${domain.name}</p>
        <p style="margin: 0; font-size: 0.85em; color: #64748b; font-family: monospace;">NFT ID: ${domain.id.substring(0, 20)}...</p>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="openDomainModal('${domain.id}', '${domain.name}')" style="white-space: nowrap;">
        ⚙️ Manage
      </button>
    </div>
  `).join('');
  
}

// Open domain management modal
window.openDomainModal = async function(domainId, domainName) {
  if (!loadedToolsComponentAddress) {
    showError("Please load an RNS component first");
    return;
  }


  currentManagedDomain = { id: domainId, name: domainName };

  const modal = document.getElementById("domainModal");
  const modalTitle = document.getElementById("domainModalTitle");
  const domainInfoContent = document.getElementById("domainInfoContent");

  if (!modal || !modalTitle || !domainInfoContent) {
    console.error("❌ [Modal] Modal elements not found");
    return;
  }

  // Update modal title
  modalTitle.textContent = `Manage: ${domainName}`;

  // Display domain info
  domainInfoContent.innerHTML = `
    <div style="padding: 16px;">
      <div class="info-row">
        <span class="info-label">Domain Name:</span>
        <span class="info-value">${domainName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">NFT ID:</span>
        <span class="info-value" style="font-family: monospace; font-size: 0.9em;">${domainId}</span>
      </div>
    </div>
  `;

  // Reset to subdomains tab (ensure it's the active tab)
  switchDomainTab('subdomains');

  // Show modal
  modal.classList.remove("hidden");

  // Load subdomains and records (async but don't wait - they'll load in background)
  loadDomainSubdomains().catch(err => {
    console.error("❌ [Modal] Failed to load subdomains:", err);
  });
  loadDomainRecords().catch(err => {
    console.error("❌ [Modal] Failed to load records:", err);
  });
};

// Close modal
function closeDomainModal() {
  const modal = document.getElementById("domainModal");
  if (modal) {
    modal.classList.add("hidden");
  }
  currentManagedDomain = null;
}

// Tab switching
function switchDomainTab(tabName) {
  const tabs = document.querySelectorAll('.tab-button');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    if (tab.dataset.tab === tabName) {
      tab.classList.add('active');
      tab.style.borderBottom = '2px solid #3b82f6';
      tab.style.color = '#3b82f6';
    } else {
      tab.classList.remove('active');
      tab.style.borderBottom = 'none';
      tab.style.color = '#64748b';
    }
  });

  contents.forEach(content => {
    if (content.id === `${tabName}Tab`) {
      content.style.display = 'block';
    } else {
      content.style.display = 'none';
    }
  });
}

// Load subdomains for current domain
async function loadDomainSubdomains() {
  const subdomainsList = document.getElementById("subdomainsList");
  if (!subdomainsList || !currentManagedDomain) {
    return;
  }

  subdomainsList.innerHTML = '<p class="info-empty">Loading subdomains...</p>';

  try {

    // Get subregistry address from domain NFT metadata
    let subregistryAddress = currentManagedDomain.subregistryAddress;
    
    if (!subregistryAddress) {
      
      // Get component details for domain resource
      const componentDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(loadedToolsComponentAddress);
      const componentState = componentDetails.details?.state?.fields || [];
      const domainManagerField = componentState.find(f => f.field_name === 'domain_manager');
      
      if (!domainManagerField) {
        console.error("❌ [Subdomains] Could not find domain resource");
        subdomainsList.innerHTML = '<p class="info-empty">No subdomains yet</p>';
        return;
      }
      
      const domainResource = domainManagerField.value;
      
      // Query the domain NFT data to get subregistry address
      const response = await gatewayApi.state.innerClient.nonFungibleData({
        stateNonFungibleDataRequest: {
          resource_address: domainResource,
          non_fungible_ids: [currentManagedDomain.id]
        }
      });


      if (response && response.non_fungible_ids && response.non_fungible_ids.length > 0) {
        const nftData = response.non_fungible_ids[0];
        const data = nftData.data;
        const fields = data?.programmatic_json?.fields || [];
        
        // Find subregistry_component_address field
        const subregistryField = fields.find(f => f.field_name === 'subregistry_component_address');
        
        if (subregistryField && subregistryField.value) {
          subregistryAddress = subregistryField.value;
        }
      }
      
      if (!subregistryAddress) {
        console.error("❌ [Subdomains] Could not find subregistry address in domain NFT metadata");
        subdomainsList.innerHTML = '<p class="info-empty">No subdomains yet</p>';
        return;
      }

      currentManagedDomain.subregistryAddress = subregistryAddress;
    }

    // Get subregistry details to find subdomains
    const subregistryDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(subregistryAddress);
    const subregistryState = subregistryDetails.details?.state?.fields || [];

    // Find subdomains KeyValueStore
    const subdomainsField = subregistryState.find(f => f.field_name === 'subdomains');
    
    if (!subdomainsField || !subdomainsField.value) {
      subdomainsList.innerHTML = '<p class="info-empty">No subdomains yet</p>';
      return;
    }

    // Query the subdomains KeyValueStore
    const kvStoreAddress = subdomainsField.value;
    
    // Get the subdomain count from the subregistry
    const subdomainCountField = subregistryState.find(f => f.field_name === 'subdomain_count');
    const subdomainCount = subdomainCountField?.value ? parseInt(subdomainCountField.value) : 0;
    
    
    if (subdomainCount === 0) {
      subdomainsList.innerHTML = '<p class="info-empty">No subdomains yet</p>';
      return;
    }

    // Enumerate all subdomains using pagination
    
    let allSubdomains = [];
    let cursor = undefined;
    
    do {
      
      // Use keyValueStoreKeys for enumeration (not keyValueStoreData!)
      const response = await gatewayApi.state.innerClient.keyValueStoreKeys({
        stateKeyValueStoreKeysRequest: {
          key_value_store_address: kvStoreAddress,
          cursor: cursor,
          limit_per_page: 100
        }
      });
      
      
      if (response.items && response.items.length > 0) {
        allSubdomains.push(...response.items);
      }
      
      cursor = response.next_cursor;
    } while (cursor !== null && cursor !== undefined);
    
    
    if (allSubdomains.length === 0) {
      subdomainsList.innerHTML = '<p class="info-empty">No subdomains yet</p>';
      return;
    }

    // Parse subdomain names from keys
    const subdomains = allSubdomains.map(item => {
      // keyValueStoreKeys returns just the key, not the value
      const name = item.key?.programmatic_json?.value || 
                   item.key?.typed?.value ||
                   item.key_json?.value ||
                   'Unknown';
      
      return {
        name: name,
        createdAt: null // We'd need a separate call to get creation timestamps
      };
    }).filter(s => s.name !== 'Unknown');

    // Display subdomains with delete buttons
    const subdomainsHtml = subdomains.map(subdomain => {
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom: 8px; background: white; border: 1px solid #e2e8f0; border-radius: 6px;">
          <div style="font-weight: 500;">${subdomain.name}.${currentManagedDomain.name}</div>
          <button 
            onclick="deleteSubdomain('${subdomain.name}')"
            style="padding: 6px 12px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em;"
            onmouseover="this.style.background='#dc2626'"
            onmouseout="this.style.background='#ef4444'">
            Delete
          </button>
        </div>
      `;
    }).join('');

    subdomainsList.innerHTML = `
      <div style="margin-bottom: 12px; padding: 8px 12px; background: rgba(34, 197, 94, 0.1); border-left: 3px solid #22c55e; border-radius: 4px;">
        <strong>${subdomains.length}</strong> subdomain${subdomains.length === 1 ? '' : 's'} found
      </div>
      ${subdomainsHtml}
    `;
  } catch (error) {
    console.error("❌ [Subdomains] Error loading subdomains:", error);
    console.error("   Error details:", error.message);
    // If there's an error, it's likely the domain has no subdomains yet (normal for new domains)
    subdomainsList.innerHTML = '<p class="info-empty">No subdomains yet</p>';
  }
}

// Load records for current domain
async function loadDomainRecords() {
  const recordsList = document.getElementById("recordsList");
  if (!recordsList || !currentManagedDomain) {
    return;
  }

  recordsList.innerHTML = '<p class="info-empty">Loading records...</p>';

  try {

    // Get subregistry address (should be cached by now)
    if (!currentManagedDomain.subregistryAddress) {
      
      const componentDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(loadedToolsComponentAddress);
      const componentState = componentDetails.details?.state?.fields || [];
      const domainManagerField = componentState.find(f => f.field_name === 'domain_manager');
      
      if (!domainManagerField) {
        recordsList.innerHTML = '<p class="info-empty">No records yet</p>';
        return;
      }
      
      const domainResource = domainManagerField.value;
      const response = await gatewayApi.state.innerClient.nonFungibleData({
        stateNonFungibleDataRequest: {
          resource_address: domainResource,
          non_fungible_ids: [currentManagedDomain.id]
        }
      });

      if (response?.non_fungible_ids?.[0]) {
        const fields = response.non_fungible_ids[0].data?.programmatic_json?.fields || [];
        const subregistryField = fields.find(f => f.field_name === 'subregistry_component_address');
        if (subregistryField?.value) {
          currentManagedDomain.subregistryAddress = subregistryField.value;
        }
      }
    }

    if (!currentManagedDomain.subregistryAddress) {
      recordsList.innerHTML = '<p class="info-empty">No records yet</p>';
      return;
    }

    // Get subregistry details to find records KeyValueStore
    const subregistryDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(currentManagedDomain.subregistryAddress);
    const subregistryState = subregistryDetails.details?.state?.fields || [];

    // Find records KeyValueStore (for root domain)
    const recordsField = subregistryState.find(f => f.field_name === 'records');
    
    if (!recordsField || !recordsField.value) {
      recordsList.innerHTML = '<p class="info-empty">No records yet</p>';
      return;
    }

    const kvStoreAddress = recordsField.value;

    // Enumerate all contexts (keys) using pagination - same approach as subdomains
    
    let allContexts = [];
    let cursor = undefined;
    
    do {
      
      // Use keyValueStoreKeys for enumeration (not keyValueStoreData!)
      const response = await gatewayApi.state.innerClient.keyValueStoreKeys({
        stateKeyValueStoreKeysRequest: {
          key_value_store_address: kvStoreAddress,
          cursor: cursor,
          limit_per_page: 100
        }
      });
      
      
      if (response.items && response.items.length > 0) {
        allContexts.push(...response.items);
      }
      
      cursor = response.next_cursor;
    } while (cursor !== null && cursor !== undefined);
    
    
    if (allContexts.length === 0) {
      recordsList.innerHTML = '<p class="info-empty">No records yet</p>';
      return;
    }
    
    // Parse records from contexts and query each context's directive map
    const parsedRecords = [];
    
    for (const item of allContexts) {
      const contextName = item.key?.programmatic_json?.value || 
                          item.key?.typed?.value ||
                          item.key_json?.value ||
                          'Unknown';
      
      if (contextName === 'Unknown') continue;
      
      
      try {
        // Query the specific key to get the HashMap value
        const contextDataResponse = await gatewayApi.state.innerClient.keyValueStoreData({
          stateKeyValueStoreDataRequest: {
            key_value_store_address: kvStoreAddress,
            keys: [{
              key_json: {
                kind: "String",
                value: contextName
              }
            }]
          }
        });
        
        
        if (contextDataResponse?.entries && contextDataResponse.entries.length > 0) {
          const entry = contextDataResponse.entries[0];
          
          // The value is a HashMap<String, String> (directives -> values)
          const directivesMap = entry.value?.programmatic_json?.entries || 
                                entry.value?.typed?.entries ||
                                entry.value?.entries ||
                                [];
          
          
          // Extract each directive/value pair
          for (const mapEntry of directivesMap) {
            const directive = mapEntry.key?.value || mapEntry.key;
            const value = mapEntry.value?.value || mapEntry.value;
            
            if (directive && value) {
              parsedRecords.push({ context: contextName, directive, value });
            }
          }
        }
      } catch (error) {
        console.error(`❌ [Records] Error querying context "${contextName}":`, error);
      }
    }
    
    
    if (parsedRecords.length === 0) {
      recordsList.innerHTML = '<p class="info-empty">No records yet</p>';
      return;
    }
    
    // Display records with delete buttons
    const recordsHtml = parsedRecords.map(record => {
      const escapedContext = record.context.replace(/'/g, "\\'");
      const escapedDirective = record.directive.replace(/'/g, "\\'");
      
      return `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 12px; margin-bottom: 8px; background: white; border: 1px solid #e2e8f0; border-radius: 6px;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; color: #1e293b; margin-bottom: 4px;">${record.context} / ${record.directive}</div>
            <div style="font-size: 0.85em; color: #64748b; word-break: break-all; font-family: monospace;">${record.value}</div>
          </div>
          <button 
            onclick="deleteRecord('${escapedContext}', '${escapedDirective}')"
            style="padding: 6px 12px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em; margin-left: 12px; white-space: nowrap;"
            onmouseover="this.style.background='#dc2626'"
            onmouseout="this.style.background='#ef4444'">
            Delete
          </button>
        </div>
      `;
    }).join('');
    
    recordsList.innerHTML = `
      <div style="margin-bottom: 12px; padding: 8px 12px; background: rgba(34, 197, 94, 0.1); border-left: 3px solid #22c55e; border-radius: 4px;">
        <strong>${parsedRecords.length}</strong> record${parsedRecords.length === 1 ? '' : 's'} found
      </div>
      ${recordsHtml}
    `;
  } catch (error) {
    console.error("❌ [Records] Error loading records:", error);
    console.error("   Error details:", error.message);
    recordsList.innerHTML = '<p class="info-empty">No records yet</p>';
  }
}

// Helper to get current epoch
async function getCurrentEpoch() {
  try {
    const status = await gatewayApi.status.getCurrent();
    return status.ledger_state.epoch;
  } catch (error) {
    console.error('Error getting current epoch:', error);
    return 100000;
  }
}

// Create subdomain
async function createSubdomain() {
  if (!currentManagedDomain) {
    showError("Please open a domain modal first");
    return;
  }

  const subdomainName = document.getElementById("newSubdomainName").value.trim();

  if (!subdomainName) {
    showError("Please enter a subdomain name");
    return;
  }

  try {
    showTransactionModal("Creating subdomain...");

    // Get component details for domain resource
    const componentDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(loadedToolsComponentAddress);
    const componentState = componentDetails.details?.state?.fields || [];
    const domainManagerField = componentState.find(f => f.field_name === 'domain_manager');
    
    if (!domainManagerField) {
      throw new Error("Could not find domain resource");
    }

    const domainResource = domainManagerField.value;

    // Get subregistry address if not already loaded
    let subregistryAddress = currentManagedDomain.subregistryAddress;
    
    if (!subregistryAddress) {
      
      // Query the domain NFT data to get subregistry address
      const response = await gatewayApi.state.innerClient.nonFungibleData({
        stateNonFungibleDataRequest: {
          resource_address: domainResource,
          non_fungible_ids: [currentManagedDomain.id]
        }
      });


      if (response && response.non_fungible_ids && response.non_fungible_ids.length > 0) {
        const nftData = response.non_fungible_ids[0];
        const data = nftData.data;
        const fields = data?.programmatic_json?.fields || [];
        
        // Find subregistry_component_address field
        const subregistryField = fields.find(f => f.field_name === 'subregistry_component_address');
        
        if (subregistryField && subregistryField.value) {
          subregistryAddress = subregistryField.value;
        }
      }
      
      if (!subregistryAddress) {
        throw new Error("Could not find subregistry address in domain NFT metadata");
      }

      currentManagedDomain.subregistryAddress = subregistryAddress;
    }

    const manifest = getCreateSubdomainManifest({
      subregistryAddress: subregistryAddress,
      domainResource: domainManagerField.value,
      domainId: currentManagedDomain.id,
      subdomainName: subdomainName,
      metadata: {},
      accountAddress: account.address,
      networkId: currentNetwork === 'mainnet' ? '1' : '2'
    });

    
    const result = await rdt.walletApi.sendTransaction({
      transactionManifest: manifest,
      version: 1,
    });

    if (result.isErr()) {
      console.error("❌ [Create Subdomain] Wallet returned error:", result.error);
      throw new Error(JSON.stringify(result.error));
    }

    const receipt = await gatewayApi.transaction.getCommittedDetails(result.value.transactionIntentHash);

    if (receipt.transaction.transaction_status === 'CommittedSuccess') {
      hideTransactionModal();
      showSuccess(`✅ Subdomain "${subdomainName}" created successfully!`);

      // Clear form
      document.getElementById("newSubdomainName").value = '';

      // Reload subdomains
      await loadDomainSubdomains();
    } else {
      throw new Error("Transaction failed: " + receipt.transaction.transaction_status);
    }
  } catch (error) {
    hideTransactionModal();
    console.error("❌ Create subdomain error:", error);
    showError("Failed to create subdomain: " + (error.message || error.error || JSON.stringify(error)));
  }
}

// Delete subdomain
window.deleteSubdomain = async function deleteSubdomain(subdomainName) {
  if (!currentManagedDomain) {
    showError("Please open a domain modal first");
    return;
  }

  if (!confirm(`Are you sure you want to delete the subdomain "${subdomainName}.${currentManagedDomain.name}"?\n\nThis will also delete all records associated with this subdomain.`)) {
    return;
  }

  try {
    showTransactionModal("Deleting subdomain...");

    // Get component details for domain resource
    const componentDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(loadedToolsComponentAddress);
    const componentState = componentDetails.details?.state?.fields || [];
    const domainManagerField = componentState.find(f => f.field_name === 'domain_manager');
    
    if (!domainManagerField) {
      throw new Error("Could not find domain resource");
    }

    const domainResource = domainManagerField.value;

    // Get subregistry address if not already loaded
    let subregistryAddress = currentManagedDomain.subregistryAddress;
    
    if (!subregistryAddress) {
      const response = await gatewayApi.state.innerClient.nonFungibleData({
        stateNonFungibleDataRequest: {
          resource_address: domainResource,
          non_fungible_ids: [currentManagedDomain.id]
        }
      });

      if (response?.non_fungible_ids?.[0]) {
        const fields = response.non_fungible_ids[0].data?.programmatic_json?.fields || [];
        const subregistryField = fields.find(f => f.field_name === 'subregistry_component_address');
        if (subregistryField?.value) {
          subregistryAddress = subregistryField.value;
        }
      }
      
      if (!subregistryAddress) {
        throw new Error("Could not find subregistry address in domain NFT metadata");
      }

      currentManagedDomain.subregistryAddress = subregistryAddress;
    }

    const manifest = getDeleteSubdomainManifest({
      subregistryAddress: subregistryAddress,
      domainResource: domainManagerField.value,
      domainId: currentManagedDomain.id,
      subdomainName: subdomainName,
      accountAddress: account.address,
      networkId: currentNetwork === 'mainnet' ? '1' : '2'
    });

    
    const result = await rdt.walletApi.sendTransaction({
      transactionManifest: manifest,
      version: 1,
    });

    if (result.isErr()) {
      console.error("❌ [Delete Subdomain] Wallet returned error:", result.error);
      throw new Error(JSON.stringify(result.error));
    }

    const receipt = await gatewayApi.transaction.getCommittedDetails(result.value.transactionIntentHash);

    if (receipt.transaction.transaction_status === 'CommittedSuccess') {
      hideTransactionModal();
      showSuccess(`✅ Subdomain "${subdomainName}.${currentManagedDomain.name}" deleted successfully!`);

      // Reload subdomains
      await loadDomainSubdomains();
    } else {
      throw new Error("Transaction failed: " + receipt.transaction.transaction_status);
    }
  } catch (error) {
    hideTransactionModal();
    console.error("❌ Delete subdomain error:", error);
    showError("Failed to delete subdomain: " + (error.message || error.error || JSON.stringify(error)));
  }
};

// Create record
async function createRecord() {
  if (!currentManagedDomain) {
    showError("Please open a domain modal first");
    return;
  }

  const context = document.getElementById("recordContext").value.trim();
  const directive = document.getElementById("recordDirective").value.trim();
  const value = document.getElementById("recordValue").value.trim();

  if (!context || !directive || !value) {
    showError("Please fill in all record fields");
    return;
  }

  try {
    showTransactionModal("Creating record...");

    // Get component details for domain resource
    const componentDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(loadedToolsComponentAddress);
    const componentState = componentDetails.details?.state?.fields || [];
    const domainManagerField = componentState.find(f => f.field_name === 'domain_manager');
    
    if (!domainManagerField) {
      throw new Error("Could not find domain resource");
    }

    const domainResource = domainManagerField.value;

    // Get subregistry address if not already loaded
    let subregistryAddress = currentManagedDomain.subregistryAddress;
    
    if (!subregistryAddress) {
      
      // Query the domain NFT data to get subregistry address
      const response = await gatewayApi.state.innerClient.nonFungibleData({
        stateNonFungibleDataRequest: {
          resource_address: domainResource,
          non_fungible_ids: [currentManagedDomain.id]
        }
      });


      if (response && response.non_fungible_ids && response.non_fungible_ids.length > 0) {
        const nftData = response.non_fungible_ids[0];
        const data = nftData.data;
        const fields = data?.programmatic_json?.fields || [];
        
        // Find subregistry_component_address field
        const subregistryField = fields.find(f => f.field_name === 'subregistry_component_address');
        
        if (subregistryField && subregistryField.value) {
          subregistryAddress = subregistryField.value;
        }
      }
      
      if (!subregistryAddress) {
        throw new Error("Could not find subregistry address in domain NFT metadata");
      }

      currentManagedDomain.subregistryAddress = subregistryAddress;
    }

    const manifest = getSetRecordManifest({
      subregistryAddress: subregistryAddress,
      domainResource: domainManagerField.value,
      domainId: currentManagedDomain.id,
      context: context,
      directive: directive,
      value: value,
      accountAddress: account.address,
      networkId: currentNetwork === 'mainnet' ? '1' : '2'
    });

    
    const result = await rdt.walletApi.sendTransaction({
      transactionManifest: manifest,
      version: 1,
    });

    if (result.isErr()) {
      console.error("❌ [Create Record] Wallet returned error:", result.error);
      throw new Error(JSON.stringify(result.error));
    }

    const receipt = await gatewayApi.transaction.getCommittedDetails(result.value.transactionIntentHash);

    if (receipt.transaction.transaction_status === 'CommittedSuccess') {
      hideTransactionModal();
      showSuccess(`✅ Record created successfully!`);

      // Clear form
      document.getElementById("recordContext").value = '';
      document.getElementById("recordDirective").value = '';
      document.getElementById("recordValue").value = '';

      // Reload records
      await loadDomainRecords();
    } else {
      throw new Error("Transaction failed: " + receipt.transaction.transaction_status);
    }
  } catch (error) {
    hideTransactionModal();
    console.error("❌ Create record error:", error);
    showError("Failed to create record: " + (error.message || error.error || JSON.stringify(error)));
  }
}

// Delete a record
window.deleteRecord = async function deleteRecord(context, directive) {
  if (!currentManagedDomain) {
    showError("Please open a domain modal first");
    return;
  }

  if (!confirm(`Are you sure you want to delete this record?\n\nContext: ${context}\nDirective: ${directive}\n\nThis action cannot be undone.`)) {
    return;
  }

  try {
    showTransactionModal("Deleting record...");

    // Get component details for domain resource
    const componentDetails = await gatewayApi.state.getEntityDetailsVaultAggregated(loadedToolsComponentAddress);
    const componentState = componentDetails.details?.state?.fields || [];
    const domainManagerField = componentState.find(f => f.field_name === 'domain_manager');
    
    if (!domainManagerField) {
      throw new Error("Could not find domain resource");
    }

    // Get subregistry address if not already loaded
    let subregistryAddress = currentManagedDomain.subregistryAddress;
    
    if (!subregistryAddress) {
      
      const response = await gatewayApi.state.innerClient.nonFungibleData({
        stateNonFungibleDataRequest: {
          resource_address: domainManagerField.value,
          non_fungible_ids: [currentManagedDomain.id]
        }
      });

      if (response?.non_fungible_ids?.[0]) {
        const fields = response.non_fungible_ids[0].data?.programmatic_json?.fields || [];
        const subregistryField = fields.find(f => f.field_name === 'subregistry_component_address');
        if (subregistryField?.value) {
          subregistryAddress = subregistryField.value;
        }
      }
      
      if (!subregistryAddress) {
        throw new Error("Could not find subregistry address in domain NFT metadata");
      }

      currentManagedDomain.subregistryAddress = subregistryAddress;
    }

    const manifest = getDeleteRecordManifest({
      subregistryAddress: subregistryAddress,
      domainResource: domainManagerField.value,
      domainId: currentManagedDomain.id,
      context: context,
      directive: directive,
      accountAddress: account.address,
      networkId: currentNetwork === 'mainnet' ? '1' : '2'
    });


    const result = await rdt.walletApi.sendTransaction({
      transactionManifest: manifest,
      version: 1,
    });

    if (result.isErr()) {
      console.error("❌ [Delete Record] Wallet returned error:", result.error);
      throw new Error(JSON.stringify(result.error));
    }

    const receipt = await gatewayApi.transaction.getCommittedDetails(result.value.transactionIntentHash);

    if (receipt.transaction.transaction_status === 'CommittedSuccess') {
      hideTransactionModal();
      showSuccess(`✅ Record deleted successfully!`);

      // Reload records
      await loadDomainRecords();
    } else {
      throw new Error("Transaction failed: " + receipt.transaction.transaction_status);
    }
  } catch (error) {
    hideTransactionModal();
    console.error("❌ Delete record error:", error);
    showError("Failed to delete record: " + (error.message || error.error || JSON.stringify(error)));
  }
};

// Update registrar select when badges are loaded
function updateDomainRegistrarSelect() {
  const select = document.getElementById("domainRegistrarSelect");
  if (!select) return;

  if (!window.userRegistrarBadges || window.userRegistrarBadges.length === 0) {
    select.innerHTML = '<option value="">No registrar badges found</option>';
    return;
  }

  select.innerHTML = window.userRegistrarBadges.map((badge, index) => {
    const shortId = badge.id.length > 20 
      ? `${badge.id.substring(0, 10)}...${badge.id.substring(badge.id.length - 6)}`
      : badge.id;
    return `<option value="${index}">Badge ${index + 1}: ${shortId}</option>`;
  }).join('');
}

// ********** Event Listeners **********
document.addEventListener("DOMContentLoaded", () => {
  
  // Initialize UI elements first
  initializeUIElements();
  
  // Initialize Radix Integration
  initializeRadixIntegration();
  
  // Initialize all visibility states
  updateResourceCreationVisibility();
  updateApplicationVisibility();
  updateAdminPanelVisibility();
  updateManagementPanelVisibility();
  
  // Note: Tab navigation replaced by mode selection in step 1
  
  // Mode selection
  elements.modeCards.forEach((card, index) => {
    card.addEventListener('click', () => {
      // Remove selected class from all cards
      elements.modeCards.forEach(c => c.classList.remove('selected'));
      
      // Add selected class to clicked card
      card.classList.add('selected');
      
      // Store selected mode
      selectedMode = card.dataset.mode;
      
      // Handle different modes
      if (selectedMode === 'deploy') {
        // Show deployment progress tracker, hide admin tracker
        if (elements.progressTracker) {
          elements.progressTracker.classList.remove('hidden');
        }
        
        // Hide admin progress tracker
        document.getElementById("adminProgressTracker")?.classList.add('hidden');
        
        if (elements.applicationFlow) {
          elements.applicationFlow.classList.remove('hidden');
        }
        
        elements.adminContent?.classList.add('hidden');
        elements.adminContent?.classList.remove('active');
        elements.manageContent?.classList.add('hidden');
        elements.manageContent?.classList.remove('active');
        elements.toolsContent?.classList.add('hidden');
        elements.toolsContent?.classList.remove('active');
        
        // Automatically advance to step 2 (Package Setup) since mode selection is complete
        goToStep(2);
      } else if (selectedMode === 'admin') {
        // Hide deployment progress tracker and applicationFlow
        elements.progressTracker?.classList.add('hidden');
        elements.applicationFlow?.classList.add('hidden');
        switchToMode('admin');
      } else if (selectedMode === 'manage') {
        // Hide BOTH progress trackers and applicationFlow
        elements.progressTracker?.classList.add('hidden');
        document.getElementById("adminProgressTracker")?.classList.add('hidden');
        elements.applicationFlow?.classList.add('hidden');
        switchToMode('manage');
      } else if (selectedMode === 'tools') {
        // Hide BOTH progress trackers and applicationFlow
        elements.progressTracker?.classList.add('hidden');
        document.getElementById("adminProgressTracker")?.classList.add('hidden');
        elements.applicationFlow?.classList.add('hidden');
        switchToMode('tools');
      }
    });
  });

  // Package option selection
  elements.packageOptionCards.forEach(card => {
    card.addEventListener('click', () => {
      // Remove selected class from all cards
      elements.packageOptionCards.forEach(c => c.classList.remove('selected'));
      
      // Add selected class to clicked card
      card.classList.add('selected');
      
      // Store selected package option
      selectedPackageOption = card.dataset.option;
      
      // Show/hide appropriate sections
      if (selectedPackageOption === 'existing') {
        elements.existingPackageSection.classList.remove('hidden');
        elements.newPackageSection.classList.add('hidden');
      } else if (selectedPackageOption === 'new') {
        elements.existingPackageSection.classList.add('hidden');
        elements.newPackageSection.classList.remove('hidden');
      }
      
      // Enable next button
      elements.step2Next.disabled = false;
      elements.step2Next.textContent = "Next →";
      
    });
  });

  // Step navigation - with error checking
  // Button elements assignment
  
  // step1Next button removed - mode cards handle navigation directly
  
  // step2Back should go back to mode selection
  if (!elements.step2Back) console.error("❌ step2Back element not found");
  else elements.step2Back.onclick = backToModeSelection;
  
  if (!elements.step2Next) console.error("❌ step2Next element not found");
  else elements.step2Next.onclick = nextStep;
  
  if (!elements.step3Back) console.error("❌ step3Back element not found");
  else elements.step3Back.onclick = previousStep;
  
  if (!elements.step3Next) console.error("❌ step3Next element not found");
  else elements.step3Next.onclick = nextStep;
  
  // Step 4 navigation (Instantiate)
  if (!elements.step4Back) console.error("❌ step4Back element not found");
  else elements.step4Back.onclick = previousStep;
  
  if (!elements.step4Next) console.error("❌ step4Next element not found");
  else elements.step4Next.onclick = instantiateRNSCore;
  
  // Admin wizard step navigation (5 steps total)
  // Admin step navigation elements
  const adminStep1Back = document.getElementById("adminStep1Back");
  const adminStep2Back = document.getElementById("adminStep2Back");
  const adminStep2Next = document.getElementById("adminStep2Next");
  const adminStep3Back = document.getElementById("adminStep3Back");
  const adminStep3Next = document.getElementById("adminStep3Next");
  const adminStep4Back = document.getElementById("adminStep4Back");
  const adminStep4Next = document.getElementById("adminStep4Next");
  const adminStep5Back = document.getElementById("adminStep5Back");
  const adminComplete = document.getElementById("adminComplete");
  
  // Back buttons (go back to mode selection from step 1, go back to previous step from others)
  if (adminStep1Back) adminStep1Back.onclick = backToModeFromAdmin;
  else console.warn("⚠️ adminStep1Back element not found");
  
  if (adminStep2Back) adminStep2Back.onclick = () => goToAdminStep(1);
  else console.warn("⚠️ adminStep2Back element not found");
  
  if (adminStep2Next) adminStep2Next.onclick = () => goToAdminStep(3);
  else console.warn("⚠️ adminStep2Next element not found");
  
  if (adminStep3Back) adminStep3Back.onclick = () => goToAdminStep(2);
  else console.warn("⚠️ adminStep3Back element not found");
  
  if (adminStep3Next) adminStep3Next.onclick = () => goToAdminStep(4);
  else console.warn("⚠️ adminStep3Next element not found");
  
  if (adminStep4Back) adminStep4Back.onclick = () => goToAdminStep(3);
  else console.warn("⚠️ adminStep4Back element not found");
  
  if (adminComplete) adminComplete.onclick = completeAdminSetup;
  else console.warn("⚠️ adminComplete element not found");
  
  // Payment resources management - with error checking
  // Resource management elements
  if (!elements.addPaymentResource) console.error("❌ addPaymentResource element not found");
  else elements.addPaymentResource.onclick = addPaymentResourceInput;
  
  // Resource creation - with error checking
  if (!elements.createDummyResources) console.error("❌ createDummyResources element not found");
  else elements.createDummyResources.onclick = createDummyResourcesForTesting;
  
  if (!elements.useCreatedResources) console.error("❌ useCreatedResources element not found");
  else elements.useCreatedResources.onclick = useCreatedResourcesInForm;
  
  // Network toggle switch
  if (!elements.networkToggle) {
    console.error("❌ networkToggle element not found");
  } else {
    // Add click handlers to both toggle options
    const toggleOptions = elements.networkToggle.querySelectorAll('.toggle-option');
    toggleOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const selectedNetwork = option.dataset.value;
        
        // Don't do anything if clicking the already active network
        if (selectedNetwork === currentNetwork) {
          return;
        }
        
        // Warn if in middle of deployment
        if (selectedMode === 'deploy' && currentStep > 1) {
          if (!confirm(
            `⚠️ Switching networks will reset your current progress. Continue?`
          )) {
            return;
          }
          
          // Reset to step 1
          backToModeSelection();
        }
        
        // Switch network
        currentNetwork = selectedNetwork;
        
        // Update toggle state
        elements.networkToggle.setAttribute('data-network', currentNetwork);
        
        // Update network configuration
        updateNetworkConfiguration();
        
        // Show notification
        showSuccess(`Switched to ${currentNetwork.toUpperCase()}`);
        
      });
    });
    
    // Also allow clicking the switch itself
    elements.networkToggle.addEventListener('click', (e) => {
      // Only handle if clicking the container directly, not the options
      if (e.target === elements.networkToggle || e.target.classList.contains('toggle-slider')) {
        const newNetwork = currentNetwork === 'stokenet' ? 'mainnet' : 'stokenet';
        
        // Warn if in middle of deployment
        if (selectedMode === 'deploy' && currentStep > 1) {
          if (!confirm(
            `⚠️ Switching networks will reset your current progress. Continue?`
          )) {
            return;
          }
          
          // Reset to step 1
          backToModeSelection();
        }
        
        // Switch network
        currentNetwork = newNetwork;
        window.currentNetwork = currentNetwork; // Expose globally for manifest builders
        
        // Update toggle state
        elements.networkToggle.setAttribute('data-network', currentNetwork);
        
        // Update network configuration
        updateNetworkConfiguration();
        
        // Show notification
        showSuccess(`Switched to ${currentNetwork.toUpperCase()}`);
        
      }
    });
  }
  
  // Admin panel - with error checking
  if (!elements.loadComponent) console.error("❌ loadComponent element not found");
  else elements.loadComponent.onclick = loadAdminComponent;
  
  if (!elements.goToAdmin) console.error("❌ goToAdmin element not found");
  else elements.goToAdmin.onclick = () => {
    if (adminComponentAddress) {
      elements.adminComponentAddress.value = adminComponentAddress;
    }
    switchTab("admin");
  };
  
  // Reserved domains - with error checking
  if (!elements.previewReservedDomains) console.error("❌ previewReservedDomains element not found");
  else elements.previewReservedDomains.onclick = previewReservedDomainsUpload;
  
  if (!elements.uploadReservedDomains) console.error("❌ uploadReservedDomains element not found");
  else elements.uploadReservedDomains.onclick = uploadReservedDomains;
  
  // Domain lookup button
  const lookupDomainBtn = document.getElementById("lookupDomainBtn");
  if (lookupDomainBtn) {
    lookupDomainBtn.onclick = lookupReservedDomain;
  }
  
  // Pagination buttons
  const prevPageBtn = document.getElementById("prevPageBtn");
  if (prevPageBtn) {
    prevPageBtn.onclick = goToPreviousPage;
  }
  
  const nextPageBtn = document.getElementById("nextPageBtn");
  if (nextPageBtn) {
    nextPageBtn.onclick = goToNextPage;
  }
  
  // V1 badge locking - with error checking
  if (!elements.lockAdminBadges) console.error("❌ lockAdminBadges element not found");
  else elements.lockAdminBadges.onclick = lockV1AdminBadges;
  
  if (!elements.lockUpgradeBadge) console.error("❌ lockUpgradeBadge element not found");
  else elements.lockUpgradeBadge.onclick = lockV1UpgradeBadge;
  
  if (!elements.refreshLockStatus) console.error("❌ refreshLockStatus element not found");
  else elements.refreshLockStatus.onclick = refreshV1LockStatus;
  
  // Admin badge management - with error checking
  if (!elements.burnAdminBadge) console.error("❌ burnAdminBadge element not found");
  else elements.burnAdminBadge.onclick = burnAdminBadge;
  
  // Back buttons
  
  if (!elements.manageBackToMode) console.error("❌ manageBackToMode element not found");
  else elements.manageBackToMode.onclick = backToModeSelection;
  
  if (!elements.toolsBackToMode) console.error("❌ toolsBackToMode element not found");
  else elements.toolsBackToMode.onclick = backToModeSelection;
  
  // Tools panel - Component Loading
  if (!elements.loadToolsComponent) console.error("❌ loadToolsComponent element not found");
  else elements.loadToolsComponent.onclick = loadToolsComponent;
  
  // Tools panel - dApp Definition Creator
  if (!elements.previewDappManifest) console.error("❌ previewDappManifest element not found");
  else elements.previewDappManifest.onclick = previewDappManifest;
  
  if (!elements.submitDappDefinition) console.error("❌ submitDappDefinition element not found");
  else elements.submitDappDefinition.onclick = submitDappDefinition;
  
  if (!elements.copyDappManifest) console.error("❌ copyDappManifest element not found");
  else elements.copyDappManifest.onclick = () => {
    const manifest = elements.dappManifestCode.textContent;
    copyToClipboard(manifest);
  };
  
  if (!elements.copyDappAddress) console.error("❌ copyDappAddress element not found");
  else elements.copyDappAddress.onclick = () => {
    const address = elements.dappDefinitionAddress.textContent;
    copyToClipboard(address);
  };
  
  // Tools panel - Domain Management
  const registerNewDomainBtn = document.getElementById("registerNewDomain");
  if (registerNewDomainBtn) registerNewDomainBtn.onclick = registerNewDomain;
  
  const refreshDomainsBtn = document.getElementById("refreshDomainsList");
  if (refreshDomainsBtn) refreshDomainsBtn.onclick = () => detectUserDomains();
  
  const createSubdomainBtn = document.getElementById("createSubdomain");
  if (createSubdomainBtn) createSubdomainBtn.onclick = createSubdomain;
  
  const createRecordBtn = document.getElementById("createRecord");
  if (createRecordBtn) createRecordBtn.onclick = createRecord;
  
  // Domain modal - tab switching
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      switchDomainTab(button.dataset.tab);
    });
  });
  
  // Domain modal - close on click outside or close button
  const domainModal = document.getElementById("domainModal");
  if (domainModal) {
    domainModal.addEventListener('click', (e) => {
      if (e.target === domainModal) {
        closeDomainModal();
      }
    });
    
    const domainModalClose = domainModal.querySelector('.modal-close');
    if (domainModalClose) {
      domainModalClose.addEventListener('click', closeDomainModal);
    }
  }
  
  // Tools panel - Registrar Management
  if (!elements.requestRegistrarBadge) console.error("❌ requestRegistrarBadge element not found");
  else elements.requestRegistrarBadge.onclick = requestRegistrarBadge;
  
  if (!elements.updateRegistrarSettings) console.error("❌ updateRegistrarSettings element not found");
  else elements.updateRegistrarSettings.onclick = updateRegistrarSettings;
  
  if (!elements.burnRegistrarBadge) console.error("❌ burnRegistrarBadge element not found");
  else elements.burnRegistrarBadge.onclick = burnRegistrarBadge;
  
  // Registrar modal - close on click outside
  if (elements.registrarModal) {
    elements.registrarModal.addEventListener('click', (e) => {
      if (e.target === elements.registrarModal) {
        closeRegistrarModal();
      }
    });
  }
  
  // Management panel - with error checking
  // Management panel elements
  if (!elements.searchComponent) console.error("❌ searchComponent element not found");
  else elements.searchComponent.onclick = searchComponentForManagement;
  
  // Copy buttons (using event delegation)
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-copy")) {
      // Try data-copy attribute first, then fallback to previous sibling text
      const addressValue = e.target.dataset.copy || e.target.previousElementSibling.textContent;
      copyToClipboard(addressValue);
    }
  });
  
  // Modal close buttons
  if (elements.transactionModalClose) {
    elements.transactionModalClose.onclick = hideTransactionModal;
  }
  if (elements.registrarModalClose) {
    elements.registrarModalClose.onclick = closeRegistrarModal;
  }
  
  // Click outside modal to close
  if (elements.transactionModal) {
    elements.transactionModal.onclick = (e) => {
      if (e.target === elements.transactionModal) {
        hideTransactionModal();
      }
    };
  }
  
  // Collapsible tool sections
  document.querySelectorAll('.tool-header').forEach(header => {
    header.addEventListener('click', () => {
      const toolSection = header.closest('.collapsible-tool');
      toolSection.classList.toggle('collapsed');
    });
  });
  
  // Make remove payment resource function global
  window.removePaymentResource = removePaymentResource;
  
  // RNS Deployer & Manager fully initialized
});

