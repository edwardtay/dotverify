"use client";

import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

type CredentialCardProps = {
  uid: string;
  issuer: string;
  recipient: string;
  schemaName: string;
  data: string;
  issuedAt: string;
  expiresAt: string;
  status: "VALID" | "REVOKED" | "EXPIRED" | "INVALID";
  verifyUrl: string;
};

export function CredentialCard({
  uid,
  issuer,
  recipient,
  schemaName,
  data,
  issuedAt,
  expiresAt,
  status,
  verifyUrl,
}: CredentialCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  function handleCopyLink() {
    navigator.clipboard.writeText(verifyUrl);
  }

  function handleDownload() {
    if (!cardRef.current) return;
    import("html2canvas").then(({ default: html2canvas }) => {
      html2canvas(cardRef.current!, { scale: 2, backgroundColor: "#ffffff" }).then((canvas) => {
        const link = document.createElement("a");
        link.download = `credential-${uid.slice(0, 10)}.png`;
        link.href = canvas.toDataURL();
        link.click();
      });
    });
  }

  const statusColor = status === "VALID" ? "#16a34a" : status === "REVOKED" ? "#dc2626" : "#d97706";
  const statusBg = status === "VALID" ? "#f0fdf4" : status === "REVOKED" ? "#fef2f2" : "#fffbeb";

  // Try to parse data as JSON for display
  let displayData: Record<string, string> = {};
  try {
    displayData = JSON.parse(data);
  } catch {
    displayData = { data };
  }

  return (
    <div className="space-y-3">
      {/* The card itself */}
      <div
        ref={cardRef}
        className="border-2 rounded-2xl p-6 max-w-md mx-auto bg-white relative overflow-hidden"
        style={{ borderColor: statusColor }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E6007A]" />
              <span className="text-xs font-bold tracking-tight">PolkaProve</span>
            </div>
            <h3 className="text-base font-bold">{schemaName}</h3>
          </div>
          <div
            className="px-2.5 py-1 rounded-full text-[10px] font-bold"
            style={{ backgroundColor: statusBg, color: statusColor }}
          >
            {status}
          </div>
        </div>

        {/* Credential data */}
        <div className="space-y-2 mb-5">
          {Object.entries(displayData).map(([key, value]) => (
            <div key={key} className="flex justify-between items-baseline">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{key}</span>
              <span className="text-sm font-medium text-right max-w-[60%] truncate">{String(value)}</span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-border my-4" />

        {/* Footer: metadata + QR */}
        <div className="flex justify-between items-end">
          <div className="space-y-1 text-[9px] text-muted-foreground">
            <div>
              <span className="uppercase tracking-wider">Issued by</span>
              <p className="font-mono text-[10px] text-foreground">{issuer.slice(0, 8)}...{issuer.slice(-4)}</p>
            </div>
            <div>
              <span className="uppercase tracking-wider">Issued to</span>
              <p className="font-mono text-[10px] text-foreground">{recipient.slice(0, 8)}...{recipient.slice(-4)}</p>
            </div>
            <div>
              <span className="uppercase tracking-wider">Date</span>
              <p className="text-[10px] text-foreground">{issuedAt}</p>
            </div>
            {expiresAt !== "Never" && (
              <div>
                <span className="uppercase tracking-wider">Expires</span>
                <p className="text-[10px] text-foreground">{expiresAt}</p>
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-1">
            <QRCodeSVG value={verifyUrl} size={72} level="M" />
            <span className="text-[8px] text-muted-foreground">Scan to verify</span>
          </div>
        </div>

        {/* UID */}
        <div className="mt-3 pt-2 border-t border-border">
          <p className="text-[8px] font-mono text-muted-foreground text-center">
            UID: {uid}
          </p>
          <p className="text-[8px] text-muted-foreground text-center">
            Polkadot Hub Testnet &middot; BLAKE2-256 verified
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-center">
        <button
          onClick={handleCopyLink}
          className="px-3 py-1.5 border border-border rounded-lg text-xs hover:bg-muted/30 transition-colors"
        >
          Copy verification link
        </button>
        <button
          onClick={handleDownload}
          className="px-3 py-1.5 bg-[#E6007A] text-white rounded-lg text-xs hover:bg-[#c40066] transition-colors"
        >
          Download as image
        </button>
      </div>
    </div>
  );
}
