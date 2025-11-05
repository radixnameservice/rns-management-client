# RNS V2 Manager

A comprehensive web application for deploying, configuring, and managing Radix Name Service (RNS) V2 components on the Radix network. Built with modern web technologies and the Radix dApp Toolkit for seamless wallet integration.

**🚀 Live App: [https://radixnameservice.github.io/rns-management-client/](https://radixnameservice.github.io/rns-management-client/)**

## 🌟 Features

### 📦 Instantiate New RNS
Deploy a fresh RNS V2 component to Stokenet or Mainnet with a complete guided wizard:
- **Package Setup**: Deploy new packages or use existing ones
- **Prerequisites**: Configure payment tokens, legacy resources, V1 badges, and component metadata
- **Component Metadata**: Set name, description, tags, info URL, and icon for the main component
- **Subregistry Metadata**: Define metadata templates for all domain subregistries
- **Icon Customization**: Set custom icons for domains, admin badges, config badges, and registrar badges
- **Transaction Preview**: Review manifest before deployment
- **Result Tracking**: Get all deployed addresses after successful instantiation

### ⚙️ Component Configuration
Manage deployed RNS V2 components with admin privileges:
- **Load Component**: Auto-discover connected resources
- **Bulk Domain Upload**: Upload reserved domains in batches
- **Domain Lookup**: Check reservation status and claimant information
- **V1 Badge Locking**: Permanently lock V1 admin and upgrade badges
- **dApp Definition**: Link your component to a dApp definition account (required before burning admin badge)
- **Admin Badge Management**: Burn admin badges to activate public registration
- **Pagination**: Browse all reserved domains with efficient pagination

### 📊 RNS Statistics
View live metrics and analytics for any RNS V2 component:
- Total domains issued (V2)
- Domains migrated from V1
- Unique user count
- Component address lookup
- Real-time data from the Radix Gateway

### 🛠️ Developer Tools
Radix development utilities and manifest generators:
- **dApp Definition Creator**: Generate dApp definition accounts with metadata
- **Registrar Management**: Request and manage registrar badges
- **Manifest Builders**: Pre-built transaction manifests for common operations
- **Address Validation**: Ensure addresses are valid before deployment

### 🔄 Network Support
Seamless switching between networks:
- **Stokenet**: Full testing environment with resource creation helpers
- **Mainnet**: Production deployment support
- Network-specific placeholder addresses
- Dynamic console links based on selected network

## 🚀 Getting Started

### 🌐 Quick Start (No Installation Required)

**Use the hosted version:**

👉 **[https://radixnameservice.github.io/rns-management-client/](https://radixnameservice.github.io/rns-management-client/)**

---

### 💻 Local Development Setup (Optional)

If you prefer to run locally or contribute to development:

#### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Radix Wallet (for connecting to the dApp)

#### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/rns-management-client.git
   cd rns-management-client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173` (or the port shown in your terminal)

### Building for Production

```bash
npm run build
```

The optimized build will be created in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

### Deploying to GitHub Pages

Deploy your application to GitHub Pages with automated GitHub Actions:

```bash
# Make sure vite.config.js has the correct base path
# Update base: '/your-repo-name/' to match your repository

# Push to main branch - automatic deployment
git add .
git commit -m "Deploy to GitHub Pages"
git push origin main
```

Or deploy manually:

```bash
npm run deploy
```

**See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.**

The official deployment is live at: **[https://radixnameservice.github.io/rns-management-client/](https://radixnameservice.github.io/rns-management-client/)**

## 📖 Usage Guide

### 0. Access the Application

**Option A:** Use the hosted version
- Visit [https://radixnameservice.github.io/rns-management-client/](https://radixnameservice.github.io/rns-management-client/)

**Option B:** Run locally for development (see installation steps above)

### 1. Connect Your Wallet

Click the Radix Connect button in the top-right corner and authorize the connection in your Radix Wallet.

### 2. Select Network

Use the network toggle to switch between Stokenet (testing) and Mainnet (production).

### 3. Choose Your Action

Select one of four main modes:

#### Instantiate New RNS
1. Choose to use an existing package or deploy a new one
2. Configure payment resources, V1 legacy addresses, and component metadata
3. Set component name, description, tags, and subregistry templates
4. Set icon URLs for domains, admin badges, config badges, and registrar badges
5. Review the transaction manifest
6. Submit to your wallet and sign

#### Component Config
1. Enter your deployed RNS component address
2. Upload reserved domains in bulk (CSV format: `domain.xrd,account_address`)
3. Lock V1 badges to prevent modifications
4. Link component to dApp definition (use existing or create new)
5. Burn admin badge to activate public registration (requires dApp definition)

#### RNS Statistics
1. Enter any RNS V2 component address
2. View live statistics including:
   - Total domains issued
   - V1 migration count
   - Unique users

#### Developer Tools
1. **dApp Definition Creator**: Generate metadata for your dApp
2. **Registrar Management**: Request or manage registrar badges

## 🏗️ Project Structure

```
rns-management-client/
├── index.html              # Main HTML entry point
├── main.js                 # Application logic and event handlers
├── style.css               # Complete styling (gradient backgrounds, modern UI)
├── package.json            # Project dependencies and scripts
├── manifests/              # Transaction manifest builders
│   ├── index.js           # Export all manifests
│   ├── instantiate.js     # RNS V2 instantiation manifest
│   ├── adminActions.js    # Admin operations (burn badge)
│   ├── packageDeploy.js   # Package deployment helpers
│   ├── v1BadgeLocking.js  # V1 badge locking manifests
│   ├── reservedDomains.js # Domain reservation manifests
│   ├── resourceCreation.js # Test resource creation (Stokenet)
│   ├── dappDefinition.js  # dApp definition manifests
│   └── registrarManagement.js # Registrar badge operations
└── .gitignore             # Git ignore rules
```

## 🎨 Key Components

### Manifest Builders

All transaction manifests are built using modular functions in the `manifests/` directory:

```javascript
import { getRNSInstantiateManifest } from './manifests/instantiate.js';

const manifest = getRNSInstantiateManifest({
  packageAddress: "package_tdx_2_1p...",
  paymentResources: ["resource_tdx_2_1t..."],
  legacyDomainResource: "resource_tdx_2_1n...",
  // ... other parameters
});
```

### Wallet Integration

Connect to the Radix Wallet using the dApp Toolkit:

```javascript
const rdt = RadixDappToolkit({
  dAppDefinitionAddress: "account_tdx_2_...",
  networkId: RadixNetwork.Stokenet
});
```

### State Management

The application uses a simple state object to track:
- Current network (Stokenet/Mainnet)
- Connected account address
- Loaded component details
- Wizard progress

## 🌐 Network Configuration

### Stokenet (Testnet)
- Network ID: `0x02`
- Gateway API: `https://stokenet.radixdlt.com`
- Developer Console: `https://stokenet-console.radixdlt.com`
- **Includes**: Test resource creation helpers

### Mainnet (Production)
- Network ID: `0x01`
- Gateway API: `https://mainnet.radixdlt.com`
- Developer Console: `https://console.radixdlt.com`

## 📝 CSV Format for Domain Reservations

When uploading reserved domains, use this format (one per line):

```
example.xrd,account_tdx_2_1c8atrp5rqr7dq6g6lj6p4qz6q3j9h5x5j5v5c5s5d5f5g5h5j
radix.xrd,account_tdx_2_1c9xatrp5rqr7dq6g6lj6p4qz6q3j9h5x5j5v5c5s5d5f5g5h5j
domain.xrd,account_tdx_2_1c7xatrp5rqr7dq6g6lj6p4qz6q3j9h5x5j5v5c5s5d5f5g5h5j
```

## 🔒 Security Considerations

- **Admin Badge Burning**: Irreversible action that removes all admin privileges
- **V1 Badge Locking**: Permanently locks badges in the component
- **Icon URLs**: Use permanent storage (IPFS, Arweave, or reliable CDN)
- **Private Keys**: Never share your wallet seed phrase or private keys

## 🐛 Troubleshooting

### Wallet Won't Connect
- Ensure you have the Radix Wallet extension installed
- Check that you're on the correct network
- Refresh the page and try again

### Transaction Failed
- Verify you have enough XRD for transaction fees
- Check that all addresses are valid for the selected network
- Review the transaction manifest for errors

### Component Not Loading
- Verify the component address is correct
- Ensure the component exists on the selected network
- Check your internet connection

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/feature`)
3. Commit your changes (`git commit -m 'Add feature'`)
4. Push to the branch (`git push origin feature/feature`)
5. Open a Pull Request

## ⚠️ Disclaimer

**USE AT YOUR OWN RISK.** This software is provided "as is" without warranty of any kind, express or implied. The authors and contributors are not liable for any damages, losses, or issues that may arise from using this software, including but not limited to:

- Loss of funds or digital assets
- Incorrect transactions or deployments
- Smart contract errors or vulnerabilities
- Data loss or corruption
- Network failures or downtime
- Any other direct or indirect damages

By using this software, you acknowledge that:
- You are solely responsible for your actions and transactions
- You understand the risks involved in DLT operations
- You will verify all transactions before signing them in your wallet
- DLT transactions are irreversible once confirmed
- You should test thoroughly on Stokenet before using Mainnet
- The software is provided for educational and informational purposes

**Always review transaction manifests carefully before signing. Never share your private keys or seed phrases.**

## 📄 License

This project is licensed under the MIT License.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.