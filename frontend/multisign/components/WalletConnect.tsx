'use client';

import { useState, useEffect } from 'react';
import { BrowserWallet } from '@meshsdk/core';

interface WalletConnectProps {
  onConnect: (wallet: BrowserWallet, walletName: string) => void;
  onDisconnect: () => void;
  connected: boolean;
}

export default function WalletConnect({ onConnect, onDisconnect, connected }: WalletConnectProps) {
  const [showModal, setShowModal] = useState(false);
  const [availableWallets, setAvailableWallets] = useState<string[]>([]);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const wallets = BrowserWallet.getInstalledWallets();
    console.log('Detected wallets:', wallets);
    setAvailableWallets(wallets.map(w => w.name));
  }, []);

  useEffect(() => {
    const getAddress = async () => {
      const connectedWallet = localStorage.getItem('connectedWallet');
      if (connected && connectedWallet) {
        try {
          const wallet = await BrowserWallet.enable(connectedWallet);
          const addresses = await wallet.getUsedAddresses();
          if (addresses.length > 0) {
            setWalletAddress(addresses[0]);
          }
        } catch (error) {
          console.error('Failed to get wallet address:', error);
        }
      }
    };
    getAddress();
  }, [connected]);

  const handleWalletConnect = async (walletName: string) => {
    setLoading(true);
    try {
      const wallet = await BrowserWallet.enable(walletName);
      onConnect(wallet, walletName);
      setShowModal(false);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
  };

  if (connected) {
    return (
      <div className="flex items-center gap-3">
        <div className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-xl px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-purple-100 font-mono">
              {truncateAddress(walletAddress)}
            </span>
          </div>
        </div>
        <button
          onClick={onDisconnect}
          className="backdrop-blur-lg bg-white/10 border border-white/20 hover:bg-white/20 text-purple-100 px-4 py-2 rounded-xl transition-all duration-300 text-sm font-medium"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-purple-500/50 transition-all duration-300 hover:shadow-purple-500/70 hover:scale-105"
      >
        Connect Wallet
      </button>

      {showModal && (
        <div className=" inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="backdrop-blur-xl bg-slate-900/90 border border-white/20 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-scale-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white">Connect Wallet</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-purple-200/60 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {availableWallets.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-purple-200/60 mb-4">No Cardano wallets detected</p>
                <p className="text-sm text-purple-300/50">
                  Please install a Cardano wallet extension like lace, Eternl, or Flint
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableWallets.map((wallet) => (
                  <button
                    key={wallet}
                    onClick={() => handleWalletConnect(wallet)}
                    disabled={loading}
                    className="w-full backdrop-blur-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 rounded-xl p-4 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-linear-to-br from-purple-500/20 to-indigo-500/20 rounded-lg flex items-center justify-center group-hover:from-purple-500/30 group-hover:to-indigo-500/30 transition-all">
                         {(() => {
                            const icon = getWalletIcon(wallet);

                            return icon.type === "img" ? (
                                <img
                                src={icon.src}
                                alt={`${wallet} wallet`}
                                className="w-6 h-6 object-contain"
                                />
                            ) : (
                                <span className="text-xl">{icon.src}</span>
                            );
                            })()}

                        </div>
                        <span className="text-white font-medium capitalize">{wallet}</span>
                      </div>
                      <svg className="w-5 h-5 text-purple-300 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function getWalletIcon(walletName: string) {
  const icons: Record<string, { type: "img" | "emoji"; src: string }> = {
    lace: {
      type: "img",
      src: "https://www.lace.io/favicon-32x32.png",
    },
    eternl: {
      type: "img",
      src: "https://eternl.io/favicon.ico",
    },
    flint: {
      type: "emoji",
      src: "🔥",
    },
    yoroi: {
      type: "img",
      src: "https://yoroi-wallet.com/assets/logo.png",
    },
    gero: {
      type: "emoji",
      src: "🎭",
    },
    typhon: {
      type: "img",
      src: "https://typhonwallet.io/assets/typhon.svg",
    },
  };

  return icons[walletName.toLowerCase()] ?? {
    type: "emoji",
    src: "💼",
  };
}
