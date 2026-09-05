// components/stock-entry/StockEntryForm.tsx
import { useEffect, useCallback, useState, useRef } from "react";
import { getImageBlobUrl } from '@/hooks/useUploadImage';  // ← ADD THIS
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Calculator, Trash2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { toast } from "@/components/ui/toast";

import { useAllVendors, useCreateVendor } from "@/hooks/useVendor";
import { useUploadStockImage, useItemImages } from '@/hooks/useUploadImage';
import { useShopLookup, useShops } from "@/hooks/useShop"; // Assume this hook exists
// import { useAllItems } from "@/hooks/useItem"; // Reuse from invoice
import { useImage } from "@/hooks/useImage";
import {
    useCreateStockEntry,
    useUpdateStockEntry,
    useCalculateSalePrice,
    type CreateStockEntryData,
    type StockEntry,
    type UpdateStockEntryData,
    type CalculateSalePriceResponse,
} from "@/hooks/useStockEntry";
import { useAllLookUp } from "@/hooks/useLookup";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useAllCategory, useCreateCategory } from "@/hooks/useCategory";
import { useCurrentRatePurities, useCurrentRate } from "@/hooks/useCurruntrate";
import { DateInput } from "@/components/ui/DatePicker";
import { MultiSelect, MultiSelectContent, MultiSelectGroup, MultiSelectItem, MultiSelectTrigger } from "@/components/ui/multi-select";
import { Switch } from "@/components/ui/switch";
import { X } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useAllBrand, useAllSockItems } from "@/hooks/useLookup";
import { useTagPrintItem } from "@/hooks/useTag";
import { ConfirmDialog } from "@/components/ui/confirmDialog";

// ========================
// Static Data
// ========================
// const STATIC_BRANDS = [
//     "Tanishq",
//     "Kalyan Jewellers",
//     "Malabar Gold & Diamonds",
//     "PC Jeweller",
//     "Reliance Jewels",
//     "Senco Gold",
//     "Joyalukkas",
//     "TBZ",
//     "Orra",
//     "CaratLane",
//     "Other"
// ];

// Gold and Silver Purity Maps (standard values)
export const GOLD_PURITY_MAP: Record<string, number> = {
    "24K": 99.9,
    "22K": 91.67,
    "18K": 75,
    "14K": 58.33,
};

const SILVER_PURITY_MAP: Record<string, number> = {
    "925": 92.5,
    "999": 99.9,
};

const caratToGram = (carat: number): number => {
    if (!carat) return 0;
    return Number((carat * 0.2).toFixed(3));
};

const VendorSchema = Yup.object().shape({
    name: Yup.string()
        .trim()
        .required("Vendor name is required")
        .min(2, "Minimum 2 characters required"),
    phone: Yup.string()
        .trim()
        .required("Phone number is required")
        .min(10, "Phone number must be at least 10 digits")
        .max(15, "Phone number cannot exceed 15 digits")
        .matches(/^[0-9+\-\s()]+$/, "Enter a valid phone number"),
    email: Yup.string().email("Invalid email").trim().nullable(),
    gstin: Yup.string().trim().nullable(),
    pan: Yup.string().trim().nullable(),
    adharNo: Yup.string().trim().nullable(),
    address: Yup.string().trim().nullable(),
    state: Yup.string().trim().nullable(),
    city: Yup.string().trim().nullable(),
    pinCode: Yup.string().trim().nullable(),
    vendorType: Yup.string().trim().nullable(),
    isActive: Yup.boolean().required(),
});

const CategorySchema = Yup.object().shape({
    categoryName: Yup.string()
        .trim()
        .required("Category name is required")
        .min(2, "Minimum 2 characters required"),
    description: Yup.string().trim().nullable(),
});


// ========================
// Validation Schema
// ========================
const StockEntrySchema = Yup.object().shape({
    metal: Yup.string().required("Metal is required"),
    // brand: Yup.string().required("Brand is required"),
    category: Yup.string().required("Category is required"),
    itemName: Yup.string().required("Item name is required"),
    huid: Yup.string().trim().notRequired(),
    showOnWebsite: Yup.boolean().required(),
    isBulkItem: Yup.boolean().required(),
    modeOfStock: Yup.string().required("Mode of stock is required"),
    caratOrKT: Yup.string().when("metal", {
        is: (metal: string) => !!metal && metal !== "Diamond" && metal !== "Others",
        then: () => Yup.string().required("Purity ID is required"),
        otherwise: () => Yup.string().notRequired(),
    }),
    diamondCarat: Yup.number()
        .typeError("Diamond carat must be a number")
        .when("metal", {
            is: "Diamond",
            then: (schema) => schema
                .min(0.001, "Carat must be greater than 0")
                .required("Diamond carat is required"),
            otherwise: (schema) => schema
                .notRequired()
                .test('min-if-provided', 'Carat must be greater than 0 if provided', function (value) {
                    if (value != null && value > 0) {
                        return value >= 0.001;
                    }
                    return true;
                }),
        }),
    pricingModel: Yup.string()  // Add this new field
        .required("Pricing model is required")
        .typeError("Pricing model must be selected"),
    purityPercent: Yup.number().when("metal", {
        is: (metal: string) => metal === "Diamond" || metal === "Others",
        then: (schema) => schema.notRequired(),
        otherwise: (schema) =>
            schema
                .typeError("Purity percent must be a number")
                .min(0)
                .max(100)
                .required("Purity percent is required"),
    }),
    stoneName: Yup.string().notRequired(),
    dPurityId: Yup.string().when(["metal", "diamondCarat"], {
        is: (metal: string, diamondCarat: number) => metal === "Diamond" || diamondCarat > 0,
        then: () => Yup.string().required("Diamond purity is required"),
        otherwise: () => Yup.string().notRequired(),
    }),
    clarity: Yup.string().notRequired(),
    // color: Yup.string().notRequired(),
    cut: Yup.string().notRequired(),
    shape: Yup.string().notRequired(),
    silverPurity: Yup.string().notRequired(),
    quantity: Yup.number()
        .typeError("Quantity must be a number")
        .min(1, "Quantity must be at least 1")
        .required("Quantity is required"),
    hsnCode: Yup.string().trim().notRequired(),
    grossWeight: Yup.number()
        .typeError("Gross weight must be a number")
        .min(0.001, "Gross weight must be greater than zero")
        .required("Gross weight is required")
        .test(
            "equals-sum",
            "Gross weight must equal stone weight + diamond weight + net weight",
            function (value) {
                const { stoneWeight, diamondWeight, netWeight } = this.parent;
                if (value == null || stoneWeight == null || diamondWeight == null || netWeight == null) return true;
                const sum = Number(stoneWeight) + Number(diamondWeight) + Number(netWeight);
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
        )
        .when("stoneName", {
            is: (stoneName: string) => !!stoneName,
            then: (schema) => schema.required("Stone weight is required when stone is selected"),
        }),
    diamondWeight: Yup.number()
        .typeError("Diamond weight must be a number")
        .min(0, "Diamond weight cannot be negative")
        .required("Diamond weight will be calculated automatically"),
    netWeight: Yup.number()
        .typeError("Net weight must be a number")
        .min(0, "Net weight cannot be negative")
        .required("Net weight will be calculated automatically"),
    pureWeight: Yup.number().when("metal", {
        is: "Diamond",
        then: (schema) => schema.notRequired(),
        otherwise: (schema) => schema.required(),
    }),
    remarks: Yup.string(),
    stockEntryType: Yup.string().required("Stock entry type is required"),
    purchaseMakingCharge: Yup.number()
        .typeError("Purchase making charge must be a number")
        .min(0, "Purchase making charge cannot be negative")
        .notRequired(),
    purchaseMakingChargeType: Yup.string().notRequired(),
saleMakingCharge: Yup.number()
  .transform((value, originalValue) =>
    originalValue === "" || originalValue == null ? undefined : value
  )
  .typeError('Sale making charge must be a number')
  .min(0, 'Cannot be negative')
  .notRequired(),
saleMakingChargeType: Yup.string().notRequired(),
saleDiscountOnMaking: Yup.number()
  .transform((value, originalValue) =>
    originalValue === "" || originalValue == null ? undefined : value
  )
  .typeError('Sale discount must be a number')
  .min(0, 'Cannot be negative')
  .notRequired(),
saleDiscountType: Yup.string().notRequired(),
saleDiamondDiscount: Yup.number()
  .transform((value, originalValue) =>
    originalValue === "" || originalValue == null ? undefined : value
  )
  .typeError('Sale diamond discount must be a number')
  .min(0, 'Cannot be negative')
  .notRequired(),
saleDiamondDiscountType: Yup.string().notRequired(),


    shopId: Yup.number()
        .typeError("Please select a valid shop")
        .required("Please select a shop"),
    vendorId: Yup.number()
        .typeError("Please select a valid vendor")
        .nullable()
        .notRequired(),
    purchaseGoldRate: Yup.number()
        .typeError("Purchase gold rate must be a number")
        .min(0, "Purchase gold rate cannot be negative")
        .max(9999999999.99, "Purchase gold rate cannot exceed 6 digits")
        .when("metal", {
            is: "Gold",
            then: (schema) => schema.required("Purchase gold rate is required for gold"),
        }),
    purchaseDiamondRate: Yup.number()
        .typeError("Purchase diamond rate must be a number")
        .min(0, "Purchase diamond rate cannot be negative")
        .max(9999999999.99, "Purchase diamond rate cannot exceed 6 digits")
        .when(["metal", "diamondCarat"], {
            is: (metal: string, diamondCarat: number) => metal === "Diamond" || diamondCarat > 0,
            then: (schema) => schema.required("Purchase diamond rate is required"),
        }),
    purchaseStonePrice: Yup.number()
        .typeError("Purchase stone price must be a number")
        .min(0, "Purchase stone price cannot be negative")
        .max(9999999999.99, "Purchase stone price cannot exceed 6 digits")
        .when("stoneName", {
            is: (stoneName: string) => !!stoneName,
            then: (schema) => schema.required("Purchase stone price is required when stone is selected"),
        }),
    stonePrice: Yup.number() // ✅ ADD THIS BLOCK
        .typeError("Stone price must be a number")
        .min(0, "Stone price cannot be negative")
        .when("stoneName", {
            is: (stoneName: string) => !!stoneName,
            then: (schema) => schema.required("Stone sale price is required when stone is selected"),
        }),
    purchaseDate: Yup.string().required("Purchase date is required"),
});

// ========================
// Main Stock Entry Form (Add + Edit in one)
// ========================
interface StockEntryFormProps {
    stockEntry?: StockEntry;
    onSuccess: (msg: string) => void;
    onCancel: () => void;
    onRedirect?: () => void;
}

export const StockEntryForm = ({ stockEntry, onSuccess, onCancel, onRedirect }: StockEntryFormProps) => {
    const isEdit = !!stockEntry;
    // Fetch lookup data
    const { data: lookupData } = useAllLookUp();

    const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
    const { deleteImage } = useImage();
    // Individual states for each array
    const [imageToDelete, setImageToDelete] = useState<{ id: number, fileName: string } | null>(null);
    const handleDeleteClick = (img: { id: number, fileName: string }) => {
        setImageToDelete(img);
    };
    const fileInputRef = useRef<HTMLInputElement>(null);





    const { data: vendorsResponse = [], refetch: refetchVendors } = useAllVendors();
    const vendors = Array.isArray(vendorsResponse) ? vendorsResponse : [];
    const createVendorMutation = useCreateVendor();
    const [newlyCreatedVendorId, setNewlyCreatedVendorId] = useState<number | null>(null);
    const { data: categories = [], refetch: refetchCategories } = useAllCategory();
    const createCategoryMutation = useCreateCategory();
    const [newlyCreatedCategoryName, setNewlyCreatedCategoryName] = useState<string | null>(null);
    const { data: shopsResponse } = useShops();
    const { data: brands = [] } = useAllBrand();
    const { data: stockItems = [] } = useAllSockItems();
    const shops = shopsResponse?.data || [];
    // const { data: items = [] } = useAllItems();
    // const { data: tags = [] } = useAllTag();
    // const brands = STATIC_BRANDS;
    const { data: lookup } = useShopLookup();
    const { data: currentRatesResponse } = useCurrentRatePurities();
    const currentRates = currentRatesResponse || { goldPurity: [], diamondPurity: [] };

    const createMutation = useCreateStockEntry();
    const updateMutation = useUpdateStockEntry();
    const calculateSalePriceMutation = useCalculateSalePrice();
    const [salePriceData, setSalePriceData] = useState<CalculateSalePriceResponse | null>(null);

    // Tag print modal states
    const [showPrintConfirmModal, setShowPrintConfirmModal] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [itemIdForPrint, setItemIdForPrint] = useState<number | null>(null);
    const [shouldFetchTagImage, setShouldFetchTagImage] = useState(false);
    const [tagImageUrl, setTagImageUrl] = useState<string | null>(null);



    // Use the tag print hook - only fetch when shouldFetchTagImage is true
    const { data: tagImageBlob, isLoading: isLoadingTagImage } = useTagPrintItem(shouldFetchTagImage ? itemIdForPrint : null);

    // Initial values
    const initialValues = {
        itemId: stockEntry?.itemId || 0,

        metal: stockEntry?.metal || "Gold",
        brand: stockEntry?.brand || "",
        category: stockEntry?.category || "",
        itemName: stockEntry?.itemName || "",
        hsnCode: (stockEntry as any)?.hsnCode || "",
        modeOfStock: stockEntry?.modeOfStock || "",
        huid: (stockEntry as any)?.huid || "",
        showOnWebsite: stockEntry?.showOnWebsite ?? true,
        isBulkItem: stockEntry?.isBulkItem || false,
        caratOrKT: stockEntry?.caratOrKT || "",
        diamondCarat: stockEntry?.diamondCarat
            ? Number(stockEntry.diamondCarat).toFixed(3)
            : stockEntry?.diamondWeight
                ? Number(stockEntry.diamondWeight / 0.2).toFixed(3)
                : 0,

        purityPercent: stockEntry?.purityPercent ? Number(stockEntry.purityPercent) : 0,
        stoneName: stockEntry?.stoneName || "",
        dPurityId: stockEntry?.dPurityId || "",
        clarity: stockEntry?.clarity || "",
        // ✅ ADD THIS LINE
        // color: stockEntry?.color || "",
        color: stockEntry?.color ? stockEntry.color.split(",") : [],
        cut: stockEntry?.cut || "",
        shape: stockEntry?.shape || "",
        silverPurity: stockEntry?.silverPurity || "",
        quantity: stockEntry?.quantity || 1,
        grossWeight: stockEntry?.grossWeight ? Number(stockEntry.grossWeight.toFixed(3)) : 0,
        stoneWeight: stockEntry?.stoneWeight ? Number(stockEntry.stoneWeight.toFixed(3)) : 0,
        diamondWeight: stockEntry?.diamondWeight ? Number(stockEntry.diamondWeight.toFixed(3)) : 0,
        netWeight: stockEntry?.netWeight ? Number(stockEntry.netWeight.toFixed(3)) : 0,
        pureWeight: stockEntry?.pureWeight ? Number(stockEntry.pureWeight.toFixed(3)) : 0,
        remarks: stockEntry?.remarks || "",
        stockEntryType: stockEntry?.stockEntryType || "",
        purchaseMakingCharge: stockEntry?.purchaseMakingCharge || "",
        purchaseMakingChargeType: stockEntry?.purchaseMakingChargeType || "",
        saleMakingCharge: stockEntry?.saleMakingCharge || "",
        saleMakingChargeType: stockEntry?.saleMakingChargeType || "",
        saleDiscountOnMaking: stockEntry?.saleDiscountOnMaking || "",
        saleDiscountType: stockEntry?.saleDiscountType || "",
        saleDiamondDiscount: stockEntry?.saleDiamondDiscount || "",
        saleDiamondDiscountType: stockEntry?.saleDiamondDiscountType || "",
        shopId: stockEntry?.shopId || "",
        vendorId: stockEntry?.vendorId || null,
        pricingModel: stockEntry?.pricingModel || "",
        purchaseGoldRate: stockEntry?.purchaseGoldRate || 0,
        purchaseDiamondRate: stockEntry?.purchaseDiamondRate || 0,
        salePrice: stockEntry?.salePrice,
        purchaseStonePrice: stockEntry?.purchaseStonePrice || 0,
        stonePrice: stockEntry?.stonePrice ?? 0,
        purchaseDate: new Date().toISOString().split("T")[0], // Not stored in StockEntry, use current date
    };
    const token = localStorage.getItem('token');


    const [imageBlobs, setImageBlobs] = useState<Record<number, string>>({});  // ← ADD
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);

    const itemId = stockEntry?.itemId ?? null;
    const { data: existingImages = [] } = useItemImages(itemId);
    const uploadMutation = useUploadStockImage();
    // ✅ Load all existing image blobs with auth
    useEffect(() => {
        let isMounted = true;

        const loadImages = async () => {
            if (!itemId || !token || existingImages.length === 0) return;

            const newBlobs: Record<number, string> = { ...imageBlobs };

            for (const img of existingImages) {
                if (imageBlobs[img.id]) continue; // Already loaded

                try {
                    const blobUrl = await getImageBlobUrl(itemId, img.fileName);
                    newBlobs[img.id] = blobUrl;
                } catch (err) {
                    console.error(`Failed to load ${img.fileName}:`, err);
                }
            }

            if (isMounted) {
                setImageBlobs(newBlobs);
            }
        };

        loadImages();

        return () => {
            isMounted = false;
            // Cleanup URLs
            Object.values(imageBlobs).forEach(URL.revokeObjectURL);
        };
    }, [existingImages, itemId, token]);
    // ✅ Confirm Delete Handler (Updated with Reload)
    const confirmDeleteImage = async () => {
        if (!imageToDelete || !itemId) return;

        try {
            await deleteImage.mutateAsync({ itemId, id: imageToDelete.id });

            // Remove from local state (optional since we are reloading, but good practice)
            const newBlobs = { ...imageBlobs };
            delete newBlobs[imageToDelete.id];
            setImageBlobs(newBlobs);

            toast.success("Image deleted successfully");
            setImageToDelete(null);

            // ✅ RELOAD THE PAGE
            window.location.reload();

        } catch (error) {
            toast.error("Failed to delete image");
        }
    };








    // 3. UPDATED HANDLER: File Change
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length === 0) return;

        setSelectedFiles(files);

        // Clean old previews
        previewUrls.forEach((u) => URL.revokeObjectURL(u));

        // Generate new previews
        const urls = files.map((f) => URL.createObjectURL(f));
        setPreviewUrls(urls);

        // ✅ FIX: Reset input value so same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // 4. UPDATED HANDLER: Upload (Kept your logic, added cleanup)
    const handleUpload = async () => {
        if (!itemId || selectedFiles.length === 0) return;

        try {
            await Promise.all(
                selectedFiles.map((file) => uploadMutation.mutateAsync({ itemId, file }))
            );
            toast.success("Images uploaded successfully");

            // Cleanup
            setSelectedFiles([]);
            previewUrls.forEach((u) => URL.revokeObjectURL(u));
            setPreviewUrls([]);

            // Double check input is clear
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        } catch (error) {
            // Error handled by mutation usually, or add toast here
        }
    };






    const handlePrintTag = () => {
        if (!tagImageUrl) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Print Tag</title>
        <style>
          @page {
            margin: 0;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
          }
          img {
            display: block;
            margin: 0;
            padding: 0;
          }
        </style>
      </head>
      <body>
        <img src="${tagImageUrl}" alt="Tag" onload="window.print(); setTimeout(function(){ window.close(); }, 500);" />
      </body>
    </html>
  `);

        printWindow.document.close();
    };




    const getStockEntryType = useCallback((mode: string) => {
        const inTypes = ["Opening", "PurchaseIn", "TransferIn", "ChallanIn", "Return"];
        return inTypes.includes(mode) ? "StockIn" : "StockOut";
    }, []);
    const handleTotalSalePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!salePriceData) return;

        const raw = e.target.value;
        const cleaned = raw.replace(/[^0-9]/g, ""); // keep digits only

        setSalePriceData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                totalSalePrice: cleaned === "" ? 0 : Number(cleaned),
            };
        });
    };




    const handleSubmit = async (values: any, { setSubmitting }: any) => {
        console.log(values);
        let payload: CreateStockEntryData | UpdateStockEntryData = {
            itemId: values.itemId || 0,
            hsnCode: values.hsnCode?.trim() || "",
            metal: values.metal,
            category: values.category,
            huid: values.huid?.trim() || "",
            showOnWebsite: values.showOnWebsite,
            isBulkItem: values.isBulkItem || false,
            brand: values.brand,
            itemName: values.itemName,
            modeOfStock: values.modeOfStock,
            stockEntryType: getStockEntryType(values.modeOfStock),
            quantity: Number(values.quantity),
            remarks: values.remarks,
            shopId: Number(values.shopId),
            vendorId: values.vendorId ? Number(values.vendorId) : undefined,
            purchaseMakingCharge: (values.purchaseMakingCharge !== "" && values.purchaseMakingCharge !== null && values.purchaseMakingCharge !== undefined) ? Number(values.purchaseMakingCharge) : 0,
            purchaseMakingChargeType: values.purchaseMakingChargeType || "",
            saleMakingCharge: (values.saleMakingCharge !== "" && values.saleMakingCharge !== null && values.saleMakingCharge !== undefined) ? Number(values.saleMakingCharge) : 0,
            saleMakingChargeType: values.saleMakingChargeType || "",
            saleDiscountOnMaking: (values.saleDiscountOnMaking !== "" && values.saleDiscountOnMaking !== null && values.saleDiscountOnMaking !== undefined) ? Number(values.saleDiscountOnMaking) : 0,
            saleDiscountType: values.saleDiscountType || "",
            saleDiamondDiscount: (values.saleDiamondDiscount !== "" && values.saleDiamondDiscount !== null && values.saleDiamondDiscount !== undefined) ? Number(values.saleDiamondDiscount) : 0,
            saleDiamondDiscountType: values.saleDiamondDiscountType || "",



            stoneName: values.stoneName || "",
            cut: values.cut || "",
            shape: values.shape || "",
            pricingModel: values.pricingModel || "",
            purchaseGoldRate: Number(values.purchaseGoldRate || 0),
            purchaseDiamondRate: Number(values.purchaseDiamondRate || 0),
            purchaseStonePrice: Number(values.purchaseStonePrice || 0),
            caratOrKT: values.caratOrKT,
            purityPercent: values.purityPercent.toString(),
            grossWeight: Number((values.grossWeight || 0).toFixed(3)),
            stoneWeight: Number((values.stoneWeight || 0).toFixed(3)),
            netWeight: Number((values.netWeight || 0).toFixed(3)),
            pureWeight: Number((values.pureWeight || 0).toFixed(3)),
            diamondWeight: Number((values.diamondWeight || 0).toFixed(3)),
            dPurityId: values.dPurityId || "",
            clarity: values.clarity || "",
            stonePrice: Number(values.stonePrice) || 0,
            diamondCarat: Number(values.diamondCarat || 0),
            // color: values.color || "",
            color: values.color?.length ? values.color.join(",") : "",
            salePrice: salePriceData?.totalSalePrice ? Number(salePriceData.totalSalePrice.toFixed(2)) : 0,
        };


        try {
            if (isEdit) {
                console.log("updated data", payload)
                await updateMutation.mutateAsync({ id: stockEntry!.id, data: { ...payload, id: stockEntry!.id } });
                onSuccess("Stock entry updated successfully!");
            } else {
                const response = await createMutation.mutateAsync(payload as CreateStockEntryData);
                toast.success("Stock entry created successfully!");

                // Check if response has itemId and show confirmation modal
                if (response?.itemId) {
                    setItemIdForPrint(response.itemId);
                    setShouldFetchTagImage(false); // Don't fetch yet, wait for user confirmation
                    setShowPrintConfirmModal(true);
                    // Don't redirect here - wait for user to close image modal or cancel
                } else {
                    // No confirmation dialog needed, redirect immediately (without showing toast again)
                    if (onRedirect) {
                        onRedirect();
                    } else {
                        onSuccess("Stock entry created successfully!");
                    }
                }
            }
        } catch (err: any) {
            console.error("Stock entry save error:", err);
            toast.error(err?.response?.data?.message || "Failed to save stock entry");
        } finally {
            setSubmitting(false);
        }
    };



    // Handle tag image blob when fetched
    useEffect(() => {
        if (tagImageBlob) {
            const imageUrl = URL.createObjectURL(tagImageBlob);
            setTagImageUrl(imageUrl);
            setShowImageModal(true);
            setShowPrintConfirmModal(false);
        }
    }, [tagImageBlob]);

    // Cleanup image URL when modal closes
    useEffect(() => {
        return () => {
            if (tagImageUrl) {
                URL.revokeObjectURL(tagImageUrl);
            }
        };
    }, [tagImageUrl]);

    // Handle print confirmation
    const handlePrintConfirm = () => {
        if (itemIdForPrint) {
            setShouldFetchTagImage(true); // Enable the query to fetch
        }
    };

    // Handle print cancel
    const handlePrintCancel = () => {
        setShowPrintConfirmModal(false);
        setItemIdForPrint(null);
        setShouldFetchTagImage(false);
        // Redirect after user clicks "No" on confirmation dialog
        if (onRedirect) {
            onRedirect();
        } else {
            onSuccess("Stock entry created successfully!");
        }
    };

    // Handle image modal close
    const handleImageModalClose = () => {
        setShowImageModal(false);
        if (tagImageUrl) {
            URL.revokeObjectURL(tagImageUrl);
            setTagImageUrl(null);
        }
        setItemIdForPrint(null);
        setShouldFetchTagImage(false);
        // Redirect after user closes the image modal
        if (onRedirect) {
            onRedirect();
        } else {
            onSuccess("Stock entry created successfully!");
        }
    };

    const handleVendorSubmit = async (
        values: any,
        { resetForm }: any
    ) => {
        const payload = {
            name: values.name.trim(),
            phone: values.phone?.trim() || undefined,
            email: values.email?.trim() || null,  // ✅ sends null if empty
            gstin: values.gstin?.trim() || undefined,
            pan: values.pan?.trim() || undefined,
            adharNo: values.adharNo?.trim() || undefined,
            address: values.address?.trim() || undefined,
            state: values.state?.trim() || undefined,
            city: values.city?.trim() || undefined,
            pinCode: values.pinCode?.trim() || undefined,
            vendorType: values.vendorType?.trim() || undefined,
            isActive: values.isActive,
        };

        createVendorMutation.mutate(payload, {
            onSuccess: (data) => {
                toast.success("Vendor created successfully");
                setVendorDialogOpen(false);
                resetForm();
                refetchVendors();
                if (data?.id) {
                    setNewlyCreatedVendorId(data.id);
                }
            },
            onError: () => toast.error("Failed to create vendor"),
        });
    };

    const handleCategorySubmit = async (
        values: any,
        { resetForm }: any
    ) => {
        const payload = {
            categoryName: values.categoryName.trim(),
            description: values.description?.trim() || "",
        };

        createCategoryMutation.mutate(payload, {
            onSuccess: (data) => {
                toast.success("Category created successfully");
                setCategoryDialogOpen(false);
                resetForm();
                refetchCategories();

                if (data?.categoryName) {
                    setNewlyCreatedCategoryName(data.categoryName);
                }
            },
            onError: () => toast.error("Failed to create category"),
        });
    };

    return (
        <>
            <Formik
                enableReinitialize
                initialValues={initialValues}
                validationSchema={StockEntrySchema}
                onSubmit={handleSubmit}
            >
                {({ values, errors, touched, setFieldValue, isSubmitting }) => {
                    // Fetch current rate for Gold based on caratOrKT
                    // Fetch current rate for Gold based on caratOrKT
                    const { data: goldCurrentRate } = useCurrentRate(values.caratOrKT);

                    // Fetch current rate for Diamond based on dPurityId  
                    const { data: diamondCurrentRate } = useCurrentRate(values.dPurityId);


                    // Auto-select newly created vendor when vendors list updates
                    useEffect(() => {
                        if (newlyCreatedVendorId && vendors.some(v => v.id === newlyCreatedVendorId)) {
                            setFieldValue("vendorId", newlyCreatedVendorId);
                            setNewlyCreatedVendorId(null);
                        }
                    }, [vendors, newlyCreatedVendorId, setFieldValue]);

                    // Auto-select newly created category when categories list updates
                    useEffect(() => {
                        if (
                            newlyCreatedCategoryName &&
                            categories.some((c) => c.categoryName === newlyCreatedCategoryName)
                        ) {
                            setFieldValue("category", newlyCreatedCategoryName);
                            setNewlyCreatedCategoryName(null);
                        }
                    }, [categories, newlyCreatedCategoryName, setFieldValue]);

                    const clearItemIfNeeded = useCallback(() => {
                        if (!isEdit) {
                            setFieldValue("itemName", "");
                            setFieldValue("caratOrKT", "");
                        }
                    }, [isEdit, setFieldValue]);

                    // Clear item if metal or category changes (for new entries)
                    useEffect(() => {
                        clearItemIfNeeded();
                    }, [values.metal, values.category, clearItemIfNeeded]);

                    // Auto-set stock entry type based on mode
                    useEffect(() => {
                        setFieldValue("stockEntryType", getStockEntryType(values.modeOfStock));
                    }, [values.modeOfStock, setFieldValue, getStockEntryType]);

                    // Auto-calculate diamondWeight from diamondCarat
                    useEffect(() => {
                        const ct = Number(values.diamondCarat) || 0;
                        setFieldValue("diamondWeight", caratToGram(ct));
                    }, [values.diamondCarat, setFieldValue]);

                    // Auto-calculate netWeight = grossWeight - (stoneWeight + diamondWeight)
                    useEffect(() => {
                        const net = (values.grossWeight || 0) - (values.stoneWeight || 0) - (values.diamondWeight || 0);
                        setFieldValue("netWeight", Number(Math.max(0, net).toFixed(3))); // Ensure non-negative and 3 decimals
                    }, [values.grossWeight, values.stoneWeight, values.diamondWeight, setFieldValue]);

                    // Auto-calculate pureWeight
                    // Formula: Pure Weight = (Gold Purity Percent * Net Weight) / 100
                    useEffect(() => {
                        if (values.metal === "Diamond") {
                            setFieldValue("pureWeight", values.diamondWeight);
                        } else {
                            const pure = ((values.purityPercent || 0) * (values.netWeight || 0)) / 100;
                            setFieldValue("pureWeight", Number(pure.toFixed(3)));
                        }
                    }, [values.netWeight, values.purityPercent, values.metal, values.diamondWeight, setFieldValue]);

                    // Clear sale price data when relevant fields change
                    useEffect(() => {
                        setSalePriceData(null);
                    }, [
                        values.grossWeight,
                        values.netWeight,
                        values.diamondWeight,
                        values.diamondCarat,
                        values.caratOrKT,
                        values.dPurityId,
                        values.stoneName,
                        values.metal,
                    ]);

                    const handleMetalChange = (v: string) => {
                        setFieldValue("metal", v);
                        // Clear conflicting fields based on metal
                        setFieldValue("purchaseGoldRate", 0);
                        setFieldValue("stoneName", "");
                        setFieldValue("stonePrice", 0);
                        setFieldValue("purchaseStonePrice", 0);
                        // setFieldValue("silverPurity", "");
                        // If metal is "Others", hide Gold/Stone/Diamond details and clear their fields
                        if (v === "Others") {
                            setFieldValue("caratOrKT", "");
                            setFieldValue("purityPercent", 0);
                            setFieldValue("silverPurity", "");
                            setFieldValue("diamondCarat", 0);
                            setFieldValue("dPurityId", "");
                            setFieldValue("purchaseDiamondRate", 0);
                            setFieldValue("clarity", "");
                            setFieldValue("color", []);
                            setFieldValue("cut", "");
                            setFieldValue("shape", "");
                            setFieldValue("stoneWeight", 0);
                            clearItemIfNeeded();
                            return;
                        }
                        if (v === "Diamond") {
                            setFieldValue("purityPercent", 0);
                        } else if (v === "Gold") {
                            if (!isEdit && !values.caratOrKT) {
                                setFieldValue("caratOrKT", "24K");
                                setFieldValue("purityPercent", GOLD_PURITY_MAP["24K"]);
                            }
                        } else if (v === "Silver") {
                            if (!isEdit && !values.silverPurity) {
                                setFieldValue("silverPurity", "999");
                                setFieldValue("caratOrKT", "999");
                                setFieldValue("purityPercent", SILVER_PURITY_MAP["999"]);
                            }
                        } else if (v === "Platinum") {
                            setFieldValue("purityPercent", 99.9);
                            setFieldValue("caratOrKT", "999");
                        } else {
                            setFieldValue("purityPercent", 0);
                        }
                        clearItemIfNeeded();
                    };

                    const handleGoldCaratChange = (v: string) => {
                        setFieldValue("caratOrKT", v);
                    };


                    const handleDiamondPurityChange = (name: string) => {
                        setFieldValue("dPurityId", name);
                    };

                    const handleStoneChange = (name: string) => {
                        setFieldValue("stoneName", name);
                        if (!name) {
                            setFieldValue("purchaseStonePrice", 0);
                            setFieldValue("stonePrice", 0);
                            setFieldValue("stoneWeight", 0);
                        }
                    };

                   const handleCalculateSalePrice = async () => {
    // Validate required fields
    if (!values.grossWeight || values.grossWeight <= 0) {
        toast.error("Gross weight is required to calculate sale price");
        return;
    }

    if (values.metal !== "Diamond" && !values.caratOrKT) {
        toast.error("Gold purity is required to calculate sale price");
        return;
    }

    if (values.metal === "Diamond" && !values.dPurityId) {
        toast.error("Diamond purity is required to calculate sale price");
        return;
    }

    try {
        const payload = {
            gPurityId: values.caratOrKT || "",
            netWeight: values.netWeight || 0,
            dPurityId: values.dPurityId || "",
            diamondWeight: values.diamondWeight || 0,
            diamondCarat: Number(values.diamondCarat || 0),
            stoneName: values.stoneName || "",
            grossWeight: values.grossWeight || 0,
        };

        const result = await calculateSalePriceMutation.mutateAsync(payload);
        setSalePriceData(result);
        toast.success("Sale price calculated successfully");
    } catch (err: any) {
        console.error("Sale price calculation error:", err);
        toast.error(
            err?.response?.data?.message || "Failed to calculate sale price"
        );
    }
};
                    // Auto-fetch rate and purity when caratOrKT changes
                    //                     useEffect(() => {
                    //     console.log("Current values:", {
                    //         caratOrKT: values.caratOrKT,
                    //         purityPercent: values.purityPercent,
                    //         purchaseGoldRate: values.purchaseGoldRate,
                    //         metal: values.metal
                    //     });
                    // }, [values.caratOrKT, values.purityPercent, values.purchaseGoldRate, values.metal]);

                    useEffect(() => {
                        // GOLD
                        if ((values.metal === "Gold" || values.metal === "Diamond") && values.caratOrKT && goldCurrentRate) {
                            setFieldValue("purchaseGoldRate", goldCurrentRate.rate || 0);
                            setFieldValue("purityPercent", Number(goldCurrentRate.purity) || 0); // Convert string to number
                        }

                        // DIAMOND
                        if (values.dPurityId && diamondCurrentRate) {
                            setFieldValue("purchaseDiamondRate", diamondCurrentRate.rate || 0);
                        }
                    }, [
                        values.metal,
                        values.caratOrKT,
                        values.dPurityId,
                        goldCurrentRate,
                        diamondCurrentRate,
                        setFieldValue,
                    ]);




                    return (
                        <div className="max-w-[1400px] mx-auto">
                            <Form className={cn("space-y-4 text-sm", "pb-[calc(9rem+env(safe-area-inset-bottom))] sm:pb-0")}>
                                {/* Section 1: Basic Information */}
                                <div className="bg-white p-4 rounded-md border space-y-3">
                                    <div className="flex justify-between items-center">
                                        <div className="">
                                                                            <h2 className="text-sm font-semibold text-gray-700">Basic Information</h2>
                                                                            </div>
                                                                            <div className="flex justify-end gap-6">
                                                                             <div className="space-y-2 flex flex-col justify-center mt-2 p-2">
                                            <Label className="text-xs text-muted-foreground">Bulk Item</Label>
                                            <div className="flex items-center gap-2 mt-1 h-10">
                                                <Switch
                                                    checked={values.isBulkItem}
                                                    onCheckedChange={(checked) => setFieldValue("isBulkItem", checked)}
                                                />
                                                <span className="text-sm text-gray-600 font-medium">
                                                    {values.isBulkItem ? "Yes" : "No"}
                                                </span>
                                            </div>
                                        </div>

                                         {/* NEW: Show on Website Toggle */}
                                        <div className="space-y-2 flex flex-col justify-center mt-2 p-2">
                                            <Label className="text-xs text-muted-foreground">Show on Website</Label>
                                            <div className="flex items-center gap-2 mt-1 h-10">
                                                <Switch
                                                    checked={values.showOnWebsite}
                                                    onCheckedChange={(checked) => setFieldValue("showOnWebsite", checked)}
                                                />
                                                <span className="text-sm text-gray-600 font-medium">
                                                    {values.showOnWebsite ? "Yes" : "No"}
                                                </span>
                                            </div>
                                        </div>
                                        </div>

                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">
                                                Shop *
                                            </Label>
                                            <SearchableSelect
                                                value={values.shopId}
                                                onChange={(v) => setFieldValue("shopId", v ? Number(v) : "")}
                                                placeholder="Select shop"
                                                options={shops.map((s) => ({
                                                    value: s.id,
                                                    label: s.name,
                                                }))}
                                            />
                                            {touched.shopId && errors.shopId && (
                                                <p className="text-sm text-red-500">{errors.shopId}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Mode of Stock *</Label>
                                            <Select
                                                value={values.modeOfStock}
                                                onValueChange={(v) => setFieldValue("modeOfStock", v)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select mode" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Opening">Opening</SelectItem>
                                                    <SelectItem value="PurchaseIn">PurchaseIn</SelectItem>
                                                    <SelectItem value="TransferIn">TransferIn</SelectItem>
                                                    <SelectItem value="ChallanIn">ChallanIn</SelectItem>
                                                    <SelectItem value="Return">Return</SelectItem>
                                                    <SelectItem value="Sale">Sale</SelectItem>
                                                    {/* <SelectItem value="TransferOut">TransferOut</SelectItem>
                                                    <SelectItem value="ChallanOut">ChallanOut</SelectItem> */}
                                                </SelectContent>
                                            </Select>
                                            {touched.modeOfStock && errors.modeOfStock && (
                                                <p className="text-sm text-red-500">{errors.modeOfStock}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Metal *</Label>
                                            <Select value={values.metal} onValueChange={handleMetalChange}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select metal" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {lookupData?.metalTypes?.map((m: string) => (
                                                        <SelectItem key={m} value={m}>
                                                            {m}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {touched.metal && errors.metal && (
                                                <p className="text-sm text-red-500">{errors.metal}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Brand</Label>
                                            <SearchableSelect
                                                value={values.brand}
                                                onChange={(v) => setFieldValue("brand", v || "")}
                                                placeholder="Select or type brand"
                                                options={brands
                                                    .filter((b: string) => b && b.trim() !== '')  // ✅ Remove empty strings
                                                    .map((b: string) => ({
                                                        value: b,
                                                        label: b,
                                                    }))
                                                }

                                                allowCustomValue={true}
                                            />
                                            {touched.brand && errors.brand && (
                                                <p className="text-sm text-red-500">{errors.brand}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Vendor</Label>
                                            <div className="flex gap-2">
                                                <div className="flex-1">
                                                    <SearchableSelect
                                                        value={values.vendorId ?? undefined}
                                                        onChange={(v) => setFieldValue("vendorId", v ? Number(v) : null)}
                                                        placeholder="Select vendor"
                                                        options={vendors.map((v) => ({
                                                            value: v.id,
                                                            label: v.name,
                                                        }))}
                                                    />
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => setVendorDialogOpen(true)}
                                                    className="shrink-0"
                                                    title="Add new vendor"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            {touched.vendorId && errors.vendorId && (
                                                <p className="text-sm text-red-500">{errors.vendorId}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Category *</Label>
                                            <div className="flex gap-2">
                                                <div className="flex-1">
                                                    <SearchableSelect
                                                        value={values.category}
                                                        onChange={(v) => setFieldValue("category", v)}
                                                        placeholder="Select category"
                                                        options={categories.map((c: any) => ({
                                                            value: c.categoryName,
                                                            label: c.categoryName,
                                                        }))}
                                                    />
                                                </div>

                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => setCategoryDialogOpen(true)}
                                                    className="shrink-0"
                                                    title="Add new category"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            {touched.category && errors.category && (
                                                <p className="text-sm text-red-500">{errors.category}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Item Name *</Label>
                                            <SearchableSelect
                                                value={values.itemName}
                                                onChange={(v) => setFieldValue("itemName", v || "")}
                                                placeholder="item name..."
                                                options={stockItems.map((item: any) => ({
                                                    value: item,
                                                    label: item,
                                                }))}

                                                allowCustomValue={true}
                                            />
                                            {touched.itemName && errors.itemName && (
                                                <p className="text-sm text-red-500">{errors.itemName}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Quantity *</Label>
                                            <Field placeholder="Enter quantity" as={Input} type="number" name="quantity" />
                                            {touched.quantity && errors.quantity && (
                                                <p className="text-sm text-red-500">{errors.quantity}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">HSN Code</Label>
                                            <Field placeholder="Enter HSN code" as={Input} name="hsnCode" />
                                            {touched.hsnCode && errors.hsnCode && (
                                                <p className="text-sm text-red-500">{errors.hsnCode as any}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">HUID Code</Label>
                                            <Field placeholder="Enter Huid code" as={Input} name="huid" />
                                            {touched.huid && errors.huid && (  /* ✅ Change touched.hsnCode to touched.huid */
                                                <p className="text-sm text-red-500">{errors.huid as any}</p>
                                            )}
                                        </div>

                                       
                                    </div>
                                </div>

                                {/* Section 2: Metal-Specific Details */}

                                {(values.metal && values.metal !== "Others") && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-white p-4 rounded-md border space-y-3">
                                            {values.metal === "Diamond" ? (
                                                <h2 className="text-sm font-semibold text-gray-700">Gold Details</h2>
                                            ) : (
                                                <h2 className="text-sm font-semibold text-gray-700">{values.metal} Details</h2>
                                            )
                                            }
                                            {(values.metal === "Gold" || values.metal === "Diamond") && (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div className="space-y-2">
                                                        <Label className="text-xs text-muted-foreground">Gold Purity (KT) *</Label>
                                                        <Select value={String(values.caratOrKT || "")} onValueChange={handleGoldCaratChange}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select gold purity" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {currentRates.goldPurity?.map((item: string) => (
                                                                    <SelectItem key={item} value={item}>
                                                                        {item}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {touched.caratOrKT && errors.caratOrKT && (
                                                            <p className="text-sm text-red-500">{errors.caratOrKT}</p>
                                                        )}
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs text-muted-foreground">Purchase Gold Rate *</Label>
                                                        <Input
                                                            type="text"
                                                            placeholder="₹ per gram"
                                                            value={values.purchaseGoldRate === 0 ? "" : values.purchaseGoldRate.toString()}
                                                            onChange={(e) => {
                                                                let input = e.target.value.replace(/[^0-9.]/g, "");
                                                                const parts = input.split(".");
                                                                if (parts.length > 2) return; // Prevent multiple decimals

                                                                let integer = parts[0] || "";
                                                                let decimal = parts[1] !== undefined ? parts[1] : null;

                                                                integer = integer.slice(0, 10);
                                                                if (decimal !== null) decimal = decimal.slice(0, 2);

                                                                // Construct string exactly as user types it
                                                                const newInput = decimal !== null ? `${integer}.${decimal}` : integer;

                                                                // Save as STRING in formik so the trailing decimal isn't lost
                                                                setFieldValue("purchaseGoldRate", newInput);
                                                            }}
                                                            onBlur={(e) => {
                                                                const val = e.target.value === "" ? 0 : Number(parseFloat(e.target.value).toFixed(2));
                                                                setFieldValue("purchaseGoldRate", Math.max(0, val)); // Converts back to number on blur
                                                            }}
                                                        />
                                                        {touched.purchaseGoldRate && errors.purchaseGoldRate && (
                                                            <p className="text-sm text-red-500">{errors.purchaseGoldRate}</p>
                                                        )}
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs text-muted-foreground">Purity Percent *</Label>
                                                        <div className="text-sm font-semibold text-blue-600 leading-tight">
                                                            {values.purityPercent}%
                                                        </div>
                                                        {touched.purityPercent && errors.purityPercent && (
                                                            <p className="text-sm text-red-500">{errors.purityPercent}</p>
                                                        )}
                                                    </div>
                                                </div>

                                            )}
                                            {values.metal && values.metal !== "Diamond" && (
                                                <>
                                                    {values.metal === "Silver" && (
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                            <div className="space-y-2">
                                                                <Label className="text-xs text-muted-foreground">Silver Purity *</Label>
                                                                <Select
                                                                    value={values.caratOrKT}
                                                                    onValueChange={(v) => {
                                                                        setFieldValue("caratOrKT", v);
                                                                        setFieldValue("silverPurity", v);
                                                                        setFieldValue("purityPercent", SILVER_PURITY_MAP[v] || 0);
                                                                    }}
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Select silver purity" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {lookup?.silverPurity?.map((item: string) => (
                                                                            <SelectItem key={item} value={item}>
                                                                                {item}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                {touched.silverPurity && errors.silverPurity && (
                                                                    <p className="text-sm text-red-500">{errors.silverPurity}</p>
                                                                )}
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs text-muted-foreground">Purity Percent *</Label>
                                                                <div className="text-sm font-semibold text-blue-600 leading-tight">

                                                                    {values.purityPercent}%
                                                                </div>
                                                                {touched.purityPercent && errors.purityPercent && (
                                                                    <p className="text-sm text-red-500">{errors.purityPercent}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {values.metal === "Platinum" && (
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                            <div className="space-y-2">
                                                                <Label className="text-xs text-muted-foreground">Purity Percent *</Label>
                                                                <div className="text-sm font-semibold text-blue-600 leading-tight">

                                                                    {values.purityPercent}%
                                                                </div>
                                                                {touched.purityPercent && errors.purityPercent && (
                                                                    <p className="text-sm text-red-500">{errors.purityPercent}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        {/* Stone Details */}
                                        <div className="bg-white p-4 rounded-md border space-y-3">
                                            <h2 className="text-sm font-semibold text-gray-700">
                                                Stone Details
                                            </h2>

                                            {/* ✅ Changed to grid-cols-3 */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                                                {/* 1. Stone Select */}
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Stone</Label>
                                                    <Select value={values.stoneName} onValueChange={handleStoneChange}>
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue placeholder="Select stone" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {lookup?.stoneTypes?.map((s: string) => (
                                                                <SelectItem key={s} value={s}>
                                                                    {s}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* 2. ✅ NEW: Sale Stone Price (stonePrice) */}
                                                <div className="space-y-2">
                                                    <Label className="text-xs text-muted-foreground">Stone Sale Price {values.stoneName ? "*" : ""}</Label>
                                                    <Input
                                                        type="text"
                                                        placeholder="Stone price"
                                                        value={values.stonePrice === 0 ? "" : values.stonePrice.toString()}
                                                        onChange={(e) => {
                                                            let input = e.target.value.replace(/[^0-9.]/g, "");
                                                            const parts = input.split(".");
                                                            if (parts.length > 2) return;
                                                            let integer = parts[0] || "";
                                                            let decimal = parts[1] || "";
                                                            integer = integer.slice(0, 10);
                                                            decimal = decimal.slice(0, 2);
                                                            const newInput = integer + (decimal ? "." + decimal : "");
                                                            const val = newInput === "" ? 0 : Number(newInput);
                                                            setFieldValue("stonePrice", val);
                                                        }}
                                                        onBlur={(e) => {
                                                            const val = e.target.value === "" ? 0 : Number(parseFloat(e.target.value).toFixed(2));
                                                            setFieldValue("stonePrice", Math.max(0, val));
                                                        }}
                                                    />
                                                    {touched.stonePrice && errors.stonePrice && (
                                                        <p className="text-sm text-red-500">{errors.stonePrice as string}</p>
                                                    )}
                                                </div>

                                                {/* 3. Purchase Stone Price */}
                                                <div className="space-y-2">
                                                    <Label className="text-xs text-muted-foreground">Purchase Stone Price {values.stoneName ? "*" : ""}</Label>
                                                    <Input
                                                        type="text"
                                                        placeholder="Stone purchase price"
                                                        value={values.purchaseStonePrice === 0 ? "" : values.purchaseStonePrice.toString()}
                                                        onChange={(e) => {
                                                            let input = e.target.value.replace(/[^0-9.]/g, "");
                                                            const parts = input.split(".");
                                                            if (parts.length > 2) return;
                                                            let integer = parts[0] || "";
                                                            let decimal = parts[1] || "";
                                                            integer = integer.slice(0, 10);
                                                            decimal = decimal.slice(0, 2);
                                                            const newInput = integer + (decimal ? "." + decimal : "");
                                                            const val = newInput === "" ? 0 : Number(newInput);
                                                            setFieldValue("purchaseStonePrice", val);
                                                        }}
                                                        onBlur={(e) => {
                                                            const val = e.target.value === "" ? 0 : Number(parseFloat(e.target.value).toFixed(2));
                                                            setFieldValue("purchaseStonePrice", Math.max(0, val));
                                                        }}
                                                    />
                                                    {touched.purchaseStonePrice && errors.purchaseStonePrice && (
                                                        <p className="text-sm text-red-500">{errors.purchaseStonePrice as string}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                )}

                                {/* Section 3: Diamond Details */}
                                {values.metal && values.metal !== "Others" && (
                                    <div className="bg-white p-4 rounded-md border space-y-3">
                                        <h2 className="text-sm font-semibold text-gray-700">Diamond Details</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                                            <div className="space-y-2">
                                                <Label className="text-xs text-muted-foreground">Diamond Purity ID</Label>
                                                <Select value={values.dPurityId} onValueChange={handleDiamondPurityChange}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select diamond purity" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {currentRates.diamondPurity?.map((item: string) => (
                                                            <SelectItem key={item} value={item}>
                                                                {item}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {touched.dPurityId && errors.dPurityId && (
                                                    <p className="text-sm text-red-500">{errors.dPurityId}</p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs text-muted-foreground">Purchase Rate </Label>
                                                <Input
                                                    type="text"
                                                    placeholder="₹ per carat"
                                                    value={values.purchaseDiamondRate === 0 ? "" : values.purchaseDiamondRate.toString()}
                                                    onChange={(e) => {
                                                        let input = e.target.value.replace(/[^0-9.]/g, "");
                                                        const parts = input.split(".");
                                                        if (parts.length > 2) return;
                                                        let integer = parts[0] || "";
                                                        let decimal = parts[1] || "";
                                                        integer = integer.slice(0, 10);
                                                        decimal = decimal.slice(0, 2);
                                                        const newInput = integer + (decimal ? "." + decimal : "");
                                                        const val = newInput === "" ? 0 : Number(newInput);
                                                        setFieldValue("purchaseDiamondRate", val);
                                                    }}
                                                    onBlur={(e) => {
                                                        const val = e.target.value === "" ? 0 : Number(parseFloat(e.target.value).toFixed(2));
                                                        setFieldValue("purchaseDiamondRate", Math.max(0, val));
                                                    }}
                                                />
                                                {touched.purchaseDiamondRate && errors.purchaseDiamondRate && (
                                                    <p className="text-sm text-red-500">{errors.purchaseDiamondRate}</p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs text-muted-foreground">Diamond Carat</Label>
                                                <Input
                                                    type="number"
                                                    step="0.001"
                                                    placeholder="e.g. 0.250"
                                                    value={values.diamondCarat === 0 ? "" : values.diamondCarat}
                                                    onChange={(e) => {
                                                        // ✅ Keep string state active
                                                        setFieldValue("diamondCarat", e.target.value);
                                                    }}
                                                    onBlur={(e) => {
                                                        const raw = e.target.value;
                                                        const num = raw === "" ? 0 : Number(raw);
                                                        const fixed = Number.isNaN(num) ? 0 : Number(num.toFixed(3));
                                                        setFieldValue("diamondCarat", fixed);
                                                        if (fixed === 0) {
                                                            e.target.value = "";
                                                        } else {
                                                            e.target.value = fixed.toFixed(3);
                                                        }
                                                    }}
                                                />
                                                {touched.diamondCarat && errors.diamondCarat && (
                                                    <p className="text-sm text-red-500">{errors.diamondCarat}</p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-xs text-muted-foreground">Clarity</Label>
                                                <Select value={values.clarity} onValueChange={(v) => setFieldValue("clarity", v)}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select clarity" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {["IF", "VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2", "I1", "I2"].map((c) => (
                                                            <SelectItem key={c} value={c}>
                                                                {c}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {touched.clarity && errors.clarity && (
                                                    <p className="text-sm text-red-500">{errors.clarity}</p>
                                                )}
                                            </div>
                                            {/* <div className="space-y-2">
                                                <Label className="text-xs text-muted-foreground">Color</Label>
                                                <Select value={values.color} onValueChange={(v) => setFieldValue("color", v)}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select color" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {["D", "E", "F", "G"].map((c) => (
                                                            <SelectItem key={c} value={c}>
                                                                {c}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {touched.color && errors.color && (
                                                    <p className="text-sm text-red-500">{errors.color}</p>
                                                )}
                                            </div> */}
                                            <div className="space-y-2">
                                                <Label className="text-xs text-muted-foreground">Color</Label>

                                                <MultiSelect
                                                    value={values.color}
                                                    onValueChange={(v) => setFieldValue("color", v)}
                                                >
                                                    <MultiSelectTrigger placeholder="Select color" />

                                                    <MultiSelectContent>
                                                        <MultiSelectGroup>
                                                            {["D", "E", "F", "G"].map((c) => (
                                                                <MultiSelectItem key={c} value={c}>
                                                                    {c}
                                                                </MultiSelectItem>
                                                            ))}
                                                        </MultiSelectGroup>
                                                    </MultiSelectContent>
                                                </MultiSelect>

                                                {touched.color && errors.color && (
                                                    <p className="text-sm text-red-500">{errors.color}</p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs text-muted-foreground">Cut</Label>
                                                <Select value={values.cut} onValueChange={(v) => setFieldValue("cut", v)}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select cut" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {["EXCELLENT", "VERY_GOOD", "GOOD"].map((c) => (
                                                            <SelectItem key={c} value={c}>
                                                                {c.replace("_", " ")}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {touched.cut && errors.cut && (
                                                    <p className="text-sm text-red-500">{errors.cut}</p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs text-muted-foreground">Shape</Label>
                                                <Select value={values.shape} onValueChange={(v) => setFieldValue("shape", v)}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select shape" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {["ROUND", "OVAL", "PEAR", "MARQUISE"].map((s) => (
                                                            <SelectItem key={s} value={s}>
                                                                {s}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {touched.shape && errors.shape && (
                                                    <p className="text-sm text-red-500">{errors.shape}</p>
                                                )}
                                            </div>
                                        </div>
                                        {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Clarity</Label>
                                            <Select value={values.clarity} onValueChange={(v) => setFieldValue("clarity", v)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select clarity" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {["IF", "VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2", "I1", "I2"].map((c) => (
                                                        <SelectItem key={c} value={c}>
                                                            {c}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {touched.clarity && errors.clarity && (
                                                <p className="text-sm text-red-500">{errors.clarity}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Color</Label>
                                            <Select value={values.color} onValueChange={(v) => setFieldValue("color", v)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select color" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {["D", "E", "F", "G"].map((c) => (
                                                        <SelectItem key={c} value={c}>
                                                            {c}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {touched.color && errors.color && (
                                                <p className="text-sm text-red-500">{errors.color}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Cut</Label>
                                            <Select value={values.cut} onValueChange={(v) => setFieldValue("cut", v)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select cut" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {["EXCELLENT", "VERY_GOOD", "GOOD"].map((c) => (
                                                        <SelectItem key={c} value={c}>
                                                            {c.replace("_", " ")}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {touched.cut && errors.cut && (
                                                <p className="text-sm text-red-500">{errors.cut}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Shape</Label>
                                            <Select value={values.shape} onValueChange={(v) => setFieldValue("shape", v)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select shape" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {["ROUND", "OVAL", "PEAR", "MARQUISE"].map((s) => (
                                                        <SelectItem key={s} value={s}>
                                                            {s}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {touched.shape && errors.shape && (
                                                <p className="text-sm text-red-500">{errors.shape}</p>
                                            )}
                                        </div>
                                    </div> */}
                                    </div>
                                )}

                                {/* Section 4: Stone Details (Optional) */}
                                {/* <div className="bg-white p-4 rounded-md border space-y-3">
                                    <h2 className="text-sm font-semibold text-gray-700">Stone Details (Optional)</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Stone</Label>
                                            <Select value={values.stoneName} onValueChange={handleStoneChange}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select stone (optional)" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {lookup?.stoneTypes?.map((s: string) => (
                                                        <SelectItem key={s} value={s}>
                                                            {s}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {touched.stoneName && errors.stoneName && (
                                                <p className="text-sm text-red-500">{errors.stoneName}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Purchase Stone Price {values.stoneName ? "*" : ""}</Label>
                                            <Input
                                                type="number"
                                                placeholder="Stone price"
                                                min="0"
                                                max="999999"
                                                value={values.purchaseStonePrice === 0 ? "" : values.purchaseStonePrice}
                                                onChange={(e) => {
                                                    const inputValue = e.target.value;
                                                    if (inputValue === "") {
                                                        setFieldValue("purchaseStonePrice", 0);
                                                        return;
                                                    }
                                                    const digitsOnly = inputValue.replace(/[^0-9]/g, '').slice(0, 6);
                                                    const val = Number(digitsOnly);
                                                    if (val <= 999999) {
                                                        setFieldValue("purchaseStonePrice", val);
                                                    }
                                                }}
                                                onBlur={(e) => {
                                                    const val = e.target.value === "" ? 0 : Number(e.target.value);
                                                    setFieldValue("purchaseStonePrice", val > 999999 ? 999999 : Math.max(0, val));
                                                }}
                                            />
                                            {touched.purchaseStonePrice && errors.purchaseStonePrice && (
                                                <p className="text-sm text-red-500">{errors.purchaseStonePrice}</p>
                                            )}
                                        </div>
                                    </div>
                                </div> */}

                                {/* Section 5: Weights */}
                                <div className="bg-white p-4 rounded-md border space-y-3">
                                    <h2 className="text-sm font-semibold text-gray-700">Weights</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Gross Weight (g) *</Label>
                                            <Input
                                                type="number"
                                                step="0.001"
                                                placeholder="Gross weight (g)" // (or "Stone weight (g)")
                                                value={values.grossWeight === 0 ? "" : values.grossWeight}
                                                onChange={(e) => {
                                                    // ✅ Allow raw string while typing so "0." is preserved
                                                    setFieldValue("grossWeight", e.target.value);
                                                }}
                                                onBlur={(e) => {
                                                    // ✅ Format cleanly when leaving the field
                                                    const val = e.target.value === "" ? 0 : Number(e.target.value);
                                                    setFieldValue("grossWeight", val === 0 ? 0 : Number(val.toFixed(3)));
                                                }}
                                            />
                                            {touched.grossWeight && errors.grossWeight && (
                                                <p className="text-sm text-red-500">{errors.grossWeight}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Stone Weight (g) {values.stoneName ? "*" : ""}</Label>
                                            <Input
                                                type="number"
                                                step="0.001"
                                                placeholder="Stone weight (g)"
                                                value={values.stoneWeight === 0 ? "" : values.stoneWeight}
                                                onChange={(e) => {
                                                    // ✅ Just store the raw string while typing so decimals aren't erased
                                                    setFieldValue("stoneWeight", e.target.value);
                                                }}
                                                onBlur={(e) => {
                                                    // ✅ Format to number and 3 decimal places when leaving the field
                                                    const val = e.target.value === "" ? 0 : Number(e.target.value);
                                                    setFieldValue("stoneWeight", val === 0 ? 0 : Number(val.toFixed(3)));
                                                }}
                                            />
                                            {touched.stoneWeight && errors.stoneWeight && (
                                                <p className="text-sm text-red-500">{errors.stoneWeight}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Diamond Weight (g)</Label>
                                            <div className="text-sm font-semibold text-blue-600 leading-tight">

                                                {values.diamondWeight.toFixed(3)}g
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Net Weight (g)</Label>
                                            <div className="text-sm font-semibold text-blue-600 leading-tight">

                                                {values.netWeight.toFixed(3)}g
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Pure Weight (g)</Label>
                                            <div className="text-sm font-semibold text-blue-600 leading-tight">

                                                {values.pureWeight.toFixed(3)}g
                                            </div>
                                            {/* <Field as={Input} type="number" step="0.001" name="pureWeight" /> */}
                                            {touched.pureWeight && errors.pureWeight && (
                                                <p className="text-sm text-red-500">{errors.pureWeight}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Section 6: Purchase Details */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Purchase Details */}
                                    <div className="bg-white p-4 rounded-md border space-y-4">
                                        <h2 className="text-sm font-semibold text-gray-700">
                                            Purchase Details
                                        </h2>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Making Charge</Label>
                                                <Input
                                                    className="h-9"
                                                    type="number"
                                                    placeholder="Amount"
                                                    value={values.purchaseMakingCharge ?? ""}
                                                    onChange={(e) => {
                                                        setFieldValue("purchaseMakingCharge", e.target.value);
                                                    }}
                                                    onBlur={(e) => {
                                                        const val = e.target.value ? Number(e.target.value) : "";
                                                        setFieldValue("purchaseMakingCharge", isNaN(val as any) ? "" : val);
                                                    }}
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-xs">Charge Type</Label>
                                                <Select value={
                                                     lookup?.makingChargeTypes?.find(
                                                         (t: string) => t.toUpperCase() === (values.purchaseMakingChargeType || "").toUpperCase()
                                                     ) || values.purchaseMakingChargeType || "__none__"
                                                 }
                                                    onValueChange={(v) => setFieldValue("purchaseMakingChargeType", v === "__none__" ? "" : v)}>
                                                    <SelectTrigger className="h-9">
                                                        <SelectValue placeholder="Select type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="__none__">Select type</SelectItem>
                                                        {lookup?.makingChargeTypes?.map((item: string) => (
                                                            <SelectItem key={item} value={item}>
                                                                {item}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-xs text-muted-foreground">
                                                    Purchase Date *
                                                </Label>

                                                <DateInput
                                                    value={values.purchaseDate || null}
                                                    onValueChange={(val) => setFieldValue("purchaseDate", val)}
                                                    placeholder="Select purchase date"
                                                    className="h-9"
                                                    max={new Date().toISOString().split("T")[0]} // optional: no future date
                                                />

                                                {touched.purchaseDate && errors.purchaseDate && (
                                                    <p className="text-xs text-red-500">{errors.purchaseDate}</p>
                                                )}
                                            </div>

                                        </div>
                                    </div>

                                    {/* Remarks */}
                                    <div className="bg-white p-4 rounded-md border space-y-1">
                                        <h2 className="text-sm font-semibold text-gray-700">
                                            Remarks
                                        </h2>

                                        <Textarea
                                            onChange={(e) => {
                                                setFieldValue("remarks", e.target.value);
                                            }}
                                            value={values.remarks}
                                            className="text-sm"
                                            placeholder="Additional remarks (optional)"
                                        />
                                        {touched.remarks && errors.remarks && (
                                            <p className="text-sm text-red-500">{errors.remarks}</p>
                                        )}
                                    </div>
                                </div>
                                {/* ✅ Sale Making Charge & Discount */}
<div className="bg-white p-4 rounded-md border space-y-4">
  <h2 className="text-sm font-semibold text-gray-700">Sale Details</h2>
  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">

    {/* Sale Making Charge */}
    <div className="space-y-1">
      <Label className="text-xs">Sale Making Charge</Label>
      <Input
        className="h-9"
        type="number"
        placeholder="Amount"
        value={values.saleMakingCharge ?? ""}
        onChange={(e) => setFieldValue('saleMakingCharge', e.target.value)}
        onBlur={(e) => {
          const val = e.target.value ? Number(e.target.value) : "";
          setFieldValue('saleMakingCharge', isNaN(val as any) ? "" : val);
        }}
      />
      {touched.saleMakingCharge && errors.saleMakingCharge && (
        <p className="text-sm text-red-500">{errors.saleMakingCharge as string}</p>
      )}
    </div>

    {/* Sale Making Charge Type */}
    <div className="space-y-1">
      <Label className="text-xs">Sale Charge Type</Label>
      <Select
        value={
          lookup?.makingChargeTypes?.find(
            (t: string) => t.toUpperCase() === (values.saleMakingChargeType || "").toUpperCase()
          ) || values.saleMakingChargeType || "__none__"
        }
        onValueChange={(v) => setFieldValue('saleMakingChargeType', v === "__none__" ? "" : v)}
      >
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Select type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Select type</SelectItem>
          {lookup?.makingChargeTypes?.map((item: string) => (
            <SelectItem key={item} value={item}>{item}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* Sale Discount On Making */}
    <div className="space-y-1">
      <Label className="text-xs">Sale Discount on Making</Label>
      <Input
        className="h-9"
        type="number"
        placeholder="Discount amount"
        value={values.saleDiscountOnMaking ?? ""}
        onChange={(e) => setFieldValue('saleDiscountOnMaking', e.target.value)}
        onBlur={(e) => {
          const val = e.target.value ? Number(e.target.value) : "";
          setFieldValue('saleDiscountOnMaking', isNaN(val as any) ? "" : val);
        }}
      />
      {touched.saleDiscountOnMaking && errors.saleDiscountOnMaking && (
        <p className="text-sm text-red-500">{errors.saleDiscountOnMaking as string}</p>
      )}
    </div>

    {/* Sale Discount Type */}
    <div className="space-y-1">
      <Label className="text-xs">Sale Discount Type</Label>
      <Select
        value={
          lookup?.makingChargeTypes?.find(
            (t: string) => t.toUpperCase() === (values.saleDiscountType || "").toUpperCase()
          ) || values.saleDiscountType || "__none__"
        }
        onValueChange={(v) => setFieldValue('saleDiscountType', v === "__none__" ? "" : v)}
      >
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Select type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Select type</SelectItem>
          {lookup?.makingChargeTypes?.map((item: string) => (
            <SelectItem key={item} value={item}>{item}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>



<div className="space-y-1">
      <Label className="text-xs">Sale Diamond Discount</Label>
      <Input
        className="h-9"
        type="number"
        placeholder="Discount amount"
        value={values.saleDiamondDiscount ?? ""}
        onChange={(e) => setFieldValue('saleDiamondDiscount', e.target.value)}
        onBlur={(e) => {
          const val = e.target.value ? Number(e.target.value) : "";
          setFieldValue('saleDiamondDiscount', isNaN(val as any) ? "" : val);
        }}
      />
      {touched.saleDiamondDiscount && errors.saleDiamondDiscount && (
        <p className="text-sm text-red-500">{errors.saleDiamondDiscount as string}</p>
      )}
    </div>




<div className="space-y-1">
      <Label className="text-xs">Sale Diamond Discount Type</Label>
      <Select
        value={
          lookup?.makingChargeTypes?.find(
            (t: string) => t.toUpperCase() === (values.saleDiamondDiscountType || "").toUpperCase()
          ) || values.saleDiamondDiscountType || "__none__"
        }
        onValueChange={(v) => setFieldValue('saleDiamondDiscountType', v === "__none__" ? "" : v)}
      >
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Select type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Select type</SelectItem>
          {lookup?.makingChargeTypes?.map((item: string) => (
            <SelectItem key={item} value={item}>{item}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>


  </div>
</div>


                                {isEdit && (
                                    <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-lg font-semibold text-gray-900">Product Images</Label>
                                            <div className="text-xs text-gray-500 bg-blue-50 px-3 py-1 rounded-full">
                                                {previewUrls.length + existingImages.length} images
                                            </div>
                                        </div>

                                        {/* Uniform Perfect Grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">

                                            {/* 📱 New Upload Previews */}
                                            {previewUrls.map((url, idx) => (
                                                <div
                                                    key={`new-${idx}`}
                                                    className="group relative bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-dashed border-indigo-200 rounded-xl p-1 hover:border-indigo-400 transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
                                                >
                                                    <div className="w-full h-24 rounded-lg overflow-hidden bg-white shadow-sm">
                                                        <img
                                                            src={url}
                                                            alt={`New ${idx + 1}`}
                                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                                            draggable={false}
                                                        />
                                                    </div>

                                                    {/* Remove button for NEW images */}
                                                    <button
                                                        type="button"
                                                        className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg border-2 border-white opacity-0 group-hover:opacity-100 transition-all duration-200 transform hover:scale-110"
                                                        onClick={() => {
                                                            URL.revokeObjectURL(url);
                                                            setPreviewUrls(prev => prev.filter((_, i) => i !== idx));
                                                            setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
                                                            // ✅ Reset input here too just in case
                                                            if (fileInputRef.current) fileInputRef.current.value = "";
                                                        }}
                                                    >
                                                        <X className="w-4 h-4" /> {/* Assuming you imported X icon */}
                                                    </button>

                                                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-gray-900 text-xs px-2 py-0.5 rounded-full font-medium shadow-md">
                                                        Pending
                                                    </div>
                                                </div>
                                            ))}

                                            {/* 🖼️ Existing Images */}
                                            {existingImages.map((img) => (
                                                <div
                                                    key={img.id}
                                                    className="group relative bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl p-1 hover:border-emerald-400 transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
                                                >
                                                    <div className="w-full h-24 rounded-lg overflow-hidden bg-white shadow-sm">
                                                        {imageBlobs[img.id] ? (
                                                            <img
                                                                src={imageBlobs[img.id]}
                                                                alt={img.fileName}
                                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                                                draggable={false}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="absolute bottom-1 left-1 right-1 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-px rounded-b-lg truncate opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                        {img.fileName.split('.')[0]}
                                                    </div>

                                                    <div className="absolute top-1 right-1 bg-white/90 text-gray-700 text-xs px-1.5 py-0.5 rounded-full shadow-sm font-medium">
                                                        {Math.round(img.size / 1024)}KB
                                                    </div>

                                                    {/* ✅ Delete Button for EXISTING images */}
                                                    <button
                                                        type="button"
                                                        className="absolute -top-2 -right-2 w-7 h-7 bg-white hover:bg-red-50 text-red-500 hover:text-red-600 border border-red-100 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                                        onClick={() => handleDeleteClick(img)}
                                                        title="Delete Image"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}

                                            {/* ➕ Add More */}
                                            {(previewUrls.length + existingImages.length) < 12 && (
                                                <label className="group border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
                                                    <div className="w-12 h-12 bg-gray-100 group-hover:bg-blue-100 rounded-xl flex items-center justify-center mb-2 transition-colors">
                                                        <svg className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                        </svg>
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600 transition-colors">
                                                        Add Image
                                                    </span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        className="hidden"
                                                        ref={fileInputRef} // ✅ Attached Ref Here
                                                        onChange={handleFileChange}
                                                    />
                                                </label>
                                            )}
                                        </div>

                                        {/* 📊 Stats + Controls */}
                                        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-gray-100">
                                            <div className="text-xs text-gray-500">
                                                Max 12 images • JPG, PNG up to 5MB
                                            </div>
                                            <div className="ml-auto flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedFiles([]);
                                                        previewUrls.forEach(URL.revokeObjectURL);
                                                        setPreviewUrls([]);
                                                        if (fileInputRef.current) fileInputRef.current.value = ""; // ✅ Reset on clear
                                                    }}
                                                    disabled={selectedFiles.length === 0}
                                                    className="h-9 px-4"
                                                >
                                                    Clear New
                                                </Button>
                                                <Button
                                                    type="button"
                                                    onClick={handleUpload}
                                                    disabled={!itemId || selectedFiles.length === 0 || uploadMutation.isPending}
                                                    className="h-9 px-6 font-medium"
                                                >
                                                    {uploadMutation.isPending ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            Uploading...
                                                        </>
                                                    ) : (
                                                        `Upload ${selectedFiles.length}`
                                                    )}
                                                </Button>
                                            </div>
                                        </div>

                                        {uploadMutation.isError && (
                                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                                <p className="text-sm text-red-700">{uploadMutation.error?.message}</p>
                                            </div>
                                        )}
                                    </div>
                                )}



                                {/* Section 7: Sale Price Calculation */}
                                <div className="bg-white p-4 rounded-md border space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-semibold text-gray-700">
                                            Pricing Model
                                        </Label>
                                        <div>
                                            <Select value={values.pricingModel}
                                                onValueChange={(v) => setFieldValue("pricingModel", v)}>
                                                <SelectTrigger className="h-9">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {lookup?.pricingModel?.map((item: string) => (
                                                        <SelectItem key={item} value={item}>
                                                            {item}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {touched.pricingModel && errors.pricingModel && (
                                                <p className="text-xs text-red-500">{errors.pricingModel}</p>
                                            )}
                                        </div>
                                    </div>


                                    {/* ✅ Show ONLY in Edit mode when salePrice exists */}
                                    {isEdit && values.salePrice && values.salePrice > 0 && (
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-semibold text-gray-700">Current Sale Price</label>
                                            <p className="bg-transparent outline-none w-32 text-right font-bold text-green-600">
                                                ₹ {values.salePrice.toLocaleString()}
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between">
                                        <h2 className="text-sm font-semibold text-gray-700">
                                            Sale Price Calculation
                                        </h2>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleCalculateSalePrice}
                                            disabled={calculateSalePriceMutation.isPending || !values.grossWeight || values.grossWeight <= 0}
                                        >
                                            {calculateSalePriceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            <Calculator className="text-black" />
                                        </Button>
                                    </div>

                                    {salePriceData && (
                                        <div className="space-y-3 pt-2 border-t">
                                            {/* Cost Breakdown */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {salePriceData.goldCost > 0 && (
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-muted-foreground">Gold Cost</Label>
                                                        <div className="text-sm font-semibold text-blue-600">
                                                            ₹{salePriceData.goldCost.toFixed(2)}
                                                        </div>
                                                    </div>
                                                )}
                                                {salePriceData.diamondCost > 0 && (
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-muted-foreground">Diamond Cost</Label>
                                                        <div className="text-sm font-semibold text-blue-600">
                                                            ₹{salePriceData.diamondCost.toFixed(2)}
                                                        </div>
                                                    </div>
                                                )}
                                                {salePriceData.stoneCost > 0 && (
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-muted-foreground">Stone Cost</Label>
                                                        <div className="text-sm font-semibold text-blue-600">
                                                            ₹{salePriceData.stoneCost.toFixed(2)}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Additional Charges */}
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                {salePriceData.makingCharges > 0 && (
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-muted-foreground">Making Charges</Label>
                                                        <div className="text-sm font-medium text-gray-700">
                                                            ₹{salePriceData.makingCharges.toFixed(2)}
                                                        </div>
                                                    </div>
                                                )}
                                                {salePriceData.discount > 0 && (
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-muted-foreground">Discount</Label>
                                                        <div className="text-sm font-medium text-red-600">
                                                            -₹{salePriceData.discount.toFixed(2)}
                                                        </div>
                                                    </div>
                                                )}
                                                {salePriceData.otherCharges > 0 && (
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-muted-foreground">Other Charges</Label>
                                                        <div className="text-sm font-medium text-gray-700">
                                                            ₹{salePriceData.otherCharges.toFixed(2)}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Tax Breakdown */}
                                            {(salePriceData.igst > 0 || salePriceData.cgst > 0 || salePriceData.sgst > 0) && (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    {salePriceData.igst > 0 && (
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-muted-foreground">IGST</Label>
                                                            <div className="text-sm font-medium text-gray-700">
                                                                ₹{salePriceData.igst.toFixed(2)}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {salePriceData.cgst > 0 && (
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-muted-foreground">CGST</Label>
                                                            <div className="text-sm font-medium text-gray-700">
                                                                ₹{salePriceData.cgst.toFixed(2)}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {salePriceData.sgst > 0 && (
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-muted-foreground">SGST</Label>
                                                            <div className="text-sm font-medium text-gray-700">
                                                                ₹{salePriceData.sgst.toFixed(2)}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Total Sale Price */}
                                            <div className="pt-2 border-t">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-sm font-semibold text-gray-700">Total Sale Price</Label>
                                                    <div className="text-xl font-bold text-green-600">
                                                        ₹<input
                                                            type="text"
                                                            value={salePriceData?.totalSalePrice ?? ""}
                                                            onChange={handleTotalSalePriceChange}
                                                            className="bg-transparent outline-none w-32 text-right font-bold text-green-600"
                                                        />



                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {!salePriceData && (
                                        <p className="text-xs text-muted-foreground">
                                            Click "Calculate Sale Price" to get the estimated sale price based on current rates.
                                        </p>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                {/* Desktop actions (normal flow) */}
                                <div className="hidden justify-end gap-3 pt-4 border-t sm:flex">
                                    <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting} size="lg">
                                        {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                        {isEdit ? "Update Stock Entry" : "Create Stock Entry"}
                                    </Button>
                                </div>

                                {/* Mobile actions (fixed footer, safe-area aware) */}
                                <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75 sm:hidden">
                                    <div
                                        className="mx-auto grid max-w-[1400px] grid-cols-2 gap-3 px-6 py-3"
                                        style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
                                    >
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={onCancel}
                                            disabled={isSubmitting}
                                            className="w-full"
                                        >
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={isSubmitting} size="lg" className="w-full">
                                            {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                            {isEdit ? "Update" : "Create"}
                                        </Button>
                                    </div>
                                </div>
                            </Form>
                        </div>
                    );
                }}
            </Formik>

            {/* Add Vendor Dialog */}
            <Dialog open={vendorDialogOpen} onOpenChange={setVendorDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Add New Vendor</DialogTitle>
                    </DialogHeader>
                    <Formik
                        enableReinitialize
                        initialValues={{
                            name: "",
                            phone: "",
                            email: "",
                            gstin: "",
                            pan: "",
                            adharNo: "",
                            address: "",
                            state: "",
                            city: "",
                            pinCode: "",
                            vendorType: "",
                            isActive: true,
                        }}
                        validationSchema={VendorSchema}
                        validateOnBlur={false}
                        validateOnChange={false}
                        onSubmit={handleVendorSubmit}
                    >
                        {({ values, errors, touched, isSubmitting, submitForm, setFieldValue }) => (
                            <Form noValidate className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Vendor Name *</Label>
                                    <Field
                                        as={Input}
                                        id="name"
                                        name="name"
                                        placeholder="e.g. ABC Electronics Ltd"
                                        disabled={isSubmitting}
                                    />
                                    {touched.name && errors.name && (
                                        <p className="text-sm text-red-500">{errors.name}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="phone">Phone *</Label>
                                        <Field as={Input} id="phone" name="phone" placeholder="1234567890" disabled={isSubmitting} />
                                        {touched.phone && errors.phone && (
                                            <p className="text-sm text-red-500">{errors.phone}</p>
                                        )}
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Field
                                            as={Input}
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="vendor@example.com"
                                            disabled={isSubmitting}
                                        />
                                        {touched.email && errors.email && (
                                            <p className="text-sm text-red-500">{errors.email}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="gstin">GSTIN</Label>
                                        <Field
                                            as={Input}
                                            id="gstin"
                                            name="gstin"
                                            placeholder="e.g. 27AAECS9290R1Z5"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="pan">PAN</Label>
                                        <Field
                                            as={Input}
                                            id="pan"
                                            name="pan"
                                            placeholder="e.g. AAECS9290R"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="adharNo">Aadhaar No</Label>
                                        <Field
                                            as={Input}
                                            id="adharNo"
                                            name="adharNo"
                                            placeholder="e.g. 1234 5678 9012"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="vendorType">Vendor Type</Label>
                                        <Field
                                            as={Input}
                                            id="vendorType"
                                            name="vendorType"
                                            placeholder="e.g. Supplier"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="state">State</Label>
                                        <Field
                                            as={Input}
                                            id="state"
                                            name="state"
                                            placeholder="e.g. Maharashtra"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="city">City</Label>
                                        <Field
                                            as={Input}
                                            id="city"
                                            name="city"
                                            placeholder="e.g. Mumbai"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="pinCode">Pin Code</Label>
                                        <Field
                                            as={Input}
                                            id="pinCode"
                                            name="pinCode"
                                            placeholder="e.g. 400001"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Field
                                        as={Input}
                                        id="address"
                                        name="address"
                                        placeholder="123 Business St, City, Country"
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="isActive"
                                        checked={values.isActive}
                                        onCheckedChange={(checked) => setFieldValue("isActive", checked)}
                                        disabled={isSubmitting}
                                    />
                                    <Label htmlFor="isActive" className="cursor-pointer">
                                        Is Active
                                    </Label>
                                </div>

                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setVendorDialogOpen(false)}
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={submitForm}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        Create
                                    </Button>
                                </DialogFooter>
                            </Form>
                        )}
                    </Formik>
                </DialogContent>
            </Dialog>

            {/* Add Category Dialog */}
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add New Category</DialogTitle>
                    </DialogHeader>

                    <Formik
                        enableReinitialize
                        initialValues={{
                            categoryName: "",
                            description: "",
                        }}
                        validationSchema={CategorySchema}
                        validateOnBlur={false}
                        validateOnChange={false}
                        onSubmit={handleCategorySubmit}
                    >
                        {({ errors, touched, isSubmitting, submitForm }) => (
                            <Form noValidate className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="categoryName">Category Name</Label>
                                    <Field
                                        as={Input}
                                        id="categoryName"
                                        name="categoryName"
                                        placeholder="e.g. Ring"
                                        disabled={isSubmitting}
                                    />
                                    {touched.categoryName && errors.categoryName && (
                                        <p className="text-sm text-red-500">{errors.categoryName}</p>
                                    )}
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Field
                                        as={Textarea}
                                        id="description"
                                        name="description"
                                        placeholder="Optional description"
                                        rows={3}
                                        disabled={isSubmitting}
                                    />
                                    {touched.description && errors.description && (
                                        <p className="text-sm text-red-500">{errors.description}</p>
                                    )}
                                </div>

                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setCategoryDialogOpen(false)}
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </Button>

                                    <Button
                                        type="button"
                                        onClick={submitForm}
                                        disabled={isSubmitting || createCategoryMutation.isPending}
                                    >
                                        {(isSubmitting || createCategoryMutation.isPending) && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        Save Category
                                    </Button>
                                </DialogFooter>
                            </Form>
                        )}
                    </Formik>
                </DialogContent>
            </Dialog>

            {/* Print Tag Confirmation Modal */}
            <ConfirmDialog
                open={showPrintConfirmModal}
                title="Print Tag"
                message="Do you want to print the tag for this item?"
                confirmText="Yes"
                cancelText="No"
                variant="default"
                onConfirm={handlePrintConfirm}
                onCancel={handlePrintCancel}
            />
            <ConfirmDialog
                open={!!imageToDelete}
                title="Delete Image?"
                message={`Are you sure you want to delete "${imageToDelete?.fileName}"?`}
                confirmText={deleteImage.isPending ? "Deleting..." : "Delete"}
                variant="destructive"
                onConfirm={confirmDeleteImage}
                onCancel={() => setImageToDelete(null)}
            />

            {/* Tag Image Display Modal */}

            <Dialog open={showImageModal} onOpenChange={(isOpen) => !isOpen && handleImageModalClose()}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Tag Image</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 flex justify-center items-center">
                        {isLoadingTagImage ? (
                            <div className="flex flex-col items-center justify-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                                <p className="text-sm text-muted-foreground">Loading tag image...</p>
                            </div>
                        ) : tagImageUrl ? (
                            <img
                                src={tagImageUrl}
                                alt="Tag"
                                className="print-only-image max-w-full h-auto rounded-lg border"
                                onLoad={() => { }}
                            />
                        ) : (
                            <p className="text-sm text-muted-foreground">No image available</p>
                        )}
                    </div>
                    <DialogFooter className="justify-between pt-4 border-t">
                        {tagImageUrl && (
                            <>
                                {/* <div className="text-sm text-muted-foreground">
            📏 Size: {imgDimensions.width ? `${Math.round(imgDimensions.width)}x${Math.round(imgDimensions.height)}px` : 'Loading...'}
          </div> */}
                                <div className="flex gap-2">
                                    {/* Your popup print button (keep it!) */}
                                    <Button type="button" onClick={handlePrintTag}>
                                        Print
                                    </Button>
                                    <Button type="button" variant="outline" onClick={handleImageModalClose}>
                                        Close
                                    </Button>
                                </div>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>


        </>
    );
};