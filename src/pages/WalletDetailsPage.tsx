"use client";

import React, { useEffect, useState,useMemo } from "react";
import { useParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletByCustomerId, useWalletLedger, useWalletRewards, useOldMetalPurchase, usePayout,useOldMetalPurchases,type WalletLedgerEntry } from "@/hooks/useWallet";
import { useAllLookUp } from "@/hooks/useLookup";
import { useCurrentRate } from "@/hooks/useCurruntrate";
import { Loader2, Coins, ReceiptText, Gift, CreditCard, Plus, Trash2,User as UserIcon, Phone, Mail, Wallet, X  } from "lucide-react";
import { useCustomer } from "@/hooks/useCustomer"; 
export default function WalletDetailsPage() {
  const { customerId } = useParams();
  const parsedCustomerId = Number(customerId);
  const { data: customerData, isLoading: isCustomerLoading } = useCustomer(parsedCustomerId);

  // 3. Fetch Wallet Details
  const [activeTab, setActiveTab] = useState<"ledger" | "rewards" | "purchase" | "payout">("ledger");

  const { data: wallet, isLoading: isWalletLoading } = useWalletByCustomerId(parsedCustomerId);

  if (isWalletLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-xl font-medium text-red-600">Wallet not found for this customer.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Wallet Dashboard</h1>
        <p className="text-sm text-gray-500">Manage ledger, rewards, purchases, and payouts for {wallet.phone}</p>
      </div>

      {/* --- CUSTOMER & WALLET SUMMARY CARD --- */}
      {isCustomerLoading ? (
        <div className="flex justify-center p-6 mb-6 bg-gray-50 rounded-xl border border-gray-200">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : (customerData && wallet) ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-5 mb-6">
          <div className="flex flex-col lg:flex-row justify-between gap-5">
            
            {/* Left side: Customer Info */}
            <div className="flex items-start gap-3">
              <div className="bg-blue-50 p-2.5 rounded-full mt-1">
                <UserIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{customerData.name}</h3>
                <div className="mt-1 space-y-1">
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-3.5 w-3.5 mr-2 text-gray-400" />
                    {customerData.phone}
                  </div>
                  {customerData.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-3.5 w-3.5 mr-2 text-gray-400" />
                      {customerData.email}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right side: Balances */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100 flex flex-col justify-center">
                <div className="flex items-center text-xs font-medium text-gray-500 mb-1">
                  <Wallet className="h-3.5 w-3.5 mr-1" /> Total Balance
                </div>
                <span className="text-lg font-bold text-gray-900">
                  {wallet.balance.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                </span>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 flex flex-col justify-center">
                <div className="flex items-center text-xs font-medium text-gray-500 mb-1">
                  <Coins className="h-3.5 w-3.5 mr-1" /> Return Balance
                </div>
                <span className="text-base font-semibold text-gray-800">
                  {wallet.returnBalance.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                </span>
              </div>

              <div className="bg-green-50/50 rounded-lg p-3 border border-green-100 flex flex-col justify-center col-span-2 sm:col-span-1">
                <div className="flex items-center text-xs font-medium text-gray-500 mb-1">
                  <Gift className="h-3.5 w-3.5 mr-1" /> Reward Balance
                </div>
                <span className="text-base font-semibold text-green-700">
                  {wallet.rewardBalance.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                </span>
              </div>
            </div>
            
          </div>
        </div>
      ) : null}
      {/* -------------------------------------- */}

      {/* Custom Tabs List */}
      <div className="flex border-b border-gray-200 mb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab("ledger")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "ledger" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <ReceiptText className="w-4 h-4" /> Ledger
        </button>
        <button
          onClick={() => setActiveTab("rewards")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "rewards" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <Gift className="w-4 h-4" /> Rewards
        </button>
        <button
          onClick={() => setActiveTab("purchase")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "purchase" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <Coins className="w-4 h-4" /> Old Metal Purchase
        </button>
        <button
          onClick={() => setActiveTab("payout")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "payout" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <CreditCard className="w-4 h-4" /> Payment to Customer
        </button>
      </div>

      {/* Tab Content Box */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {activeTab === "ledger" && <LedgerTab customerId={parsedCustomerId} />}
        {activeTab === "rewards" && <RewardsTab customerId={parsedCustomerId} />}
        {activeTab === "purchase" && <OldMetalPurchaseTab customerId={parsedCustomerId} />}
        {activeTab === "payout" && <PayoutTab customerId={parsedCustomerId} />}
      </div>
    </div>
  );
}
// Make sure to import these at the top of your file if not already present:
// import { useState, useMemo } from "react";
// import { Search, X } from "lucide-react"; // Optional: for the search input and clear buttonimport { useMemo, useState } from "react";

export function LedgerTab({ customerId }: { customerId: number }) {
  const { data: ledgerData, isLoading } = useWalletLedger(customerId);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const transactions: WalletLedgerEntry[] = Array.isArray(ledgerData) ? ledgerData : [];

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx: WalletLedgerEntry) => {
      const txDate = new Date(tx.createdAt);
      txDate.setHours(0, 0, 0, 0);

      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(0, 0, 0, 0);

      const matchesStartDate = start ? txDate >= start : true;
      const matchesEndDate = end ? txDate <= end : true;

      const matchesType =
        typeFilter === "All" || tx.transactionType === typeFilter;

      const query = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !query ||
        tx.source?.toLowerCase().includes(query) ||
        tx.referenceNo?.toLowerCase().includes(query) ||
        tx.note?.toLowerCase().includes(query);

      return matchesStartDate && matchesEndDate && matchesType && matchesSearch;
    });
  }, [transactions, startDate, endDate, typeFilter, searchTerm]);

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setTypeFilter("All");
    setSearchTerm("");
  };

  const formatDateTime = (dateString: string) => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return { date: "-", time: "-" };

    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleString("en-US", { month: "short" });
    const year = d.getFullYear();

    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");

    return {
      date: `${day}-${month}-${year}`,
      time: `${hours}:${minutes}`,
    };
  };

  const inputClass =
    "w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent";

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="mb-1 text-lg font-semibold text-gray-900">Ledger History</h2>
          <p className="text-sm text-gray-500">
            View recent transactions and balance history.
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Search</label>
            <input
              type="text"
              placeholder="Ref No, Source, or Note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Transaction Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={inputClass}
            >
              <option value="All">All Types</option>
              <option value="Credit">Credit Only</option>
              <option value="Debit">Debit Only</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
              max={endDate || undefined}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-700">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputClass}
                min={startDate || undefined}
              />
            </div>

            {(startDate || endDate || typeFilter !== "All" || searchTerm) && (
              <button
                type="button"
                onClick={clearFilters}
                className="mb-[1px] h-[34px] whitespace-nowrap rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 py-8 text-center">
          <p className="text-sm text-gray-500">
            {transactions.length === 0
              ? "No transactions found for this wallet."
              : "No transactions match your current filters."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="w-full min-w-[1200px] table-auto text-left">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Date
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Type
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Source
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Ref No
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Amount
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Main Bal.
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Reward Bal.
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Return Bal.
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Note
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredTransactions.map((tx: WalletLedgerEntry) => {
                const isCredit = tx.transactionType === "Credit";
                const { date: formattedDate, time: formattedTime } = formatDateTime(tx.createdAt);

                return (
                  <tr key={tx.id} className="transition-colors hover:bg-gray-50 align-top">
                    <td className="whitespace-nowrap px-3 py-2.5 text-sm text-gray-900">
                      {formattedDate}
                      <br />
                      <span className="text-xs text-gray-500">{formattedTime}</span>
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                          isCredit
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {tx.transactionType}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5 text-sm text-gray-700">
                      {tx.source || "-"}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5 text-sm font-medium text-gray-900">
                      {tx.referenceNo || "-"}
                    </td>

                    <td
                      className={`whitespace-nowrap px-3 py-2.5 text-right text-sm font-medium ${
                        isCredit ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {isCredit ? "+" : "-"}
                      {Number(tx.amount).toLocaleString("en-IN", {
                        style: "currency",
                        currency: "INR",
                      })}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-sm font-semibold text-gray-900">
                      {Number(tx.balanceAfter).toLocaleString("en-IN", {
                        style: "currency",
                        currency: "INR",
                      })}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-sm text-gray-700">
                      {Number(tx.rewardBalanceAfter).toLocaleString("en-IN", {
                        style: "currency",
                        currency: "INR",
                      })}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-sm text-gray-700">
                      {Number(tx.returnBalanceAfter).toLocaleString("en-IN", {
                        style: "currency",
                        currency: "INR",
                      })}
                    </td>

                    <td
                      className="px-3 py-2.5 text-sm text-gray-600 whitespace-normal break-words min-w-[280px] max-w-[420px]"
                      title={tx.note || ""}
                    >
                      {tx.note || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}// Make sure to import useState if you haven't already:
// import { useState } from "react";
function RewardsTab({ customerId }: { customerId: number }) {
  const { data: rewardsData, isLoading } = useWalletRewards(customerId);

  // Filter States
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [levelFilter, setLevelFilter] = useState("All"); // NEW: Level Filter State
  const [searchTerm, setSearchTerm] = useState("");

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600 h-8 w-8" /></div>;

  const rewards = Array.isArray(rewardsData) ? rewardsData : [];

  // Extract unique levels dynamically from the rewards data for the dropdown options
  const uniqueLevels = Array.from(new Set(rewards.map((r: any) => r.level).filter(Boolean))).sort((a: any, b: any) => a - b);

  // Filter Logic
  const filteredRewards = rewards.filter((reward: any) => {
    // 1. Date Filter
    const rDate = new Date(reward.createdAt);
    rDate.setHours(0, 0, 0, 0);

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(0, 0, 0, 0);

    const matchesStartDate = start ? rDate >= start : true;
    const matchesEndDate = end ? rDate <= end : true;

    // 2. Status Filter
    let matchesStatus = true;
    if (statusFilter === "Active") matchesStatus = !reward.isRolledBack;
    if (statusFilter === "RolledBack") matchesStatus = !!reward.isRolledBack;

    // 3. Level Filter (NEW)
    const matchesLevel = levelFilter === "All" || String(reward.level) === levelFilter;

    // 4. Search Filter
    const query = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !query ||
      reward.invoiceNo?.toLowerCase().includes(query) ||
      reward.customerName?.toLowerCase().includes(query) ||
      reward.referralName?.toLowerCase().includes(query) ||
      reward.note?.toLowerCase().includes(query);

    return matchesStartDate && matchesEndDate && matchesStatus && matchesLevel && matchesSearch;
  });

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setStatusFilter("All");
    setLevelFilter("All"); // Reset Level Filter
    setSearchTerm("");
  };

  // --- NEW FORMATTING FUNCTION ---
  const formatDateTime = (dateString: string) => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return { date: "-", time: "-" };

    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' }); // "Jan", "Feb", etc.
    const year = d.getFullYear();

    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return {
      date: `${day}-${month}-${year}`,
      time: `${hours}:${minutes}`
    };
  };
  // -------------------------------

  const inputClass = "w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent";

  return (
    <div className="p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Rewards History</h2>
        <p className="text-sm text-gray-500">View earned, referred, and rolled-back rewards.</p>
      </div>

      {/* Filters Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Invoice, Name, or Note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Reward Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={inputClass}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="RolledBack">Rolled Back Only</option>
            </select>
          </div>

          {/* NEW: Level Filter Dropdown */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Level</label>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className={inputClass}
            >
              <option value="All">All Levels</option>
              {uniqueLevels.map((lvl) => (
                <option key={lvl as string} value={String(lvl)}>
                  Level {lvl as string}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Clear Filters Button */}
            {(startDate || endDate || statusFilter !== "All" || levelFilter !== "All" || searchTerm) && (
              <button
                onClick={clearFilters}
                className="mb-[1px] px-3 py-1.5 h-[34px] text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {filteredRewards.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">
            {rewards.length === 0 
              ? "No rewards found for this wallet." 
              : "No rewards match your current filters."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="w-full min-w-max table-auto text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoice No</th>
                <th className="py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer / Referral</th>
                <th className="py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Level & %</th>
                <th className="py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Amount</th>
                <th className="py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredRewards.map((reward: any) => {
                const { date: formattedDate, time: formattedTime } = formatDateTime(reward.createdAt);

                // Format rolled-back date if it exists
                let rolledBackDate = null;
                if (reward.rolledBackAt) {
                  rolledBackDate = formatDateTime(reward.rolledBackAt).date;
                }

                return (
                  <tr key={reward.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-3 text-sm text-gray-900 whitespace-nowrap">
                      {formattedDate} <br />
                      <span className="text-xs text-gray-500">{formattedTime}</span>
                    </td>
                    <td className="py-2.5 px-3 text-sm font-medium text-gray-900 whitespace-nowrap">{reward.invoiceNo || "-"}</td>
                    <td className="py-2.5 px-3 text-sm text-gray-700 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{reward.customerName || "-"}</span>
                        {reward.referralName && <span className="text-xs text-gray-500">Ref: {reward.referralName}</span>}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-sm text-gray-700 whitespace-nowrap text-center">
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">Lvl {reward.level}</span><br />
                      <span className="text-xs text-gray-500">{reward.percentage}%</span>
                    </td>
                    <td className="py-2.5 px-3 text-sm font-semibold text-green-600 text-right whitespace-nowrap">
                      +{Number(reward.rewardAmount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {reward.isRolledBack ? (
                        <div className="flex flex-col">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 w-fit">Rolled Back</span>
                          {rolledBackDate && <span className="text-[10px] text-gray-500 mt-1">{rolledBackDate}</span>}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Active</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-sm text-gray-500 max-w-[200px] truncate" title={reward.note}>{reward.note || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// 1. Form values interface
// 1. Form values interface
interface OldMetalPurchaseFormValues {
  customerId: number;
  metalType: string;
  grossWeight: number;
  netWeight: number;
  purity: string;
  purityPercent: number;
  rate: number;
  totalCost: number;
  remarks: string;
  purchaseDate: string;
  shopId: number;
}

// 2. Added interface for the API GET response based on your Swagger JSON
interface OldMetalPurchase {
  id: number;
  purchaseNo: string;
  customerId: number;
  metalType: string;
  grossWeight: number;
  netWeight: number;
  rate: number;
  totalCost: number;
  purity: string;
  purityPercent: number;
  remarks: string;
  shopId: number;
  purchaseDate: string;
  createDate: string;
  createdBy: string;
}

export function OldMetalPurchaseTab({ customerId }: { customerId: number }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user, selectedShop } = useAuth();
  const { data: lookupData, isLoading: isLoadingLookup } = useAllLookUp();
  const purchaseMutation = useOldMetalPurchase();

  // Fetches the array of purchases mapped to the OldMetalPurchase interface
  const { data: purchases, isLoading: isLoadingPurchases } = useOldMetalPurchases(customerId);

  // ==========================================
  // FILTER STATES & LOGIC
  // ==========================================
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [metalTypeFilter, setMetalTypeFilter] = useState("All");

  const purchasesList = Array.isArray(purchases) ? purchases : [];

  const filteredPurchases = purchasesList.filter((p: OldMetalPurchase) => {
    // 1. Date Filter
    const pDate = new Date(p.purchaseDate);
    pDate.setHours(0, 0, 0, 0);

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(0, 0, 0, 0);

    const matchesStartDate = start ? pDate >= start : true;
    const matchesEndDate = end ? pDate <= end : true;

    // 2. Metal Type Filter
    const matchesMetalType = 
      metalTypeFilter === "All" || 
      p.metalType?.toLowerCase() === metalTypeFilter.toLowerCase();

    // 3. Search Filter
    const query = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !query ||
      p.purchaseNo?.toLowerCase().includes(query) ||
      p.purity?.toLowerCase().includes(query) ||
      p.remarks?.toLowerCase().includes(query);

    return matchesStartDate && matchesEndDate && matchesMetalType && matchesSearch;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setMetalTypeFilter("All");
  };
  // ==========================================

  // --- NEW FORMATTING FUNCTION ---
  const formatDateTime = (dateString: string) => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return { date: "-", time: "-" };

    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' }); // "Jan", "Feb", etc.
    const year = d.getFullYear();

    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return {
      date: `${day}-${month}-${year}`,
      time: `${hours}:${minutes}`
    };
  };
  // -------------------------------

  const activeShopId = selectedShop?.id || user?.shop?.id || 0;

  const { register, watch, setValue, handleSubmit, getValues, reset, formState: { errors } } = useForm<OldMetalPurchaseFormValues>({
    defaultValues: {
      customerId: customerId,
      metalType: "",
      grossWeight: 0,
      netWeight: 0,
      purity: "",
      purityPercent: 0,
      rate: 0,
      totalCost: 0,
      remarks: "",
      purchaseDate: new Date().toISOString(),
      shopId: activeShopId,
    },
  });

  const selectedMetalType = watch("metalType");
  const selectedPurity = watch("purity");
  const purityPercent = watch("purityPercent");
  const grossWeight = watch("grossWeight");
  const netWeight = watch("netWeight");
  const rate = watch("rate");

  const { data: activeRate } = useCurrentRate(selectedPurity || null);

  useEffect(() => {
  if (activeRate?.rate && activeRate?.metalType === selectedMetalType) {
    setValue("rate", activeRate.rate, { shouldValidate: true });

    if (activeRate?.purity) {
      const numericPurity = parseFloat(activeRate.purity);
      if (!isNaN(numericPurity)) {
        setValue("purityPercent", numericPurity, { shouldValidate: true });
      }
    }
  } else {
    setValue("rate", 0, { shouldValidate: true });
  }
}, [activeRate, selectedMetalType, setValue]);

  useEffect(() => {
  if (grossWeight > 0 && purityPercent > 0) {
    const calculatedNetWeight = (Number(grossWeight) * Number(purityPercent)) / 100;
    setValue("netWeight", parseFloat(calculatedNetWeight.toFixed(3)), { shouldValidate: true });
  } else {
    setValue("netWeight", 0, { shouldValidate: true });
  }
}, [grossWeight, purityPercent, setValue]);

  // UPDATE: Calculate Total Cost formatted to 3 decimal places
  useEffect(() => {
    const calculatedCost = (Number(grossWeight) || 0) * (Number(rate) || 0);
    setValue("totalCost", parseFloat(calculatedCost.toFixed(3)), { shouldValidate: true });
  }, [grossWeight, rate, setValue]);

  const onSubmit = (values: OldMetalPurchaseFormValues) => {
    const cleanValues = {
      ...values,
      grossWeight: values.grossWeight || 0,
      netWeight: values.netWeight || 0,
      rate: values.rate || 0,
      purityPercent: values.purityPercent || 0,
    };

    purchaseMutation.mutate(cleanValues, {
      onSuccess: () => {
        reset({ 
          ...getValues(), 
          grossWeight: 0, 
          netWeight: 0, 
          purityPercent: 0,
          totalCost: 0, 
          remarks: "", 
          purchaseDate: new Date().toISOString() 
        });
        setIsModalOpen(false);
      },
    });
  };

  const getPurityOptions = () => {
    if (selectedMetalType?.toLowerCase() === "gold") return lookupData?.goldPurity || [];
    if (selectedMetalType?.toLowerCase() === "silver") return lookupData?.silverPurity || [];
    if (selectedMetalType?.toLowerCase() === "diamond") return lookupData?.diamondPurity || [];
    return [];
  };

  const inputClass = "w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  if (isLoadingPurchases) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="p-4 sm:p-5">
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Old Metal Purchases</h2>
          <p className="text-sm text-gray-500">View and record old items exchanged or sold by the customer.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" /> Record Purchase
        </button>
      </div>

      {/* FILTER SECTION */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Ref No, Purity, or Note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Metal Type</label>
            <select
              value={metalTypeFilter}
              onChange={(e) => setMetalTypeFilter(e.target.value)}
              className={inputClass}
            >
              <option value="All">All Metals</option>
              <option value="Gold">Gold</option>
              <option value="Silver">Silver</option>
              <option value="Diamond">Diamond</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex gap-2 md:col-span-2 lg:col-span-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Clear Filters Button */}
            {(startDate || endDate || metalTypeFilter !== "All" || searchTerm) && (
              <button
                onClick={clearFilters}
                className="mb-[1px] px-3 py-1.5 h-[34px] text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase No</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metal & Purity</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Wt</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Wt</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPurchases.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                  {purchasesList.length === 0 
                    ? "No old metal purchases found."
                    : "No purchases match your current filters."}
                </td>
              </tr>
            ) : (
              filteredPurchases.map((purchase: OldMetalPurchase) => {
                const { date: formattedDate, time: formattedTime } = formatDateTime(purchase.purchaseDate);

                return (
                  <tr key={purchase.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{purchase.purchaseNo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formattedDate} <br />
                      <span className="text-xs text-gray-500">{formattedTime}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {purchase.metalType} ({purchase.purity})
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{purchase.grossWeight?.toFixed(3)}g</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">{purchase.netWeight?.toFixed(3)}g</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">₹{purchase.rate?.toLocaleString()}</td>
                    {/* UPDATE: Ensure table displays maximum 3 decimal places */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                      ₹{purchase.totalCost?.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal / Popup for the Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-lg bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="text-lg font-semibold text-gray-900">Record Old Metal Purchase</h3>
              <button onClick={() => setIsModalOpen(false)} className="h-5 w-5 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none">
               <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5">
              {isLoadingLookup ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" /></div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                    <div className="md:col-span-2 lg:col-span-1">
                      <label className={labelClass}>Metal Type</label>
                      <select {...register("metalType", { required: "Required" })} className={inputClass}>
                        <option value="">Select</option>
                        {lookupData?.metalTypes?.map((metal: string) => <option key={metal} value={metal}>{metal}</option>)}
                      </select>
                      {errors.metalType && <p className="text-xs text-red-500 mt-1">{errors.metalType.message}</p>}
                    </div>

                    <div>
                      <label className={labelClass}>Purity (ID)</label>
                      <select {...register("purity", { required: "Required" })} disabled={!selectedMetalType} className={inputClass}>
                        <option value="">Select</option>
                        {getPurityOptions().map((p: string) => <option key={p} value={p}>{p}</option>)}
                      </select>
                      {errors.purity && <p className="text-xs text-red-500 mt-1">{errors.purity.message}</p>}
                    </div>

                    <div>
                      <label className={labelClass}>Purity %</label>
                      <input 
                        type="number" step="0.01" 
                        {...register("purityPercent", { required: "Required", valueAsNumber: true, min: { value: 0.01, message: "> 0" }, max: { value: 100, message: "Max 100" } })} 
                        className={inputClass} 
                      />
                      <div className="flex justify-between items-start mt-0.5">
                        <p className="text-[10px] text-gray-500 leading-tight">Editable %</p>
                        {errors.purityPercent && <p className="text-xs text-red-500 leading-tight">{errors.purityPercent.message}</p>}
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Rate (per gram)</label>
                      <input 
                        type="number" step="0.01" 
                        {...register("rate", { required: "Required", valueAsNumber: true, min: { value: 0.01, message: "Must be > 0" } })} 
                        className={inputClass} 
                      />
                      <div className="flex justify-between items-start mt-0.5">
                        <p className="text-[10px] text-gray-500 leading-tight">{activeRate ? "Auto-filled." : "Select purity."}</p>
                        {errors.rate && <p className="text-xs text-red-500 leading-tight">{errors.rate.message}</p>}
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Gross Weight (g)</label>
                      <input 
                        type="number" step="0.001" 
                        {...register("grossWeight", { required: "Required", valueAsNumber: true, min: { value: 0.001, message: "Must be > 0" } })} 
                        className={inputClass} 
                      />
                      {errors.grossWeight && <p className="text-xs text-red-500 mt-1">{errors.grossWeight.message}</p>}
                    </div>

                    <div>
                      <label className={labelClass}>Pure Weight (g)</label>
                      <input 
                        type="number" step="0.001" readOnly 
                        {...register("netWeight", { required: "Required", valueAsNumber: true, min: { value: 0.001, message: "Must be > 0" }})} 
                        className={`${inputClass} bg-gray-50`} 
                      />
                      <div className="flex justify-between items-start mt-0.5">
                        <p className="text-[10px] text-gray-500 leading-tight">Auto-calculated.</p>
                        {errors.netWeight && <p className="text-xs text-red-500 leading-tight">{errors.netWeight.message}</p>}
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className={labelClass}>Total Cost</label>
                      {/* UPDATE: step="0.001" applied here to match the 3 decimals rule */}
                      <input type="number" step="0.001" {...register("totalCost", { valueAsNumber: true })} className={`${inputClass} bg-gray-50`} />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Remarks</label>
                    <input type="text" placeholder="Condition of item, description, etc." {...register("remarks")} className={inputClass} />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                      Cancel
                    </button>
                    <button type="submit" disabled={purchaseMutation.isPending} className="flex items-center justify-center rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-400">
                      {purchaseMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit Purchase
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}// ==========================================
// 4. Payout Form Tab (NEW)
// ==========================================

// Assuming these are imported correctly in your actual file:
// import { useAuth } from "@/contexts/AuthContext";
// import { usePayout, useWalletByCustomerId } from "@/hooks/useWallet";
// import { useAllLookUp } from "@/hooks/useLookup";
// import { useCustomer } from "@/hooks/useCustomer"; 

interface PayoutEntry {
  method: string;
  amount: number;
  reference: string;
  note: string;
}

interface PayoutFormValues {
  customerId: number;
  shopId: number;
  amount: number;
  note: string;
  payoutDate: string;
  entries: PayoutEntry[];
}

export function PayoutTab({ customerId }: { customerId: number }) {
  const { user, selectedShop } = useAuth();
  const payoutMutation = usePayout();
  
  // 1. Fetch the lookup data
  const { data: lookupData, isLoading: isLookupLoading } = useAllLookUp();
  
  // 2. Fetch Customer Details using your custom hook
  const { data: customerData, isLoading: isCustomerLoading } = useCustomer(customerId);

  // 3. Fetch Wallet Details
  const { data: walletData, isLoading: isWalletLoading } = useWalletByCustomerId(customerId);

  const activeShopId = selectedShop?.id || user?.shop?.id || 0;

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<PayoutFormValues>({
    defaultValues: {
      customerId: customerId,
      shopId: activeShopId,
      amount: 0,
      note: "",
      payoutDate: new Date().toISOString(),
      entries: [{ method: "cash", amount: 0, reference: "", note: "" }] 
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "entries",
  });

  // --- LOGIC: Dynamic Payment Methods ---
  const blockedMethods = ["exchange", "returnItem"];
  const rawPaymentMethods = lookupData?.paymentUiLabels ? Object.keys(lookupData.paymentUiLabels) : [];
  
  const availableMethods = rawPaymentMethods.filter(method => !blockedMethods.includes(method));
  const methodsToRender = availableMethods.length > 0 ? availableMethods : ["cash"];

  const formatLabel = (key: string) => {
    const withSpaces = key.replace(/([A-Z])/g, ' $1');
    return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1).trim();
  };

  // --- NEW LOGIC: Auto-calculate Total Amount & Overdraft ---
  const watchedEntries = watch("entries") || [];
  const totalAmount = watchedEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
  
  // Check if payout exceeds current balance
  const currentBalance = walletData?.balance || 0;
  const isOverdraft = totalAmount > currentBalance;
  // ----------------------------------------------

  const onSubmit = (values: PayoutFormValues) => {
    // Extra guard clauses: Prevent submit if 0, negative, or overdraft
    if (totalAmount <= 0) return; 
    if (isOverdraft) return;

    const payload = { 
      ...values, 
      amount: totalAmount, 
      payoutDate: new Date().toISOString() 
    };
    
    payoutMutation.mutate(payload, {
      onSuccess: () => {
        reset({
          customerId,
          shopId: activeShopId,
          amount: 0,
          note: "",
          payoutDate: new Date().toISOString(),
          entries: [{ method: "cash", amount: 0, reference: "", note: "" }]
        });
      },
    });
  };

  const handleMethodChange = (index: number, newMethod: string) => {
    setValue(`entries.${index}.method`, newMethod);
    if (newMethod.toLowerCase() === "cash") {
      setValue(`entries.${index}.reference`, ""); // Clear bank name
    }
  };

  const inputClass = "w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="p-4 sm:p-5">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Process Payout</h2>
        <p className="text-sm text-gray-500">Withdraw or pay out funds from the customer's wallet balance.</p>
      </div>

      {/* --- CUSTOMER & WALLET SUMMARY CARD --- */}
      
      {/* -------------------------------------- */}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div>
            <label className={labelClass}>Total Payout Amount</label>
            <div className={`w-full rounded-md border px-3 py-1.5 text-lg font-semibold h-[38px] flex items-center ${isOverdraft ? "border-red-300 bg-red-50 text-red-700" : "border-gray-200 bg-gray-50 text-gray-900"}`}>
              {totalAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
            </div>
            
            {/* Show error if amount is 0 or less */}
            {totalAmount <= 0 && <p className="text-xs text-red-500 mt-1">Total amount must be greater than 0</p>}
            
            {/* Show warning if amount exceeds balance */}
            {isOverdraft && (
              <p className="text-xs text-red-500 mt-1 font-medium">Error: Amount exceeds total wallet balance!</p>
            )}
          </div>

          <div>
            <label className={labelClass}>Master Note</label>
            <input type="text" {...register("note")} className={inputClass} placeholder="Reason for payout" />
          </div>
        </div>

        {/* Dynamic Payout Entries Section */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-900">Payment Methods</h3>
            <button
              type="button"
              onClick={() => append({ method: "cash", amount: 0, reference: "", note: "" })}
              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              <Plus className="h-3 w-3" /> Add Method
            </button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => {
              const currentMethod = watchedEntries[index]?.method || "cash";
              const isCash = currentMethod.toLowerCase() === "cash";

              return (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start bg-white p-3 rounded-md border border-gray-100 shadow-sm relative">
                  
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Method</label>
                    <select 
                      {...register(`entries.${index}.method`)} 
                      onChange={(e) => handleMethodChange(index, e.target.value)}
                      className={inputClass}
                      disabled={isLookupLoading}
                    >
                      {methodsToRender.map((method) => (
                        <option key={method} value={method}>
                          {formatLabel(method)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Amount</label>
                    <input type="number" step="0.01" {...register(`entries.${index}.amount`, { valueAsNumber: true })} className={inputClass} placeholder="0.00" />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Bank Name</label>
                    <select 
                      {...register(`entries.${index}.reference`)} 
                      className={inputClass}
                      disabled={isLookupLoading || isCash}
                    >
                      <option value="">
                        {isLookupLoading ? "Loading banks..." : isCash ? "Not required for Cash" : "Select a bank..."}
                      </option>
                      {lookupData?.bankNames?.map((bank) => (
                        <option key={bank} value={bank}>
                          {bank}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Note</label>
                    <input type="text" {...register(`entries.${index}.note`)} className={inputClass} placeholder="Optional note..." />
                  </div>

                  <div className="md:col-span-1 flex justify-end mt-6">
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                        title="Remove Entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        <button 
          type="submit" 
          /* Button automatically disables if API is pending, total amount is <= 0, OR if overdrafting */
          disabled={payoutMutation.isPending || totalAmount <= 0 || isOverdraft} 
          className="w-full md:w-auto flex items-center justify-center rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
        >
          {payoutMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Payout
        </button>
      </form>
    </div>
  );
}