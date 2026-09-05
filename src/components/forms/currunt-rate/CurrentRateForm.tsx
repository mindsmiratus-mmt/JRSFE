// components/forms/CurrentRateForm.tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
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

import { useCreateCurrentRate, useUpdateCurrentRate } from "@/hooks/useCurruntrate";
import { useShopLookup } from "@/hooks/useShop";

const CurrentRateSchema = Yup.object().shape({
    description: Yup.string().trim().required("Description is required"),
    rate: Yup.number()
        .typeError("Rate must be a number")
        .positive("Rate must be positive")
        .required("Rate is required"),
    unit: Yup.string().required("Unit is required"),
    purity: Yup.number()
        .typeError("Purity must be a number")
        .positive("Purity must be greater than zero"),
    metalType: Yup.string().required("Metal type is required"),
    makingCharge: Yup.number()
        .typeError("Making charge must be a number")
        .min(0, "Cannot be negative")
        .required("Making charge is required"),
    makingChargeType: Yup.string().required("Making charge type is required"),
    discountOnMaking: Yup.number()
        .typeError("Discount must be a number")
        .min(0, "Cannot be negative")
        .required("Discount is required"),
    discountType: Yup.string().required("Discount type is required"),
});

interface CurrentRateFormProps {
    currentRate?: any;
    onSuccess: (msg: string) => void;
    onCancel: () => void;
}

export const CurrentRateForm = ({ currentRate, onSuccess, onCancel }: CurrentRateFormProps) => {
    const isEdit = !!currentRate;
    const createMutation = useCreateCurrentRate();
    const updateMutation = useUpdateCurrentRate();
    const { data: lookup } = useShopLookup();

    const initialValues = {
        id: currentRate?.id || "",
        description: currentRate?.description || "",
        rate: currentRate?.rate || "",
        unit: currentRate?.unit || "", 
        purity: currentRate?.purity || "", // Maps directly to the number input
        metalType: currentRate?.metalType || "",
        makingCharge: currentRate?.makingCharge || "",
        makingChargeType: currentRate?.makingChargeType || "",
        discountOnMaking: currentRate?.discountOnMaking || "",
        discountType: currentRate?.discountType || "",
    };

    const handleSubmit = async (values: any, { setSubmitting }: any) => {
        const payload = {
            description: values.description.trim(),
            rate: Number(values.rate),
            unit: values.unit,
            purity: String(values.purity), // Cast back to string for the API (e.g. "83.30")
            metalType: values.metalType,
            makingCharge: Number(values.makingCharge),
            makingChargeType: values.makingChargeType,
            discountOnMaking: Number(values.discountOnMaking),
            discountType: values.discountType,
        };

        try {
            if (isEdit) {
                await updateMutation.mutateAsync({ data: { ...payload, id: currentRate.id } });
                onSuccess("Current rate updated successfully!");
            } else {
                await createMutation.mutateAsync({ data: payload });
                onSuccess("Current rate created successfully!");
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to save current rate");
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
            validationSchema={CurrentRateSchema}
            onSubmit={handleSubmit}
            enableReinitialize
        >
            {({ values, errors, touched, setFieldValue, isSubmitting }) => {
                return (
                    <Form className="space-y-8 pb-[calc(9rem+env(safe-area-inset-bottom))] md:pb-0">
                        <div className="bg-white p-6 rounded-lg border">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                                
                                <div className="space-y-2">
                                    <Label>Metal Type *</Label>
                                    <Select
                                        disabled={isEdit} 
                                        value={values.metalType ? String(values.metalType) : undefined}
                                        onValueChange={(val) => {
                                            setFieldValue("metalType", val);
                                            setFieldValue("purity", ""); // Reset purity on metal change
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select metal" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {lookup?.metalTypes?.map((item: string) => (
                                                <SelectItem key={item} value={item}>
                                                    {item}
                                                </SelectItem>
                                            ))}
                                            {values.metalType && !lookup?.metalTypes?.includes(values.metalType) && (
                                                <SelectItem value={values.metalType}>{values.metalType}</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {touched.metalType && <FormError error={errors.metalType} />}
                                </div>

                                <div className="space-y-2">
                                    <Label>ID (Code)</Label>
                                    <Field
                                        as={Input}
                                        name="id"
                                        placeholder="e.g. 22K Gold Rate"
                                        disabled={isEdit}
                                    />
                                    {touched.id && (
                                        <FormError error={errors.id} />
                                    )}
                                </div>

                                <div className="space-y-2 md:col-span-3">
                                    <Label>Description *</Label>
                                    <Field
                                        as={Input}
                                        name="description"
                                        placeholder="e.g. 22K Gold Rate"
                                    />
                                    {touched.description && (
                                        <FormError error={errors.description} />
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>Purity *</Label>
                                    <Field
                                        as={Input}
                                        name="purity"
                                        type="number"
                                        step="0.01"
                                        disabled={isEdit}
                                        placeholder="e.g. 83.30"
                                    />
                                    {touched.purity && <FormError error={errors.purity} />}
                                </div>

                                <div className="space-y-2">
                                    <Label>Rate *</Label>
                                    <Field
                                        as={Input}
                                        name="rate"
                                        type="number"
                                        step="0.01"
                                        placeholder="6200"
                                    />
                                    {touched.rate && <FormError error={errors.rate} />}
                                </div>

                                <div className="space-y-2">
                                    <Label>Unit *</Label>
                                    <Select
                                        value={values.unit ? String(values.unit) : undefined}
                                        onValueChange={(val) => setFieldValue("unit", val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Unit" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {lookup?.units?.map((item: string) => (
                                                <SelectItem key={item} value={item}>
                                                    {item}
                                                </SelectItem>
                                            ))}
                                            {values.unit && !lookup?.units?.includes(values.unit) && (
                                                <SelectItem value={values.unit}>{values.unit}</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {touched.unit && <FormError error={errors.unit} />}
                                </div>

                                <div className="space-y-2">
                                    <Label>Making Charge *</Label>
                                    <Field
                                        as={Input}
                                        name="makingCharge"
                                        type="number"
                                        step="0.01"
                                    />
                                    {touched.makingCharge && (
                                        <FormError error={errors.makingCharge} />
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>Making Charge Type *</Label>
                                    <Select
                                        value={values.makingChargeType ? String(values.makingChargeType) : undefined}
                                        onValueChange={(val) => setFieldValue("makingChargeType", val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {lookup?.makingChargeTypes?.map((item: string) => (
                                                <SelectItem key={item} value={item}>
                                                    {item}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {touched.makingChargeType && <FormError error={errors.makingChargeType} />}
                                </div>

                                <div className="space-y-2">
                                    <Label>
                                        {values.metalType === "Diamond" ? "Discount on Price *" : "Discount on Making *"}
                                    </Label>
                                    <Field
                                        as={Input}
                                        name="discountOnMaking"
                                        type="number"
                                        step="0.01"
                                    />
                                    {touched.discountOnMaking && (
                                        <FormError error={errors.discountOnMaking} />
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>Discount Type *</Label>
                                    <Select
                                        value={values.discountType ? String(values.discountType) : undefined}
                                        onValueChange={(val) => setFieldValue("discountType", val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select discount type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {lookup?.discountTypes?.map((item: string) => (
                                                <SelectItem key={item} value={item}>
                                                    {item}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {touched.discountType && <FormError error={errors.discountType} />}
                                </div>
                            </div>
                        </div>

                        {/* Submit Buttons */}
                        <div className="hidden md:flex justify-end gap-4 pt-8 border-t">
                            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting} size="lg">
                                {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                {isEdit ? "Update Current Rate" : "Create Current Rate"}
                            </Button>
                        </div>

                        {/* Mobile Fixed Action Bar */}
                        <div
                            className="fixed bottom-0 inset-x-0 z-40 border-t bg-white/95 backdrop-blur md:hidden"
                            style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
                        >
                            <div className="mx-auto max-w-7xl px-4 pt-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={onCancel}
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        {isEdit ? "Update" : "Create"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Form>
                );
            }}
        </Formik>
    );
};
