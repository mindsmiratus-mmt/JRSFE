// components/invoice/InvoiceForm.tsx
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Formik, Form, Field, FieldArray } from "formik";
import * as Yup from "yup";
import { toast } from "@/components/ui/toast";

import { useAllCustomer } from "@/hooks/useCustomer";
import {
    useCreateInvoice,
    useUpdateInvoice,
    type CreateInvoiceData,
    type Invoice,
    type UpdateInvoiceData,
} from "@/hooks/useInvoice";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useAllItems } from "@/hooks/useItem";
import { DateInput } from "@/components/ui/DatePicker";
import { cn } from "@/lib/utils";

// ========================
// Validation Schema
// ========================
const InvoiceItemSchema = Yup.object().shape({
    itemId: Yup.number().required("Please select an item"),
    weight: Yup.number()
        .min(0.001, "Weight must be greater than 0")
        .required("Weight is required"),
    rate: Yup.number()
        .min(1, "Rate must be greater than 0")
        .required("Rate is required"),
    makingCharge: Yup.number().min(0).default(0),
});

const InvoiceSchema = Yup.object().shape({
    customerId: Yup.number().required("Please select a customer"),
    invoiceDate: Yup.date().required("Invoice date is required"),
    cgst: Yup.number().min(0).max(100).default(1.5),
    sgst: Yup.number().min(0).max(100).default(1.5),
    paidAmount: Yup.number().min(0).default(0),
    status: Yup.string().oneOf(["PAID", "PARTIAL", "UNPAID"]).default("UNPAID"),
    items: Yup.array().of(InvoiceItemSchema).min(1, "Add at least one item"),
});

// ========================
// Main Invoice Form (Add + Edit in one)
// ========================
interface InvoiceFormProps {
    invoice?: Invoice;
    onSuccess: (msg: string) => void;
    onCancel: () => void;
}

export const InvoiceForm = ({ invoice, onSuccess, onCancel }: InvoiceFormProps) => {
    const isEdit = !!invoice;

    const { data: customers = [] } = useAllCustomer();
    const { data: allItems = [] } = useAllItems();
    const createMutation = useCreateInvoice();
    const updateMutation = useUpdateInvoice();

    // Initial values
    const initialValues = {
        customerId: invoice?.customerId || "",
        invoiceDate: invoice?.invoiceDate?.split("T")[0] || new Date().toISOString().split("T")[0],
        cgst: invoice?.cgst ?? 1.5,
        sgst: invoice?.sgst ?? 1.5,
        paidAmount: invoice?.paidAmount ?? 0,
        status: invoice?.status || "UNPAID",
        items: invoice?.items?.map(it => ({
            itemId: it.itemId,
            itemName: it.itemName || "",
            goldKT: it.gPurityId || "",
            barcode: it.tagNumber || "",
            weight: it.netWeight || it.grossWeight || "", 
            rate: it.goldRate || it.diamondRate || it.stoneRate || "", 
            makingCharge: it.makingCharges ?? 0,
        })) || [
                {
                    itemId: "",
                    itemName: "",
                    goldKT: "",
                    barcode: "",
                    weight: "",
                    rate: "",
                    makingCharge: 0,
                }
            ],
    };

    const handleSubmit = async (values: any, { setSubmitting }: any) => {
        // calculate subtotal
        const subtotal = values.items.reduce((sum: number, it: any) => {
            const weight = Number(it.weight) || 0;
            const rate = Number(it.rate) || 0;
            const makingCharge = Number(it.makingCharge) || 0;
            return sum + (weight * rate + makingCharge);
        }, 0);

        const cgst = Number(values.cgst) || 0;
        const sgst = Number(values.sgst) || 0;

        const tax = subtotal * (cgst + sgst) / 100;
        const totalAmount = subtotal + tax;

        const payload: CreateInvoiceData | UpdateInvoiceData = {
            invoiceDate: new Date(values.invoiceDate).toISOString(),
            customerId: Number(values.customerId),
            cgst,
            sgst,
            paidAmount: Number(values.paidAmount),
            totalAmount: Number(totalAmount.toFixed(2)),
            status: values.status,
            items: values.items.map((it: any) => ({
                itemId: Number(it.itemId),
                weight: Number(it.weight),
                rate: Number(it.rate),
                makingCharge: Number(it.makingCharge || 0),
                ...(isEdit && it.id ? { id: it.id } : {}) // Include ID for update payload
            })),
        };

        try {
            if (isEdit) {
                await updateMutation.mutateAsync({ id: invoice!.id, data: { ...payload, id: invoice!.id, invoiceNo: invoice!.invoiceNo } });
                onSuccess("Invoice updated successfully!");
            } else {
                await createMutation.mutateAsync(payload as CreateInvoiceData);
                onSuccess("Invoice created successfully!");
            }
        } catch (err: any) {
            console.error("Invoice save error:", err);
            toast.error(err?.response?.data?.message || "Failed to save invoice");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Formik
            enableReinitialize
            initialValues={initialValues}
            validationSchema={InvoiceSchema}
            onSubmit={handleSubmit}
        >
            {({ values, errors, touched, setFieldValue, isSubmitting }) => {
                // Live calculations
                const subtotal = values.items.reduce((sum: number, it: any) => {
                    const weight = Number(it.weight) || 0;
                    const rate = Number(it.rate) || 0;
                    const makingCharge = Number(it.makingCharge) || 0;
                    return sum + (weight * rate + makingCharge);
                }, 0);

                const cgst = Number(values.cgst) || 0;
                const sgst = Number(values.sgst) || 0;

                const tax = subtotal * (cgst + sgst) / 100;
                const grandTotal = subtotal + tax;
                const balance = grandTotal - (Number(values.paidAmount) || 0);

                // Auto update status
                useEffect(() => {
                    if (grandTotal === 0) return;
                    const paid = Number(values.paidAmount) || 0;
                    if (paid >= grandTotal) setFieldValue("status", "PAID");
                    else if (paid > 0) setFieldValue("status", "PARTIAL");
                    else setFieldValue("status", "UNPAID");
                }, [values.paidAmount, grandTotal, setFieldValue]);

                return (
                    <Form className={cn("space-y-8", "pb-[calc(9rem+env(safe-area-inset-bottom))] md:pb-0")}>
                        {/* Header Section */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 rounded-lg border">
                            <div className="space-y-2">
                                <Label>Customer *</Label>
                                <SearchableSelect
                                    value={values.customerId}
                                    onChange={(v) => setFieldValue("customerId", v ? Number(v) : undefined)}
                                    placeholder="Select customer"
                                    options={customers.map((c) => ({
                                        value: c.id,
                                        label: c.name,
                                    }))}
                                />
                                {touched.customerId && errors.customerId && (
                                    <p className="text-sm text-red-500">{errors.customerId}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Invoice Date *</Label>
                                <DateInput
                                    value={values.invoiceDate}
                                    onValueChange={(v) =>
                                        setFieldValue("invoiceDate", v)
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Paid Amount</Label>
                                <Input
                                    value={values.paidAmount}
                                    onChange={(e) => setFieldValue("paidAmount", Number(e.target.value) || 0)}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        {/* Items Section */}
                        <div className="bg-white rounded-lg border overflow-hidden">
                            <div className="p-6 border-b bg-gray-50">
                                <h3 className="text-lg font-semibold">Invoice Items</h3>
                            </div>

                            <FieldArray name="items">
                                {({ push, remove }) => (
                                    <div className="p-6 space-y-6">
                                        {values.items.map((item: any, index: number) => (
                                            <div key={index} className="space-y-4">

                                                {/* MOBILE CARD */}
                                                <div className="md:hidden bg-gray-50 rounded-lg p-4 space-y-4">
                                                    {/* Item */}
                                                    <div>
                                                        <Label>Item</Label>
                                                        <Select
                                                            value={String(item.itemId)}
                                                            onValueChange={(v) => {
                                                                const selectedItem = allItems.find((i: any) => i.id === Number(v));
                                                                setFieldValue(`items.${index}.itemId`, Number(v));
                                                                setFieldValue(`items.${index}.itemName`, selectedItem?.name || "");
                                                                setFieldValue(`items.${index}.goldKT`, selectedItem?.goldKT || "");
                                                                setFieldValue(`items.${index}.barcode`, selectedItem?.barcode || "");
                                                                setFieldValue(`items.${index}.rate`, selectedItem?.making || 0);
                                                            }}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select item">
                                                                    {item.itemName && (
                                                                        <div>
                                                                            <div className="font-medium">{item.itemName}</div>
                                                                            <div className="text-xs text-gray-500">{item.goldKT} • {item.barcode}</div>
                                                                        </div>
                                                                    )}
                                                                </SelectValue>
                                                            </SelectTrigger>
                                                            <SelectContent className="max-h-64">
                                                                {allItems.map((it: any) => (
                                                                    <SelectItem key={it.id} value={String(it.id)}>
                                                                        <div>
                                                                            <div className="font-medium">{it.name}</div>
                                                                            <div className="text-xs text-gray-500">{it.goldKT} • ₹{it.making}/g • {it.barcode}</div>
                                                                        </div>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    {/* Inputs */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <Label>Weight (g)</Label>
                                                            <Field as={Input} type="number" step="0.001" name={`items.${index}.weight`} />
                                                        </div>
                                                        <div>
                                                            <Label>Rate / g</Label>
                                                            <Field as={Input} type="number" name={`items.${index}.rate`} />
                                                        </div>
                                                        <div className="col-span-2">
                                                            <Label>Making Charge</Label>
                                                            <Field as={Input} type="number" name={`items.${index}.makingCharge`} />
                                                        </div>
                                                    </div>

                                                    {/* Amount + Delete */}
                                                    <div className="flex justify-between items-center pt-2">
                                                        <div className="font-semibold text-blue-600">
                                                            Amount: ₹{((Number(item.weight) || 0) * (Number(item.rate) || 0) + (Number(item.makingCharge) || 0)).toLocaleString("en-IN")}
                                                        </div>
                                                        {index !== 0 && (
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-red-600">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* DESKTOP GRID */}
                                                <div className="hidden md:grid grid-cols-12 gap-4 items-end border-b pb-6 last:border-0">
                                                    <div className="col-span-5">
                                                        <Label>Item</Label>
                                                        <Select
                                                            value={String(item.itemId)}
                                                            onValueChange={(v) => {
                                                                const selectedItem = allItems.find((i: any) => i.id === Number(v));
                                                                setFieldValue(`items.${index}.itemId`, Number(v));
                                                                setFieldValue(`items.${index}.itemName`, selectedItem?.name || "");
                                                                setFieldValue(`items.${index}.goldKT`, selectedItem?.goldKT || "");
                                                                setFieldValue(`items.${index}.barcode`, selectedItem?.barcode || "");
                                                                setFieldValue(`items.${index}.rate`, selectedItem?.making || 0);
                                                            }}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select item">
                                                                    {item.itemName && (
                                                                        <div>
                                                                            <div className="font-medium">{item.itemName}</div>
                                                                            <div className="text-xs text-gray-500">{item.goldKT} • {item.barcode}</div>
                                                                        </div>
                                                                    )}
                                                                </SelectValue>
                                                            </SelectTrigger>
                                                            <SelectContent className="max-h-64">
                                                                {allItems.map((it: any) => (
                                                                    <SelectItem key={it.id} value={String(it.id)}>
                                                                        <div>
                                                                            <div className="font-medium">{it.name}</div>
                                                                            <div className="text-xs text-gray-500">{it.goldKT} • ₹{it.making}/g • {it.barcode}</div>
                                                                        </div>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <Label>Weight (g)</Label>
                                                        <Field as={Input} type="number" step="0.001" name={`items.${index}.weight`} />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <Label>Rate/g</Label>
                                                        <Field as={Input} type="number" name={`items.${index}.rate`} />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <Label>Making Charge</Label>
                                                        <Field as={Input} type="number" name={`items.${index}.makingCharge`} />
                                                    </div>
                                                    <div className="col-span-1 text-right">
                                                        <Label>Amount</Label>
                                                        <div className="font-semibold text-blue-600">
                                                            ₹{((Number(item.weight) || 0) * (Number(item.rate) || 0) + (Number(item.makingCharge) || 0)).toLocaleString("en-IN")}
                                                        </div>
                                                    </div>
                                                    {index !== 0 && (
                                                        <div className="col-span-1">
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-red-600 hover:bg-red-50">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        <Button type="button" variant="outline" onClick={() => push({ itemId: "", weight: "", rate: "", makingCharge: 0 })} className="w-full">
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Another Item
                                        </Button>
                                    </div>
                                )}
                            </FieldArray>
                        </div>

                        {/* Summary */}
                        <div className="bg-white p-6 rounded-lg border space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <Label>CGST (%)</Label>
                                    <Field
                                        as={Input}
                                        type="number"
                                        step="0.01"
                                        name="cgst"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <Label>SGST (%)</Label>
                                    <Field
                                        as={Input}
                                        type="number"
                                        step="0.01"
                                        name="sgst"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <Label>Status</Label>
                                    <div className="pt-2 font-medium">{values.status}</div>
                                </div>
                            </div>

                            <div className="border-t pt-6 space-y-3 text-lg">
                                <div className="flex justify-between">
                                    <span>Subtotal:</span>
                                    <span className="font-semibold">₹{subtotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Tax ({(cgst + sgst).toFixed(2)}%):</span>
                                    <span>₹{tax.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-2xl font-bold text-blue-600">
                                    <span>Grand Total:</span>
                                    <span>₹{grandTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-xl">
                                    <span>Balance Due:</span>
                                    <span className={balance > 0 ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                                        ₹{balance.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        {/* Desktop actions (normal flow) */}
                        <div className="hidden justify-end gap-4 pt-8 border-t md:flex">
                            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting} size="lg">
                                {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                {isEdit ? "Update Invoice" : "Create Invoice"}
                            </Button>
                        </div>

                        {/* Mobile actions (fixed footer, safe-area aware) */}
                        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75 md:hidden">
                            <div
                                className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-6 py-3"
                                style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
                            >
                                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="w-full">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting} size="lg" className="w-full">
                                    {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                    {isEdit ? "Update" : "Create"}
                                </Button>
                            </div>
                        </div>
                    </Form>
                );
            }}
        </Formik>
    );
};