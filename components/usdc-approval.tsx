"use client";
import { useMemo } from "react";
import type { Address } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useWalletStatus } from "@/components/wallet-status";
import { erc20ReadAbi, formatUsdcUnits, getLootlyEscrowAddress, getUsdcConfig, toUsdcUnits, USDC_FALLBACK_DECIMALS } from "@/lib/usdc";

export type ApprovalState = "unavailable" | "loading" | "ready" | "approval_required" | "approved" | "pending" | "confirmed" | "failed";

export function useUsdcApproval(amount: number | string) {
  const { address, isConnected } = useAccount();
  const wallet = useWalletStatus();
  const config = getUsdcConfig(wallet.chainId);
  const escrowAddress = getLootlyEscrowAddress(wallet.chainId);
  const enabled = Boolean(address && isConnected && config && escrowAddress && !wallet.wrongNetwork);
  const decimalsRead = useReadContract({ address: config?.address, abi: erc20ReadAbi, functionName: "decimals", chainId: config?.chain.id, query: { enabled } });
  const decimals = decimalsRead.data === undefined ? USDC_FALLBACK_DECIMALS : Number(decimalsRead.data);
  const required = toUsdcUnits(amount, decimals);
  const allowanceRead = useReadContract({ address: config?.address, abi: erc20ReadAbi, functionName: "allowance", args: address && escrowAddress ? [address as Address, escrowAddress] : undefined, chainId: config?.chain.id, query: { enabled: enabled && !decimalsRead.isLoading && !decimalsRead.isError } });
  const { writeContract, data: hash, isPending: isWalletPending, error: writeError, reset } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash, query: { enabled: Boolean(hash) } });
  const allowance = typeof allowanceRead.data === "bigint" ? allowanceRead.data : undefined;
  const state: ApprovalState = !enabled ? "unavailable" : decimalsRead.isLoading || allowanceRead.isLoading ? "loading" : decimalsRead.isError || allowanceRead.isError ? "failed" : isWalletPending ? "pending" : receipt.isLoading ? "pending" : receipt.isSuccess ? "confirmed" : receipt.isError || writeError ? "failed" : allowance !== undefined && allowance >= required ? "approved" : "approval_required";
  const approveExactAmount = () => {
    if (!enabled || !config || !escrowAddress || !address || required <= 0n) return;
    reset();
    writeContract({ address: config.address, abi: erc20ReadAbi, functionName: "approve", args: [escrowAddress, required], chainId: config.chain.id });
  };
  return useMemo(() => ({ escrowAddress, tokenAddress: config?.address, decimals, required, allowance, allowanceFormatted: allowance === undefined ? null : formatUsdcUnits(allowance, decimals), requiredFormatted: formatUsdcUnits(required, decimals), state, hash, error: writeError || receipt.error || decimalsRead.error || allowanceRead.error || null, refetch: allowanceRead.refetch, approveExactAmount }), [escrowAddress, config?.address, decimals, required, allowance, state, hash, writeError, receipt.error, decimalsRead.error, allowanceRead.error, allowanceRead.refetch]);
}
