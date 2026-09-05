// components/advance-order/AdvanceOrderForm.tsx
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
import { Formik, Form, Field, FieldArray, type FormikHelpers, useFormikContext } from "formik";
import * as Yup from "yup";
import { toast } from "@/components/ui/toast";

import { useAllCustomer } from "@/hooks/useCustomer";
import { useCreateAdvanceOrder, useUpdateAdvanceOrder } from "@/hooks/useAdvanceOrder";
import type { AdvanceOrder, CreateAdvanceOrderData, UpdateAdvanceOrderData } from "@/hooks/useAdvanceOrder";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { DateInput } from "@/components/ui/DatePicker";
import { useAllItems } from "@/hooks/useItem";
import { cn } from "@/lib/utils";

const OrderItemSchema = Yup.object().shape({
    itemId: Yup.number().required("Please select an item"),
    weight: Yup.number().min(0.001, "Weight must be > 0").required("Weight required"),
    rate: Yup.number().min(1, "Rate must be > 0").required("Rate required"),
    makingCharge: Yup.number().min(0).default(0),
});

const AdvanceOrderSchema = Yup.object().shape({
    customerId: Yup.number().required("Customer is required"),
    orderDate: Yup.date().required("Order date required"),
    deliveryDate: Yup.date().required("Delivery date required").min(Yup.ref("orderDate"), "Delivery date cannot be before order date"),
    advanceAmount: Yup.number().min(0).required(),
    status: Yup.string().oneOf(["PENDING", "PROCESSING", "READY", "DELIVERED"]).default("PENDING"),
    items: Yup.array().of(OrderItemSchema).min(1, "Add at least one item"),
});

interface AdvanceOrderFormProps {
    order?: AdvanceOrder;
    onSuccess: (msg: string) => void;
    onCancel: () => void;
}

type AdvanceOrderStatus = "PENDING" | "PROCESSING" | "READY" | "DELIVERED";

type ItemLookup = {
    id: number;
    name: string;
    barcode?: string;
    goldKT?: string;
    netWt?: number;
    making?: number;
};

type AdvanceOrderItemForm = {
    itemId: number | "";
    item: ItemLookup | null;
    weight: number | "";
    rate: number | "";
    makingCharge: number;
};

type AdvanceOrderFormValues = {
    customerId: number | "";
    orderDate: string;
    deliveryDate: string;
    totalAmount: number;
    advanceAmount: number;
    status: AdvanceOrderStatus;
    items: AdvanceOrderItemForm[];
};

type ApiError = {
    response?: {
        data?: {
            message?: string;
        };
    };
};

const AdvanceOrderStatusSync = () => {
    const { values, setFieldValue } = useFormikContext<AdvanceOrderFormValues>();

    const subtotal = values.items.reduce((sum, it) => {
        return (
            sum +
            (Number(it.weight) || 0) * (Number(it.rate) || 0) +
            (Number(it.makingCharge) || 0)
        );
    }, 0);

    useEffect(() => {
        const nextStatus: AdvanceOrderStatus =
            subtotal === values.advanceAmount && subtotal > 0
                ? "DELIVERED"
                : values.advanceAmount > 0
                    ? "PROCESSING"
                    : "PENDING";

        if (values.status !== nextStatus) {
            setFieldValue("status", nextStatus);
        }
    }, [setFieldValue, subtotal, values.advanceAmount, values.status]);

    return null;
};

export const AdvanceOrderForm = ({ order, onSuccess, onCancel }: AdvanceOrderFormProps) => {
    const isEdit = !!order;

    const { data: customers = [] } = useAllCustomer();
    const { data: allItems = [] } = useAllItems();

    const createMutation = useCreateAdvanceOrder();
    const updateMutation = useUpdateAdvanceOrder();

    const initialValues: AdvanceOrderFormValues = {
        customerId: order?.customerId || "",
        orderDate: order?.orderDate.split("T")[0] || "",
        deliveryDate: order?.deliveryDate.split("T")[0] || "",
        totalAmount: order?.totalAmount || 0,
        advanceAmount: order?.advanceAmount ?? 0,
        status: (order?.status as AdvanceOrderStatus) || "PENDING",
        items: order?.items.map((it) => ({
            itemId: it.itemId,
            item: it.item as unknown as ItemLookup,
            weight: it.weight,
            rate: it.rate,
            makingCharge: it.makingCharge || 0,
        })) || [{ itemId: "", item: null, weight: "", rate: "", makingCharge: 0 }],
    };

    const handleSubmit = async (
        values: AdvanceOrderFormValues,
        { setSubmitting }: FormikHelpers<AdvanceOrderFormValues>
    ) => {
        // ✅ TOTAL AMOUNT CALCULATION
        const totalAmount = values.items.reduce(
            (sum, it) =>
                sum +
                (Number(it.weight) || 0) * (Number(it.rate) || 0) +
                (Number(it.makingCharge) || 0),
            0
        );

        const payload: CreateAdvanceOrderData | UpdateAdvanceOrderData = {
            customerId: Number(values.customerId),
            orderDate: new Date(values.orderDate).toISOString(),
            deliveryDate: new Date(values.deliveryDate).toISOString(),

            totalAmount: Number(totalAmount), // ✅ SEND
            advanceAmount: Number(values.advanceAmount),

            status: values.status,
            items: values.items.map((it) => ({
                itemId: Number(it.itemId),
                weight: Number(it.weight),
                rate: Number(it.rate),
                makingCharge: Number(it.makingCharge),
            })),
        };

        try {
            if (isEdit) {
                await updateMutation.mutateAsync({
                    id: order!.id,
                    data: { ...payload, id: order!.id, orderNo: order!.orderNo } as UpdateAdvanceOrderData,
                });
                onSuccess("Advance order updated successfully!");
            } else {
                await createMutation.mutateAsync(
                    payload as CreateAdvanceOrderData
                );
                onSuccess("Advance order created successfully!");
            }
        } catch (err: unknown) {
            const message = (err as ApiError)?.response?.data?.message;
            toast.error(message || "Failed to save advance order");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Formik
            enableReinitialize
            initialValues={initialValues}
            validationSchema={AdvanceOrderSchema}
            onSubmit={handleSubmit}
        >
            {({ values, errors, touched, setFieldValue, isSubmitting }) => {
                const subtotal = values.items.reduce((sum, it) => {
                    return sum + (Number(it.weight) || 0) * (Number(it.rate) || 0) + (Number(it.makingCharge) || 0);
                }, 0);

                const balance = subtotal - (values.advanceAmount || 0);

                return (
                    <Form className={cn("space-y-10", "pb-[calc(9rem+env(safe-area-inset-bottom))] md:pb-0")}>
                        <AdvanceOrderStatusSync />
                        {/* Header Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-white p-6 rounded-xl border border-[#f0ddcb] shadow-sm">

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
                            </div>

                            <div className="space-y-2">
                                <Label>Order Date *</Label>
                                <DateInput
                                    value={values.orderDate}
                                    onValueChange={(date) => setFieldValue("orderDate", date)}
                                    placeholder="Pick a date"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Delivery Date *</Label>
                                <DateInput
                                    value={values.deliveryDate}
                                    onValueChange={(date) => setFieldValue("deliveryDate", date)}
                                    placeholder="Pick a date"
                                />
                                {touched.deliveryDate && errors.deliveryDate && <p className="text-sm text-red-500">{errors.deliveryDate}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label>Advance Amount</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={values.advanceAmount}
                                    onChange={e => setFieldValue("advanceAmount", Number(e.target.value) || 0)}
                                />
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border">
                            <div className="p-6 border-b bg-gray-50">
                                <h3 className="text-lg font-semibold">Order Items</h3>
                            </div>

                            <FieldArray name="items">
                                {({ push, remove }) => (
                                    <div className="p-6 space-y-6">
                                        {values.items.map((item: AdvanceOrderItemForm, index: number) => (
                                            <div key={index}>
                                                {/* MOBILE CARD */}
                                                <div className="md:hidden bg-gray-50 rounded-lg p-4 space-y-3">
                                                    <Label>Item</Label>
                                                    <Select value={item.itemId ? String(item.itemId) : ""} onValueChange={(v) => {
                                                        const selected = allItems.find((i: ItemLookup) => i.id === Number(v));
                                                        if (!selected) return;
                                                        setFieldValue(`items.${index}`, {
                                                            itemId: selected.id,
                                                            item: selected,
                                                            weight: selected.netWt || "",
                                                            rate: "",
                                                            makingCharge: selected.making || 0,
                                                        });
                                                    }}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select item">
                                                                {item.item && (
                                                                    <div>
                                                                        <div className="font-medium">{item.item.name}</div>
                                                                        <div className="text-xs text-gray-500">{item.item.goldKT} • {item.item.barcode}</div>
                                                                    </div>
                                                                )}
                                                            </SelectValue>
                                                        </SelectTrigger>
                                                        <SelectContent className="max-h-64">
                                                            {allItems.map((it: ItemLookup) => (
                                                                <SelectItem key={it.id} value={String(it.id)}>
                                                                    <div>
                                                                        <div className="font-medium">{it.name}</div>
                                                                        <div className="text-xs text-gray-500">{it.goldKT} • {it.barcode}</div>
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <Label>Weight</Label>
                                                            <Field as={Input} type="number" name={`items.${index}.weight`} />
                                                        </div>
                                                        <div>
                                                            <Label>Rate</Label>
                                                            <Field as={Input} type="number" name={`items.${index}.rate`} />
                                                        </div>
                                                        <div className="col-span-2">
                                                            <Label>Making</Label>
                                                            <Field as={Input} type="number" name={`items.${index}.makingCharge`} />
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between items-center pt-2">
                                                        <div className="font-semibold text-blue-600">
                                                            Amount: ₹{((Number(item.weight) || 0) * (Number(item.rate) || 0) + (Number(item.makingCharge) || 0)).toLocaleString("en-IN")}
                                                        </div>
                                                        {index !== 0 && <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-red-600"><Trash2 className="h-4 w-4" /></Button>}
                                                    </div>
                                                </div>

                                                {/* DESKTOP GRID */}
                                                <div className="hidden md:grid grid-cols-12 gap-4 items-end border-b pb-6 last:border-0">
                                                    <div className="col-span-5">
                                                        <Label>Item</Label>
                                                        <Select value={item.itemId ? String(item.itemId) : ""} onValueChange={(v) => {
                                                            const selected = allItems.find((i: ItemLookup) => i.id === Number(v));
                                                            if (!selected) return;
                                                            setFieldValue(`items.${index}`, {
                                                                itemId: selected.id,
                                                                item: selected,
                                                                weight: selected.netWt || "",
                                                                rate: "",
                                                                makingCharge: selected.making || 0,
                                                            });
                                                        }}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select item">
                                                                    {item.item && (
                                                                        <div>
                                                                            <div className="font-medium">{item.item.name}</div>
                                                                            <div className="text-xs text-gray-500">{item.item.goldKT} • {item.item.barcode}</div>
                                                                        </div>
                                                                    )}
                                                                </SelectValue>
                                                            </SelectTrigger>
                                                            <SelectContent className="max-h-64">
                                                                {allItems.map((it: ItemLookup) => (
                                                                    <SelectItem key={it.id} value={String(it.id)}>
                                                                        <div>
                                                                            <div className="font-medium">{it.name}</div>
                                                                            <div className="text-xs text-gray-500">{it.goldKT} • {it.barcode}</div>
                                                                        </div>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <Label>Weight</Label>
                                                        <Field as={Input} type="number" name={`items.${index}.weight`} />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <Label>Rate</Label>
                                                        <Field as={Input} type="number" name={`items.${index}.rate`} />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <Label>Making</Label>
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
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        <Button type="button" variant="outline" className="w-full" onClick={() => push({ itemId: "", item: null, weight: "", rate: "", makingCharge: 0 })}>
                                            <Plus className="w-4 h-4 mr-2" /> Add Another Item
                                        </Button>
                                    </div>
                                )}
                            </FieldArray>
                        </div>


                        {/* Summary */}
                        <div className="bg-white p-6 rounded-lg border space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div>
                                    <Label>Status</Label>
                                    <div className="pt-2 font-medium">{values.status}</div>
                                </div>
                            </div>

                            <div className="border-t pt-6 space-y-3 text-lg">
                                <div className="flex justify-between text-lg">
                                    <span>Total Amount:</span>
                                    <span className="font-bold text-[#3a2f1f]">
                                        ₹{subtotal.toLocaleString("en-IN")}
                                    </span>
                                </div>

                                <div className="flex justify-between text-green-700">
                                    <span>Advance Paid:</span>
                                    <span className="font-bold">
                                        ₹{values.advanceAmount.toLocaleString("en-IN")}
                                    </span>
                                </div>

                                <div className="flex justify-between text-xl font-bold">
                                    <span>Balance to Pay:</span>
                                    <span className={balance > 0 ? "text-red-600" : "text-green-700"}>
                                        ₹{balance.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        {/* Desktop / Tablet actions (normal flow) */}
                        <div className="hidden justify-end gap-4 pt-8 border-t md:flex">
                            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                                Cancel
                            </Button>

                            <Button type="submit" disabled={isSubmitting} size="lg">
                                {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                {isEdit ? "Update Order" : "Create Order"}
                            </Button>
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
                );
            }}
        </Formik>
    );
};