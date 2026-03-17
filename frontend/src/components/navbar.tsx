"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { siteConfig } from "@/config/site";
import { PolkadotWalletButton } from "./polkadot-wallet-button";

function EvmButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;

        return (
          <div
            {...(!mounted && {
              "aria-hidden": true,
              style: { opacity: 0, pointerEvents: "none" as const, userSelect: "none" as const },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    title="Connect MetaMask, WalletConnect, or other EVM wallet"
                    className="flex items-center gap-1.5 h-[34px] px-3 rounded-lg border border-border bg-white hover:bg-muted/50 transition-colors text-[11px] font-medium"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    MetaMask
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    className="flex items-center gap-1.5 h-[34px] px-3 rounded-lg border border-red-200 bg-red-50 text-[11px] font-medium text-red-600"
                  >
                    Wrong network
                  </button>
                );
              }

              return (
                <button
                  onClick={openAccountModal}
                  title={account.address}
                  className="flex items-center gap-1.5 h-[34px] px-3 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100/50 transition-colors text-[11px] font-medium"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="font-mono">{account.displayName}</span>
                </button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

export function Navbar() {
  return (
    <header className="border-b border-border bg-white">
      <div className="flex items-center justify-between px-4 py-2 max-w-6xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-1.5 text-sm font-bold tracking-tight">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#E6007A]" />
          {siteConfig.name}
        </Link>
        <div className="flex items-center gap-1.5">
          <PolkadotWalletButton />
          <EvmButton />
        </div>
      </div>
    </header>
  );
}
