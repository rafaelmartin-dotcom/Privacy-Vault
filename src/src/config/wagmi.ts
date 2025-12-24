import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Privacy Vault',
  projectId: 'YOUR_PROJECT_ID', // Replace with your WalletConnect project id
  chains: [sepolia],
  ssr: false,
});
