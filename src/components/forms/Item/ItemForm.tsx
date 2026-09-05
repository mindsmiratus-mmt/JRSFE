// components/item/ItemForm.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Image as ImageIcon } from "lucide-react";
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

import { useCreateItem, useUpdateItem, useUploadItemImage } from "@/hooks/useItem";
import { useAllCategory } from "@/hooks/useCategory";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useCurrentRatePurities } from "@/hooks/useCurruntrate";
import Barcode from "react-barcode";
import { useNavigate } from "react-router-dom";
import { useShopLookup } from "@/hooks/useShop";
import { cn } from "@/lib/utils";

const ItemSchema = Yup.object().shape({
    name: Yup.string().required("Item name is required"),
    categoryId: Yup.number().required("Please select a category"),
    barcode: Yup.string().required("Barcode is required"),
    goldKT: Yup.string().required("Gold KT is required"),
    metal: Yup.string().required("Metal is required"),
    grossWt: Yup.number().min(0.001, "Must be > 0").required("Gross weight is required"),
    netWt: Yup.number().min(0.001, "Must be > 0").required("Net weight is required"),
    making: Yup.number().min(0).required("Making charge is required"),
    quantity: Yup.number().min(0).integer().required("Quantity is required"),
    firmId: Yup.string().required("Firm ID is required"),
    natureOfStock: Yup.string().required("Nature of stock is required"),
    status: Yup.string().required("Status is required"),
});

interface ItemFormProps {
    item?: any;
    onSuccess: (msg: string) => void;
    onCancel: () => void;
}

export const ItemForm = ({ item, onCancel }: ItemFormProps) => {
    const navigate = useNavigate();
    const [effectiveItem, setEffectiveItem] = useState(item);
    const [showUpload, setShowUpload] = useState(false);
    const isEdit = !!effectiveItem;
    const createMutation = useCreateItem();
    const updateMutation = useUpdateItem();
    const uploadMutation = useUploadItemImage();
    const { data: categories = [] } = useAllCategory();
    const { data: lookup } = useShopLookup();
    const { data: curruntRatePurityResponse } = useCurrentRatePurities();
    const initialValues = {
        name: effectiveItem?.name || "",
        categoryId: effectiveItem?.categoryId || "",
        description: effectiveItem?.description || "",
        goldKT: effectiveItem?.goldKT || "",
        metal: effectiveItem?.metal || "Gold",
        grossWt: effectiveItem?.grossWt || 0,
        netWt: effectiveItem?.netWt || 0,
        firmId: effectiveItem?.firmId || "",
        barcode: effectiveItem?.barcode || "",
        making: effectiveItem?.making || 0,
        discountOnMaking: effectiveItem?.discountOnMaking || 0,
        discountOnMakingType: effectiveItem?.discountOnMakingType || "PERCENT",
        discountOnDiamond: effectiveItem?.discountOnDiamond || 0,
        discountOnStone: effectiveItem?.discountOnStone || 0,
        discountOnStoneType: effectiveItem?.discountOnStoneType || "PERCENT",
        natureOfStock: effectiveItem?.natureOfStock || "Stock",
        quantity: effectiveItem?.quantity || 1,
        sold: effectiveItem?.sold || 0,
        status: effectiveItem?.status || "Available",
        itemImage: effectiveItem?.itemImage || "",
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, setFieldValue: (field: string, value: any) => void) => {
        const file = e.target.files?.[0];
        if (!file || !effectiveItem?.id) {
            e.target.value = "";
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        try {
            const { url } = await uploadMutation.mutateAsync({ itemId: effectiveItem.id, formData });
            setFieldValue("itemImage", url);
            toast.success("Image uploaded successfully!");
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to upload image");
        } finally {
            e.target.value = "";
        }
    };

    const handleSubmit = async (values: any, { setSubmitting }: any) => {
        const basePayload = {
            ...values,
            categoryId: Number(values.categoryId),
            grossWt: Number(values.grossWt),
            netWt: Number(values.netWt),
            making: Number(values.making),
            quantity: Number(values.quantity),
            sold: Number(values.sold),
            discountOnMaking: Number(values.discountOnMaking),
            discountOnDiamond: Number(values.discountOnDiamond),
            discountOnStone: Number(values.discountOnStone),
            itemImage: values.itemImage,
        };

        try {
            if (isEdit) {
                const payload = basePayload;
                await updateMutation.mutateAsync({ id: effectiveItem.id, data: { ...payload, id: effectiveItem.id } });
                toast.success("Item updated successfully!");
                setShowUpload(true);
            } else {
                const createdItem = await createMutation.mutateAsync(basePayload);
                setEffectiveItem(createdItem);
                setShowUpload(true);
                toast.success("Item created successfully! You can now upload an image if desired.");
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to save item");
        } finally {
            setSubmitting(false);
        }
    };

    const FormError = ({ error }: { error: any }) => {
        if (!error) return null;
        return <p className="text-sm text-red-500 mt-1">{String(error)}</p>;
    };

    return (
        <Formik
            initialValues={initialValues}
            validationSchema={ItemSchema}
            onSubmit={handleSubmit}
            enableReinitialize
        >
            {({ values, errors, touched, setFieldValue, isSubmitting }) => (
                <Form className={cn("space-y-8", "pb-[calc(9rem+env(safe-area-inset-bottom))] md:pb-0")}>
                    {/* Basic Info */}
                    <div className="bg-white p-6 rounded-lg border">
                        {/* Item Image Upload & Preview */}
                        {showUpload && (
                            <div className="mb-6">
                                <Label className="text-base font-medium mb-3 block">
                                    Item Image (Optional)
                                </Label>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* LEFT: Upload */}
                                    <div className="min-h-[180px] border-2 border-dashed border-gray-300 rounded-md bg-gray-50
                                    flex items-center justify-center p-4 hover:border-blue-400 transition">
                                        <div className="w-full text-center space-y-3">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleImageUpload(e, setFieldValue)}
                                                disabled={uploadMutation.isPending || isSubmitting}
                                                className="mx-auto block text-sm text-gray-500
                                                file:mr-4 file:py-2 file:px-4
                                                file:rounded-full file:border-0
                                                file:text-sm file:font-semibold
                                                file:bg-blue-50 file:text-blue-700
                                                hover:file:bg-blue-100 cursor-pointer"
                                            />

                                            {uploadMutation.isPending && (
                                                <div className="flex justify-center">
                                                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                                </div>
                                            )}

                                            {!values.itemImage && effectiveItem?.itemImage && (
                                                <p className="text-xs text-gray-500">
                                                    Upload a new image to replace existing one
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* RIGHT: Preview */}
                                    <div className="min-h-[180px] border rounded-md bg-gray-50
                                    flex items-center justify-center p-4">
                                        {values.itemImage || effectiveItem?.itemImage ? (
                                            <img
                                                src={values.itemImage || effectiveItem?.itemImage}
                                                alt="Item Preview"
                                                className="max-h-[140px] max-w-full object-contain rounded-md"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center text-gray-400">
                                                <ImageIcon className="h-10 w-10 mb-1" />
                                                <span className="text-xs">No Image</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <FormError error={touched.itemImage && errors.itemImage} />
                            </div>
                        )}

                        {/* Other Fields Grid */}
                        {!showUpload && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                    <Label>Item Name *</Label>
                                    <Field as={Input} name="name" placeholder="Gold Chain 22KT" />
                                    <FormError error={touched.name && errors.name} />
                                </div>

                                <div>
                                    <Label>Category *</Label>
                                    <SearchableSelect
                                        value={values.categoryId}
                                        onChange={(v) => setFieldValue("categoryId", v ? Number(v) : undefined)}
                                        placeholder="Select category"
                                        options={categories.map((c) => ({
                                            value: c.id,
                                            label: c.categoryName,
                                        }))}
                                    />
                                    <FormError error={touched.categoryId && errors.categoryId} />
                                </div>

                                <div>
                                    <Label>Barcode *</Label>

                                    <Field
                                        as={Input}
                                        name="barcode"
                                        placeholder="Enter barcode number or code"
                                    />

                                    <FormError error={touched.barcode && errors.barcode} />

                                    {/* Barcode Preview */}
                                    {values.barcode && (
                                        <div className="mt-3 flex justify-center border rounded-md p-3 bg-gray-50">
                                            <Barcode
                                                value={values.barcode}
                                                width={2}
                                                height={60}
                                                fontSize={14}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <Label>Firm ID *</Label>
                                    <Field as={Input} name="firmId" placeholder="F001" />
                                    <FormError error={touched.firmId && errors.firmId} />
                                </div>

                                <div>
                                    <Label>Gold KT *</Label>
                                    <Select value={values.goldKT} onValueChange={(v) => setFieldValue("goldKT", v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select KT" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {curruntRatePurityResponse?.goldPurity?.map((kt: any) => (
                                                <SelectItem key={kt} value={kt}>{kt}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label>Metal *</Label>
                                    <Field as={Input} name="metal" placeholder="Gold / Silver" />
                                </div>

                                <div>
                                    <Label>Gross Weight (g) *</Label>
                                    <Field as={Input} type="number" step="0.001" name="grossWt" />
                                    <FormError error={touched.grossWt && errors.grossWt} />
                                </div>

                                <div>
                                    <Label>Net Weight (g) *</Label>
                                    <Field as={Input} type="number" step="0.001" name="netWt" />
                                    <FormError error={touched.netWt && errors.netWt} />
                                </div>

                                <div>
                                    <Label>Making Charge /g *</Label>
                                    <Field as={Input} type="number" name="making" placeholder="800" />
                                </div>

                                <div>
                                    <Label>Quantity *</Label>
                                    <Field as={Input} type="number" name="quantity" min="0" />
                                </div>

                                <div>
                                    <Label>Sold Quantity</Label>
                                    <Field as={Input} type="number" name="sold" min="0" disabled={isEdit} />
                                </div>

                                <div>
                                    <Label>Status *</Label>
                                    <Select value={values.status} onValueChange={(v) => setFieldValue("status", v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Available">Available</SelectItem>
                                            <SelectItem value="Sold">Sold</SelectItem>
                                            <SelectItem value="Reserved">Reserved</SelectItem>
                                            <SelectItem value="Repair">In Repair</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Discount Section */}
                    {!showUpload && (
                        <div className="bg-white p-6 rounded-lg border">
                            <h3 className="text-lg font-semibold mb-4">Discounts</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div>
                                    <Label>Discount on Making</Label>
                                    <Field as={Input} type="number" name="discountOnMaking" placeholder="0" />
                                </div>
                                <div>
                                    <Label>Type</Label>
                                    <Select value={values.discountOnMakingType} onValueChange={(v) => setFieldValue("discountOnMakingType", v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {lookup?.makingChargeTypes?.map((m: string) => (
                                                <SelectItem key={m} value={m}>
                                                    {m}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label>Discount on Diamond</Label>
                                    <Field as={Input} type="number" name="discountOnDiamond" placeholder="0" />
                                </div>

                                <div>
                                    <Label>Discount on Stone</Label>
                                    <Field as={Input} type="number" name="discountOnStone" placeholder="0" />
                                </div>
                                <div>
                                    <Label>Stone Discount Type</Label>
                                    <Select value={values.discountOnStoneType} onValueChange={(v) => setFieldValue("discountOnStoneType", v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        {/* <SelectContent>
                                            <SelectItem value="PERCENT">%</SelectItem>
                                            <SelectItem value="FIXED">₹ Fixed</SelectItem>
                                        </SelectContent> */}
                                        <SelectContent>
                                            {lookup?.discountTypes?.map((m: string) => (
                                                <SelectItem key={m} value={m}>
                                                    {m}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label>Nature of Stock *</Label>
                                    <Select value={values.natureOfStock} onValueChange={(v) => setFieldValue("natureOfStock", v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Stock">Stock</SelectItem>
                                            <SelectItem value="Customer Owned">Customer Owned</SelectItem>
                                            <SelectItem value="Consignment">Consignment</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Description */}
                    {!showUpload && (
                        <div className="bg-white p-6 rounded-lg border">
                            <Label>Description</Label>
                            <Field
                                as="textarea"
                                rows={4}
                                name="description"
                                className="w-full mt-2 border rounded-md p-3 text-sm"
                                placeholder="Add any notes, stone details, design info..."
                            />
                        </div>
                    )}
                    {/* Action Buttons */}
                    {/* Desktop actions (normal flow) */}
                    <div className="hidden justify-end gap-4 pt-8 border-t md:flex">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={isSubmitting || uploadMutation.isPending}
                        >
                            Cancel
                        </Button>

                        {!showUpload && (
                            <Button type="submit" disabled={isSubmitting} size="lg">
                                {isSubmitting && (
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                )}
                                {isEdit ? "Update Item" : "Create Item"}
                            </Button>
                        )}

                        {showUpload && (
                            <Button type="button" size="lg" onClick={() => navigate("/admin/item")}
                            >
                                Save & Finish
                            </Button>
                        )}
                    </div>

                    {/* Mobile actions (fixed footer, safe-area aware) */}
                    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75 md:hidden">
                        <div
                            className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-6 py-3"
                            style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
                        >
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onCancel}
                                disabled={isSubmitting || uploadMutation.isPending}
                                className="w-full"
                            >
                                Cancel
                            </Button>

                            {!showUpload && (
                                <Button type="submit" disabled={isSubmitting} size="lg" className="w-full">
                                    {isSubmitting && (
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    )}
                                    {isEdit ? "Update" : "Create"}
                                </Button>
                            )}

                            {showUpload && (
                                <Button type="button" size="lg" className="w-full" onClick={() => navigate("/admin/item")}
                                >
                                    Save
                                </Button>
                            )}
                        </div>
                    </div>
                </Form>
            )}
        </Formik>
    );
};