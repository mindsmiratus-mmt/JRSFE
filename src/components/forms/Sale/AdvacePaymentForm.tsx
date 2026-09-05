import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  User,
  Banknote,
  Tag,
  Store,
  Package,
  Scale,
  Gem,
  Pencil,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import {
  useOrder,
  useCompleteAdvance,
  useEditAdvanceOrder,
} from "@/hooks/useOrder";
import { useAllLookUp } from "@/hooks/useLookup";
import { useWalletByCustomerId } from "@/hooks/useWallet";
import { useInvoicePdf } from "@/hooks/useInvoice";

type PaymentMethodKey =
  | "cash"
  | "card"
  | "upi"
  | "onlineBanking"
  | "exchange"
  | "returnItem";

interface PaymentUiLabel {
  amountLabel: string;
  machineOrBankLabel?: string;
  referenceLabel?: string;
  noteLabel?: string;
  itemNameLabel?: string;
  metalTypeLabel?: string;
  externalIdLabel?: string;
}

interface LookupResponse {
  metalTypes: string[];
  makingChargeTypes: string[];
  discountTypes: string[];
  units: string[];
  goldPurity: string[];
  diamondPurity: string[];
  silverPurity: string[];
  stoneTypes: string[];
  pricingModel: string[];
  paymentUiLabels: Record<PaymentMethodKey, PaymentUiLabel>;
  gst: {
    igst: number;
    cgst: number;
    sgst: number;
  };
  bankNames: string[];
  advanceOrderSettings?: {
    minAdvancePercent?: number;
  };
}

interface WalletResponse {
  id: number;
  customerId: number;
  phone: string;
  balance: number;
  rewardBalance: number;
  returnBalance: number;
  createdAt: string;
  updatedAt: string;
}

interface Payment {
  method: number;
  amount: number;
  machineOrBank?: string;
  reference?: string;
  note?: string;
}

interface ExchangeItem {
  amount: number;
  note?: string;
}

interface PaymentDetail {
  payments: Payment[];
  exchangeItems?: ExchangeItem[];
  adjustAmount?: number;
}

interface CompleteAdvancePayload {
  walletRedeemAmount: number;
  paymentDetail: PaymentDetail;
}

interface PaymentFormEntry {
  id: string;
  method: number;
  amount: string;
  machineOrBank: string;
  reference: string;
  note: string;
}

interface ItemCostDetails {
  goldCost?: number;
  diamondCost?: number;
  stoneCost?: number;
  makingCharges?: number;
  discount?: number;
  igst?: number;
  cgst?: number;
  sgst?: number;
  otherCharges?: number;
  totalSalePrice?: number;
  totalSalePriceBeforeTax?: number;
  igstPercent?: number;

  GoldCost?: number;
  DiamondCost?: number;
  StoneCost?: number;
  MakingCharges?: number;
  Discount?: number;
  IGST?: number;
  CGST?: number;
  SGST?: number;
  OtherCharges?: number;
  TotalSalePrice?: number;
  TotalSalePriceBeforeTax?: number;
  IGSTPercent?: number;
}

interface CartItem {
  id?: string;
  itemId?: number;
  tagNumber?: string;
  itemName?: string;
  metal?: string;
  category?: string;
  quantity?: number;
  gPurityId?: string;
  purityPercent?: string;
  grossWeight?: number;
  stoneWeight?: number;
  diamondWeight?: number;
  netWeight?: number;
  itemCostDetails?: ItemCostDetails;

  Id?: string;
  ItemId?: number;
  TagNumber?: string;
  ItemName?: string;
  Metal?: string;
  Category?: string;
  Quantity?: number;
  GPurityId?: string;
  PurityPercent?: string;
  GrossWeight?: number;
  StoneWeight?: number;
  DiamondWeight?: number;
  NetWeight?: number;
  ItemCostDetails?: ItemCostDetails;
}

interface CartResponse {
  id?: string;
  status?: number;
  shopId?: number;
  userId?: number;
  customerId?: number;
  items?: CartItem[];
  makingCharges?: number;
  discount?: number;
  igst?: number;
  cgst?: number;
  sgst?: number;
  grandTotal?: number;
  currency?: string;

  Id?: string;
  Status?: number;
  ShopId?: number;
  UserId?: number;
  CustomerId?: number;
  Items?: CartItem[];
  MakingCharges?: number;
  Discount?: number;
  IGST?: number;
  CGST?: number;
  SGST?: number;
  GrandTotal?: number;
  Currency?: string;
}

interface CustomerInfo {
  id: number;
  name: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  gstin?: string;
  pan?: string;
  adharNo?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  isActive?: boolean;
  referralId?: number;
  createDate?: string;
  createdBy?: string;
  updateDate?: string;
  updatedBy?: string;
}

interface OrderResponse {
  id: number;
  orderNo: string;
  cartId: string;
  cartData: string | CartResponse;
  userId: number;
  shopId: number;
  customerId: number;
  customer: CustomerInfo;
  status: string;
  createdAt: string;
  isAdvanceOrder: boolean;
  deliveryDate?: string;
  advanceAmount?: number;
  balanceAmount?: number;
  totalAmount?: number;
  invoiceId?: number;
}

interface PaymentMethodOption {
  value: number;
  key: PaymentMethodKey;
  label: string;
  ui: PaymentUiLabel;
}

interface EditAdvanceItemDraft {
  itemKey: string;
  itemId: number;
  itemName: string;
  tagNumber: string;
  grossWeight: string;
  netWeight: string;
  diamondWeight: string;
  diamondCarat: string;
  stoneWeight: string;
}

interface AdvanceOrderEditItem {
  goldMakingCharge?: number;
  goldMakingChargeType?: string;
  goldDiscount?: number;
  goldDiscountType?: string;
  diamondMakingCharge?: number;
  diamondMakingChargeType?: string;
  diamondDiscount?: number;
  diamondDiscountType?: string;
  stoneDiscount?: number;
  stoneDiscountType?: string;
  grossWeight?: number;
  netWeight?: number;
  diamondWeight?: number;
  diamondCarat?: number;
  stoneWeight?: number;
}

interface EditAdvancePayload {
  orderId: number;
  edits: Record<string, AdvanceOrderEditItem>;
}

function parseCartData(raw: unknown): CartResponse | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as CartResponse;
    } catch {
      return null;
    }
  }
  return raw as CartResponse;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getItemTotal(item: CartItem): number {
  return num(
    item.itemCostDetails?.totalSalePrice ??
      item.ItemCostDetails?.totalSalePrice ??
      item.ItemCostDetails?.TotalSalePrice
  );
}

function getCartItemKey(item: CartItem, index = 0): string {
  return String(item.id || item.Id || item.itemId || item.ItemId || `item-${index}`);
}

export default function CompleteAdvanceOrderPage() {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const orderId = Number(params.id);

  const { data: lookupData } = useAllLookUp() as { data?: LookupResponse };
  const { data: order, isLoading: orderLoading } = useOrder(
    Number.isFinite(orderId) ? orderId : null
  ) as { data?: OrderResponse; isLoading: boolean };

  const completeAdvanceMutation = useCompleteAdvance();
  const invoicePdfMutation = useInvoicePdf();
  const editAdvanceMutation = useEditAdvanceOrder();

  const [walletRedeem, setWalletRedeem] = useState("0");
  const [adjustAmount, setAdjustAmount] = useState("0");
  const [isPaymentConfirmOpen, setIsPaymentConfirmOpen] = useState(false);
  const [isInvoicePromptOpen, setIsInvoicePromptOpen] = useState(false);
  const [pendingPaymentPayload, setPendingPaymentPayload] =
    useState<CompleteAdvancePayload | null>(null);

  const [isEditItemsOpen, setIsEditItemsOpen] = useState(false);
  const [editItemsDraft, setEditItemsDraft] = useState<EditAdvanceItemDraft[]>([]);

  const [paymentsList, setPaymentsList] = useState<PaymentFormEntry[]>([
    {
      id: "1",
      method: 0,
      amount: "",
      machineOrBank: "",
      reference: "",
      note: "",
    },
  ]);

  const cart = useMemo(() => parseCartData(order?.cartData), [order?.cartData]);
  const customer = order?.customer;
  const balanceAmount = num(order?.balanceAmount);
  const advanceAmount = num(order?.advanceAmount);
  const finalGrandTotal =
    num(cart?.grandTotal ?? cart?.GrandTotal) || num(order?.totalAmount);

  const cartItems: CartItem[] = useMemo(() => {
    return (cart?.items ?? cart?.Items ?? []) as CartItem[];
  }, [cart]);

  const { data: walletData } = useWalletByCustomerId(customer?.id || null) as {
    data?: WalletResponse;
  };

  useEffect(() => {
    if (!order) return;
    setPaymentsList([
      {
        id: Date.now().toString(),
        method: 0,
        amount: "",
        machineOrBank: "",
        reference: "",
        note: "",
      },
    ]);
  }, [order]);

  useEffect(() => {
    if (walletData && typeof walletData.rewardBalance === "number") {
      const maxRedeemable = Math.min(
        Math.floor(walletData.rewardBalance),
        Math.max(0, balanceAmount)
      );
      setWalletRedeem(String(maxRedeemable));
    } else if (!walletData) {
      setWalletRedeem("0");
    }
  }, [walletData, balanceAmount]);

  const paymentConfig: {
    methods: PaymentMethodOption[];
    bankOptions: { value: string; label: string }[];
  } = {
    methods: [
      {
        value: 0,
        key: "cash",
        label: "Cash",
        ui: lookupData?.paymentUiLabels?.cash ?? { amountLabel: "Amount" },
      },
      {
        value: 1,
        key: "card",
        label: "Card",
        ui: lookupData?.paymentUiLabels?.card ?? {
          amountLabel: "Amount",
          machineOrBankLabel: "POS Machine",
          referenceLabel: "Transaction ID",
          noteLabel: "Card Last 4 Digits",
        },
      },
      {
        value: 2,
        key: "upi",
        label: "UPI",
        ui: lookupData?.paymentUiLabels?.upi ?? {
          amountLabel: "Amount",
          machineOrBankLabel: "UPI Gateway",
          referenceLabel: "UPI Transaction Ref",
          noteLabel: "UPI Note",
        },
      },
      {
        value: 3,
        key: "onlineBanking",
        label: "Online Banking",
        ui: lookupData?.paymentUiLabels?.onlineBanking ?? {
          amountLabel: "Amount",
          machineOrBankLabel: "Bank Name",
          referenceLabel: "Auth Code",
          noteLabel: "Remarks",
        },
      },
      {
        value: 4,
        key: "exchange",
        label: "Exchange",
        ui: lookupData?.paymentUiLabels?.exchange ?? {
          amountLabel: "Exchange Value",
          itemNameLabel: "Item Name",
          metalTypeLabel: "Metal Type",
          externalIdLabel: "Tag/HUID",
        },
      },
    ],
    bankOptions:
      lookupData?.bankNames?.map((bank) => ({
        value: bank,
        label: bank,
      })) ?? [],
  };

  const getPaymentMethod = (method: number): PaymentMethodOption =>
    paymentConfig.methods.find((m) => m.value === method) ??
    paymentConfig.methods[0];

  const getPaymentMethodLabel = (method: number): string =>
    getPaymentMethod(method).label;

  const getPaymentUi = (method: number): PaymentUiLabel =>
    getPaymentMethod(method).ui;

  const paymentMethodOptions = paymentConfig.methods.map((m) => ({
    value: m.value,
    label: m.label,
  }));
  const toSafeNumber = (value: string | number | undefined | null) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const roundTo3 = (value: number) => Number(Math.max(0, value).toFixed(3));

const caratToGram = (carat: number) => carat * 0.2;

  const updatePayment = (
    id: string,
    field: keyof PaymentFormEntry,
    value: string | number
  ) => {
    setPaymentsList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const addPayment = () => {
    setPaymentsList((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        method: 0,
        amount: "",
        machineOrBank: "",
        reference: "",
        note: "",
      },
    ]);
  };

  const removePayment = (id: string) => {
    setPaymentsList((prev) => prev.filter((p) => p.id !== id));
  };

  const buildFormattedPayments = (list: PaymentFormEntry[]): Payment[] | null => {
    const formattedPayments: Payment[] = [];

    for (const p of list) {
      const amt = Number(p.amount ?? 0);

      if (!Number.isFinite(amt) || amt < 0) {
        toast.error("Payment amount cannot be negative.");
        return null;
      }

      if (p.method !== 0 && p.method !== 4 && !p.machineOrBank.trim()) {
        const methodLabel = getPaymentMethodLabel(p.method);
        toast.error(`Bank / Machine name is required for ${methodLabel}.`);
        return null;
      }

      formattedPayments.push({
        method: Number(p.method),
        amount: Number(amt.toFixed(2)),
        machineOrBank:
          p.method === 0 || p.method === 4
            ? undefined
            : p.machineOrBank.trim() || undefined,
        reference: p.reference.trim() || undefined,
        note: p.note.trim() || undefined,
      });
    }

    return formattedPayments;
  };
  useEffect(() => {
  if (editItemsDraft.length === 0) return;

  const recalculated = editItemsDraft.map((item) => {
    const grossWeight = toSafeNumber(item.grossWeight);
    const stoneWeight = toSafeNumber(item.stoneWeight);
    const diamondCarat = toSafeNumber(item.diamondCarat);

    const diamondWeight = roundTo3(caratToGram(diamondCarat));
    const netWeight = roundTo3(grossWeight - stoneWeight - diamondWeight);

    return {
      ...item,
      diamondWeight: String(diamondWeight),
      netWeight: String(netWeight),
    };
  });

  const hasChanged = recalculated.some((item, index) => {
    return (
      item.diamondWeight !== editItemsDraft[index].diamondWeight ||
      item.netWeight !== editItemsDraft[index].netWeight
    );
  });

  if (hasChanged) {
    setEditItemsDraft(recalculated);
  }
}, [editItemsDraft]);

  const handleWalletRedeemChange = (raw: string) => {
    if (!walletData || typeof walletData.rewardBalance !== "number") {
      setWalletRedeem(raw);
      return;
    }

    const maxBalance = Math.min(
      Math.floor(walletData.rewardBalance),
      Math.max(0, balanceAmount)
    );
    const entered = Number(raw);

    if (!Number.isFinite(entered) || entered < 0) {
      setWalletRedeem(raw);
      return;
    }

    if (entered > maxBalance) {
      toast.error(
        `Insufficient reward balance. Maximum redeemable amount is ₹${maxBalance}.`
      );
      setWalletRedeem(String(maxBalance));
    } else {
      setWalletRedeem(raw);
    }
  };

  const currentTotalPaid = paymentsList.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );

  const currentTotalExpected = Math.max(
    0,
    balanceAmount - Number(walletRedeem || 0)
  );

  const remainingAmount =
    currentTotalExpected - currentTotalPaid - Number(adjustAmount || 0);

  const downloadPdfBlob = (blobData: Blob, fallbackName: string) => {
    const blob = new Blob([blobData], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const newTab = window.open(url, "_blank");

    if (!newTab) {
      const a = document.createElement("a");
      a.href = url;
      a.download = fallbackName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    setTimeout(() => window.URL.revokeObjectURL(url), 60000);
  };

  const handleFinalizePaymentClick = () => {
    if (!orderId) {
      toast.error("Order ID is missing. Cannot complete advance payment.");
      return;
    }

    const formattedPayments = buildFormattedPayments(paymentsList);

    if (!formattedPayments) {
      return;
    }

    const totalPaid = formattedPayments.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );

    const expectedTotal = Math.max(0, balanceAmount - Number(walletRedeem || 0));
    const calculatedAdjustment = expectedTotal - totalPaid;

    const hasManualAdjust =
      adjustAmount !== "" &&
      adjustAmount !== null &&
      adjustAmount !== undefined;

    const parsedAdjustAmount = Number(adjustAmount);

    const finalAdjustment =
      hasManualAdjust && Number.isFinite(parsedAdjustAmount)
        ? parsedAdjustAmount
        : calculatedAdjustment;

    setPendingPaymentPayload({
      walletRedeemAmount: Number(walletRedeem || 0),
      paymentDetail: {
        payments: formattedPayments,
        exchangeItems: [],
        adjustAmount: Number(finalAdjustment.toFixed(2)),
      },
    });

    setIsPaymentConfirmOpen(true);
  };

  const handleConfirmCompleteAdvancePayment = () => {
    if (!orderId || !pendingPaymentPayload) return;

    setIsPaymentConfirmOpen(false);

    completeAdvanceMutation.mutate(
      { id: orderId, payload: pendingPaymentPayload },
      {
        onSuccess: () => {
          toast.success("Advance order completed successfully!");
          setIsInvoicePromptOpen(true);
        },
        onError: (err: any) => {
          toast.error(
            err?.response?.data?.message || "Failed to complete advance order."
          );
        },
      }
    );
  };

  const handleDownloadInvoice = () => {
    const invoiceId = order?.invoiceId;
    if (!invoiceId) {
      toast.error("Invoice ID is missing. Invoice is not available yet.");
      return;
    }

    invoicePdfMutation.mutate(invoiceId, {
      onSuccess: (blobData) => {
        downloadPdfBlob(blobData, `invoice-${invoiceId}.pdf`);
        setIsInvoicePromptOpen(false);
        navigate("/admin/sale");
      },
      onError: () => {
        toast.error("Failed to download invoice. Please try again.");
      },
    });
  };

  const handleSkipInvoiceDownload = () => {
    setIsInvoicePromptOpen(false);
    navigate("/admin/sale");
  };

  const openEditItemsDialog = () => {
    const draft = cartItems
      .map((item, index) => {
        const itemId = Number(item.itemId || item.ItemId || 0);
        const itemKey = getCartItemKey(item, index);
        if (!itemKey) return null;

        return {
          itemKey,
          itemId,
          itemName: item.itemName || item.ItemName || `Item ${index + 1}`,
          tagNumber: item.tagNumber || item.TagNumber || "",
          grossWeight: String(Number(item.grossWeight || item.GrossWeight || 0)),
          netWeight: String(Number(item.netWeight || item.NetWeight || 0)),
          diamondWeight: String(
            Number(item.diamondWeight || item.DiamondWeight || 0)
          ),
          diamondCarat: "0",
          stoneWeight: String(Number(item.stoneWeight || item.StoneWeight || 0)),
        } as EditAdvanceItemDraft;
      })
      .filter(Boolean) as EditAdvanceItemDraft[];

    setEditItemsDraft(draft);
    setIsEditItemsOpen(true);
  };

  const updateEditDraftItem = (
    itemKey: string,
    field: keyof Omit<
      EditAdvanceItemDraft,
      "itemKey" | "itemId" | "itemName" | "tagNumber"
    >,
    value: string
  ) => {
    setEditItemsDraft((prev) =>
      prev.map((item) =>
        item.itemKey === itemKey ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSubmitEditAdvanceItems = () => {
    if (!orderId) {
      toast.error("Order ID is missing.");
      return;
    }

    const edits: EditAdvancePayload["edits"] = {};

    editItemsDraft.forEach((draft) => {
      const original = cartItems.find(
        (item, index) => getCartItemKey(item, index) === draft.itemKey
      );

      if (!original) return;

      const grossWeight = Number(draft.grossWeight || 0);
      const netWeight = Number(draft.netWeight || 0);
      const diamondWeight = Number(draft.diamondWeight || 0);
      const diamondCarat = Number(draft.diamondCarat || 0);
      const stoneWeight = Number(draft.stoneWeight || 0);

      const originalGrossWeight = Number(
        original.grossWeight || original.GrossWeight || 0
      );
      const originalNetWeight = Number(
        original.netWeight || original.NetWeight || 0
      );
      const originalDiamondWeight = Number(
        original.diamondWeight || original.DiamondWeight || 0
      );
      const originalStoneWeight = Number(
        original.stoneWeight || original.StoneWeight || 0
      );

      const changedFields: AdvanceOrderEditItem = {};

      if (grossWeight !== originalGrossWeight) {
        changedFields.grossWeight = grossWeight;
      }

      if (netWeight !== originalNetWeight) {
        changedFields.netWeight = netWeight;
      }

      if (diamondWeight !== originalDiamondWeight) {
        changedFields.diamondWeight = diamondWeight;
      }

      if (stoneWeight !== originalStoneWeight) {
        changedFields.stoneWeight = stoneWeight;
      }

      if (diamondCarat !== 0) {
        changedFields.diamondCarat = diamondCarat;
      }

      if (Object.keys(changedFields).length > 0) {
        edits[draft.itemKey] = changedFields;
      }
    });

    if (Object.keys(edits).length === 0) {
      toast.error("No changes found to update.");
      return;
    }

    const payload: EditAdvancePayload = {
      orderId,
      edits,
    };

    editAdvanceMutation.mutate(
      { id: orderId, payload },
      {
        onSuccess: () => {
          toast.success("Advance order items updated successfully.");
          setIsEditItemsOpen(false);
        },
        onError: (err: any) => {
          toast.error(
            err?.response?.data?.message ||
              "Failed to update advance order items."
          );
        },
      }
    );
  };


  if (!Number.isFinite(orderId)) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          Invalid order ID.
        </div>
      </div>
    );
  }

  if (orderLoading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <div className="rounded-full border border-green-100 bg-green-50 p-4">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-gray-800">
            Loading advance order details...
          </p>
          <p className="mt-1 text-sm text-gray-500">Please wait...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          Advance order not found.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="relative overflow-hidden rounded-xl border-2 border-green-400 bg-white p-6 shadow-lg animate-in fade-in slide-in-from-bottom-4">
        <div className="mb-6 flex flex-col gap-4 border-b border-gray-100 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
              <Tag className="h-5 w-5 fill-current text-[#b08d28]" />
              Complete Advance Order
            </h2>

            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <p className="rounded border border-gray-200 bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-500">
                Order: {order.orderNo}
              </p>

              {order.cartId && (
                <p className="rounded border border-gray-200 bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-500">
                  Cart: {order.cartId}
                </p>
              )}

              {customer?.name && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <User className="h-3 w-3" />
                  {customer.name}
                </div>
              )}

              {typeof order.shopId === "number" && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Store className="h-3 w-3" />
                  Shop ID: {order.shopId}
                </div>
              )}
            </div>

            {walletData && (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {typeof walletData.rewardBalance === "number" && (
                  <p className="flex items-center gap-1 text-xs font-medium text-green-600">
                    <Banknote className="h-3 w-3" />
                    Reward Balance: ₹
                    {Math.floor(walletData.rewardBalance).toLocaleString()}
                  </p>
                )}

                {typeof walletData.returnBalance === "number" &&
                  walletData.returnBalance > 0 && (
                    <p className="flex items-center gap-1 text-xs font-medium text-blue-600">
                      <Banknote className="h-3 w-3" />
                      Return Balance: ₹
                      {Math.floor(walletData.returnBalance).toLocaleString()}
                    </p>
                  )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="min-w-[180px] rounded-xl border border-green-100 bg-green-50 px-5 py-3 text-right shadow-sm">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-green-600 md:text-xs">
                Remaining Balance
              </p>
              <p className="text-2xl font-bold text-green-700 md:text-3xl">
                ₹
                {balanceAmount.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </p>

              {Number(walletRedeem) > 0 && (
                <p className="mt-1 text-[11px] text-gray-500">
                  Wallet Applied: ₹
                  {Number(walletRedeem).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </p>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/sale")}
              className="h-10 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
            >
              Cancel
            </Button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Grand Total
            </p>
            <p className="mt-2 text-lg font-bold text-slate-900">
              ₹
              {finalGrandTotal.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              Advance Paid
            </p>
            <p className="mt-2 text-lg font-bold text-amber-900">
              ₹
              {advanceAmount.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-600">
              Balance Pending
            </p>
            <p className="mt-2 text-lg font-bold text-green-900">
              ₹
              {balanceAmount.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        {cartItems.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-amber-700" />
                <h3 className="text-base font-bold text-gray-800">
                  Items Being Purchased
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-600">
                  {cartItems.length} item{cartItems.length > 1 ? "s" : ""}
                </span>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openEditItemsDialog}
                  className="border-amber-300 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit Items
                </Button>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {cartItems.map((item, index) => {
                const itemName = item.itemName || item.ItemName || "Unnamed Item";
                const itemId = item.itemId || item.ItemId;
                const tagNumber = item.tagNumber || item.TagNumber;
                const metal = item.metal || item.Metal || "-";
                const category = item.category || item.Category || "-";
                const purity =
                  item.gPurityId ||
                  item.GPurityId ||
                  item.purityPercent ||
                  item.PurityPercent ||
                  "-";
                const grossWeight = Number(item.grossWeight || item.GrossWeight || 0);
                const netWeight = Number(item.netWeight || item.NetWeight || 0);
                const stoneWeight = Number(item.stoneWeight || item.StoneWeight || 0);
                const diamondWeight = Number(
                  item.diamondWeight || item.DiamondWeight || 0
                );
                const qty = Number(item.quantity || item.Quantity || 1);
                const itemTotal = getItemTotal(item);

                return (
                  <div
                    key={item.id || item.Id || index}
                    className="p-4 transition-colors hover:bg-amber-50/30"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-bold text-gray-900">
                            {itemName}
                          </h4>

                          {tagNumber && (
                            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                              Tag: {tagNumber}
                            </span>
                          )}

                          {itemId && (
                            <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                              ID: {itemId}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                              Metal / Purity
                            </p>
                            <p className="mt-1 text-sm font-semibold text-gray-800">
                              {metal} {purity !== "-" ? `• ${purity}` : ""}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">{category}</p>
                          </div>

                          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                            <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                              <Scale className="h-3.5 w-3.5" />
                              Weight
                            </p>
                            <p className="mt-1 text-sm text-gray-700">
                              Gross:{" "}
                              <span className="font-semibold">
                                {grossWeight.toFixed(3)} g
                              </span>
                            </p>
                            <p className="text-sm text-gray-700">
                              Net:{" "}
                              <span className="font-semibold">
                                {netWeight.toFixed(3)} g
                              </span>
                            </p>
                          </div>

                          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                            <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                              <Gem className="h-3.5 w-3.5" />
                              Stones
                            </p>
                            <p className="mt-1 text-sm text-gray-700">
                              Diamond:{" "}
                              <span className="font-semibold">
                                {diamondWeight.toFixed(3)}
                              </span>
                            </p>
                            <p className="text-sm text-gray-700">
                              Stone:{" "}
                              <span className="font-semibold">
                                {stoneWeight.toFixed(3)} g
                              </span>
                            </p>
                          </div>

                          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                              Quantity / Value
                            </p>
                            <p className="mt-1 text-sm text-gray-700">
                              Qty: <span className="font-semibold">{qty}</span>
                            </p>
                            <p className="text-sm text-green-700">
                              Item Total:{" "}
                              <span className="font-bold">
                                ₹
                                {itemTotal.toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-amber-100 bg-amber-50/60 px-4 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-gray-700">Cart Total</p>
                <p className="text-lg font-bold text-green-700">
                  ₹
                  {num(cart?.grandTotal ?? cart?.GrandTotal).toLocaleString(
                    undefined,
                    { maximumFractionDigits: 2 }
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 mt-6">
          <Label className="mb-2 block text-sm font-semibold text-gray-700">
            Wallet Redeem Amount (optional)
          </Label>

          <div className="relative max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              ₹
            </span>
            <Input
              type="number"
              min="0"
              className="h-11 bg-gray-50 pl-7"
              value={walletRedeem}
              onChange={(e) => handleWalletRedeemChange(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="mb-2 flex items-center gap-2 text-lg font-bold text-gray-800">
            <Banknote className="h-5 w-5 text-indigo-600" />
            Split & Finalize Payment
          </h4>

          <div className="space-y-3">
            {paymentsList.map((p) => {
              const paymentUi = getPaymentUi(p.method);

              return (
                <div
                  key={p.id}
                  className="grid grid-cols-1 items-end gap-3 rounded-lg border border-gray-200 bg-gray-50/50 p-3 md:grid-cols-12"
                >
                  <div className="md:col-span-3">
                    <Label className="mb-1 block text-xs font-semibold text-gray-600">
                      Method
                    </Label>

                    <Select
                      value={String(p.method)}
                      onValueChange={(val) => {
                        const methodId = Number(val);
                        updatePayment(p.id, "method", methodId);

                        if (methodId === 4 && walletData) {
                          const maxExchange = walletData.returnBalance || 0;
                          updatePayment(p.id, "amount", String(maxExchange));
                        }
                      }}
                    >
                      <SelectTrigger className="h-10 border-gray-300 bg-white">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        {paymentMethodOptions.map((m) => (
                          <SelectItem key={m.value} value={String(m.value)}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-3">
                    <Label className="mb-1 flex items-end justify-between text-xs font-semibold text-gray-600">
                      <span>{paymentUi.amountLabel || "Amount"}</span>
                      {p.method === 4 && (
                        <span className="text-[10px] text-blue-600">
                          Max: ₹{walletData?.returnBalance || 0}
                        </span>
                      )}
                    </Label>

                    <Input
                      type="number"
                      min="0"
                      className="h-10 border-gray-300 bg-white"
                      value={p.amount}
                      onChange={(e) => {
                        let newValue = e.target.value;

                        if (p.method === 4) {
                          const maxReturn = walletData?.returnBalance || 0;
                          if (Number(newValue) > maxReturn) {
                            toast.error(
                              `Exchange amount cannot exceed return balance (₹${maxReturn})`
                            );
                            newValue = String(maxReturn);
                          }
                        }

                        updatePayment(p.id, "amount", newValue);
                      }}
                    />
                  </div>

                  <div className="md:col-span-3">
                    <Label className="mb-1 block text-xs font-semibold text-gray-600">
                      {paymentUi.machineOrBankLabel || "Bank/Machine"}{" "}
                      {p.method !== 0 && p.method !== 4 && (
                        <span className="text-red-500">*</span>
                      )}
                    </Label>

                    {p.method === 0 || p.method === 4 ? (
                      <Input
                        className="h-10 border-gray-300 bg-gray-100"
                        disabled
                        placeholder={`N/A for ${
                          p.method === 4 ? "Exchange" : "Cash"
                        }`}
                        value=""
                        readOnly
                      />
                    ) : (
                      <SearchableSelect
                        options={paymentConfig.bankOptions}
                        value={p.machineOrBank}
                        placeholder={
                          paymentUi.machineOrBankLabel ||
                          "Select or type Bank/Machine"
                        }
                        onChange={(val) =>
                          updatePayment(
                            p.id,
                            "machineOrBank",
                            val ? String(val) : ""
                          )
                        }
                        allowCustomValue
                      />
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <Label className="mb-1 block text-xs font-semibold text-gray-600">
                      {paymentUi.referenceLabel || "Ref/Note"}
                    </Label>

                    <Input
                      className="h-10 border-gray-300 bg-white"
                      placeholder={paymentUi.referenceLabel || "Optional"}
                      value={p.reference}
                      onChange={(e) =>
                        updatePayment(p.id, "reference", e.target.value)
                      }
                    />
                  </div>

                  <div className="flex justify-center pb-1 md:col-span-1">
                    {paymentsList.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full text-red-500 hover:bg-red-100"
                        onClick={() => removePayment(p.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-2 flex flex-col items-center justify-between gap-4 rounded-lg border border-indigo-100 bg-indigo-50 p-4 sm:flex-row">
            <Button
              variant="outline"
              size="sm"
              onClick={addPayment}
              className="border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-100"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Split Payment
            </Button>

            <div className="flex flex-col items-end gap-4 text-right sm:flex-row">
              <div className="text-xs text-gray-600 sm:text-sm">
                <div>
                  <span className="mr-1 text-gray-500">Remaining Balance:</span>
                  <span className="font-semibold text-gray-800">
                    ₹
                    {balanceAmount.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                {Number(walletRedeem) > 0 && (
                  <div>
                    <span className="mr-1 text-gray-500">Wallet Used:</span>
                    <span className="font-semibold text-emerald-700">
                      -₹
                      {Number(walletRedeem).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}

                <div>
                  <span className="mr-1 text-gray-500">Net After Wallet:</span>
                  <span className="font-semibold text-indigo-700">
                    ₹
                    {currentTotalExpected.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              <div className="text-sm">
                <div>
                  <span className="mr-2 text-gray-500">Total Paid:</span>
                  <span className="font-bold text-gray-800">
                    ₹
                    {currentTotalPaid.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div>
                  <span className="mr-2 text-gray-500">Balance Due:</span>
                  <span
                    className={`font-bold ${
                      remainingAmount > 0
                        ? "text-red-600"
                        : remainingAmount < 0
                        ? "text-blue-600"
                        : "text-green-600"
                    }`}
                  >
                    ₹
                    {remainingAmount.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {currentTotalPaid !== currentTotalExpected && (
            <div
              className={`mt-4 animate-in zoom-in-95 rounded-lg border p-4 ${
                currentTotalPaid > currentTotalExpected
                  ? "border-blue-200 bg-blue-50"
                  : "border-yellow-200 bg-yellow-50"
              }`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-1 items-start gap-3">
                  <div className="mt-0.5">
                    <Banknote
                      className={`h-6 w-6 ${
                        currentTotalPaid > currentTotalExpected
                          ? "text-blue-600"
                          : "text-yellow-600"
                      }`}
                    />
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold ${
                        currentTotalPaid > currentTotalExpected
                          ? "text-blue-800"
                          : "text-yellow-800"
                      }`}
                    >
                      {currentTotalPaid > currentTotalExpected
                        ? "Overpayment Detected (Change Due)"
                        : "Payment Mismatch"}
                    </p>

                    <p
                      className={`mt-1 text-xs leading-5 ${
                        currentTotalPaid > currentTotalExpected
                          ? "text-blue-700"
                          : "text-yellow-700"
                      }`}
                    >
                      {currentTotalPaid > currentTotalExpected
                        ? `Customer overpaid by ₹${(
                            currentTotalPaid - currentTotalExpected
                          ).toFixed(
                            2
                          )}. This will be recorded as a negative adjustment (change returned).`
                        : "Please provide the adjustment amount to settle the bill difference."}
                    </p>
                  </div>
                </div>

                <div className="w-full shrink-0 md:w-52">
                  <Button
                    type="button"
                    variant="outline"
                    className={`mb-2 w-full text-xs ${
                      currentTotalPaid > currentTotalExpected
                        ? "border-blue-300 text-blue-800 hover:bg-blue-100"
                        : "border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                    }`}
                    onClick={() => {
                      const expectedTotal =
                        balanceAmount - (Number(walletRedeem) || 0);
                      const difference = expectedTotal - currentTotalPaid;
                      setAdjustAmount(difference.toFixed(2));
                    }}
                  >
                    {currentTotalPaid > currentTotalExpected
                      ? "Record Change"
                      : "Fill Remaining Amount"}
                  </Button>

                  <Label
                    className={`mb-1 block text-xs font-semibold ${
                      currentTotalPaid > currentTotalExpected
                        ? "text-blue-800"
                        : "text-yellow-800"
                    }`}
                  >
                    Adjust Amount
                  </Label>

                  <Input
                    type="number"
                    step="0.01"
                    className={`h-10 bg-white ${
                      currentTotalPaid > currentTotalExpected
                        ? "border-blue-300"
                        : "border-yellow-300"
                    }`}
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-4 border-t border-gray-100 pt-4 sm:flex-row">
            <Button
              className="h-12 w-full bg-indigo-600 text-base text-white shadow-md transition-all hover:bg-indigo-700 sm:w-1/2"
              onClick={handleFinalizePaymentClick}
              disabled={completeAdvanceMutation.isPending}
            >
              {completeAdvanceMutation.isPending ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : null}
              Confirm Payment
            </Button>

            <Button
              variant="outline"
              className="h-12 w-full border-gray-300 text-gray-600 hover:bg-gray-50 sm:w-1/4"
              onClick={() => navigate("/admin/sale")}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isPaymentConfirmOpen} onOpenChange={setIsPaymentConfirmOpen}>
        <DialogContent className="bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              Confirm Advance Payment
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 text-sm text-gray-600">
            <p className="mb-4">
              Are you sure you want to complete this advance order? This will
              settle the remaining balance and finalize the transaction.
            </p>

            <div className="flex flex-col gap-2 rounded-lg border border-green-100 bg-green-50 p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-green-800">
                  Remaining Balance
                </span>
                <span className="font-bold text-green-900">
                  ₹
                  {balanceAmount.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              {Number(walletRedeem) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-emerald-700">Wallet Used</span>
                  <span className="font-semibold text-emerald-800">
                    -₹
                    {Number(walletRedeem).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="font-medium text-indigo-700">
                  Net After Wallet
                </span>
                <span className="font-semibold text-indigo-900">
                  ₹
                  {currentTotalExpected.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-green-200 pt-2">
                <span className="text-base font-bold text-green-800">
                  Amount Being Paid
                </span>
                <span className="text-xl font-black text-green-700">
                  ₹
                  {currentTotalPaid.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPaymentConfirmOpen(false)}
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleConfirmCompleteAdvancePayment}
              disabled={completeAdvanceMutation.isPending}
              className="min-w-[160px] bg-green-600 text-white hover:bg-green-700"
            >
              {completeAdvanceMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirm Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isInvoicePromptOpen} onOpenChange={setIsInvoicePromptOpen}>
        <DialogContent className="bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-700">
              <CheckCircle2 className="h-5 w-5" />
              Download Invoice
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 text-sm text-gray-600">
            <p>
              Order completed successfully. Do you want to download the invoice
              now?
            </p>
          </div>

          <DialogFooter className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSkipInvoiceDownload}
            >
              No
            </Button>

            <Button
              type="button"
              onClick={handleDownloadInvoice}
              disabled={invoicePdfMutation.isPending}
              className="min-w-[170px] bg-blue-600 text-white hover:bg-blue-700"
            >
              {invoicePdfMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Yes, Download Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditItemsOpen} onOpenChange={setIsEditItemsOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto bg-white sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <Pencil className="h-5 w-5" />
              Edit Advance Items
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {editItemsDraft.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                No items available to edit.
              </div>
            ) : (
  editItemsDraft.map((item) => (
    <div
      key={item.itemKey}
      className="rounded-xl border border-amber-100 bg-amber-50/40 p-4"
    >
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-gray-900">
            {item.itemName}
          </p>
          <p className="text-xs text-gray-500">
            ID: {item.itemId}
            {item.tagNumber ? ` • Tag: ${item.tagNumber}` : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div>
          <Label className="mb-1 block text-xs font-semibold text-gray-600">
            Gross Weight (g)
          </Label>
          <Input
            type="number"
            step="0.001"
            min="0"
            className="h-10"
            value={item.grossWeight}
            onChange={(e) =>
              updateEditDraftItem(
                item.itemKey,
                "grossWeight",
                e.target.value
              )
            }
          />
        </div>

        <div>
          <Label className="mb-1 block text-xs font-semibold text-gray-600">
            Net Weight (g)
          </Label>
          <Input
            type="number"
            step="0.001"
            min="0"
            className="h-10"
            value={item.netWeight}
            onChange={(e) =>
              updateEditDraftItem(
                item.itemKey,
                "netWeight",
                e.target.value
              )
            }
          />
        </div>

        <div>
          <Label className="mb-1 block text-xs font-semibold text-gray-600">
            Diamond Weight (g)
          </Label>
          <Input
            type="number"
            step="0.001"
            min="0"
            className="h-10"
            value={item.diamondWeight}
            onChange={(e) =>
              updateEditDraftItem(
                item.itemKey,
                "diamondWeight",
                e.target.value
              )
            }
          />
        </div>

        <div>
          <Label className="mb-1 block text-xs font-semibold text-gray-600">
            Diamond Carat
          </Label>
          <Input
            type="number"
            step="0.001"
            min="0"
            className="h-10"
            value={item.diamondCarat}
            onChange={(e) =>
              updateEditDraftItem(
                item.itemKey,
                "diamondCarat",
                e.target.value
              )
            }
          />
        </div>

        <div>
          <Label className="mb-1 block text-xs font-semibold text-gray-600">
            Stone Weight (g)
          </Label>
          <Input
            type="number"
            step="0.001"
            min="0"
            className="h-10"
            value={item.stoneWeight}
            onChange={(e) =>
              updateEditDraftItem(
                item.itemKey,
                "stoneWeight",
                e.target.value
              )
            }
          />
        </div>
      </div>
    </div>
  ))
)}
          </div>

          <DialogFooter className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditItemsOpen(false)}
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleSubmitEditAdvanceItems}
              disabled={editAdvanceMutation.isPending || editItemsDraft.length === 0}
              className="min-w-[180px] bg-amber-600 text-white hover:bg-amber-700"
            >
              {editAdvanceMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Update Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}