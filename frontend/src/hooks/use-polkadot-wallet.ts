"use client";

import { useState, useCallback, useEffect } from "react";

export type PolkadotAccount = {
  address: string;
  name?: string;
  source: string; // wallet extension name (subwallet-js, talisman, polkadot-js)
};

export function usePolkadotWallet() {
  const [accounts, setAccounts] = useState<PolkadotAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<PolkadotAccount | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore from sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = sessionStorage.getItem("polkadot-account");
    if (saved) {
      try {
        setSelectedAccount(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === "undefined") return;

    setIsConnecting(true);
    setError(null);

    try {
      const { web3Enable, web3Accounts } = await import("@polkadot/extension-dapp");

      const extensions = await web3Enable("DotVerify");

      if (extensions.length === 0) {
        setError("No Polkadot wallet found. Install SubWallet, Talisman, or Polkadot.js extension.");
        return;
      }

      const allAccounts = await web3Accounts();

      if (allAccounts.length === 0) {
        setError("No accounts found. Create an account in your Polkadot wallet.");
        return;
      }

      const mapped: PolkadotAccount[] = allAccounts.map((a) => ({
        address: a.address,
        name: a.meta.name ?? undefined,
        source: a.meta.source,
      }));

      setAccounts(mapped);

      setSelectedAccount((current) => {
        if (current) return current;
        sessionStorage.setItem("polkadot-account", JSON.stringify(mapped[0]));
        return mapped[0];
      });
    } catch (err) {
      setError(String(err));
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const selectAccount = useCallback((account: PolkadotAccount) => {
    setSelectedAccount(account);
    sessionStorage.setItem("polkadot-account", JSON.stringify(account));
  }, []);

  const disconnect = useCallback(() => {
    setSelectedAccount(null);
    setAccounts([]);
    sessionStorage.removeItem("polkadot-account");
  }, []);

  /// Sign a raw message with the selected Polkadot account (sr25519)
  const signRaw = useCallback(async (message: string): Promise<{ signature: string; address: string } | null> => {
    if (!selectedAccount) return null;

    try {
      const { web3FromSource } = await import("@polkadot/extension-dapp");
      const injector = await web3FromSource(selectedAccount.source);

      if (!injector.signer?.signRaw) {
        throw new Error("Wallet does not support signRaw");
      }

      const result = await injector.signer.signRaw({
        address: selectedAccount.address,
        data: message,
        type: "bytes",
      });

      return {
        signature: result.signature,
        address: selectedAccount.address,
      };
    } catch (err) {
      setError(`Signing failed: ${err}`);
      return null;
    }
  }, [selectedAccount]);

  return {
    accounts,
    selectedAccount,
    isConnecting,
    error,
    connect,
    selectAccount,
    disconnect,
    signRaw,
  };
}
