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
import { useCreateCustomerAddress } from "@/hooks/useCustomerAddress";
import { SelectSearchColor } from "@/components/ui/SelectSearchColor";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { alphanumericUpper, digitsOnly, getApiErrorMessage } from "@/utils/formInput";
import { ADDRESS_MAX } from "./CustomerAddresses";

// ========================
// Validation Schema
// ========================
// Add Customer only: the optional address fields become the customer's first CustomerAddress,
// whose API requires Address/City/State/PIN together — so once any one is filled, all four are.
const ADDRESS_FIELDS = ["address", "city", "state", "pinCode"] as const;
const hasAnyAddress = (values: Record<string, any>) =>
    ADDRESS_FIELDS.some((f) => String(values?.[f] ?? "").trim() !== "");
const requiredWithAddress = (message: string) =>
    Yup.string().test("required-with-address", message, function (value) {
        return !hasAnyAddress(this.parent) || String(value ?? "").trim() !== "";
    });

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

const CreateCustomerSchema = CustomerSchema.shape({
    address: requiredWithAddress("Address is required when adding an address").max(ADDRESS_MAX.addressLine1),
    city: requiredWithAddress("City is required when adding an address").max(ADDRESS_MAX.city),
    state: requiredWithAddress("State is required when adding an address").max(ADDRESS_MAX.state),
    pinCode: requiredWithAddress("PIN code is required when adding an address")
        .matches(/^\d{6}$/, { message: "PIN code must be 6 digits", excludeEmptyString: true }),
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
    const createAddressMutation = useCreateCustomerAddress();

    const initialValues = {
        name: customer?.name || "",
        phone: customer?.phone || "",
        email: customer?.email || null,
        dateOfBirth: customer?.dateOfBirth?.split("T")[0] ?? null,
        gender: customer?.gender || "",
        gstin: customer?.gstin || "",
        pan: customer?.pan || "",
        adharNo: customer?.adharNo || "",
        // Address inputs exist only on Add Customer (they seed the first CustomerAddress). On Edit,
        // addresses are managed exclusively in the Saved Addresses section.
        address: "",
        city: "",
        state: "",
        pinCode: "",
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

        const { address, city, state, pinCode, ...customerValues } = values;
        const customerPayload = {
            ...customerValues,
            referralId: values.referralId || undefined,
            dateOfBirth: values.dateOfBirth
                ? new Date(values.dateOfBirth).toISOString()
                : null,
            isActive: values.isActive ?? true,
        };

        // Add Customer: the address inputs seed the first CustomerAddress (validated as a complete
        // set by CreateCustomerSchema). On Edit there are no address inputs at all.
        const hasAddressInput = !isEdit && hasAnyAddress(values);

        try {
            if (isEdit) {
                // PUT /api/Customer/{id} overwrites every column, including the legacy
                // Address/City/State/PinCode. They are no longer edited here, so echo the stored
                // values back unchanged — omitting them would wipe legacy data. Saved addresses are
                // changed only through the Saved Addresses section (address API).
                const data: UpdateCustomerData = {
                    ...customerPayload,
                    id: customer.id,
                    address: customer.address ?? null,
                    city: customer.city ?? null,
                    state: customer.state ?? null,
                    pinCode: customer.pinCode ?? null,
                };
                await updateMutation.mutateAsync({ id: customer.id, data });

                onSuccess("Customer updated successfully!");
            } else {
                // The legacy Customer address columns still receive the same values as a
                // compatibility mirror: the invoice PDF picks CGST+SGST vs IGST from live
                // Customer.State, and the customer list displays the legacy columns. The saved
                // CustomerAddress created below is the address record checkout snapshots from.
                const created = await createMutation.mutateAsync({
                    ...customerPayload,
                    address,
                    city,
                    state,
                    pinCode,
                } as CreateCustomerData);

                if (hasAddressInput) {
                    try {
                        await createAddressMutation.mutateAsync({
                            customerId: created.id,
                            data: {
                                recipientName: values.name,
                                phone: values.phone,
                                addressLine1: address.trim(),
                                city: city.trim(),
                                state: state.trim(),
                                pinCode,
                            },
                        });
                    } catch (addrErr: any) {
                        // The customer itself is saved; say so, and include why the address failed.
                        toast.error(
                            `Customer was created, but the address could not be saved (${getApiErrorMessage(
                                addrErr,
                                "unknown error"
                            )}). Add it from Saved Addresses.`
                        );
                    }
                }

                onSuccess("Customer created successfully!");
            }
        } catch (err: any) {
            toast.error(getApiErrorMessage(err, "Failed to save customer"));
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
            validationSchema={isEdit ? CustomerSchema : CreateCustomerSchema}
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
                                inputMode="numeric"
                                maxLength={10}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setFieldValue("phone", digitsOnly(e.target.value, 10))
                                }
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
                                maxLength={15}
                                className="uppercase"
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setFieldValue("gstin", alphanumericUpper(e.target.value, 15))
                                }
                            />
                            {touched.gstin && (
                                <ErrorText error={errors.gstin as string} />
                            )}
                        </div>

                        <div>
                            <Label>PAN</Label>
                            <Field
                                placeholder="ABCDE1234F"
                                as={Input}
                                name="pan"
                                maxLength={10}
                                className="uppercase"
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setFieldValue("pan", alphanumericUpper(e.target.value, 10))
                                }
                            />
                            {touched.pan && (
                                <ErrorText error={errors.pan as string} />
                            )}
                        </div>

                        <div>
                            <Label>Aadhaar</Label>
                            <Field
                                placeholder="12-digit Aadhaar number"
                                as={Input}
                                name="adharNo"
                                inputMode="numeric"
                                maxLength={12}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setFieldValue("adharNo", digitsOnly(e.target.value, 12))
                                }
                            />
                            {touched.adharNo && (
                                <ErrorText error={errors.adharNo as string} />
                            )}
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

                    {/* Initial address — Add Customer only. Saved as the customer's first (default)
                        CustomerAddress; on Edit, addresses are managed in Saved Addresses below. */}
                    {!isEdit && (
                        <>
                            <div>
                                <Label>Address</Label>
                                <Field
                                    as={Input}
                                    name="address"
                                    placeholder="House no, street, area"
                                    maxLength={ADDRESS_MAX.addressLine1}
                                />
                                {touched.address && (
                                    <ErrorText error={errors.address as string} />
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <Label>City</Label>
                                    <Field placeholder="City" as={Input} name="city" maxLength={ADDRESS_MAX.city} />
                                    {touched.city && (
                                        <ErrorText error={errors.city as string} />
                                    )}
                                </div>

                                <div>
                                    <Label>State</Label>
                                    <Field placeholder="State" as={Input} name="state" maxLength={ADDRESS_MAX.state} />
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
                                        inputMode="numeric"
                                        maxLength={6}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            setFieldValue("pinCode", digitsOnly(e.target.value, 6))
                                        }
                                    />
                                    {touched.pinCode && (
                                        <ErrorText error={errors.pinCode as string} />
                                    )}
                                </div>
                            </div>
                        </>
                    )}

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