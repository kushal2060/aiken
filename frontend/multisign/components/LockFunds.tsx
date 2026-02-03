'use client';

import { useState, useEffect } from 'react';
import { BrowserWallet, Asset, mConStr0, deserializeAddress } from '@meshsdk/core';
import { getScript, getTxBuilder } from '@/lib/contract';

interface LockFundsProps {
  wallet: BrowserWallet | null;
}

export default function LockFunds({ wallet }: LockFundsProps) {
  const [additionalOwners, setAdditionalOwners] = useState<string[]>(['']);
  const [threshold, setThreshold] = useState<number>(2);
  const [amount, setAmount] = useState<string>('10');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [connectedWalletAddress, setConnectedWalletAddress] = useState<string>('');

  useEffect(() => {
    const getWalletAddress = async () => {
      if (wallet) {
        try {
          const addresses = await wallet.getUsedAddresses();
          if (addresses.length > 0) {
            setConnectedWalletAddress(addresses[0]);
          } else {
            const unusedAddresses = await wallet.getUnusedAddresses();
            if (unusedAddresses.length > 0) {
              setConnectedWalletAddress(unusedAddresses[0]);
            }
          }
        } catch (err) {
          console.error('Failed to get wallet address:', err);
        }
      }
    };
    getWalletAddress();
  }, [wallet]);

  const addOwner = () => {
    setAdditionalOwners([...additionalOwners, '']);
  };

  const removeOwner = (index: number) => {
    if (additionalOwners.length > 1) {
      setAdditionalOwners(additionalOwners.filter((_, i) => i !== index));
    }
  };

  const updateOwner = (index: number, value: string) => {
    const newOwners = [...additionalOwners];
    newOwners[index] = value;
    setAdditionalOwners(newOwners);
  };

  const handleLock = async () => {
    if (!wallet) {
      setError('Please connect your wallet first');
      return;
    }

    if (!connectedWalletAddress) {
      setError('Unable to get wallet address');
      return;
    }

    const validAdditionalOwners = additionalOwners.filter(o => o.trim() !== '');
    
  
    const totalOwners = 1 + validAdditionalOwners.length;

    if (totalOwners < 2) {
      setError('Please provide at least 1 additional owner address');
      return;
    }

    if (threshold < 1 || threshold > totalOwners) {
      setError(`Threshold must be between 1 and ${totalOwners}`);
      return;
    }

    if (!amount || parseFloat(amount) < 1) {
      setError('Amount must be at least 1 ADA');
      return;
    }

    setLoading(true);
    setError('');
    setTxHash('');

    try {
 
      const allOwnerAddresses = [connectedWalletAddress, ...validAdditionalOwners];

      // Extract pub key hashes from addresses
      const ownerHashes = allOwnerAddresses.map(addr => {
        try {
          const { pubKeyHash } = deserializeAddress(addr);
          return pubKeyHash;
        } catch (err) {
          throw new Error(`Invalid address: ${addr}`);
        }
      });

      console.log('All owner addresses:', allOwnerAddresses);
      console.log('All owner hashes:', ownerHashes);

      const assets: Asset[] = [
        {
          unit: 'lovelace',
          quantity: (parseFloat(amount) * 1_000_000).toString(),
        },
      ];

      const utxos = await wallet.getUtxos();
      const walletAddress = (await wallet.getUnusedAddresses())[0];
      const { scriptAddr } = getScript();

      // Create datum: { owners: [pkh1, pkh2, ...], threshold: N }
      const datum = mConStr0([ownerHashes, threshold]);

      const txBuilder = getTxBuilder();
      await txBuilder
        .txOut(scriptAddr, assets)
        .txOutInlineDatumValue(datum)
        .changeAddress(walletAddress)
        .selectUtxosFrom(utxos)
        .complete();

      const unsignedTx = txBuilder.txHex;
      const signedTx = await wallet.signTx(unsignedTx);
      const submittedTxHash = await wallet.submitTx(signedTx);

      // data in localStorage
      const lockData = {
        txHash: submittedTxHash,
        ownerAddresses: allOwnerAddresses,
        threshold: threshold,
        amount: amount,
        timestamp: Date.now()
      };
      
   
      const existingLocks = JSON.parse(localStorage.getItem('multisigLocks') || '[]');
      existingLocks.push(lockData);
      localStorage.setItem('multisigLocks', JSON.stringify(existingLocks));

      setTxHash(submittedTxHash);
      console.log('Locked funds at tx:', submittedTxHash);
      console.log('Saved lock data:', lockData);
    } catch (err: any) {
      console.error('Lock failed:', err);
      setError(err.message || 'Failed to lock funds. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalOwners = 1 + additionalOwners.filter(o => o.trim() !== '').length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-white mb-2">Lock Funds</h3>
        <p className="text-purple-200/60">
          Configure with owner addresses and threshold
        </p>
      </div>

  
      <div>
        <label className="block text-sm font-medium text-purple-200 mb-2">
          Owner 1 (Your Wallet) 
          <span className="ml-2 text-xs text-green-400">● Connected</span>
        </label>
        <div className="backdrop-blur-lg bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
          <p className="text-white font-mono text-sm break-all">
            {connectedWalletAddress || 'Loading...'}
          </p>
        </div>
        <p className="text-xs text-purple-300/50 mt-1">
          Your connected wallet is the first owner
        </p>
      </div>


      <div>
        <label className="block text-sm font-medium text-purple-200 mb-2">
          Amount (ADA)
        </label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            step="0.1"
            className="w-full backdrop-blur-lg bg-white/5 border border-white/20 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
            placeholder="10"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300/70 font-medium">
            ₳
          </div>
        </div>
      </div>

 
      <div>
        <label className="block text-sm font-medium text-purple-200 mb-2">
          Signature Threshold
        </label>
        <input
          type="number"
          value={threshold}
          onChange={(e) => setThreshold(parseInt(e.target.value) || 1)}
          min="1"
          max={totalOwners}
          className="w-full backdrop-blur-lg bg-white/5 border border-white/20 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
        />
        <p className="text-xs text-purple-300/50 mt-1">
          Number of signatures required to unlock (out of {totalOwners} total owners)
        </p>
      </div>


      <div>
        <div className="flex justify-between items-center mb-3">
          <label className="block text-sm font-medium text-purple-200">
            Additional Owners
          </label>
          <button
            onClick={addOwner}
            className="text-sm text-purple-300 hover:text-white transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Owner
          </button>
        </div>

        <div className="space-y-3">
          {additionalOwners.map((owner, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={owner}
                onChange={(e) => updateOwner(index, e.target.value)}
                placeholder={`Owner ${index + 2} address (addr_test...)`}
                className="flex-1 backdrop-blur-lg bg-white/5 border border-white/20 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-mono text-sm"
              />
              {additionalOwners.length > 1 && (
                <button
                  onClick={() => removeOwner(index)}
                  className="backdrop-blur-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-300 px-4 rounded-xl transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>


      {error && (
        <div className="backdrop-blur-lg bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        </div>
      )}

   
      {txHash && (
        <div className="backdrop-blur-lg bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-green-200 text-sm font-medium mb-1">Funds locked successfully!</p>
              <p className="text-green-300/70 text-xs font-mono break-all">
                Transaction: {txHash}
              </p>
              <p className="text-green-300/70 text-xs mt-2">
                Save this for unlocking: <span className="font-semibold">{txHash}#0</span>
              </p>
            </div>
          </div>
        </div>
      )}


      <button
        onClick={handleLock}
        disabled={loading}
        className="w-full bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-purple-800 disabled:to-indigo-800 text-white py-4 rounded-xl font-semibold shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70 transition-all duration-300 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Locking Funds...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Lock Funds
          </>
        )}
      </button>
    </div>
  );
}