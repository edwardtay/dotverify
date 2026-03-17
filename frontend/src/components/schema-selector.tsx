"use client";

import { useReadContract } from "wagmi";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";

function SchemaOption({ uid, selected, onSelect }: { uid: `0x${string}`; selected: boolean; onSelect: () => void }) {
  const { data: schema } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getSchema",
    args: [uid],
  });

  const s = schema as { name: string; definition: string; revocable: boolean; resolver: string } | undefined;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left border rounded-lg p-3 transition-colors ${
        selected
          ? "border-[#E6007A] bg-[#E6007A]/5"
          : "border-border hover:border-[#E6007A]/30 hover:bg-muted/20"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-xs">{s?.name || "Loading..."}</span>
        {s && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded ${s.revocable ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>
            {s.revocable ? "Revocable" : "Permanent"}
          </span>
        )}
      </div>
      {s && (
        <div className="flex flex-wrap gap-1">
          {s.definition.split(",").map((field) => (
            <span key={field} className="text-[9px] font-mono bg-muted/50 px-1 py-0.5 rounded">
              {field.split(":")[0]}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

export function SchemaSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (uid: string) => void;
}) {
  const { data: schemaUids } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getAllSchemaUids",
  });

  const uids = schemaUids as `0x${string}`[] | undefined;

  if (!uids || uids.length === 0) {
    return (
      <div className="border border-border rounded-lg p-3 text-xs text-muted-foreground">
        No credential templates registered yet. Go to the Templates tab to create one.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-[11px] font-medium text-muted-foreground block">Choose a credential type</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {uids.map((uid) => (
          <SchemaOption
            key={uid}
            uid={uid}
            selected={value === uid}
            onSelect={() => onChange(uid)}
          />
        ))}
      </div>
    </div>
  );
}
