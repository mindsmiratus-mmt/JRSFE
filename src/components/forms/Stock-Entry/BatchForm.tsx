// pages/stock-entry/AddBatchPage.tsx
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Formik, Form, Field, useFormikContext } from "formik";
import * as Yup from "yup";
import {
  ArrowLeft,
  Calculator,
  Loader2,
  Package,
  ShoppingBag,
  Weight,
  IndianRupee,
  FileText,
} from "lucide-react";

import { useCurrentRate } from "@/hooks/useCurruntrate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { cn } from "@/lib/utils";

import { useAllVendors } from "@/hooks/useVendor";
import { useShopLookup, useShops } from "@/hooks/useShop";
import {
  useAddBatchStockEntry,
  useBulkStockEntries,
  useCalculateSalePrice,
  type AddBatchStockEntryData,
  type CalculateSalePriceResponse,
  type StockEntry,
} from "@/hooks/useStockEntry";

const caratToGram = (carat: number): number => {
  if (!carat) return 0;
  return Number((carat * 0.2).toFixed(3));
};

const getStockEntryType = (mode: string) => {
  const inTypes = ["Opening", "PurchaseIn", "TransferIn", "ChallanIn", "Return"];
  return inTypes.includes(mode) ? "StockIn" : "StockOut";
};

const getLatestUniqueBulkItems = (items: StockEntry[]) => {
  const map = new Map<number, StockEntry>();

  for (const item of items) {
    const itemId = Number(item.itemId);
    if (!itemId) continue;

    const existing = map.get(itemId);

    if (!existing) {
      map.set(itemId, item);
      continue;
    }

    const existingDate = existing.createDate ? new Date(existing.createDate).getTime() : 0;
    const currentDate = item.createDate ? new Date(item.createDate).getTime() : 0;

    if (currentDate >= existingDate) {
      map.set(itemId, item);
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const aDate = a.createDate ? new Date(a.createDate).getTime() : 0;
    const bDate = b.createDate ? new Date(b.createDate).getTime() : 0;
    return bDate - aDate;
  });
};

const BatchSchema = Yup.object().shape({
  selectedItemId: Yup.number()
    .typeError("Please select a bulk item")
    .required("Please select a bulk item"),

  huid: Yup.string().trim().notRequired(),

  modeOfStock: Yup.string().required("Mode of stock is required"),

  quantity: Yup.number()
    .typeError("Quantity must be a number")
    .min(1, "Quantity must be at least 1")
    .required("Quantity is required"),

  grossWeight: Yup.number()
    .typeError("Gross weight must be a number")
    .min(0.001, "Gross weight must be greater than zero")
    .required("Gross weight is required")
    .test(
      "equals-sum",
      "Gross weight must equal stone weight + diamond weight + net weight",
      function (value) {
        const { stoneWeight, diamondWeight, netWeight } = this.parent;
        if (
          value == null ||
          stoneWeight == null ||
          diamondWeight == null ||
          netWeight == null
        ) {
          return true;
        }

        const sum =
          Number(stoneWeight || 0) +
          Number(diamondWeight || 0) +
          Number(netWeight || 0);

        return Number(value.toFixed(3)) === Number(sum.toFixed(3));
      }
    ),

  stoneWeight: Yup.number()
    .typeError("Stone weight must be a number")
    .min(0, "Stone weight cannot be negative")
    .test(
      "not-greater-than-gross",
      "Stone weight cannot be more than gross weight",
      function (value) {
        const { grossWeight } = this.parent;
        if (value == null || grossWeight == null) return true;
        return Number(value) <= Number(grossWeight);
      }
    ),

  diamondCarat: Yup.number()
    .typeError("Diamond carat must be a number")
    .min(0, "Diamond carat cannot be negative")
    .notRequired(),

  diamondWeight: Yup.number()
    .typeError("Diamond weight must be a number")
    .min(0, "Diamond weight cannot be negative")
    .required("Diamond weight is required"),

  netWeight: Yup.number()
    .typeError("Net weight must be a number")
    .min(0, "Net weight cannot be negative")
    .required("Net weight is required"),

  pureWeight: Yup.number()
    .typeError("Pure weight must be a number")
    .min(0, "Pure weight cannot be negative")
    .required("Pure weight is required"),

  stockEntryType: Yup.string().required("Stock entry type is required"),

  purchaseMakingCharge: Yup.number()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue == null ? undefined : value
    )
    .typeError("Purchase making charge must be a number")
    .min(0, "Purchase making charge cannot be negative")
    .notRequired(),

  purchaseMakingChargeType: Yup.string().when("purchaseMakingCharge", {
    is: (val: unknown) =>
      val !== "" &&
      val !== null &&
      val !== undefined &&
      !Number.isNaN(Number(val)),
    then: (schema) =>
      schema.required("Charge type is required when making charge is entered"),
    otherwise: (schema) => schema.notRequired(),
  }),

  purchaseGoldRate: Yup.number()
    .typeError("Purchase gold rate must be a number")
    .min(0, "Purchase gold rate cannot be negative")
    .notRequired(),

  purchaseDiamondRate: Yup.number()
    .typeError("Purchase diamond rate must be a number")
    .min(0, "Purchase diamond rate cannot be negative")
    .notRequired(),

  purchaseStonePrice: Yup.number()
    .typeError("Purchase stone price must be a number")
    .min(0, "Purchase stone price cannot be negative")
    .notRequired(),

  stonePrice: Yup.number()
    .typeError("Stone price must be a number")
    .min(0, "Stone price cannot be negative")
    .notRequired(),

  salePrice: Yup.number()
    .typeError("Sale price must be a number")
    .min(0, "Sale price cannot be negative")
    .notRequired(),

  remarks: Yup.string().nullable(),

  shopId: Yup.number()
    .typeError("Please select a valid shop")
    .required("Please select a shop"),

  vendorId: Yup.number().nullable().notRequired(),
});

type BatchFormValues = {
  selectedItemId: number | string;
  huid: string;
  modeOfStock: string;
  quantity: number | string;
  grossWeight: number | string;
  stoneWeight: number | string;
  diamondCarat: number | string;
  diamondWeight: number | string;
  netWeight: number | string;
  pureWeight: number | string;
  remarks: string;
  stockEntryType: string;
  purchaseMakingCharge: number | string;
  purchaseMakingChargeType: string;
  purchaseGoldRate: number | string;
  purchaseDiamondRate: number | string;
  purchaseStonePrice: number | string;
  stonePrice: number | string;
  salePrice: number | string;
  shopId: number | string;
  vendorId: number | null;
};

export default function AddBatchPage() {
  const navigate = useNavigate();
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  const {
    data: bulkItemsResponse = [],
    isLoading: isBulkItemsLoading,
    isError: isBulkItemsError,
  } = useBulkStockEntries();

  const { data: shopsResponse } = useShops();
  const { data: vendorsResponse = [] } = useAllVendors();
  const { data: lookup } = useShopLookup();

  const shops = shopsResponse?.data || [];
  const vendors = Array.isArray(vendorsResponse) ? vendorsResponse : [];
  const rawBulkItems = Array.isArray(bulkItemsResponse) ? bulkItemsResponse : [];

  const bulkItems = useMemo(
    () => getLatestUniqueBulkItems(rawBulkItems as StockEntry[]),
    [rawBulkItems]
  );

  const selectedBulkItem = useMemo<StockEntry | null>(() => {
    if (!selectedItemId) return null;
    return bulkItems.find((item) => Number(item.itemId) === Number(selectedItemId)) || null;
  }, [bulkItems, selectedItemId]);

  const addBatchMutation = useAddBatchStockEntry();
  const calculateSalePriceMutation = useCalculateSalePrice();

  const initialValues: BatchFormValues = {
    selectedItemId: selectedBulkItem?.itemId || "",
    huid: "",
    modeOfStock: "PurchaseIn",
    quantity: 1,
    grossWeight: "",
    stoneWeight: "",
    diamondCarat: "",
    diamondWeight: 0,
    netWeight: 0,
    pureWeight: 0,
    remarks: "",
    stockEntryType: "StockIn",
    purchaseMakingCharge: "",
    purchaseMakingChargeType: "",
    purchaseGoldRate: selectedBulkItem?.purchaseGoldRate || "",
    purchaseDiamondRate: selectedBulkItem?.purchaseDiamondRate || "",
    purchaseStonePrice: "",
    stonePrice: selectedBulkItem?.stonePrice || "",
    salePrice: selectedBulkItem?.salePrice || "",
    shopId: selectedBulkItem?.shopId || "",
    vendorId: selectedBulkItem?.vendorId || null,
  };

  const bulkItemOptions = useMemo(
    () =>
      bulkItems.map((item) => ({
        value: String(item.itemId),
        label: `${item.tagNumber || "No Tag"} • ${item.itemName || "Unnamed Item"} • ${
          item.metal || "-"
        } • ${item.category || "-"}`,
      })),
    [bulkItems]
  );

  if (isBulkItemsLoading) {
    return (
      <div className="p-6">
        <div className="rounded-md border bg-white p-8 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading bulk items...</span>
        </div>
      </div>
    );
  }

  if (isBulkItemsError) {
    return (
      <div className="p-6">
        <div className="rounded-md border bg-white p-6">
          <p className="text-red-600">Unable to load bulk items.</p>
          <Button className="mt-4" variant="outline" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Add Item Batch
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Select an existing bulk item and add a new purchase batch.
              </p>
            </div>
          </div>
        </div>

        <Formik
          enableReinitialize
          initialValues={initialValues}
          validationSchema={BatchSchema}
          onSubmit={async (values, { setSubmitting }) => {
            if (!selectedBulkItem) {
              toast.error("Please select a bulk item");
              setSubmitting(false);
              return;
            }

            const hasMakingCharge =
              values.purchaseMakingCharge !== "" &&
              values.purchaseMakingCharge !== null &&
              values.purchaseMakingCharge !== undefined &&
              !Number.isNaN(Number(values.purchaseMakingCharge));

            const payload: AddBatchStockEntryData = {
              huid: values.huid?.trim() || "",
              modeOfStock: values.modeOfStock,
              quantity: Number(values.quantity),
              grossWeight: Number((Number(values.grossWeight) || 0).toFixed(3)),
              stoneWeight: Number((Number(values.stoneWeight) || 0).toFixed(3)),
              diamondWeight: Number((Number(values.diamondWeight) || 0).toFixed(3)),
              diamondCarat: Number(values.diamondCarat || 0),
              netWeight: Number((Number(values.netWeight) || 0).toFixed(3)),
              pureWeight: Number((Number(values.pureWeight) || 0).toFixed(3)),
              remarks: values.remarks || "",
              stockEntryType: getStockEntryType(values.modeOfStock),
              purchaseGoldRate: Number(values.purchaseGoldRate || 0),
              purchaseDiamondRate: Number(values.purchaseDiamondRate || 0),
              purchaseStonePrice: Number(values.purchaseStonePrice || 0),
              stonePrice: Number(values.stonePrice || 0),
              salePrice: Number(values.salePrice || 0),
              shopId: Number(values.shopId),
              vendorId: values.vendorId ? Number(values.vendorId) : null,

              ...(hasMakingCharge
                ? {
                    purchaseMakingCharge: Number(values.purchaseMakingCharge),
                    purchaseMakingChargeType: values.purchaseMakingChargeType,
                  }
                : {}),
            };

            try {
              await addBatchMutation.mutateAsync({
                itemId: selectedBulkItem.itemId,
                payload,
              });

              toast.success("Batch added successfully");
              navigate("/stock");
            } catch (err: any) {
              toast.error(err?.response?.data?.message || "Failed to add batch");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <AddBatchFormContent
            navigate={navigate}
            selectedBulkItem={selectedBulkItem}
            setSelectedItemId={setSelectedItemId}
            bulkItemOptions={bulkItemOptions}
            shops={shops}
            vendors={vendors}
            lookup={lookup}
            addBatchMutationPending={addBatchMutation.isPending}
            calculateSalePriceMutation={calculateSalePriceMutation}
          />
        </Formik>
      </div>
    </div>
  );
}

type AddBatchFormContentProps = {
  navigate: ReturnType<typeof useNavigate>;
  selectedBulkItem: StockEntry | null;
  setSelectedItemId: React.Dispatch<React.SetStateAction<number | null>>;
  bulkItemOptions: { value: string; label: string }[];
  shops: any[];
  vendors: any[];
  lookup: any;
  addBatchMutationPending: boolean;
  calculateSalePriceMutation: ReturnType<typeof useCalculateSalePrice>;
};

function AddBatchFormContent({
  navigate,
  selectedBulkItem,
  setSelectedItemId,
  bulkItemOptions,
  shops,
  vendors,
  lookup,
  addBatchMutationPending,
  calculateSalePriceMutation,
}: AddBatchFormContentProps) {
  const { values, errors, touched, setFieldValue, isSubmitting } =
    useFormikContext<BatchFormValues>();

  const { data: goldCurrentRate } = useCurrentRate(
    selectedBulkItem?.metal === "Gold" ? selectedBulkItem?.caratOrKT || "" : ""
  );

  const { data: diamondCurrentRate } = useCurrentRate(selectedBulkItem?.dPurityId || "");

  useEffect(() => {
    setFieldValue("selectedItemId", selectedBulkItem?.itemId || "");
  }, [selectedBulkItem, setFieldValue]);

  useEffect(() => {
    if (!selectedBulkItem) return;

    setFieldValue("purchaseGoldRate", selectedBulkItem.purchaseGoldRate || "");
    setFieldValue("purchaseDiamondRate", selectedBulkItem.purchaseDiamondRate || "");
    setFieldValue("stonePrice", selectedBulkItem.stonePrice || "");
    setFieldValue("salePrice", selectedBulkItem.salePrice || "");
    setFieldValue("shopId", selectedBulkItem.shopId || "");
    setFieldValue("vendorId", selectedBulkItem.vendorId || null);
    setFieldValue("purchaseMakingCharge", "");
    setFieldValue("purchaseMakingChargeType", "");
  }, [selectedBulkItem, setFieldValue]);

  useEffect(() => {
    setFieldValue("stockEntryType", getStockEntryType(values.modeOfStock));
  }, [values.modeOfStock, setFieldValue]);

  useEffect(() => {
    const ct = Number(values.diamondCarat) || 0;
    setFieldValue("diamondWeight", caratToGram(ct));
  }, [values.diamondCarat, setFieldValue]);

  useEffect(() => {
    const gross = Number(values.grossWeight) || 0;
    const stone = Number(values.stoneWeight) || 0;
    const diamond = Number(values.diamondWeight) || 0;
    const net = gross - stone - diamond;
    setFieldValue("netWeight", Number(Math.max(0, net).toFixed(3)));
  }, [values.grossWeight, values.stoneWeight, values.diamondWeight, setFieldValue]);

  useEffect(() => {
    if (!selectedBulkItem) return;

    if (selectedBulkItem.metal === "Diamond") {
      setFieldValue("pureWeight", Number(values.diamondWeight || 0));
    } else {
      const pure =
        (Number(selectedBulkItem.purityPercent || 0) * Number(values.netWeight || 0)) / 100;
      setFieldValue("pureWeight", Number(pure.toFixed(3)));
    }
  }, [values.netWeight, values.diamondWeight, setFieldValue, selectedBulkItem]);

  useEffect(() => {
    if (selectedBulkItem?.metal === "Gold" && goldCurrentRate?.rate) {
      setFieldValue("purchaseGoldRate", goldCurrentRate.rate);
    }
  }, [goldCurrentRate, setFieldValue, selectedBulkItem]);

  useEffect(() => {
    if (
      selectedBulkItem &&
      (selectedBulkItem.metal === "Diamond" || Number(values.diamondCarat) > 0) &&
      diamondCurrentRate?.rate
    ) {
      setFieldValue("purchaseDiamondRate", diamondCurrentRate.rate);
    }
  }, [diamondCurrentRate, setFieldValue, selectedBulkItem, values.diamondCarat]);

  const handleCalculateSalePrice = async () => {
    if (!selectedBulkItem) {
      toast.error("Please select a bulk item first");
      return;
    }

    if (!values.grossWeight || Number(values.grossWeight) <= 0) {
      toast.error("Gross weight is required to calculate sale price");
      return;
    }

    try {
      const result: CalculateSalePriceResponse =
        await calculateSalePriceMutation.mutateAsync({
          gPurityId:
            selectedBulkItem.metal === "Diamond" ? "" : selectedBulkItem.caratOrKT || "",
          netWeight: Number(values.netWeight || 0),
          dPurityId: selectedBulkItem.dPurityId || "",
          diamondWeight: Number(values.diamondWeight || 0),
          diamondCarat: Number(values.diamondCarat || 0),
          stoneName: selectedBulkItem.stoneName || "",
          grossWeight: Number(values.grossWeight || 0),
        });

      setFieldValue("salePrice", Number(result.totalSalePrice.toFixed(2)));
      toast.success("Sale price calculated successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to calculate sale price");
    }
  };

  return (
    <Form className={cn("space-y-4 pb-[calc(9rem+env(safe-area-inset-bottom))] text-sm sm:pb-0")}>
      <SectionCard
        icon={<Package className="h-4 w-4" />}
        title="Select Bulk Item"
        description="Choose the bulk item you want to add a purchase batch for."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FormField
            label="Bulk Item"
            error={touched.selectedItemId ? (errors.selectedItemId as string) : ""}
          >
            <SearchableSelect
              value={values.selectedItemId ? String(values.selectedItemId) : undefined}
              onChange={(v) => {
                const id = v ? Number(v) : null;
                setSelectedItemId(id);
                setFieldValue("selectedItemId", id || "");
              }}
              placeholder="Select bulk item"
              options={bulkItemOptions}
            />
          </FormField>
        </div>
      </SectionCard>

      {selectedBulkItem && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Item ID" value={selectedBulkItem.itemId} />
            <StatCard label="Tag Number" value={selectedBulkItem.tagNumber || "-"} />
            <StatCard label="Metal" value={selectedBulkItem.metal || "-"} />
            <StatCard label="Category" value={selectedBulkItem.category || "-"} />
          </div>

          <SectionCard
            icon={<ShoppingBag className="h-4 w-4" />}
            title="Bulk Item Info"
            description="These details come from the selected bulk master item."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ReadOnlyField label="Tag Number" value={selectedBulkItem.tagNumber} />
              <ReadOnlyField label="Item ID" value={selectedBulkItem.itemId} />
              <ReadOnlyField label="Item Name" value={selectedBulkItem.itemName} />
              <ReadOnlyField label="Category" value={selectedBulkItem.category} />
              <ReadOnlyField label="Metal" value={selectedBulkItem.metal} />
              <ReadOnlyField label="Brand" value={selectedBulkItem.brand} />
              <ReadOnlyField label="Purity / KT" value={selectedBulkItem.caratOrKT} />
              <ReadOnlyField label="Purity Percent" value={selectedBulkItem.purityPercent} />
              <ReadOnlyField label="Stone" value={selectedBulkItem.stoneName} />
              <ReadOnlyField label="Diamond Purity" value={selectedBulkItem.dPurityId} />
              <ReadOnlyField label="Pricing Model" value={selectedBulkItem.pricingModel} />
              <ReadOnlyField
                label="Bulk Item"
                value={selectedBulkItem.isBulkItem ? "Yes" : "No"}
              />
            </div>
          </SectionCard>

          <SectionCard
            icon={<Package className="h-4 w-4" />}
            title="Batch Details"
            description="Enter purchase source and batch-level details."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 items-start">
              <FormField label="Shop" error={touched.shopId ? (errors.shopId as string) : ""}>
                <SearchableSelect
                  value={values.shopId ? String(values.shopId) : undefined}
                  onChange={(v) => setFieldValue("shopId", v ? Number(v) : "")}
                  placeholder="Select shop"
                  options={shops.map((s) => ({
                    value: String(s.id),
                    label: s.name,
                  }))}
                />
              </FormField>

              <FormField
                label="Mode of Stock"
                error={touched.modeOfStock ? (errors.modeOfStock as string) : ""}
              >
                <Select
                  value={values.modeOfStock}
                  onValueChange={(v) => setFieldValue("modeOfStock", v)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Opening">Opening</SelectItem>
                    <SelectItem value="PurchaseIn">PurchaseIn</SelectItem>
                    <SelectItem value="TransferIn">TransferIn</SelectItem>
                    <SelectItem value="ChallanIn">ChallanIn</SelectItem>
                    <SelectItem value="Return">Return</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                label="Vendor"
                error={touched.vendorId ? (errors.vendorId as string) : ""}
              >
                <SearchableSelect
                  value={values.vendorId ? String(values.vendorId) : undefined}
                  onChange={(v) => setFieldValue("vendorId", v ? Number(v) : null)}
                  placeholder="Select vendor"
                  options={vendors.map((v) => ({
                    value: String(v.id),
                    label: v.name,
                  }))}
                />
              </FormField>

              <FormField label="HUID" error={touched.huid ? (errors.huid as string) : ""}>
                <Field as={Input} name="huid" placeholder="Enter HUID" className="h-10" />
              </FormField>

              <FormField
                label="Quantity"
                error={touched.quantity ? (errors.quantity as string) : ""}
              >
                <Input
                  type="number"
                  className="h-10"
                  value={values.quantity}
                  onChange={(e) => setFieldValue("quantity", e.target.value)}
                />
              </FormField>
            </div>
          </SectionCard>

          <SectionCard
            icon={<Weight className="h-4 w-4" />}
            title="Weight Details"
            description="Batch weights are auto-derived where possible."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
              <NumberField
                label="Gross Weight"
                value={values.grossWeight}
                onChange={(v) => setFieldValue("grossWeight", v)}
                error={touched.grossWeight ? (errors.grossWeight as string) : ""}
              />

              <NumberField
                label="Stone Weight"
                value={values.stoneWeight}
                onChange={(v) => setFieldValue("stoneWeight", v)}
                error={touched.stoneWeight ? (errors.stoneWeight as string) : ""}
              />

              <NumberField
                label="Diamond Carat"
                value={values.diamondCarat}
                onChange={(v) => setFieldValue("diamondCarat", v)}
                error={touched.diamondCarat ? (errors.diamondCarat as string) : ""}
              />

              <ReadOnlyDisplay
                label="Diamond Weight g"
                value={Number(values.diamondWeight || 0).toFixed(3)}
              />
              <ReadOnlyDisplay
                label="Net Weight g"
                value={Number(values.netWeight || 0).toFixed(3)}
              />
              <ReadOnlyDisplay
                label="Pure Weight g"
                value={Number(values.pureWeight || 0).toFixed(3)}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <InfoPill label="Stock Entry Type" value={values.stockEntryType} />
              <InfoPill label="Metal" value={selectedBulkItem.metal || "-"} />
              <InfoPill label="Pricing Model" value={selectedBulkItem.pricingModel || "-"} />
            </div>
          </SectionCard>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <SectionCard
              icon={<IndianRupee className="h-4 w-4" />}
              title="Purchase Values"
              description="Enter purchase-side batch pricing."
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NumberField
                  label="Purchase Gold Rate"
                  value={values.purchaseGoldRate}
                  onChange={(v) => setFieldValue("purchaseGoldRate", v)}
                  error={touched.purchaseGoldRate ? (errors.purchaseGoldRate as string) : ""}
                  step="0.01"
                />

                <NumberField
                  label="Purchase Diamond Rate"
                  value={values.purchaseDiamondRate}
                  onChange={(v) => setFieldValue("purchaseDiamondRate", v)}
                  error={touched.purchaseDiamondRate ? (errors.purchaseDiamondRate as string) : ""}
                  step="0.01"
                />

                <NumberField
                  label="Purchase Stone Price"
                  value={values.purchaseStonePrice}
                  onChange={(v) => setFieldValue("purchaseStonePrice", v)}
                  error={touched.purchaseStonePrice ? (errors.purchaseStonePrice as string) : ""}
                  step="0.01"
                />

                <NumberField
                  label="Making Charge"
                  value={values.purchaseMakingCharge}
                  onChange={(v) => setFieldValue("purchaseMakingCharge", v)}
                  error={touched.purchaseMakingCharge ? (errors.purchaseMakingCharge as string) : ""}
                  step="0.01"
                />

                <FormField
                  label="Charge Type"
                  error={
                    touched.purchaseMakingChargeType
                      ? (errors.purchaseMakingChargeType as string)
                      : ""
                  }
                >
                  <Select
                    value={values.purchaseMakingChargeType || undefined}
                    onValueChange={(v) => setFieldValue("purchaseMakingChargeType", v)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {lookup?.makingChargeTypes?.map((item: string) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            </SectionCard>

            <SectionCard
              icon={<Calculator className="h-4 w-4" />}
              title="Sale Price"
              description="Auto-calculate or manually adjust selling values."
              action={
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCalculateSalePrice}
                  disabled={calculateSalePriceMutation.isPending}
                >
                  {calculateSalePriceMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Calculator className="mr-2 h-4 w-4" />
                  )}
                  Calculate
                </Button>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NumberField
                  label="Stone Price"
                  value={values.stonePrice}
                  onChange={(v) => setFieldValue("stonePrice", v)}
                  error={touched.stonePrice ? (errors.stonePrice as string) : ""}
                  step="0.01"
                />

                <NumberField
                  label="Sale Price"
                  value={values.salePrice}
                  onChange={(v) => setFieldValue("salePrice", v)}
                  error={touched.salePrice ? (errors.salePrice as string) : ""}
                  step="0.01"
                />
              </div>

              <div className="mt-4 rounded-md border bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Current calculation basis
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Gold rate, diamond rate, weights, and purity are used from the selected
                  item and current batch inputs.
                </p>
              </div>
            </SectionCard>
          </div>

          <SectionCard
            icon={<FileText className="h-4 w-4" />}
            title="Remarks"
            description="Use this for vendor invoice number, notes, or internal comments."
          >
            <Field
              as={Textarea}
              name="remarks"
              rows={4}
              placeholder="Enter remarks, vendor invoice no, notes..."
              className="min-h-[110px]"
            />
            {touched.remarks && errors.remarks && (
              <p className="text-sm text-red-500">{errors.remarks as string}</p>
            )}
          </SectionCard>
        </>
      )}

      <div className="hidden justify-end gap-3 border-t border-slate-200 pt-4 sm:flex">
        <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || addBatchMutationPending || !selectedBulkItem}
        >
          {(isSubmitting || addBatchMutationPending) && (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          )}
          Add Batch
        </Button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75 sm:hidden">
        <div
          className="mx-auto grid max-w-[1400px] grid-cols-2 gap-3 px-6 py-3"
          style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
        >
          <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || addBatchMutationPending || !selectedBulkItem}
          >
            {(isSubmitting || addBatchMutationPending) && (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            )}
            Add Batch
          </Button>
        </div>
      </div>
    </Form>
  );
}

function SectionCard({
  title,
  description,
  icon,
  action,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            {icon}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 sm:text-base">{title}</h2>
            {description ? (
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">{description}</p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value || "-"}</p>
    </div>
  );
}

function InfoPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-blue-600">{label}</p>
      <p className="mt-1 text-sm font-semibold text-blue-900">{value || "-"}</p>
    </div>
  );
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-slate-500">{label}</Label>
      {children}
      {!!error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-slate-500">{label}</Label>
      <Input value={value ?? ""} disabled className="h-10 bg-slate-50 text-slate-700" />
    </div>
  );
}

function ReadOnlyDisplay({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
      <Label className="text-xs font-medium text-slate-500">{label}</Label>
      <div className="mt-1 text-sm font-semibold text-blue-600">{value}</div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  error,
  step = "0.001",
}: {
  label: string;
  value: string | number;
  onChange: (v: string | number) => void;
  error?: string;
  step?: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-slate-500">{label}</Label>
      <Input
        type="number"
        step={step}
        className="h-10"
        value={value === 0 ? "" : value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          const val = e.target.value === "" ? 0 : Number(e.target.value);
          onChange(val < 0 ? 0 : val);
        }}
      />
      {!!error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}