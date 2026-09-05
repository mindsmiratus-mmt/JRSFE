// components/customer/CustomerForm.tsx
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
import { DateInput } from "@/components/ui/DatePicker";
import {
    useAllCustomer,
    useCreateCustomer,
    useUpdateCustomer,
    type CreateCustomerData,
    type UpdateCustomerData,
} from "@/hooks/useCustomer";
import { SelectSearchColor } from "@/components/ui/SelectSearchColor";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// ========================
// Validation Schema
// ========================
const CustomerSchema = Yup.object().shape({
    name: Yup.string().trim().min(2).required("Name is required"),
    phone: Yup.string()
        .matches(/^[6-9]\d{9}$/, "Invalid Indian mobile number")
        .required("Phone is required"),
    // email: Yup.string().email("Invalid email"),
    dateOfBirth: Yup.date()
        .nullable()
        .max(new Date(), "Date of birth cannot be in the future"),
    // gender: Yup.string().required("Gender is required"),
    address: Yup.string(),
    city: Yup.string(),
    state: Yup.string(),
    pinCode: Yup.string()
        .matches(/^\d{6}$/, "PIN code must be 6 digits"),
    gstin: Yup.string()
        .matches(
            /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
            "Invalid GSTIN"
        )
        .optional(),
    pan: Yup.string()
        .matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN")
        .optional(),
    adharNo: Yup.string()
        .matches(/^\d{12}$/, "Aadhaar must be 12 digits")
        .optional(),
    referralId: Yup.string().optional(),
});

// ========================
// Props
// ========================
interface CustomerFormProps {
    customer?: any;
    onSuccess: (msg: string) => void;
    onCancel: () => void;
}

export const CustomerForm = ({
    customer,
    onSuccess,
    onCancel,
}: CustomerFormProps) => {
    const isEdit = !!customer;
    const createMutation = useCreateCustomer();
    const { data: customers = [], isLoading: customerLoading } = useAllCustomer();
    const updateMutation = useUpdateCustomer();

    const initialValues = {
        name: customer?.name || "",
        phone: customer?.phone || "",
        email: customer?.email || null,
        dateOfBirth: customer?.dateOfBirth?.split("T")[0] ?? null,
        gender: customer?.gender || "",
        gstin: customer?.gstin || "",
        pan: customer?.pan || "",
        adharNo: customer?.adharNo || "",
        address: customer?.address || "",
        city: customer?.city || "",
        state: customer?.state || "",
        pinCode: customer?.pinCode || "",
        referralId: customer?.referralId || "",
        isActive: customer?.isActive ?? true,
    };

    const handleSubmit = async (values: any, { setSubmitting }: any) => {
        if (isEdit && values.referralId) {
            // 1. Check for self-referral
            if (String(values.referralId) === String(customer?.id)) {
                toast.error("A customer cannot be their own reference.");
                setSubmitting(false);
                return;
            }

            // 2. Check for mutual/cyclic referral
            const selectedReferenceUser = customers.find(
                (c: any) => String(c.id) === String(values.referralId)
            );

            if (
                selectedReferenceUser &&
                String(selectedReferenceUser.referralId) === String(customer?.id)
            ) {
                toast.error(
                    `Mutual referral blocked: ${selectedReferenceUser.name} is already referred by you!`
                );
                setSubmitting(false);
                return;
            }
        }

        const payload: CreateCustomerData | UpdateCustomerData = {
            ...values,
            referralId: values.referralId || undefined,
            dateOfBirth: values.dateOfBirth
                ? new Date(values.dateOfBirth).toISOString()
                : null,
            isActive: values.isActive ?? true,
        };

        try {
            if (isEdit) {
                await updateMutation.mutateAsync({
                    id: customer.id,
                    data: { ...payload, id: customer.id },
                });
                onSuccess("Customer updated successfully!");
            } else {
                await createMutation.mutateAsync(payload as CreateCustomerData);
                onSuccess("Customer created successfully!");
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to save customer");
        } finally {
            setSubmitting(false);
        }
    };

    const ErrorText = ({ error }: { error?: string }) => {
        if (!error) return null;
        return <p className="text-sm text-red-500">{error}</p>;
    };

    return (
        <Formik
            initialValues={initialValues}
            validationSchema={CustomerSchema}
            onSubmit={handleSubmit}
            enableReinitialize
        >
            {({ values, errors, touched, isSubmitting, setFieldValue }) => (
                <Form
                    className={cn(
                        "space-y-8 bg-white p-8 rounded-lg border",
                        "pb-[calc(9rem+env(safe-area-inset-bottom))] md:pb-8"
                    )}
                >
                    {/* Personal Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <Label>Full Name *</Label>
                            <Field
                                placeholder="Enter full name"
                                as={Input}
                                name="name"
                            />
                            {touched.name && (
                                <ErrorText error={errors.name as string} />
                            )}
                        </div>

                        <div>
                            <Label>Phone *</Label>
                            <Field
                                placeholder="10-digit mobile number"
                                as={Input}
                                name="phone"
                            />
                            {touched.phone && (
                                <ErrorText error={errors.phone as string} />
                            )}
                        </div>

                        <div>
                            <Label>Email</Label>
                            <Field
                                placeholder="Enter email address"
                                as={Input}
                                type="email"
                                name="email"
                            />
                            {touched.email && (
                                <ErrorText error={errors.email as string} />
                            )}
                        </div>

                        <div>
                            <Label>Date of Birth</Label>
                            <DateInput
                                value={values.dateOfBirth}
                                onValueChange={(v) => setFieldValue("dateOfBirth", v)}
                                max={new Date().toISOString().slice(0, 10)}
                                placeholder="Select date of birth"
                            />
                            {touched.dateOfBirth && (
                                <ErrorText error={errors.dateOfBirth as string} />
                            )}
                        </div>

                        <div>
                            <Label>Gender *</Label>
                            <Select
                                value={values.gender}
                                onValueChange={(v) => setFieldValue("gender", v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Female">Female</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                            {touched.gender && (
                                <ErrorText error={errors.gender as string} />
                            )}
                        </div>

                        <div>
                            <Label>GSTIN</Label>
                            <Field
                                placeholder="22AAAAA0000A1Z5"
                                as={Input}
                                name="gstin"
                            />
                        </div>

                        <div>
                            <Label>PAN</Label>
                            <Field
                                placeholder="ABCDE1234F"
                                as={Input}
                                name="pan"
                            />
                        </div>

                        <div>
                            <Label>Aadhaar</Label>
                            <Field
                                placeholder="12-digit Aadhaar number"
                                as={Input}
                                name="adharNo"
                            />
                        </div>

                        {/* Referred By */}
                        <div>
                            <Label>Referred By</Label>
                            <SelectSearchColor
                                value={values.referralId}
                                onChange={(v) => setFieldValue("referralId", v || "")}
                                placeholder={
                                    customerLoading
                                        ? "Loading customers..."
                                        : "Select Customer"
                                }
                                options={[
                                    ...(customers
                                        ?.filter(
                                            (c: any) =>
                                                !isEdit ||
                                                String(c.id) !== String(customer?.id)
                                        )
                                        .map((c: any) => ({
                                            value: String(c.id),
                                            label: `${c.id} | ${c.name} | ${c.phone} | ${c.email ?? ""}`,
                                        })) || []),
                                ]}
                                disabled={customerLoading}
                                emptyStateColor="orange"
                                selectedStateColor="green"
                            />
                            {touched.referralId && (
                                <ErrorText error={errors.referralId as string} />
                            )}
                        </div>
                    </div>

                    {/* Address */}
                    <div>
                        <Label>Address</Label>
                        <Field
                            as={Input}
                            name="address"
                            placeholder="House no, street, area"
                        />
                        {touched.address && (
                            <ErrorText error={errors.address as string} />
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <Label>City</Label>
                            <Field placeholder="City" as={Input} name="city" />
                            {touched.city && (
                                <ErrorText error={errors.city as string} />
                            )}
                        </div>

                        <div>
                            <Label>State</Label>
                            <Field placeholder="State" as={Input} name="state" />
                            {touched.state && (
                                <ErrorText error={errors.state as string} />
                            )}
                        </div>

                        <div>
                            <Label>PIN Code</Label>
                            <Field
                                placeholder="6-digit PIN code"
                                as={Input}
                                name="pinCode"
                            />
                            {touched.pinCode && (
                                <ErrorText error={errors.pinCode as string} />
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="isActive">Status</Label>

                            <div className="flex items-center gap-3 h-10">
                                <Switch
                                    id="isActive"
                                    checked={values.isActive}
                                    onCheckedChange={(checked) =>
                                        setFieldValue("isActive", checked)
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    {/* Desktop actions */}
                    <div className="hidden justify-end gap-4 pt-6 border-t md:flex">
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
                            {isEdit ? "Update Customer" : "Add Customer"}
                        </Button>
                    </div>

                    {/* Mobile actions */}
                    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75 md:hidden">
                        <div
                            className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-6 py-3"
                            style={{
                                paddingBottom:
                                    "calc(0.5rem + env(safe-area-inset-bottom))",
                            }}
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
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full"
                            >
                                {isSubmitting && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {isEdit ? "Update" : "Add"}
                            </Button>
                        </div>
                    </div>
                </Form>
            )}
        </Formik>
    );
};