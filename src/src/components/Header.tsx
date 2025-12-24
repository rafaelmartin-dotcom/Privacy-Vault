import { ConnectButton } from '@rainbow-me/rainbowkit';
import '../styles/Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-content">
          <div className="header-left">
            <div className="header-brand">
              <span className="brand-mark">PV</span>
              <div>
                <h1 className="header-title">Privacy Vault</h1>
                <p className="header-subtitle">Encrypted notebooks powered by Zama FHE</p>
              </div>
            </div>
          </div>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
