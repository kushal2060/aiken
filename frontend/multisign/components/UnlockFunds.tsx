'use client';

import { useState, useEffect } from 'react';
import { BrowserWallet, mConStr0, deserializeAddress } from '@meshsdk/core';
import { getScript, getTxBuilder, getBlockchainProvider } from '@/lib/contract';
import WalletConnect from './WalletConnect';

interface UnlockFundsProps {
  wallet: BrowserWallet | null;
}

interface LockData {
  txHash: string;
  ownerAddresses: string[];
  threshold: number;
  amount: string;
  timestamp: number;
}

export default function UnlockFunds({ wallet }: UnlockFundsProps) {
  const [availableLocks, setAvailableLocks] = useState<LockData[]>([]);
  const [selectedLock, setSelectedLock] = useState<LockData | null>(null);
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [utxoInfo, setUtxoInfo] = useState<any>(null);
  
  const [partialTx, setPartialTx] = useState<string>('');
  const [signedBy, setSignedBy] = useState<string[]>([]);
  const [currentSignerWallet, setCurrentSignerWallet] = useState<BrowserWallet | null>(null);
  const [currentSignerAddress, setCurrentSignerAddress] = useState<string>('');
  const [signingStep, setSigningStep] = useState<number>(0);
  const [showWalletConnect, setShowWalletConnect] = useState(false);

  useEffect(() => {
    const locks = JSON.parse(localStorage.getItem('multisigLocks') || '[]');
    setAvailableLocks(locks);
  }, []);

  useEffect(() => {
    const getAddress = async () => {
      if (currentSignerWallet) {
        const addresses = await currentSignerWallet.getUsedAddresses();
        if (addresses.length > 0) {
          setCurrentSignerAddress(addresses[0]);
        } else {
          const unusedAddrs = await currentSignerWallet.getUnusedAddresses();
          if (unusedAddrs.length > 0) {
            setCurrentSignerAddress(unusedAddrs[0]);
          }
        }
      }
    };
    getAddress();
  }, [currentSignerWallet]);

  const selectLock = async (lock: LockData) => {
    setSelectedLock(lock);
    setError('');
    setTxHash('');
    setUtxoInfo(null);
    setPartialTx('');
    setSignedBy([]);
    setSigningStep(0);
    setCurrentSignerWallet(null);
    setCurrentSignerAddress('');
    
    try {
      const { scriptAddr } = getScript();
      const blockchainProvider = getBlockchainProvider();
      const utxos = await blockchainProvider.fetchAddressUTxOs(scriptAddr);

      const utxo = utxos.find(u => u.input.txHash === lock.txHash);

      if (!utxo) {
        throw new Error('UTxO not found at script address. It may have already been spent.');
      }

      const lovelace = utxo.output.amount.find(a => a.unit === 'lovelace')?.quantity || '0';
      setUtxoInfo({
        ...utxo,
        adaAmount: (parseInt(lovelace) / 1_000_000).toFixed(2),
      });
    } catch (err: any) {
      console.error('Fetch UTxO failed:', err);
      setError(err.message || 'Failed to fetch UTxO');
    }
  };

  const handleWalletConnect = async (wallet: BrowserWallet, walletName: string) => {
    setCurrentSignerWallet(wallet);
    const addresses = await wallet.getUsedAddresses();
    const addr = addresses.length > 0 ? addresses[0] : (await wallet.getUnusedAddresses())[0];
    
    if (!selectedLock) return;
    

    if (!selectedLock.ownerAddresses.includes(addr)) {
      setError(`This wallet (${addr.slice(0, 20)}...) is not an owner of this lock`);
      setCurrentSignerWallet(null);
      return;
    }


    if (signedBy.includes(addr)) {
      setError(`This owner has already signed`);
      setCurrentSignerWallet(null);
      return;
    }

    setError('');
    setShowWalletConnect(false);
  };

  const handleWalletDisconnect = () => {
    setCurrentSignerWallet(null);
    setCurrentSignerAddress('');
  };

  const startSigning = async () => {
    if (!selectedLock || !utxoInfo || !recipientAddress) return;

    setLoading(true);
    setError('');

    try {
      const { scriptAddr, scriptCbor } = getScript();
      const scriptUtxo = utxoInfo;

      // all owner pub key hashes
      const ownerHashes = selectedLock.ownerAddresses.map(addr => {
        return deserializeAddress(addr).pubKeyHash;
      });

      console.log('Building transaction with required signers:', ownerHashes);

    
      if (!wallet) {
        throw new Error('Please connect a wallet first');
      }
      //collateral UTxO
      const walletUtxos = await wallet.getUtxos();
      const collateral = walletUtxos.find(u => {
        const lovelace = parseInt(u.output.amount.find(a => a.unit === 'lovelace')?.quantity || '0');
        return lovelace >= 5_000_000;
      });

      if (!collateral) {
        throw new Error('No suitable collateral found. Need at least 5 ADA');
      }

      const redeemer = mConStr0([]);
      const changeAddress = (await wallet.getUnusedAddresses())[0] || (await wallet.getUsedAddresses())[0];

      const txBuilder = getTxBuilder();
      let builder = txBuilder
        .spendingPlutusScript('V3')
        .txIn(
          scriptUtxo.input.txHash,
          scriptUtxo.input.outputIndex,
          scriptUtxo.output.amount,
          scriptAddr
        )
        .txInInlineDatumPresent()
        .txInRedeemerValue(redeemer)
        .txInScript(scriptCbor)
        .txOut(recipientAddress, scriptUtxo.output.amount);

    
      // Only first `threshold` owners:
      ownerHashes.slice(0, selectedLock.threshold).forEach(hash => {
        builder = builder.requiredSignerHash(hash);
      });

      await builder
        .txInCollateral(
          collateral.input.txHash,
          collateral.input.outputIndex,
          collateral.output.amount,
          collateral.output.address
        )
        .changeAddress(changeAddress)
        .selectUtxosFrom([collateral])
        .complete();

      const unsignedTx = txBuilder.txHex;
      setPartialTx(unsignedTx);
      setSigningStep(1);
      setShowWalletConnect(true);

      console.log('Transaction built. Ready for signing.');
    } catch (err: any) {
      console.error('Build failed:', err);
      setError(err.message || 'Failed to build transaction');
    } finally {
      setLoading(false);
    }
  };

  const signTransaction = async () => {
    if (!currentSignerWallet || !partialTx || !selectedLock) return;

    setLoading(true);
    setError('');

    try {
      console.log(`Owner ${signedBy.length + 1} signing transaction...`);
      const signedTx = await currentSignerWallet.signTx(partialTx, true);
      
      setPartialTx(signedTx);
      setSignedBy([...signedBy, currentSignerAddress]);
      
      console.log(`Signature ${signedBy.length + 1}/${selectedLock.threshold} collected`);

      // enough signatures ??
      if (signedBy.length + 1 >= selectedLock.threshold) {
        await submitTransaction(signedTx);
      } else {
        // Prompt for next signer
        setCurrentSignerWallet(null);
        setCurrentSignerAddress('');
        setShowWalletConnect(true);
      }
    } catch (err: any) {
      console.error('Signing failed:', err);
      setError(err.message || 'Failed to sign transaction');
    } finally {
      setLoading(false);
    }
  };

  const submitTransaction = async (signedTx: string) => {
    if (!currentSignerWallet) return;

    try {
      console.log('Submitting fully signed transaction...');
      const submitTxHash = await currentSignerWallet.submitTx(signedTx);

      setTxHash(submitTxHash);
      console.log('Unlocked funds at tx:', submitTxHash);

      //clear 
      if (selectedLock) {
        const updatedLocks = availableLocks.filter(l => l.txHash !== selectedLock.txHash);
        localStorage.setItem('multisigLocks', JSON.stringify(updatedLocks));
        setAvailableLocks(updatedLocks);
      }

      setSigningStep(0);
      setPartialTx('');
      setSignedBy([]);
    } catch (err: any) {
      console.error('Submit failed:', err);
      setError(err.message || 'Failed to submit transaction');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-white mb-2">Unlock Funds</h3>
        <p className="text-purple-200/60">
          Collect signatures from multiple owners to unlock funds
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-purple-200 mb-2">
          Select Locked Transaction
        </label>
        {availableLocks.length === 0 ? (
          <div className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-xl p-6 text-center">
            <p className="text-purple-200/60 text-sm">No locked transactions found</p>
            <p className="text-purple-300/50 text-xs mt-2">Lock funds first to see them here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {availableLocks.map((lock, index) => (
              <button
                key={index}
                onClick={() => selectLock(lock)}
                disabled={signingStep > 0}
                className={`w-full backdrop-blur-lg border rounded-xl p-4 text-left transition-all ${
                  selectedLock?.txHash === lock.txHash
                    ? 'bg-purple-500/20 border-purple-500/50'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                } ${signingStep > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white font-medium text-sm">{lock.amount} ₳</p>
                    <p className="text-purple-300/70 text-xs font-mono mt-1">
                      {lock.txHash.slice(0, 16)}...{lock.txHash.slice(-8)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-purple-200 text-xs">
                      {lock.threshold} of {lock.ownerAddresses.length} signatures required
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedLock && (
        <>
      
          {utxoInfo && (
            <div className="backdrop-blur-lg bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <p className="text-green-200 text-sm">✓ UTxO verified: {utxoInfo.adaAmount} ₳</p>
            </div>
          )}

 
          {signingStep > 0 && (
            <div className="backdrop-blur-lg bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-purple-200 text-sm font-medium">
                  Collecting Signatures ({signedBy.length}/{selectedLock.threshold})
                </p>
              </div>
              <div className="space-y-2">
                {signedBy.map((addr, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-green-300 text-xs font-mono">{addr.slice(0, 20)}...{addr.slice(-12)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

      
          {showWalletConnect && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="backdrop-blur-xl bg-slate-900/90 border border-white/20 rounded-2xl p-8 max-w-md w-full">
                <h3 className="text-xl font-bold text-white mb-4">
                  Connect Owner {signedBy.length + 1} Wallet
                </h3>
                <p className="text-purple-200/60 text-sm mb-6">
                  Please connect the wallet for the next owner to sign the transaction
                </p>
                <WalletConnect
                  onConnect={handleWalletConnect}
                  onDisconnect={handleWalletDisconnect}
                  connected={currentSignerWallet !== null}
                />
              </div>
            </div>
          )}


          {currentSignerWallet && currentSignerAddress && (
            <div className="backdrop-blur-lg bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <p className="text-blue-200 text-sm mb-2">
                ✓ Owner wallet connected
              </p>
              <p className="text-blue-300/70 text-xs font-mono">
                {currentSignerAddress.slice(0, 20)}...{currentSignerAddress.slice(-12)}
              </p>
            </div>
          )}

  
          {signingStep === 0 && (
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Recipient Address
              </label>
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="addr_test..."
                className="w-full backdrop-blur-lg bg-white/5 border border-white/20 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-mono text-sm"
              />
            </div>
          )}

  
          {error && (
            <div className="backdrop-blur-lg bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}


          {txHash && (
            <div className="backdrop-blur-lg bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <p className="text-green-200 text-sm font-medium mb-1">✓ Funds unlocked!</p>
              <p className="text-green-300/70 text-xs font-mono break-all">{txHash}</p>
            </div>
          )}

          {signingStep === 0 ? (
            <button
              onClick={startSigning}
              disabled={loading || !utxoInfo || !recipientAddress}
              className="w-full bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-purple-800 disabled:to-indigo-800 text-white py-4 rounded-xl font-semibold shadow-lg shadow-purple-500/50 transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? 'Building...' : 'Start Multi-Sig Process'}
            </button>
          ) : currentSignerWallet && (
            <button
              onClick={signTransaction}
              disabled={loading}
              className="w-full bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-green-800 disabled:to-emerald-800 text-white py-4 rounded-xl font-semibold shadow-lg transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? 'Signing...' : `Sign as Owner ${signedBy.length + 1}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}