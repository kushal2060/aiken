'use client';

import { useState, useEffect } from 'react';
import { BrowserWallet } from '@meshsdk/core';
import LockFunds from '@/components/LockFunds';
import UnlockFunds from '@/components/UnlockFunds';
import WalletConnect from '@/components/WalletConnect';

export default function Home() {
  const [wallet, setWallet] = useState<BrowserWallet | null>(null);
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'lock' | 'unlock'>('lock');

  useEffect(() => {
    // Check if wallet was previously connected
    const checkWallet = async () => {
      const walletName = localStorage.getItem('connectedWallet');
      if (walletName) {
        try {
          const browserWallet = await BrowserWallet.enable(walletName);
          setWallet(browserWallet);
          setConnected(true);
        } catch (error) {
          console.error('Failed to reconnect wallet:', error);
          localStorage.removeItem('connectedWallet');
        }
      }
    };
    checkWallet();
  }, []);

  const handleConnect = (browserWallet: BrowserWallet, walletName: string) => {
    setWallet(browserWallet);
    setConnected(true);
    localStorage.setItem('connectedWallet', walletName);
  };

  const handleDisconnect = () => {
    setWallet(null);
    setConnected(false);
    localStorage.removeItem('connectedWallet');
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-950 to-slate-900">
      {/* Animated background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-linear-to-br from-purple-500/10 to-transparent rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-linear-to-tl from-indigo-500/10 to-transparent rounded-full blur-3xl animate-pulse-slow-delayed"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/10 backdrop-blur-md bg-white/5">
          <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-linear-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/50">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-linear-to-r from-white to-purple-200 bg-clip-text text-transparent">
                  MultiSign Protocol
                </h1>
                <p className="text-xs text-purple-300/70">Secure multi-signature vault</p>
              </div>
            </div>
            <WalletConnect
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              connected={connected}
            />
          </div>
        </header>

        {/* Hero section */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-bold mb-4 bg-linear-to-r from-purple-200 via-white to-indigo-200 bg-clip-text text-transparent">
              Trustless Multi-Signature Vault
            </h2>
            <p className="text-lg text-purple-200/60 max-w-2xl mx-auto">
              Lock funds with multiple owners and require threshold signatures to unlock. 
              Powered by Cardano smart contracts.
            </p>
          </div>

          {!connected ? (
            <div className="max-w-2xl mx-auto">
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                <div className="w-20 h-20 bg-linear-to-br from-purple-500/20 to-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-purple-500/30">
                  <svg className="w-10 h-10 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-white mb-3">Connect Your Wallet</h3>
                <p className="text-purple-200/60 mb-8">
                  Connect your Cardano wallet to start locking and unlocking funds with multi-signature security
                </p>
                <div className="text-sm text-purple-300/50">
                  Supported wallets: Nami, Eternl, Flint, Yoroi, and more
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {/* Tab switcher */}
              <div className="flex gap-4 mb-8 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-2">
                <button
                  onClick={() => setActiveTab('lock')}
                  className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-300 ${
                    activeTab === 'lock'
                      ? 'bg-linear-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/50'
                      : 'text-purple-200/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Lock Funds
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('unlock')}
                  className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-300 ${
                    activeTab === 'unlock'
                      ? 'bg-linear-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/50'
                      : 'text-purple-200/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                    Unlock Funds
                  </div>
                </button>
              </div>

              {/* Content */}
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 animate-fade-in">
                {activeTab === 'lock' ? (
                  <LockFunds wallet={wallet} />
                ) : (
                  <UnlockFunds wallet={wallet} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-white/10 backdrop-blur-md bg-white/5 mt-20">
          <div className="max-w-7xl mx-auto px-6 py-8 text-center">
            <p className="text-purple-200/50 text-sm">
              Built on Cardano • Powered by Aiken Smart Contracts
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}