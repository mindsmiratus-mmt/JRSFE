import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2, Plus, Trash2, CreditCard,
  ScanLine, Tag, User, Store, ShoppingBag,
  CheckCircle2, Banknote, AlertCircle, Edit2
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { useCart, useGetCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import { useAllLookUp } from "@/hooks/useLookup";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useAllCustomer, useCreateCustomer } from "@/hooks/useCustomer";
import { useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateSession, useCloseSession } from "@/hooks/useSession";
import {
  useFinalizePayment,
  useOrder,
  useCheckoutAdvance,
  useCompleteAdvance,
  useAdvanceReceiptPdf,
} from "@/hooks/useOrder";
import {
  useSaleItemsByStatus,
  type SaleItemAvailability,
} from "@/hooks/useSaleItemAvailability";
import { BarcodeScanner } from "@/components/ui/BarcodeScanner";
import { useWalletByCustomerId } from "@/hooks/useWallet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// ==========================================
// TYPES
// ==========================================
interface ItemCostDetails {
  goldCost: number;
  diamondCost: number;
  stoneCost: number;
  makingCharges: number;
  discount: number;
  igst: number;
  cgst: number;
  sgst: number;
  otherCharges: number;
  totalSalePrice: number;

  goldRate?: number;
  goldMakingChargeRaw?: number;
  goldMakingChargeType?: string;
  goldMakingChargeApplied?: number;
  goldDiscountRaw?: number;
  goldDiscountType?: string;
  discountOnMaking?: number;

  diamondRate?: number;
  diamondUnit?: string;
  diamondMakingChargeRaw?: number;
  diamondMakingChargeType?: string;
  diamondDiscountRaw?: number;
  diamondDiscountType?: string;
  diamondDiscount?: number;

  stoneRate?: number;
  stoneDiscountRaw?: number;
  stoneDiscountType?: string;
  stoneDiscount?: number;
  totalSalePriceBeforeTax?: number;
  igstPercent?: number;
}

interface CartItem {
  id: string;
  itemId: number;
  tagNumber: string;
  itemName: string;
  metal: string;
  category: string;
  quantity: number;
  gPurityId: string;
  purityPercent: string;

  dPurityId?: string;
  clarity?: string;
  color?: string;
  cut?: string;
  shape?: string;
  stoneName?: string;
  grossWeight: number;
  stoneWeight?: number;
  diamondWeight?: number;
  diamondCarat?: number;

  netWeight: number;
  tagePrice: number;
  itemCostDetails: ItemCostDetails;
}

interface CartResponse {
  id: string;
  status: number;
  shopId: number;
  userId: number;
  customerId: number;
  items: CartItem[];
  makingCharges: number;
  discount: number;
  igst: number;
  cgst: number;
  sgst: number;
  grandTotal: number;
  currency: string;
}

interface SaleFormProps {
  onCancel: () => void;
  editOrderId?: string | null;
}

interface PaymentFormEntry {
  id: string;
  method: number;
  amount: string;
  machineOrBank: string;
  reference: string;
  note: string;
}
interface BulkItemForm {
  bulkGrossWeight: string;
  bulkNetWeight: string;
  bulkDiamondCarat: string;
  bulkStoneWeight: string;
}
const PAYMENT_METHODS = [
  { value: 0, label: "Cash" },
  { value: 1, label: "Card" },
  { value: 2, label: "UPI" },
  { value: 3, label: "Online Banking" },
  { value: 4, label: "Exchange" },
];

function parseCartData(raw: any) {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const emptyBulkForm: BulkItemForm = {
  bulkGrossWeight: "",
  bulkNetWeight: "",
  bulkDiamondCarat: "",
  bulkStoneWeight: "",
};
// ==========================================
// COMPONENT
// ==========================================
export const SaleForm = ({ onCancel, editOrderId }: SaleFormProps) => {
  const isEditMode = !!editOrderId;
  const parsedEditOrderId = isEditMode ? Number(editOrderId) : null;
  const { data: lookupData } = useAllLookUp();
  const advanceReceiptPdfMutation = useAdvanceReceiptPdf();

  const [isAdvanceReceiptPromptOpen, setIsAdvanceReceiptPromptOpen] = useState(false);
  const [advanceReceiptOrderId, setAdvanceReceiptOrderId] = useState<number | null>(null);
  const paymentConfig = {
    methods: [
      {
        value: 0,
        key: "cash",
        label: "Cash",
        ui: lookupData?.paymentUiLabels?.cash ?? {
          amountLabel: "Amount",
        },
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
      lookupData?.bankNames?.map((bank: string) => ({
        value: bank,
        label: bank,
      })) ?? [],
    gst: {
      igst: Number(lookupData?.gst?.igst ?? 0),
      cgst: Number(lookupData?.gst?.cgst ?? 0),
      sgst: Number(lookupData?.gst?.sgst ?? 0),
    },
  };

  const getPaymentMethod = (method: number) =>
    paymentConfig.methods.find((m) => m.value === method) ?? paymentConfig.methods[0];

  const getPaymentMethodLabel = (method: number) =>
    getPaymentMethod(method).label;

  const getPaymentUi = (method: number) =>
    getPaymentMethod(method).ui;

  const paymentMethodOptions = paymentConfig.methods.map((m) => ({
    value: m.value,
    label: m.label,
  }));

  const advancePaymentMethodOptions = paymentConfig.methods.filter(
    (m) => m.value !== 4
  );
  const { data: availableItems, isLoading: itemsLoading } = useSaleItemsByStatus("Available");

  const { user, selectedShop } = useAuth();
  const { addItem, removeItem, checkout, updateItemCost } = useCart();
  const { data: customers = [], isLoading: customerLoading } = useAllCustomer();
  const checkoutAdvanceMutation = useCheckoutAdvance();
  const completeAdvanceMutation = useCompleteAdvance();

  const [isAdvanceOrder, setIsAdvanceOrder] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceOrderNote, setAdvanceOrderNote] = useState("");
  const [advancePaymentsList, setAdvancePaymentsList] = useState<PaymentFormEntry[]>([
    {
      id: "advance-1",
      method: 0,
      amount: "",
      machineOrBank: "",
      reference: "",
      note: "",
    },
  ]);

  const createSessionMutation = useCreateSession();
  const closeSessionMutation = useCloseSession();
  const finalizePaymentMutation = useFinalizePayment();
  const queryClient = useQueryClient();
  const createCustomerMutation = useCreateCustomer();

  const [editCostModal, setEditCostModal] = useState({
    isOpen: false,
    cartId: "",
    cartItemId: "",
    hasGold: false,
    hasDiamond: false,
    hasStone: false,
  });

  const [costForm, setCostForm] = useState({
    goldMakingCharge: 0,
    goldMakingChargeType: "FIXED",
    goldDiscount: 0,
    goldDiscountType: "FIXED",
    diamondMakingCharge: 0,
    diamondMakingChargeType: "FIXED",
    diamondDiscount: 0,
    diamondDiscountType: "FIXED",
    stoneDiscount: 0,
    stoneDiscountType: "FIXED"
  });

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: null as string | null,
    dateOfBirth: "",
    gender: "",
    gstin: "",
    pan: "",
    adharNo: "",
    address: "",
    city: "",
    state: "",
    pinCode: "",
    referralId: "",
  });

  const [isBulkItemModalOpen, setIsBulkItemModalOpen] = useState(false);
  const [selectedBulkItem, setSelectedBulkItem] = useState<SaleItemAvailability | null>(null);
  const [bulkItemForm, setBulkItemForm] = useState<BulkItemForm>(emptyBulkForm);

  const { data: existingOrder, isLoading: orderLoading } = useOrder(parsedEditOrderId);

  const [activeCartId, setActiveCartId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState<boolean>(!isEditMode);

  const [customerId, setCustomerId] = useState<string>("");
  const [newItemId, setNewItemId] = useState<string>("");
  const [newQuantity, setNewQuantity] = useState<string>("1");
  const [walletRedeem, setWalletRedeem] = useState<string>("0");
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const [adjustAmount, setAdjustAmount] = useState<string>("0");

  const [orderPlaced, setOrderPlaced] = useState<boolean>(isEditMode);
  const [placedOrderId, setPlacedOrderId] = useState<number | null>(parsedEditOrderId);
  const [finalGrandTotal, setFinalGrandTotal] = useState<number>(0);

  const [isCheckoutConfirmOpen, setIsCheckoutConfirmOpen] = useState(false);
  const [isPaymentConfirmOpen, setIsPaymentConfirmOpen] = useState(false);
  const [pendingPaymentPayload, setPendingPaymentPayload] = useState<any>(null);

  const [paymentsList, setPaymentsList] = useState<PaymentFormEntry[]>([
    { id: "1", method: 0, amount: "", machineOrBank: "", reference: "", note: "" }
  ]);

  const { data: rawCartData, refetch } = useGetCart(activeCartId);

  const cart = isEditMode
    ? (parseCartData((existingOrder as any)?.cartData) as CartResponse | undefined)
    : (rawCartData as unknown as CartResponse | undefined);

  const activeCustomerId =
    Number(customerId) ||
    (isEditMode
      ? (existingOrder as any)?.customerId || (existingOrder as any)?.customer?.id
      : null);

  const { data: walletData } = useWalletByCustomerId(activeCustomerId || null);
  const cartGrandTotal = num((cart as any)?.grandTotal ?? (cart as any)?.GrandTotal);

  const minAdvancePercent = Number(
    lookupData?.advanceOrderSettings?.minAdvancePercent ?? 0
  );

  const minAdvanceAmount = Number(
    ((cartGrandTotal * minAdvancePercent) / 100).toFixed(2)
  );
  useEffect(() => {
    if (!isAdvanceOrder) return;
    if (!cartGrandTotal || minAdvanceAmount <= 0) return;

    setAdvanceAmount((prev) => {
      const current = Number(prev || 0);
      return !prev || !Number.isFinite(current) || current <= 0
        ? String(minAdvanceAmount)
        : prev;
    });

    setAdvancePaymentsList((prev) => {
      if (!prev.length) {
        return [
          {
            id: "advance-1",
            method: 0,
            amount: String(minAdvanceAmount),
            machineOrBank: "",
            reference: "",
            note: "",
          },
        ];
      }

      return prev.map((payment, index) =>
        index === 0 && (!payment.amount || Number(payment.amount || 0) < minAdvanceAmount)
          ? { ...payment, method: 0, amount: String(minAdvanceAmount) }
          : payment
      );
    });
  }, [isAdvanceOrder, cartGrandTotal, minAdvanceAmount]);
  useEffect(() => {
    if (walletData && typeof walletData.rewardBalance === "number") {
      const truncatedBalance = Math.floor(walletData.rewardBalance);
      setWalletRedeem(String(truncatedBalance));

      if (isEditMode && orderPlaced) {
        const expectedTotal = finalGrandTotal - truncatedBalance;
        setPaymentsList(prev =>
          prev.length === 1 && prev[0].method === 0
            ? [{ ...prev[0], amount: String(Math.max(0, expectedTotal)) }]
            : prev
        );
      }
    } else if (!walletData) {
      setWalletRedeem("0");
    }
  }, [walletData, isEditMode, orderPlaced, finalGrandTotal]);


  const resetBulkItemModal = () => {
    setIsBulkItemModalOpen(false);
    setSelectedBulkItem(null);
    setBulkItemForm(emptyBulkForm);
  };
  const handleDownloadAdvanceReceipt = async (orderId: number) => {
    try {
      const blob = await advanceReceiptPdfMutation.mutateAsync(orderId);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `advance-receipt-${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Advance receipt downloaded successfully.");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to download advance receipt."
      );
    }
  };

  const caratToGram = (carat: number) => {
    if (!carat || !Number.isFinite(carat)) return 0;
    return Number((carat * 0.2).toFixed(3));
  };
  const updateAdvancePayment = (
    id: string,
    field: keyof PaymentFormEntry,
    value: any
  ) => {
    setAdvancePaymentsList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const addAdvancePayment = () => {
    setAdvancePaymentsList((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        method: 0,
        amount: "",
        machineOrBank: "",
        reference: "",
        note: "",
      },
    ]);
  };

  const removeAdvancePayment = (id: string) => {
    setAdvancePaymentsList((prev) => prev.filter((p) => p.id !== id));
  };

  const buildFormattedPayments = (list: PaymentFormEntry[]) => {
    const formattedPayments: any[] = [];

    for (const p of list) {
      const amt = Number(p.amount || 0);
      if (amt <= 0) continue;

      if (p.method !== 0 && p.method !== 4 && !p.machineOrBank.trim()) {
        const methodLabel = getPaymentMethodLabel(p.method);
        toast.error(`Bank / Machine name is required for ${methodLabel}.`);
        return null;
      }

      formattedPayments.push({
        method: p.method,
        amount: amt,
        machineOrBank:
          p.method === 0 || p.method === 4 ? undefined : p.machineOrBank.trim() || undefined,
        reference: p.reference.trim() || undefined,
        note: p.note.trim() || undefined,
      });
    }

    return formattedPayments;
  };

  const calculateBulkNetWeight = ({
    bulkGrossWeight,
    bulkDiamondCarat,
    bulkStoneWeight,
  }: {
    bulkGrossWeight: string;
    bulkDiamondCarat: string;
    bulkStoneWeight: string;
  }) => {
    const gross = Number(bulkGrossWeight || 0);
    const stone = Number(bulkStoneWeight || 0);
    const diamondCarat = Number(bulkDiamondCarat || 0);
    const diamondWeightGram = caratToGram(diamondCarat);

    const net = gross - stone - diamondWeightGram;
    return Number(Math.max(0, net).toFixed(3));
  };

  const updateBulkField = (field: keyof BulkItemForm, value: string) => {
    setBulkItemForm((prev) => {
      const updated = {
        ...prev,
        [field]: value,
      };

      const autoNetWeight = calculateBulkNetWeight({
        bulkGrossWeight: updated.bulkGrossWeight,
        bulkDiamondCarat: updated.bulkDiamondCarat,
        bulkStoneWeight: updated.bulkStoneWeight,
      });

      return {
        ...updated,
        bulkNetWeight: autoNetWeight === 0 ? "0.000" : autoNetWeight.toFixed(3),
      };
    });
  };

  const handleBarcodeScan = (decodedText: string) => {
    const trimmed = decodedText.trim();

    const matched = availableItems?.find(
      (item: SaleItemAvailability) => item.tagNumber === trimmed
    );

    if (matched) {
      setNewItemId(String(matched.itemId));
      toast.success(`Tag "${trimmed}" found — ready to add!`);
    } else {
      setNewItemId(trimmed);
      toast.success(`Scanned: ${trimmed} (no matching tag, using raw value)`);
    }
  };

  useEffect(() => {
    if (isEditMode) {
      if (existingOrder) {
        let orderTotal = 0;

        if (cart) {
          orderTotal = num((cart as any).grandTotal ?? (cart as any).GrandTotal);
        }

        if (orderTotal === 0 && existingOrder) {
          orderTotal = num((existingOrder as any).totalAmount || (existingOrder as any).TotalAmount);
        }

        setFinalGrandTotal(orderTotal);
        setPlacedOrderId(parsedEditOrderId);
        setOrderPlaced(true);

        setPaymentsList([{
          id: Date.now().toString(),
          method: 0,
          amount: String(orderTotal),
          machineOrBank: "",
          reference: "",
          note: ""
        }]);
      }
    } else {
      if (!user?.id || !selectedShop?.id) {
        toast.error("Missing user or shop info. Cannot start sale.");
        setSessionLoading(false);
        return;
      }

      createSessionMutation.mutate(
        {
          userId: user.id,
          shopId: selectedShop.id,
          timeoutMinutes: 0,
        },
        {
          onSuccess: (data) => {
            setActiveCartId(data.cartId);
            setActiveSessionId(data.sessionId);
            setSessionLoading(false);
          },
          onError: () => {
            toast.error("Failed to initialize sale session.");
            setSessionLoading(false);
          },
        }
      );
    }
  }, [isEditMode, existingOrder]);

  const handleCreateCustomer = () => {
    if (!newCustomer.name || !newCustomer.phone) {
      toast.error("Name and Phone are required.");
      return;
    }

    createCustomerMutation.mutate({
      ...newCustomer,
      dateOfBirth: newCustomer.dateOfBirth ? new Date(newCustomer.dateOfBirth).toISOString() : undefined,
      isActive: true,
      referralId: newCustomer.referralId ? Number(newCustomer.referralId) : 0,
      referredBy: "",
    } as any, {
      onSuccess: (data) => {
        toast.success("Customer created successfully");
        queryClient.invalidateQueries({ queryKey: ['all_customer'] });
        setCustomerId(String(data.id));
        setIsCustomerModalOpen(false);
        setNewCustomer({
          name: "",
          phone: "",
          email: "",
          dateOfBirth: "",
          gender: "",
          gstin: "",
          pan: "",
          adharNo: "",
          address: "",
          city: "",
          state: "",
          pinCode: "",
          referralId: ""
        });
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || "Failed to create customer");
      }
    });
  };

  const handleOpenEditCost = (item: any) => {
    if (!activeCartId) return;

    const details = item.itemCostDetails || item.ItemCostDetails || {};

    const hasGold =
      (details.goldCost || details.GoldCost) > 0 ||
      (details.makingCharges || details.MakingCharges) > 0;
    const hasDiamond =
      (details.diamondCost || details.DiamondCost) > 0 ||
      Number(item.diamondWeight || item.DiamondWeight) > 0;
    const hasStone =
      (details.stoneCost || details.StoneCost) > 0 ||
      Number(item.stoneWeight || item.StoneWeight) > 0;

    setCostForm({
      goldMakingCharge: details.goldMakingChargeRaw || details.GoldMakingChargeRaw || 0,
      goldMakingChargeType: details.goldMakingChargeType || details.GoldMakingChargeType || "FIXED",
      goldDiscount: details.goldDiscountRaw || details.GoldDiscountRaw || 0,
      goldDiscountType: details.goldDiscountType || details.GoldDiscountType || "FIXED",
      diamondMakingCharge: details.diamondMakingChargeRaw || details.DiamondMakingChargeRaw || 0,
      diamondMakingChargeType: details.diamondMakingChargeType || details.DiamondMakingChargeType || "FIXED",
      diamondDiscount: details.diamondDiscountRaw || details.DiamondDiscountRaw || 0,
      diamondDiscountType: details.diamondDiscountType || details.DiamondDiscountType || "FIXED",
      stoneDiscount: details.stoneDiscountRaw || details.StoneDiscountRaw || 0,
      stoneDiscountType: details.stoneDiscountType || details.StoneDiscountType || "FIXED",
    });

    setEditCostModal({
      isOpen: true,
      cartId: activeCartId,
      cartItemId: item.id || item.Id,
      hasGold,
      hasDiamond,
      hasStone
    });
  };

  const handleSaveCosts = () => {
    updateItemCost.mutate(
      {
        cartId: editCostModal.cartId,
        cartItemId: editCostModal.cartItemId,
        costDetails: costForm,
      },
      {
        onSuccess: () => {
          toast.success("Item costs updated successfully!");
          setEditCostModal((prev) => ({ ...prev, isOpen: false }));
          refetch();
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || "Failed to update item costs.");
        }
      }
    );
  };

  // ✅ NEW SHARED FINAL ADD FUNCTION
  const submitAddItem = (
    itemId: number,
    bulkValues?: {
      bulkGrossWeight?: number;
      bulkNetWeight?: number;
      bulkDiamondCarat?: number;
      bulkStoneWeight?: number;
    }
  ) => {
    if (isEditMode || !activeCartId) return;

    addItem.mutate(
      {
        cartId: activeCartId,
        item: {
          itemId,
          quantity: Number(newQuantity) || 1,
          ...bulkValues,
        },
      },
      {
        onSuccess: () => {
          toast.success("Item Added");
          setNewItemId("");
          setNewQuantity("1");
          resetBulkItemModal();
          refetch();
        },
        onError: (err: any) => {
          const errorData = err?.response?.data;
          const errorMsg =
            errorData?.details ||
            (errorData?.message !== "Internal Server Error"
              ? errorData?.message
              : null) ||
            "Failed to add item. Please try again.";

          toast.error(errorMsg);
        },
      }
    );
  };

  // ✅ UPDATED ADD ITEM HANDLER
  const handleAddItem = () => {
    if (isEditMode || !activeCartId) return;

    if (!newItemId) {
      toast.error("Please enter Item ID / Tag");
      return;
    }

    const parsedItemId = Number(newItemId);
    if (isNaN(parsedItemId)) {
      toast.error("Invalid Item ID format.");
      return;
    }

    const selectedItem = availableItems?.find(
      (item: SaleItemAvailability) => Number(item.itemId) === parsedItemId
    );

    if (selectedItem?.isBulkItem) {
      setSelectedBulkItem(selectedItem);
      setBulkItemForm({
        bulkGrossWeight: "",
        bulkNetWeight: "0.000",
        bulkDiamondCarat: "",
        bulkStoneWeight: "",
      });
      setIsBulkItemModalOpen(true);
      return;
    }

    submitAddItem(parsedItemId);
  };

  // ✅ NEW BULK SUBMIT HANDLER
  const handleConfirmBulkItemAdd = () => {
    if (!selectedBulkItem) {
      toast.error("No bulk item selected.");
      return;
    }

    const bulkGrossWeight = Number(bulkItemForm.bulkGrossWeight || 0);
    const bulkStoneWeight = Number(bulkItemForm.bulkStoneWeight || 0);
    const bulkDiamondCarat = Number(bulkItemForm.bulkDiamondCarat || 0);
    const bulkNetWeight = calculateBulkNetWeight({
      bulkGrossWeight: bulkItemForm.bulkGrossWeight,
      bulkDiamondCarat: bulkItemForm.bulkDiamondCarat,
      bulkStoneWeight: bulkItemForm.bulkStoneWeight,
    });

    if (!Number.isFinite(bulkGrossWeight) || bulkGrossWeight <= 0) {
      toast.error("Please enter a valid bulk gross weight.");
      return;
    }

    if (!Number.isFinite(bulkStoneWeight) || bulkStoneWeight < 0) {
      toast.error("Please enter a valid bulk stone weight.");
      return;
    }

    if (!Number.isFinite(bulkDiamondCarat) || bulkDiamondCarat < 0) {
      toast.error("Please enter a valid bulk diamond carat.");
      return;
    }

    if (!Number.isFinite(bulkNetWeight) || bulkNetWeight <= 0) {
      toast.error("Calculated net weight must be greater than 0.");
      return;
    }

    submitAddItem(selectedBulkItem.itemId, {
      bulkGrossWeight: Number(bulkGrossWeight.toFixed(3)),
      bulkNetWeight: Number(bulkNetWeight.toFixed(3)),
      bulkDiamondCarat: Number(bulkDiamondCarat.toFixed(3)),
      bulkStoneWeight: Number(bulkStoneWeight.toFixed(3)),
    });
  };

  const handleRemoveItem = (cartItemId: string) => {
    if (isEditMode || !activeCartId) return;
    removeItem.mutate(
      { cartId: activeCartId, cartItemId },
      { onSuccess: () => { toast.success("Item Removed"); refetch(); } }
    );
  };

  const handlePlaceOrderClick = () => {
    if (isEditMode || !activeCartId) return;

    if (!customerId) {
      toast.error("Please select a customer before placing the order.");
      return;
    }

    setIsCheckoutConfirmOpen(true);
  };
  const handleConfirmPlaceOrder = () => {
    if (isEditMode || !activeCartId) return;

    if (!customerId) {
      toast.error("Please select a customer before placing the order.");
      return;
    }

    setIsCheckoutConfirmOpen(false);

    const currentGrandTotal = num(
      (cart as any)?.grandTotal ?? (cart as any)?.GrandTotal
    );

    if (isAdvanceOrder) {
      if (!deliveryDate) {
        toast.error("Please select a delivery date.");
        return;
      }

      const parsedAdvanceAmount = Number(advanceAmount || 0);
      if (!Number.isFinite(parsedAdvanceAmount) || parsedAdvanceAmount <= 0) {
        toast.error("Please enter a valid advance amount.");
        return;
      }

      // ✅ Minimum advance amount is NOT enforced — any amount > 0 is allowed.
      // The informational hint is still shown in the UI.
      if (parsedAdvanceAmount > currentGrandTotal) {
        toast.error("Advance amount cannot be greater than the grand total.");
        return;
      }

      const formattedAdvancePayments = buildFormattedPayments(advancePaymentsList);
      if (!formattedAdvancePayments || formattedAdvancePayments.length === 0) {
        toast.error("Please add at least one valid advance payment.");
        return;
      }

      const totalAdvancePaid = formattedAdvancePayments.reduce(
        (sum, p) => sum + Number(p.amount || 0),
        0
      );

      if (
        Number(totalAdvancePaid.toFixed(2)) !==
        Number(parsedAdvanceAmount.toFixed(2))
      ) {
        toast.error("Advance payment total must exactly match the advance amount.");
        return;
      }

      checkoutAdvanceMutation.mutate(
        {
          cartId: activeCartId,
          customerId: Number(customerId),
          deliveryDate: new Date(deliveryDate).toISOString(),
          advanceAmount: parsedAdvanceAmount,
          paymentDetails: {
            payments: formattedAdvancePayments,
            exchangeItems: [],
            adjustAmount: 0,
          },
          note: advanceOrderNote.trim() || undefined,
        },
        {
          onSuccess: (response: any) => {
            toast.success("Advance order placed successfully.");

            const newOrderId =
              response?.id ?? response?.orderId ?? response?.data?.id ?? null;

            if (!newOrderId) {
              toast.error("Advance order created, but order ID was not returned.");
              return;
            }

            setPlacedOrderId(newOrderId);
            setFinalGrandTotal(currentGrandTotal);
            setOrderPlaced(true);
            setAdvanceReceiptOrderId(newOrderId);
            setIsAdvanceReceiptPromptOpen(true);

            if (activeSessionId) {
              closeSessionMutation.mutate(activeSessionId);
            } else {
              onCancel();
            }
          },
          onError: (err: any) => {
            toast.error(
              err?.response?.data?.detail || "Failed to place advance order."
            );
          },
        }
      );

      return;
    }

    checkout.mutate(
      {
        cartId: activeCartId,
        details: {
          customerId: Number(customerId),
          walletRedeemAmount: Number(walletRedeem || 0),
          paymentMethod: "",
        },
      },
      {
        onSuccess: (response: any) => {
          toast.success("Order placed! Please complete payment below.");

          const newOrderId =
            response?.id ?? response?.orderId ?? response?.data?.id ?? null;

          if (!newOrderId) {
            toast.error("Order placed, but ID not returned.");
            return;
          }

          setPlacedOrderId(newOrderId);
          setFinalGrandTotal(currentGrandTotal);
          setOrderPlaced(true);

          const defaultDue = Math.max(0, currentGrandTotal - Number(walletRedeem || 0));
          setPaymentsList([
            {
              id: Date.now().toString(),
              method: 0,
              amount: String(defaultDue),
              machineOrBank: "",
              reference: "",
              note: "",
            },
          ]);

          if (activeSessionId) {
            closeSessionMutation.mutate(activeSessionId);
          }
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || "Failed to place order.");
        },
      }
    );
  };
  const handleConfirmCompleteAdvancePayment = () => {
    if (!placedOrderId || !pendingPaymentPayload) return;

    setIsPaymentConfirmOpen(false);

    completeAdvanceMutation.mutate(
      {
        id: placedOrderId,
        payload: pendingPaymentPayload,
      },
      {
        onSuccess: () => {
          toast.success("Advance order completed successfully!");
          onCancel();
        },
        onError: (err: any) => {
          toast.error(
            err?.response?.data?.message || "Failed to complete advance order."
          );
        },
      }
    );
  };

  const updatePayment = (id: string, field: keyof PaymentFormEntry, value: any) => {
    setPaymentsList(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const addPayment = () => {
    setPaymentsList(prev => [...prev, { id: Date.now().toString(), method: 0, amount: "", machineOrBank: "", reference: "", note: "" }]);
  };

  const removePayment = (id: string) => {
    setPaymentsList(prev => prev.filter(p => p.id !== id));
  };

  const currentTotalPaid = paymentsList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const currentTotalExpected = finalGrandTotal - (Number(walletRedeem) || 0);

  const handleFinalizePaymentClick = () => {
    if (!placedOrderId) {
      toast.error("Order ID is missing. Cannot finalize payment.");
      return;
    }

    const formattedPayments = buildFormattedPayments(paymentsList);
    if (!formattedPayments || formattedPayments.length === 0) {
      toast.error("Please provide at least one valid payment amount greater than 0.");
      return;
    }

    const totalPaid = formattedPayments.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );

    const expectedTotal = finalGrandTotal - Number(walletRedeem || 0);
    const parsedAdjustAmount = Number(adjustAmount || 0);
    const calculatedAdjustment = expectedTotal - totalPaid;
    const finalAdjustment =
      parsedAdjustAmount !== 0 ? parsedAdjustAmount : calculatedAdjustment;

    if (Number((totalPaid + finalAdjustment).toFixed(2)) < Number(expectedTotal.toFixed(2))) {
      toast.error(
        `Payment mismatch! The total paid ₹${totalPaid.toFixed(
          2
        )} is less than the expected balance ₹${expectedTotal.toFixed(2)}.`
      );
      return;
    }

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

  const handleConfirmFinalizePayment = () => {
    if (!placedOrderId || !pendingPaymentPayload) return;

    if (isAdvanceOrder) {
      handleConfirmCompleteAdvancePayment();
      return;
    }

    setIsPaymentConfirmOpen(false);

    finalizePaymentMutation.mutate(
      {
        id: placedOrderId,
        payload: pendingPaymentPayload,
      },
      {
        onSuccess: () => {
          toast.success("Payment finalized successfully!");
          onCancel();
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || "Failed to finalize payment.");
        },
      }
    );
  };

  const handleWalletRedeemChange = (raw: string) => {
    if (!walletData || typeof walletData.rewardBalance !== "number") {
      setWalletRedeem(raw);
      return;
    }

    const maxBalance = Math.floor(walletData.rewardBalance);
    const entered = Number(raw);

    if (!Number.isFinite(entered) || entered < 0) {
      setWalletRedeem(raw);
      return;
    }

    if (entered > maxBalance) {
      toast.error(`Insufficient reward balance. Maximum redeemable amount is ₹${maxBalance}.`);
      setWalletRedeem(String(maxBalance));
    } else {
      setWalletRedeem(raw);
    }
  };

  const handleCancel = () => {
    if (activeSessionId && !orderPlaced && !isEditMode) {
      closeSessionMutation.mutate(activeSessionId, {
        onSuccess: onCancel,
        onError: onCancel,
      });
    } else {
      onCancel();
    }
  };

  const totalTax =
    num((cart as any)?.igst) +
    num((cart as any)?.cgst) +
    num((cart as any)?.sgst);

  const remainingAmount = Math.max(0, currentTotalExpected - currentTotalPaid - Number(adjustAmount || 0));

  if (sessionLoading || (isEditMode && orderLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <div className="p-4 bg-green-50 rounded-full border border-green-100">
          <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-800 text-base">
            {isEditMode ? "Loading Order Details..." : "Starting Sale Session..."}
          </p>
          <p className="text-sm text-gray-500 mt-1">Please wait...</p>
        </div>
      </div>
    );
  }

  if (!activeCartId && !sessionLoading && !isEditMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <div className="p-4 bg-red-50 rounded-full border border-red-100">
          <Tag className="w-8 h-8 text-red-500" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-800 text-base">Failed to Start Session</p>
          <p className="text-sm text-gray-500 mt-1">Could not initialize sale. Please try again.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => window.location.reload()} className="bg-green-600">Retry</Button>
          <Button variant="outline" onClick={onCancel}>Go Back</Button>
        </div>
      </div>
    );
  }

  const subtotalBeforeTax = (cart?.items || (cart as any)?.Items || []).reduce(
    (sum: number, item: any) =>
      sum + num(item.itemCostDetails?.totalSalePriceBeforeTax ?? item.ItemCostDetails?.TotalSalePriceBeforeTax),
    0
  );

  return (
    <div className="space-y-4 md:space-y-6 max-w-full flex flex-col min-h-full">

      {!isEditMode && !orderPlaced && (
        <div className="bg-white md:p-6 p-4 rounded-xl border shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#b08d28] fill-current" />
                Sale In-Progress
              </h2>
              <div className="flex items-center gap-3 mt-1.5">
                <p className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                  Cart: {activeCartId}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <User className="w-3 h-3" /> {user?.username}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Store className="w-3 h-3" /> {selectedShop?.name}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-green-50 px-5 py-3 rounded-xl border border-green-100 text-right shadow-sm">
                <p className="text-[10px] md:text-xs text-green-600 font-bold uppercase tracking-wider mb-1">Grand Total</p>
                <p className="text-2xl md:text-3xl font-bold text-green-700">
                  ₹{num((cart as any)?.grandTotal ?? (cart as any)?.GrandTotal).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleCancel} className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 h-10">
                Cancel Sale
              </Button>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-5 space-y-2">
                <Label className="text-xs uppercase font-bold text-slate-500">
                  Item Tag / ID
                </Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <SearchableSelect
                      options={
                        availableItems?.map((item) => ({
                          value: String(item.itemId), // The API uses itemId for adding to cart
                          label: item.tagNumber,      // Display the tag number to the user
                        })) || []
                      }
                      value={newItemId}
                      placeholder={
                        itemsLoading ? "Loading inventory..." : "Search or scan Tag..."
                      }
                      onChange={(val) => setNewItemId(val ? String(val) : "")}
                      allowCustomValue={true} // Keeps support for raw barcode scanner inputs
                      disabled={itemsLoading}
                    />
                  </div>

                  {/* Scan button: opens camera scanner */}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0 border-slate-300 bg-white hover:bg-blue-50"
                    onClick={() => setIsScannerOpen(true)}
                  >
                    <ScanLine className="w-4 h-4 text-blue-600" />
                  </Button>
                </div>
              </div>

              {(() => {
                const selectedItem = availableItems?.find(
                  (item: SaleItemAvailability) => String(item.itemId) === newItemId
                );
                const isBulk = selectedItem?.isBulkItem ?? false;

                return (
                  <div className="md:col-span-3 space-y-2">
                    <Label className="text-xs uppercase font-bold text-slate-500">
                      Qty
                    </Label>
                    <Input
                      type="number"
                      value={isBulk ? newQuantity : "1"}
                      onChange={(e) => {
                        if (isBulk) setNewQuantity(e.target.value);
                      }}
                      min="1"
                      className={`bg-white h-10 border-slate-300 ${!isBulk ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      disabled={!isBulk}
                      onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                    />

                  </div>
                );
              })()}

              <div className="md:col-span-4">
                <Button
                  onClick={handleAddItem}
                  disabled={addItem.isPending}
                  className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
                >
                  {addItem.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Add Item
                </Button>
              </div>
            </div>
          </div>

          <div className="border rounded-xl overflow-hidden shadow-sm bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[900px]">
                <thead className="bg-gray-50/80 text-gray-700 font-semibold border-b">
                  <tr>
                    <th className="p-3 md:p-4 w-[20%]">Item Details</th>
                    <th className="p-3 md:p-4 w-[20%]">Metal / Purity</th>
                    <th className="p-3 md:p-4 w-[15%]">Weight</th>
                    <th className="p-3 md:p-4 w-[10%] text-center">Qty</th>
                    <th className="p-3 md:p-4 w-[30%]">Detailed Cost Breakdown</th>
                    <th className="p-3 md:p-4 w-[5%] text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y text-gray-600">
                  {(!cart?.items && !(cart as any)?.Items) || ((cart?.items?.length || (cart as any)?.Items?.length) === 0) ? (
                    <tr><td colSpan={6} className="p-10 text-center text-gray-400 italic">Cart is empty. Scan an item to begin.</td></tr>
                  ) : (
                    (cart?.items || (cart as any)?.Items || []).map((item: any) => (
                      <tr key={item.id || item.Id} className="hover:bg-blue-50/30 transition-colors group">

                        {/* ITEM DETAILS */}
                        {/* ITEM DETAILS */}
                        <td className="p-3 md:p-4 align-top">
                          <div className="font-bold text-gray-900">{item.itemName || item.ItemName}</div>

                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {/* Existing Item ID Badge */}
                            <div className="text-xs text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                              ID: {item.itemId || item.ItemId}
                            </div>

                            {/* New HUID Badge */}
                            {(item.huid || item.HUID || item.Huid) && (
                              <div className="text-xs text-blue-600 font-mono bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                HUID: {item.huid || item.HUID || item.Huid}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* METAL / PURITY */}
                        <td className="p-3 md:p-4 align-top">
                          <div className="text-gray-900 font-semibold">{item.metal || item.Metal}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{item.gPurityId || item.GPurityId} ({item.purityPercent || item.PurityPercent}%)</div>
                          {(item.dPurityId || item.color || item.clarity) && (
                            <div className="mt-2">
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Diamond</div>
                              <div className="text-xs text-gray-700 mt-0.5">{(item.dPurityId || item.color || item.clarity) ? `${item.color}/${item.clarity}` : ''}</div>
                            </div>
                          )}
                        </td>

                        {/* WEIGHT */}
                        <td className="p-3 md:p-4 align-top text-xs space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Gross:</span>
                            <span className="font-medium">
                              {Number(item.grossWeight || item.GrossWeight || 0).toFixed(3)} g
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-gray-400">Net:</span>
                            <span className="font-medium">
                              {Number(item.netWeight || item.NetWeight || 0).toFixed(3)} g
                            </span>
                          </div>

                          {Number(item.diamondCarat || item.diamondCarat) > 0 && (
                            <div className="flex justify-between text-blue-700/80">
                              <span className="text-blue-400/80">Diamond:</span>
                              <span>
                                {Number(item.diamondCarat || item.diamondCarat).toFixed(3)} ct
                              </span>
                            </div>
                          )}

                          {Number(item.stoneWeight || item.StoneWeight) > 0 && (
                            <div className="flex justify-between text-emerald-700/80">
                              <span className="text-emerald-400/80">Stone:</span>
                              <span>
                                {Number(item.stoneWeight || item.StoneWeight).toFixed(3)} g
                              </span>
                            </div>
                          )}
                        </td>

                        {/* QTY */}
                        <td className="p-3 md:p-4 align-top text-center font-bold text-gray-900">{item.quantity || item.Quantity}</td>

                        {/* DETAILED BREAKDOWN */}
                        <td className="p-3 md:p-4 align-top text-xs text-gray-600">
                          <div className="space-y-3 pr-4">
                            {/* GOLD */}
                            {((item.itemCostDetails?.goldCost || item.ItemCostDetails?.GoldCost) > 0 || (item.itemCostDetails?.makingCharges || item.ItemCostDetails?.MakingCharges) > 0) && (
                              <div className="space-y-1">
                                <div className="font-semibold text-gray-800 border-b border-gray-100 pb-1 flex justify-between">
                                  <span>Gold / Metal Cost</span>
                                  <span>₹{num(item.itemCostDetails?.goldCost || item.ItemCostDetails?.GoldCost).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                </div>
                                {(item.itemCostDetails?.goldRate || item.ItemCostDetails?.GoldRate) && (
                                  <div className="flex justify-between text-gray-500">
                                    <span>Rate</span>
                                    <span>₹{num(item.itemCostDetails?.goldRate || item.ItemCostDetails?.GoldRate).toLocaleString()}/g</span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span>Making {(item.itemCostDetails?.goldMakingChargeRaw || item.ItemCostDetails?.GoldMakingChargeRaw) ? `(${item.itemCostDetails?.goldMakingChargeRaw || item.ItemCostDetails?.GoldMakingChargeRaw}${item.itemCostDetails?.goldMakingChargeType || item.ItemCostDetails?.GoldMakingChargeType})` : ''}</span>
                                  <span>₹{num((item.itemCostDetails?.goldMakingChargeApplied || item.ItemCostDetails?.GoldMakingChargeApplied) || (item.itemCostDetails?.makingCharges || item.ItemCostDetails?.MakingCharges)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                </div>
                                {(item.itemCostDetails?.discountOnMaking || item.ItemCostDetails?.DiscountOnMaking) ? (
                                  <div className="flex justify-between text-green-600 font-medium">
                                    <span>Discount {(item.itemCostDetails?.goldDiscountRaw || item.ItemCostDetails?.GoldDiscountRaw) ? `(${item.itemCostDetails?.goldDiscountRaw || item.ItemCostDetails?.GoldDiscountRaw}${item.itemCostDetails?.goldDiscountType || item.ItemCostDetails?.GoldDiscountType})` : ''}</span>
                                    <span>-₹{num(item.itemCostDetails?.discountOnMaking || item.ItemCostDetails?.DiscountOnMaking).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                  </div>
                                ) : null}
                              </div>
                            )}

                            {/* DIAMOND */}
                            {((item.itemCostDetails?.diamondCost || item.ItemCostDetails?.DiamondCost) > 0 || Number(item.diamondWeight || item.DiamondWeight) > 0) && (
                              <div className="space-y-1">
                                <div className="font-semibold text-blue-900 border-b border-blue-100 pb-1 flex justify-between mt-2">
                                  <span>Diamond Cost</span>
                                  <span>₹{num(item.itemCostDetails?.diamondCost || item.ItemCostDetails?.DiamondCost).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                </div>
                                {(item.itemCostDetails?.diamondRate || item.ItemCostDetails?.DiamondRate) && (
                                  <div className="flex justify-between text-gray-500">
                                    <span>Rate</span>
                                    <span>₹{num(item.itemCostDetails?.diamondRate || item.ItemCostDetails?.DiamondRate).toLocaleString()}/{item.itemCostDetails?.diamondUnit || item.ItemCostDetails?.DiamondUnit}</span>
                                  </div>
                                )}
                                {/* {(item.itemCostDetails?.diamondMakingChargeRaw || item.ItemCostDetails?.DiamondMakingChargeRaw) && (
                                  <div className="flex justify-between">
                                    <span>Making ({item.itemCostDetails?.diamondMakingChargeRaw || item.ItemCostDetails?.DiamondMakingChargeRaw}{item.itemCostDetails?.diamondMakingChargeType || item.ItemCostDetails?.DiamondMakingChargeType})</span>
                                    <span>Applied</span>
                                  </div>
                                )} */}
                                {(item.itemCostDetails?.diamondDiscount || item.ItemCostDetails?.DiamondDiscount) ? (
                                  <div className="flex justify-between text-green-600 font-medium">
                                    <span>Discount ({(item.itemCostDetails?.diamondDiscountRaw || item.ItemCostDetails?.DiamondDiscountRaw)}{(item.itemCostDetails?.diamondDiscountType || item.ItemCostDetails?.DiamondDiscountType)})</span>
                                    <span>-₹{num(item.itemCostDetails?.diamondDiscount || item.ItemCostDetails?.DiamondDiscount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                  </div>
                                ) : null}
                              </div>
                            )}

                            {/* STONE */}
                            {((item.itemCostDetails?.stoneCost || item.ItemCostDetails?.StoneCost) > 0 || Number(item.stoneWeight || item.StoneWeight) > 0) && (
                              <div className="space-y-1">
                                <div className="font-semibold text-emerald-900 border-b border-emerald-100 pb-1 flex justify-between mt-2">
                                  <span>Stone Cost</span>
                                  <span>₹{num(item.itemCostDetails?.stoneCost || item.ItemCostDetails?.StoneCost).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                </div>
                                {(item.itemCostDetails?.stoneRate || item.ItemCostDetails?.StoneRate) && (
                                  <div className="flex justify-between text-gray-500">
                                    <span>Rate</span>
                                    <span>₹{num(item.itemCostDetails?.stoneRate || item.ItemCostDetails?.StoneRate).toLocaleString()}</span>
                                  </div>
                                )}
                                {(item.itemCostDetails?.stoneDiscount || item.ItemCostDetails?.StoneDiscount) ? (
                                  <div className="flex justify-between text-green-600 font-medium">
                                    <span>Discount ({(item.itemCostDetails?.stoneDiscountRaw || item.ItemCostDetails?.StoneDiscountRaw)}{(item.itemCostDetails?.stoneDiscountType || item.ItemCostDetails?.StoneDiscountType)})</span>
                                    <span>-₹{num(item.itemCostDetails?.stoneDiscount || item.ItemCostDetails?.StoneDiscount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                  </div>
                                ) : null}
                              </div>
                            )}
                            {/* TAXES */}
                            <div className="flex gap-4 pt-1 text-[11px] font-medium text-orange-700/80 bg-orange-50/50 p-1.5 rounded border border-orange-100/50 mt-2">

                              {/* CGST - Commented out
  {(item.itemCostDetails?.cgst || item.ItemCostDetails?.Cgst) > 0 && (
    <div>
      CGST ({((item.itemCostDetails?.igstPercent || item.ItemCostDetails?.IgstPercent || 0) / 2)}%):
      ₹{num(item.itemCostDetails?.cgst || item.ItemCostDetails?.Cgst).toFixed(2)}
    </div>
  )}
  */}

                              {/* SGST - Commented out
  {(item.itemCostDetails?.sgst || item.ItemCostDetails?.Sgst) > 0 && (
    <div>
      SGST ({((item.itemCostDetails?.igstPercent || item.ItemCostDetails?.IgstPercent || 0) / 2)}%):
      ₹{num(item.itemCostDetails?.sgst || item.ItemCostDetails?.Sgst).toFixed(2)}
    </div>
  )}
  */}

                              {/* GST (Replaced IGST) */}
                              {(item.itemCostDetails?.igst || item.ItemCostDetails?.Igst) > 0 && (
                                <div className="flex justify-between w-full">
                                  <span>
                                    GST ({item.itemCostDetails?.igstPercent || item.ItemCostDetails?.IgstPercent || 0}%):
                                  </span>
                                  <span>
                                    ₹{num(item.itemCostDetails?.igst || item.ItemCostDetails?.Igst).toFixed(2)}
                                  </span>
                                </div>
                              )}

                            </div>



                            {/* TOTAL FOR THIS ITEM */}
                            <div className="mt-4 pt-2 border-t border-gray-200 flex justify-between items-center text-sm font-bold text-gray-900">
                              <span>Item Total</span>
                              <span>₹{num(item.itemCostDetails?.totalSalePrice || item.ItemCostDetails?.TotalSalePrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        </td>

                        {/* ACTION BUTTONS */}
                        <td className="p-3 md:p-4 align-top text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 p-0 rounded-full opacity-60 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleOpenEditCost(item)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0 rounded-full opacity-60 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleRemoveItem(item.id || item.Id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>

                {((cart?.items?.length || (cart as any)?.Items?.length) || 0) > 0 && (
                  <tfoot className="bg-gray-50 border-t text-sm">
                    <tr>
                      <td colSpan={4} className="p-3 text-right font-medium text-gray-500">
                        Subtotal (Before Tax)
                      </td>
                      <td className="p-3 text-right font-semibold text-gray-800">
                        ₹{subtotalBeforeTax.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>
                    {((cart?.cgst || (cart as any)?.Cgst) > 0 || (cart?.sgst || (cart as any)?.Sgst) > 0 || (cart?.igst || (cart as any)?.Igst) > 0) && (
                      <>
                        {(cart?.igst || (cart as any)?.Igst) > 0 && (
                          <tr>
                            <td colSpan={4} className="p-2 text-right text-[11px] font-medium text-orange-600/80 align-middle">
                              + GST ({lookupData?.gst?.igst ?? 0}%):
                            </td>
                            <td className="p-2 text-right text-[11px] font-medium text-orange-600/80 pr-8">
                              ₹{num(cart?.igst || (cart as any)?.Igst).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </td>
                            <td></td>
                          </tr>
                        )}

                        {/* <tr>
                          <td colSpan={4} className="p-3 text-right font-medium text-gray-500">
                            Total Tax
                          </td>
                          <td className="p-3 text-right font-semibold text-gray-800 pr-8">
                            ₹{num(totalTax).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </td>
                          <td></td>
                        </tr> */}
                      </>
                    )}

                    {/* Total Discount Applied Row stays right below here */}


                    {(cart?.discount || (cart as any)?.Discount) > 0 && (
                      <tr className="text-green-700 bg-green-50/50 font-medium">
                        <td colSpan={4} className="p-3 text-right">Total Discount Applied</td>
                        <td className="p-3 text-right font-bold pr-8">- ₹{num(cart?.discount || (cart as any)?.Discount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td></td>
                      </tr>
                    )}
                    <tr className="text-lg font-bold text-gray-900 border-t-2 border-gray-200 bg-white">
                      <td colSpan={4} className="p-4 text-right">Grand Total</td>
                      <td className="p-4 text-right text-green-700 pr-8">₹{num((cart as any)?.grandTotal ?? (cart as any)?.GrandTotal).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {((cart?.items?.length || (cart as any)?.Items?.length) || 0) > 0 && !orderPlaced && (
            <div className="bg-white p-5 rounded-xl border-2 border-blue-100 shadow-sm mt-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-blue-600" /> Order Placement
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
                <div className="md:col-span-5 space-y-1.5">
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs font-semibold uppercase text-gray-500">
                      Select Customer <span className="text-red-500">*</span>
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-blue-600 hover:text-blue-800 hover:bg-transparent"
                      onClick={() => setIsCustomerModalOpen(true)}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add New
                    </Button>
                  </div>

                  <SearchableSelect
                    value={customerId}
                    onChange={(v: any) => setCustomerId(v ? String(v) : "")}
                    placeholder={customerLoading ? "Loading..." : "Search Customer"}
                    options={
                      customers?.map((c: any) => ({
                        value: String(c.id),
                        label: `${c.id} | ${c.name} | ${c.phone}`,
                      })) || []
                    }
                    disabled={customerLoading}
                  />
                </div>

                <div className="md:col-span-3 space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-gray-500">
                    Wallet Coin Deduct <span className="text-gray-400 font-normal lowercase">(Optional)</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                    <Input
                      type="number"
                      className="bg-white pl-7 h-11"
                      disabled
                      value={walletRedeem}
                      onChange={(e) => handleWalletRedeemChange(e.target.value)}
                    />
                  </div>
                </div>

                <div className="md:col-span-4 space-y-2">
                  <Label className="text-xs font-semibold uppercase text-gray-500">
                    Advance Order
                  </Label>
                  <button
                    type="button"
                    onClick={() => setIsAdvanceOrder((prev) => !prev)}
                    className={`h-11 w-full rounded-lg border px-4 text-sm font-semibold transition ${isAdvanceOrder
                        ? "bg-amber-50 border-amber-300 text-amber-700"
                        : "bg-gray-50 border-gray-200 text-gray-600"
                      }`}
                  >
                    {isAdvanceOrder ? "Advance Order: ON" : "Advance Order: OFF"}
                  </button>
                </div>
              </div>

              {isAdvanceOrder && (
                <div className="mt-5 border rounded-xl p-4 bg-amber-50/40 border-amber-200 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-4 space-y-1.5">
                      <Label className="text-xs font-semibold uppercase text-gray-500">
                        Delivery Date <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="datetime-local"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="bg-white h-11"
                      />
                    </div>

                    <div className="md:col-span-4 space-y-1.5">
                      <Label className="text-xs font-semibold uppercase text-gray-500">
                        Advance Amount <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                        <Input
                          type="number"
                          min={0.01}
                          step="0.01"
                          value={advanceAmount}
                          onChange={(e) => {
                            const raw = e.target.value;

                            if (raw === "") {
                              setAdvanceAmount("");
                              return;
                            }

                            const entered = Number(raw);

                            if (!Number.isFinite(entered)) {
                              setAdvanceAmount(raw);
                              return;
                            }

                            // ✅ No minimum floor — user can enter any amount > 0
                            if (entered > cartGrandTotal) {
                              setAdvanceAmount(String(cartGrandTotal));
                              return;
                            }

                            setAdvanceAmount(raw);
                          }}
                          className="bg-white pl-7 h-11"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-4 space-y-1.5">
                      <Label className="text-xs font-semibold uppercase text-gray-500">
                        Remaining After Advance
                      </Label>
                      <div className="h-11 rounded-lg border bg-gray-50 px-3 flex items-center font-semibold text-gray-700">
                        ₹
                        {Math.max(0, cartGrandTotal - Number(advanceAmount || 0)).toLocaleString(
                          undefined,
                          { maximumFractionDigits: 2 }
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-amber-200 bg-amber-100/60 px-3 py-2 text-sm text-amber-900">
                    ℹ️ Suggested advance: <span className="font-bold">{minAdvancePercent}%</span>
                    {" "}= ₹{minAdvanceAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} (not enforced)
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase text-gray-500">
                      Note
                    </Label>
                    <Input
                      value={advanceOrderNote}
                      onChange={(e) => setAdvanceOrderNote(e.target.value)}
                      className="bg-white h-11"
                      placeholder="Optional note for advance order"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-amber-800">Advance Payment Details</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addAdvancePayment}
                        className="border-amber-300 text-amber-700 hover:bg-amber-100"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Payment
                      </Button>
                    </div>

                    {advancePaymentsList.map((p) => (
                      <div
                        key={p.id}
                        className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end border border-amber-200 p-3 rounded-lg bg-white"
                      >
                        <div className="md:col-span-3">
                          <Label className="text-xs font-semibold text-gray-600 mb-1 block">Method</Label>
                          <Select
                            value={String(p.method)}
                            onValueChange={(val) =>
                              updateAdvancePayment(p.id, "method", Number(val))
                            }
                          >
                            <SelectTrigger className="h-10 bg-white border-gray-300">
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

                        <div className="md:col-span-2">
                          <Label className="text-xs font-semibold text-gray-600 mb-1 block">Amount</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            className="h-10 bg-white border-gray-300"
                            value={p.amount}
                            onChange={(e) => {
                              const raw = e.target.value;

                              if (advancePaymentsList.length === 1) {
                                const entered = Number(raw || 0);
                                // ✅ No minimum per-payment enforcement
                              }

                              updateAdvancePayment(p.id, "amount", raw);
                            }}
                          />
                        </div>

                        <div className="md:col-span-3">
                          <Label className="text-xs font-semibold text-gray-600 mb-1 block">
                            Bank / Machine {p.method !== 0 && <span className="text-red-500">*</span>}
                          </Label>
                          {p.method === 0 ? (
                            <Input
                              className="h-10 bg-gray-100 border-gray-300"
                              value="Cash"
                              readOnly
                            />
                          ) : (
                            <SearchableSelect
                              options={
                                lookupData?.bankNames?.map((bank: string) => ({
                                  value: bank,
                                  label: bank,
                                })) || []
                              }
                              value={p.machineOrBank}
                              placeholder="Select or type Bank/Machine"
                              onChange={(val) =>
                                updateAdvancePayment(
                                  p.id,
                                  "machineOrBank",
                                  val ? String(val) : ""
                                )
                              }
                              allowCustomValue={true}
                            />
                          )}
                        </div>

                        <div className="md:col-span-3">
                          <Label className="text-xs font-semibold text-gray-600 mb-1 block">
                            Reference / Note
                          </Label>
                          <Input
                            className="h-10 bg-white border-gray-300"
                            value={p.reference}
                            onChange={(e) =>
                              updateAdvancePayment(p.id, "reference", e.target.value)
                            }
                            placeholder="Optional"
                          />
                        </div>

                        <div className="md:col-span-1 flex justify-center pb-1">
                          {advancePaymentsList.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:bg-red-100 h-10 w-10 rounded-full"
                              onClick={() => removeAdvancePayment(p.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}

                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <span className="text-amber-800 font-medium">
                        Advance Amount: ₹{Number(advanceAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-amber-900 font-bold">
                        Payment Total: ₹
                        {advancePaymentsList
                          .reduce((sum, p) => sum + Number(p.amount || 0), 0)
                          .toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* INLINE PAYMENT FINALIZATION DIV */}
      {orderPlaced && (
        <div className="bg-white p-6 md:p-8 rounded-xl border-2 border-green-400 shadow-lg relative overflow-hidden animate-in fade-in slide-in-from-bottom-4">

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-gray-100 pb-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  {isEditMode ? "Finalize Existing Order" : "Order Successfully Placed!"}
                </h3>
                <p className="text-gray-500 mt-1">
                  Order ID: <span className="font-bold text-gray-700">#{placedOrderId}</span>
                </p>

                {/* Check for customer name in both Edit and Create modes */}
                {((isEditMode && (existingOrder as any)?.customer) || (!isEditMode && customerId)) && (
                  <div className="mt-1 flex flex-col gap-1">
                    <p className="text-sm font-semibold text-indigo-700 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {isEditMode
                        ? (existingOrder as any).customer.name
                        : customers?.find((c: any) => String(c.id) === String(customerId))?.name}
                    </p>

                    {/* Wallet Balance Display */}
                    {walletData && (
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Reward Balance */}
                        {typeof walletData.rewardBalance === "number" && (
                          <p className="text-xs font-medium text-green-600 flex items-center gap-1">
                            <Banknote className="w-3 h-3" />
                            Reward Balance : ₹{Math.floor(walletData.rewardBalance).toLocaleString()}
                          </p>
                        )}

                        {/* Return Balance (Only shows if > 0) */}
                        {typeof walletData.returnBalance === "number" && walletData.returnBalance > 0 && (
                          <p className="text-xs font-medium text-blue-600 flex items-center gap-1">
                            <Banknote className="w-3 h-3" />
                            Return Balance : ₹{Math.floor(walletData.returnBalance).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>


            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Final Amount Due</p>
              <p className="text-4xl font-black text-green-600">
                ₹{finalGrandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
              {Number(walletRedeem) > 0 && (
                <p className="text-xs font-medium text-gray-500 mt-1">
                  Applying ₹{walletRedeem} from Wallet
                </p>
              )}
            </div>
          </div>

          <div className="mb-6">
            <Label className="text-sm font-semibold text-gray-700 block mb-2">
              Wallet Redeem Amount (optional)
            </Label>
            <div className="max-w-xs relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
              <Input
                type="number"
                min="0"
                className="pl-7 h-11 bg-gray-50"
                value={walletRedeem}
                onChange={(e) => handleWalletRedeemChange(e.target.value)}
              />
            </div>
          </div>


          <div className="space-y-4">
            <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-2 text-lg">
              <Banknote className="w-5 h-5 text-indigo-600" /> Split & Finalize Payment
            </h4>

            <div className="space-y-3">
              {paymentsList.map((p) => (
                <div key={p.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end border border-gray-200 p-3 rounded-lg bg-gray-50/50">

                  {/* METHOD SELECTION */}
                  <div className="md:col-span-3">
                    <Label className="text-xs font-semibold text-gray-600 mb-1 block">Method</Label>
                    <Select
                      value={String(p.method)}
                      onValueChange={(val) => {
                        const methodId = Number(val);
                        updatePayment(p.id, "method", methodId);

                        // Auto-fill amount with returnBalance if 'Exchange' (Method 4) is selected
                        if (methodId === 4 && walletData) {
                          const maxExchange = walletData.returnBalance || 0;
                          updatePayment(p.id, "amount", String(maxExchange));
                        }
                      }}
                    >
                      <SelectTrigger className="h-10 bg-white border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map(m => (
                          <SelectItem key={m.value} value={String(m.value)}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* AMOUNT INPUT */}
                  <div className="md:col-span-3">
                    <Label className="text-xs font-semibold text-gray-600 mb-1 flex justify-between items-end">
                      <span>Amount (₹)</span>
                      {p.method === 4 && (
                        <span className="text-[10px] text-blue-600">Max: ₹{walletData?.returnBalance || 0}</span>
                      )}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      className="h-10 bg-white border-gray-300"
                      value={p.amount}
                      onChange={(e) => {
                        let newValue = e.target.value;

                        // Restrict max amount if the method is 'Exchange' (Method 4)
                        if (p.method === 4) {
                          const maxReturn = walletData?.returnBalance || 0;
                          if (Number(newValue) > maxReturn) {
                            toast.error(`Exchange amount cannot exceed return balance (₹${maxReturn})`);
                            newValue = String(maxReturn); // Cap it at the maximum
                          }
                        }

                        updatePayment(p.id, "amount", newValue);
                      }}
                    />
                  </div>

                  {/* BANK/MACHINE SELECTION */}
                  <div className="md:col-span-3">
                    <Label className="text-xs font-semibold text-gray-600 mb-1 block">
                      Bank/Machine {p.method !== 0 && p.method !== 4 && <span className="text-red-500">*</span>}
                    </Label>

                    {p.method === 0 || p.method === 4 ? (
                      // Disabled input for Cash (0) and Exchange (4)
                      <Input
                        className="h-10 bg-gray-100 border-gray-300"
                        disabled
                        placeholder={`N/A for ${p.method === 4 ? 'Exchange' : 'Cash'}`}
                        value=""
                        readOnly
                      />
                    ) : (
                      // Custom SearchableSelect for Card/UPI/Online Banking
                      <SearchableSelect
                        options={
                          lookupData?.bankNames?.map((bank) => ({
                            value: bank,
                            label: bank,
                          })) || []
                        }
                        value={p.machineOrBank}
                        placeholder="Select or type Bank/Machine"
                        onChange={(val) => updatePayment(p.id, "machineOrBank", val ? String(val) : "")}
                        allowCustomValue={true}
                      />
                    )}
                  </div>

                  {/* REF/NOTE INPUT */}
                  <div className="md:col-span-2">
                    <Label className="text-xs font-semibold text-gray-600 mb-1 block">Ref/Note</Label>
                    <Input
                      className="h-10 bg-white border-gray-300"
                      placeholder="Optional"
                      value={p.reference}
                      onChange={e => updatePayment(p.id, "reference", e.target.value)}
                    />
                  </div>

                  {/* DELETE BUTTON */}
                  <div className="md:col-span-1 flex justify-center pb-1">
                    {paymentsList.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:bg-red-100 h-10 w-10 rounded-full"
                        onClick={() => removePayment(p.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center bg-indigo-50 p-4 rounded-lg border border-indigo-100 mt-2 gap-4">
              <Button variant="outline" size="sm" onClick={addPayment} className="text-indigo-700 border-indigo-200 hover:bg-indigo-100 bg-white">
                <Plus className="w-4 h-4 mr-2" /> Add Split Payment
              </Button>
              <div className="text-right flex flex-col sm:flex-row items-end gap-4">
                <div className="text-xs sm:text-sm text-gray-600">
                  <div>
                    <span className="text-gray-500 mr-1">Final Amount:</span>
                    <span className="font-semibold text-gray-800">₹{finalGrandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  {Number(walletRedeem) > 0 && (
                    <div>
                      <span className="text-gray-500 mr-1">Wallet Used:</span>
                      <span className="font-semibold text-emerald-700">-₹{Number(walletRedeem).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500 mr-1">Net After Wallet:</span>
                    <span className="font-semibold text-indigo-700">₹{currentTotalExpected.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <div className="text-sm">
                  <div>
                    <span className="text-gray-500 mr-2">Total Paid:</span>
                    <span className="font-bold text-gray-800">₹{currentTotalPaid.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 mr-2">Balance Due:</span>
                    <span className={`font-bold ${remainingAmount > 0 ? "text-red-600" : "text-green-600"}`}>₹{remainingAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ADJUSTMENT AMOUNT FIELD: Shows if Total Paid != Expected Amount */}
            {currentTotalPaid !== currentTotalExpected && (
              <div className={`border rounded-lg p-4 mt-4 flex items-center justify-between animate-in fade-in zoom-in-95 ${currentTotalPaid > currentTotalExpected ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'}`}>
                <div className="flex items-center gap-3">
                  <AlertCircle className={`w-6 h-6 ${currentTotalPaid > currentTotalExpected ? 'text-blue-600' : 'text-yellow-600'}`} />
                  <div>
                    <p className={`text-sm font-semibold ${currentTotalPaid > currentTotalExpected ? 'text-blue-800' : 'text-yellow-800'}`}>
                      {currentTotalPaid > currentTotalExpected ? 'Overpayment Detected (Change Due)' : 'Payment Mismatch'}
                    </p>
                    <p className={`text-xs ${currentTotalPaid > currentTotalExpected ? 'text-blue-700' : 'text-yellow-700'}`}>
                      {currentTotalPaid > currentTotalExpected
                        ? `Customer overpaid by ₹${(currentTotalPaid - currentTotalExpected).toFixed(2)}. This will be recorded as a negative adjustment (change returned).`
                        : 'Please provide the adjustment amount to settle the bill difference.'}
                    </p>
                  </div>
                </div>
                <div className="w-48">
                  <Button
                    type="button"
                    variant="outline"
                    className={`mb-2 w-full text-xs ${currentTotalPaid > currentTotalExpected ? 'border-blue-300 text-blue-800 hover:bg-blue-100' : 'border-yellow-300 text-yellow-800 hover:bg-yellow-100'}`}
                    onClick={() => {
                      const expectedTotal = finalGrandTotal - (Number(walletRedeem) || 0);
                      const difference = expectedTotal - currentTotalPaid;
                      // Set the exact difference (positive or negative) without the 100 limit
                      setAdjustAmount(difference.toFixed(2));
                    }}
                  >
                    {currentTotalPaid > currentTotalExpected ? 'Record Change' : 'Fill Remaining Amount'}
                  </Button>

                  <Label className={`text-xs font-semibold mb-1 block ${currentTotalPaid > currentTotalExpected ? 'text-blue-800' : 'text-yellow-800'}`}>
                    Adjust Amount (₹)
                  </Label>
                  <Input
                    type="number" // standard number input allows negatives naturally
                    step="0.01"
                    className={`h-10 bg-white ${currentTotalPaid > currentTotalExpected ? 'border-blue-300' : 'border-yellow-300'}`}
                    value={adjustAmount}
                    onChange={(e) => {
                      setAdjustAmount(e.target.value); // Let native browser handle number validation (including negatives)
                    }}
                  />
                </div>
              </div>
            )}


            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100 mt-4">
              <Button className="w-full sm:w-1/2 h-12 text-base bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all" onClick={handleFinalizePaymentClick} disabled={finalizePaymentMutation.isPending}>
                {finalizePaymentMutation.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CreditCard className="w-5 h-5 mr-2" />} Confirm Payment
              </Button>
              <Button variant="outline" className="w-full sm:w-1/4 h-12 border-gray-300 text-gray-600 hover:bg-gray-50" onClick={handleCancel}>
                {isEditMode ? "Cancel" : "Pay Later"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* --- NEW CUSTOMER MODAL START --- */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div
            className="bg-white rounded-xl shadow-lg w-full max-w-3xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="p-6 border-b shrink-0 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
              <h2 className="text-xl font-bold text-gray-800">Add New Customer</h2>
              <Button variant="ghost" size="sm" onClick={() => setIsCustomerModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </Button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Name */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Full Name <span className="text-red-500">*</span></Label>
                  <Input
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    placeholder="Enter full name"
                    className="mt-1.5"
                    autoFocus
                  />
                </div>

                {/* Phone */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Phone <span className="text-red-500">*</span></Label>
                  <Input
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    placeholder="10-digit mobile number"
                    className="mt-1.5"
                  />
                </div>

                {/* Email */}
                {/* Email */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Email</Label>
                  <Input
                    type="email"
                    value={newCustomer.email || ""}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value || null })} // <-- Save as null if empty
                    placeholder="Enter email address"
                    className="mt-1.5"
                  />
                </div>


                {/* DOB */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Date of Birth</Label>
                  <Input
                    type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    value={newCustomer.dateOfBirth}
                    onChange={(e) => setNewCustomer({ ...newCustomer, dateOfBirth: e.target.value })}
                    className="mt-1.5"
                  />
                </div>

                {/* Gender */}
                {/* Gender */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Gender</Label>
                  <Select
                    value={newCustomer.gender} // <-- REMOVED '|| undefined'
                    onValueChange={(val) => setNewCustomer({ ...newCustomer, gender: val })}
                  >
                    <SelectTrigger className="mt-1.5 bg-white">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent className="z-[105]">
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>



                {/* Aadhaar */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Aadhaar</Label>
                  <Input
                    value={newCustomer.adharNo}
                    onChange={(e) => setNewCustomer({ ...newCustomer, adharNo: e.target.value })}
                    placeholder="12-digit Aadhaar number"
                    className="mt-1.5"
                  />
                </div>

                {/* PAN */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700">PAN</Label>
                  <Input
                    value={newCustomer.pan}
                    onChange={(e) => setNewCustomer({ ...newCustomer, pan: e.target.value.toUpperCase() })}
                    placeholder="ABCDE1234F"
                    className="mt-1.5 uppercase"
                  />
                </div>

                {/* GSTIN */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700">GSTIN</Label>
                  <Input
                    value={newCustomer.gstin}
                    onChange={(e) => setNewCustomer({ ...newCustomer, gstin: e.target.value.toUpperCase() })}
                    placeholder="22AAAAA0000A1Z5"
                    className="mt-1.5 uppercase"
                  />
                </div>

                {/* Referral */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Referred By</Label>
                  <div className="mt-1.5">
                    <SearchableSelect
                      value={newCustomer.referralId}
                      onChange={(v: any) => setNewCustomer({ ...newCustomer, referralId: v ? String(v) : "" })}
                      placeholder={customerLoading ? "Loading..." : "Search Customer"}
                      options={customers?.map((c: any) => ({
                        value: String(c.id),
                        label: `${c.id} | ${c.name} | ${c.phone}`
                      })) || []}
                      disabled={customerLoading}
                    />
                  </div>
                </div>

              </div>

              <div className="mt-6 border-t pt-6">
                <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">Address Details</h3>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Address</Label>
                    <Input
                      value={newCustomer.address}
                      onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                      placeholder="House no, street, area"
                      className="mt-1.5"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <Label className="text-sm font-semibold text-gray-700">City</Label>
                      <Input
                        value={newCustomer.city}
                        onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                        placeholder="City"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-gray-700">State</Label>
                      <Input
                        value={newCustomer.state}
                        onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value })}
                        placeholder="State"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-gray-700">PIN Code</Label>
                      <Input
                        value={newCustomer.pinCode}
                        onChange={(e) => setNewCustomer({ ...newCustomer, pinCode: e.target.value })}
                        placeholder="6-digit PIN code"
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 md:p-6 border-t shrink-0 flex flex-col-reverse md:flex-row justify-end gap-3 bg-gray-50/50 rounded-b-xl relative z-10">
              <Button
                variant="outline"
                className="w-full md:w-auto"
                onClick={() => {
                  setIsCustomerModalOpen(false);
                  setNewCustomer({
                    name: "", phone: "", email: "", dateOfBirth: "", gender: "",
                    gstin: "", pan: "", adharNo: "", address: "", city: "", state: "", pinCode: "",
                    referralId: ""
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateCustomer}
                disabled={createCustomerMutation.isPending}
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
              >
                {createCustomerMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  "Add Customer"
                )}
              </Button>
            </div>

          </div>
        </div>
      )}
      {/* --- NEW CUSTOMER MODAL END --- */}
      {/* EDIT COST MODAL */}
      <Dialog
        open={editCostModal.isOpen}
        onOpenChange={(isOpen) => setEditCostModal((prev) => ({ ...prev, isOpen }))}
      >
        {/* Increased max-width to make the modal larger */}
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Item Costs & Discounts</DialogTitle>
          </DialogHeader>

          {/* Added more padding and spacing */}
          <div className="space-y-6 py-6">

            {/* GOLD / METAL SECTION */}
            {editCostModal.hasGold && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
                <h4 className="text-base font-bold text-gray-800 border-b pb-2">Gold / Metal Options</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Making Charge</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="flex-1"
                        placeholder="0.00"
                        value={costForm.goldMakingCharge || ""}
                        onChange={(e) => setCostForm({ ...costForm, goldMakingCharge: Number(e.target.value) })}
                      />
                      <Select value={costForm.goldMakingChargeType} onValueChange={(val) => setCostForm({ ...costForm, goldMakingChargeType: val })}>
                        <SelectTrigger className="w-[100px] bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {/* Updated values to send "Fixed" and "%" */}
                          <SelectItem value="Fixed">Fixed (₹)</SelectItem>
                          <SelectItem value="%">%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Discount Amount</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="flex-1"
                        placeholder="0.00"
                        value={costForm.goldDiscount || ""}
                        onChange={(e) => setCostForm({ ...costForm, goldDiscount: Number(e.target.value) })}
                      />
                      <Select value={costForm.goldDiscountType} onValueChange={(val) => setCostForm({ ...costForm, goldDiscountType: val })}>
                        <SelectTrigger className="w-[100px] bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {/* Updated values to send "Fixed" and "%" */}
                          <SelectItem value="Fixed">Fixed (₹)</SelectItem>
                          <SelectItem value="%">%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* DIAMOND SECTION */}
            {editCostModal.hasDiamond && (
              <div className="space-y-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100 shadow-sm">
                <h4 className="text-base font-bold text-blue-800 border-b border-blue-100 pb-2">Diamond Options</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-blue-800">Making Charge</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="flex-1"
                        placeholder="0.00"
                        value={costForm.diamondMakingCharge || ""}
                        onChange={(e) => setCostForm({ ...costForm, diamondMakingCharge: Number(e.target.value) })}
                      />
                      <Select value={costForm.diamondMakingChargeType} onValueChange={(val) => setCostForm({ ...costForm, diamondMakingChargeType: val })}>
                        <SelectTrigger className="w-[100px] bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {/* Updated values to send "Fixed" and "%" */}
                          <SelectItem value="Fixed">Fixed (₹)</SelectItem>
                          <SelectItem value="%">%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-blue-800">Discount Amount</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="flex-1"
                        placeholder="0.00"
                        value={costForm.diamondDiscount || ""}
                        onChange={(e) => setCostForm({ ...costForm, diamondDiscount: Number(e.target.value) })}
                      />
                      <Select value={costForm.diamondDiscountType} onValueChange={(val) => setCostForm({ ...costForm, diamondDiscountType: val })}>
                        <SelectTrigger className="w-[100px] bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {/* Updated values to send "Fixed" and "%" */}
                          <SelectItem value="Fixed">Fixed (₹)</SelectItem>
                          <SelectItem value="%">%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STONE SECTION */}
            {editCostModal.hasStone && (
              <div className="space-y-4 p-4 bg-emerald-50/50 rounded-lg border border-emerald-100 shadow-sm">
                <h4 className="text-base font-bold text-emerald-800 border-b border-emerald-100 pb-2">Stone Options</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-emerald-800">Discount Amount</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="flex-1"
                        placeholder="0.00"
                        value={costForm.stoneDiscount || ""}
                        onChange={(e) => setCostForm({ ...costForm, stoneDiscount: Number(e.target.value) })}
                      />
                      <Select value={costForm.stoneDiscountType} onValueChange={(val) => setCostForm({ ...costForm, stoneDiscountType: val })}>
                        <SelectTrigger className="w-[100px] bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {/* Updated values to send "Fixed" and "%" */}
                          <SelectItem value="Fixed">Fixed (₹)</SelectItem>
                          <SelectItem value="%">%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" className="h-10 px-6" onClick={() => setEditCostModal((prev) => ({ ...prev, isOpen: false }))}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveCosts}
              disabled={updateItemCost.isPending}
              className="h-10 px-6 bg-blue-600 text-white hover:bg-blue-700 font-semibold"
            >
              {updateItemCost.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* --- NEW FLOATING CHECKOUT BAR --- */}
      {/* --- NEW FLOATING CHECKOUT BAR --- */}
      {((cart?.items?.length || (cart as any)?.Items?.length) || 0) > 0 && !orderPlaced && !isEditMode && (
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)] z-[50]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 px-4">

            {/* Grand Total Display */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5 sm:text-left text-center">
                Grand Total
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-green-700">
                ₹{num((cart as any)?.grandTotal ?? (cart as any)?.GrandTotal).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>

            {/* Floating Checkout Button */}
            <Button
              className="w-full sm:w-auto h-12 px-10 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold shadow-md transition-all hover:scale-[1.02]"
              onClick={handlePlaceOrderClick}
              disabled={checkout.isPending || !customerId}
            >
              {checkout.isPending || checkoutAdvanceMutation.isPending ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <ShoppingBag className="w-5 h-5 mr-2" />
              )}
              {isAdvanceOrder ? "Create Advance Order" : "Checkout"}
            </Button>

          </div>
        </div>
      )}
      <BarcodeScanner
        open={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScan}
      />







      {/* CONFIRMATION MODALS */}
      <Dialog open={isCheckoutConfirmOpen} onOpenChange={setIsCheckoutConfirmOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-700">
              <ShoppingBag className="w-5 h-5" />
              {isAdvanceOrder ? "Confirm Advance Order" : "Confirm Order Placement"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-gray-600 text-sm">
            <p className="mb-4">
              {isAdvanceOrder
                ? "Are you sure you want to create this advance order for the selected customer? The advance payment will be recorded now and the order will remain pending until final completion."
                : "Are you sure you want to place this order for the selected customer? Once placed, the bill will be locked and you will proceed to payment."}
            </p>
            {/* ADDED TOTAL DISPLAY */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex justify-between items-center">
              <span className="font-semibold text-blue-800">Grand Total:</span>
              <span className="text-xl font-bold text-blue-900">
                ₹{num((cart as any)?.grandTotal ?? (cart as any)?.GrandTotal).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>

          </div>
          <DialogFooter className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setIsCheckoutConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmPlaceOrder} disabled={checkout.isPending} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]">
              {checkout.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Confirm & Place
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentConfirmOpen} onOpenChange={setIsPaymentConfirmOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" /> Confirm Payment
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-gray-600 text-sm">
            <p className="mb-4">Are you sure you want to finalize this payment? This will complete the transaction and this action cannot be undone.</p>

            {/* ADDED TOTAL DISPLAY */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-100 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-green-800">Total Bill Amount:</span>
                <span className="font-bold text-green-900">
                  ₹{finalGrandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-green-200 pt-2">
                <span className="font-bold text-green-800 text-base">Amount Being Paid:</span>
                <span className="text-xl font-black text-green-700">
                  ₹{currentTotalPaid.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

          </div>
          <DialogFooter className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setIsPaymentConfirmOpen(false)}>Cancel</Button>
            <Button
              onClick={handleConfirmFinalizePayment}
              disabled={finalizePaymentMutation.isPending || completeAdvanceMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white min-w-[140px]"
            >
              {finalizePaymentMutation.isPending || completeAdvanceMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {isAdvanceOrder ? "Complete Advance Order" : "Finalize Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isBulkItemModalOpen}
        onOpenChange={(open) => {
          if (!open) resetBulkItemModal();
        }}
      >
        <DialogContent className="sm:max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-blue-700">
              Enter Item Weight
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
              <div>
                <span className="font-semibold">Item:</span> {selectedBulkItem?.itemName || "-"}
              </div>
              <div>
                <span className="font-semibold">Tag:</span> {selectedBulkItem?.tagNumber || "-"}
              </div>
              <div>
                <span className="font-semibold">Item ID:</span> {selectedBulkItem?.itemId || "-"}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">
                  Bulk Gross Weight (g) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="0.000"
                  value={bulkItemForm.bulkGrossWeight}
                  onChange={(e) => updateBulkField("bulkGrossWeight", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">
                  Bulk Diamond Carat
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="0.000"
                  value={bulkItemForm.bulkDiamondCarat}
                  onChange={(e) => updateBulkField("bulkDiamondCarat", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">
                  Bulk Stone Weight (g)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="0.000"
                  value={bulkItemForm.bulkStoneWeight}
                  onChange={(e) => updateBulkField("bulkStoneWeight", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">
                  Diamond Weight (g)
                </Label>
                <Input
                  type="text"
                  readOnly
                  value={caratToGram(Number(bulkItemForm.bulkDiamondCarat || 0)).toFixed(3)}
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label className="text-sm font-semibold text-gray-700">
                  Bulk Net Weight (g)
                </Label>
                <Input
                  type="text"
                  readOnly
                  value={bulkItemForm.bulkNetWeight}
                  className="bg-gray-50 font-semibold text-blue-700"
                />
                <p className="text-xs text-gray-500">
                  Net Weight = Gross Weight - Stone Weight - Diamond Weight(g)
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={resetBulkItemModal}>
              Cancel
            </Button>

            <Button
              onClick={handleConfirmBulkItemAdd}
              disabled={addItem.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
            >
              {addItem.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Bulk Item
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isAdvanceReceiptPromptOpen}
        onOpenChange={setIsAdvanceReceiptPromptOpen}
      >
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-amber-700">
              Download Advance Receipt?
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 text-sm text-gray-600">
            <p>
              Advance order was created successfully. Do you want to download the
              advance receipt now?
            </p>

            {advanceReceiptOrderId && (
              <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 p-3">
                <span className="text-sm font-semibold text-amber-800">
                  Order ID: #{advanceReceiptOrderId}
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsAdvanceReceiptPromptOpen(false);
                onCancel();
              }}
            >
              No
            </Button>

            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={
                !advanceReceiptOrderId || advanceReceiptPdfMutation.isPending
              }
              onClick={async () => {
                if (!advanceReceiptOrderId) return;

                await handleDownloadAdvanceReceipt(advanceReceiptOrderId);
                setIsAdvanceReceiptPromptOpen(false);
                onCancel();
              }}
            >
              {advanceReceiptPdfMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Yes, Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
