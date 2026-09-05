// components/CurrentRateForm.tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Validation Schema (shared)
export const CurrentRateSchema = Yup.object().shape({
    description: Yup.string().trim().required("Description is required"),
    rate: Yup.number()
        .typeError("Rate must be a number")
        .positive("Rate must be positive")
        .required("Rate is required"),
    unit: Yup.string().required("Unit is required"),
    purity: Yup.string().required("Purity is required"),
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
    initialValues: any;
    onSubmit: (values: any, actions: any) => void;
    onCancel: () => void;
    isSubmitting: boolean;
    lookup?: any;
    purity?: any;
}

const FormError = ({ error }: { error: any }) => {
    if (!error) return null;
    if (typeof error === "string") {
        return <p className="text-sm text-red-500 mt-1">{error}</p>;
    }
    return null;
};

export const CurrentRateForm = ({
    initialValues,
    onSubmit,
    onCancel,
    isSubmitting,
    lookup,
    purity
}: CurrentRateFormProps) => {
    return (
        <Formik
            enableReinitialize
            initialValues={initialValues}
            validationSchema={CurrentRateSchema}
            onSubmit={onSubmit}
            validateOnBlur={true}
            validateOnChange={false}
        >
            {({ errors, touched, setFieldValue, values }) => (
                <Form noValidate>
                    <div className="grid grid-cols-3 gap-4 py-4">
                        {/* Row 1 */}
                        <div className="space-y-2">
                            <Label>Rate</Label>
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
                            <Label>Unit</Label>
                            {/* <Field as={Input} name="unit" placeholder="per gram" /> */}
                            <Select
                                value={values.unit}
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
                                </SelectContent>
                            </Select>
                            {touched.unit && <FormError error={errors.unit} />}
                        </div>

                        <div className="space-y-2">
                            <Label>Metal Type</Label>
                            <Select
                                value={values.metalType}
                                onValueChange={(val) => setFieldValue("metalType", val)}
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
                                </SelectContent>
                            </Select>
                            {touched.metalType && <FormError error={errors.metalType} />}
                        </div>

                        {/* Row 2 */}
                        <div className="space-y-2">
                            <Label>Purity</Label>
                            <Select value={values.purity} onValueChange={(v) => setFieldValue("purity", v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select purity" />
                                </SelectTrigger>
                                <SelectContent>
                                    {purity?.goldPurity?.map((kt: any) => (
                                        <SelectItem key={kt} value={kt}>{kt}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {touched.purity && <FormError error={errors.purity} />}
                        </div>

                        <div className="space-y-2">
                            <Label>Making Charge</Label>
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
                            <Label>Making Charge Type</Label>
                            <Select
                                value={values.makingChargeType}
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
                            {touched.makingChargeType && (
                                <FormError error={errors.makingChargeType} />
                            )}
                        </div>

                        {/* Row 3 */}
                        <div className="space-y-2">
                            <Label>Discount on Making</Label>
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
                            <Label>Discount Type</Label>
                            <Select
                                value={values.discountType}
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
                            {touched.discountType && (
                                <FormError error={errors.discountType} />
                            )}
                        </div>

                        {/* Empty cell to complete row */}
                        <div />

                        {/* Description - Full Row */}
                        <div className="space-y-2 col-span-3">
                            <Label>Description</Label>
                            <Field
                                as={Input}
                                name="description"
                                placeholder="e.g. 22K Gold Rate"
                            />
                            {touched.description && (
                                <FormError error={errors.description} />
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onCancel}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Update Rate
                        </Button>
                    </div>
                </Form>
            )}
        </Formik>
    );
};