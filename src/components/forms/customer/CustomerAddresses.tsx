// components/forms/customer/CustomerAddresses.tsx
//
// Manage a customer's saved delivery/billing addresses from the POS Customer edit screen.
// Only rendered once a customer has a real database Id (i.e. in edit mode) — a brand-new
// customer has no CustomerId to attach an address to until the customer record itself is saved.
import { useState } from "react";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirmDialog";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/AuthContext";
import { getModulePermissions } from "@/utils/permission";
import {
    useCustomerAddresses,
    useCreateCustomerAddress,
    useUpdateCustomerAddress,
    useDeleteCustomerAddress,
    useSetDefaultCustomerAddress,
    type CustomerAddress,
    type CustomerAddressInput,
} from "@/hooks/useCustomerAddress";
import { digitsOnly, getApiErrorMessage, getApiFieldErrors } from "@/utils/formInput";

// Max lengths are the backend contract (CustomerAddressUpsertRequest [MaxLength] = the
// CustomerAddresses column lengths in JewelleryDbContext), so the form can never build a
// request the API would reject for length.
export const ADDRESS_MAX = {
    recipientName: 200,
    addressLine1: 300,
    addressLine2: 300,
    city: 100,
    state: 100,
    country: 100,
    addressType: 50,
} as const;

const AddressSchema = Yup.object().shape({
    recipientName: Yup.string().trim().max(ADDRESS_MAX.recipientName).required("Recipient name is required"),
    phone: Yup.string()
        .matches(/^[6-9]\d{9}$/, "Invalid Indian mobile number")
        .required("Phone is required"),
    addressLine1: Yup.string().trim().max(ADDRESS_MAX.addressLine1).required("Address is required"),
    addressLine2: Yup.string().max(ADDRESS_MAX.addressLine2).optional(),
    city: Yup.string().trim().max(ADDRESS_MAX.city).required("City is required"),
    state: Yup.string().trim().max(ADDRESS_MAX.state).required("State is required"),
    pinCode: Yup.string().matches(/^\d{6}$/, "PIN code must be 6 digits").required("PIN code is required"),
    country: Yup.string().max(ADDRESS_MAX.country).optional(),
    addressType: Yup.string().max(ADDRESS_MAX.addressType).optional(),
});

const emptyValues: CustomerAddressInput = {
    recipientName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pinCode: "",
    country: "India",
    addressType: "Other",
};

interface CustomerAddressesProps {
    customerId: number;
    // Used to prefill a saved address from the customer's legacy Customer.Address/City/State/
    // PinCode when they have no CustomerAddress yet. Legacy columns are never modified here.
    customer?: {
        name?: string;
        phone?: string;
        address?: string | null;
        city?: string | null;
        state?: string | null;
        pinCode?: string | null;
    };
}

export const CustomerAddresses = ({ customerId, customer }: CustomerAddressesProps) => {
    const { permissions, user } = useAuth();
    const { hasCreate, hasUpdate, hasDelete } = getModulePermissions(permissions, user, "Customer");

    const { data: addresses = [], isLoading } = useCustomerAddresses(customerId);
    const createMutation = useCreateCustomerAddress();
    const updateMutation = useUpdateCustomerAddress();
    const deleteMutation = useDeleteCustomerAddress();
    const setDefaultMutation = useSetDefaultCustomerAddress();

    const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
    const [createValues, setCreateValues] = useState<CustomerAddressInput>(emptyValues);
    const [formOpen, setFormOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // A customer created before CustomerAddress existed may only have the legacy flat fields.
    // Those are no longer editable on the Customer form, so offer them here as a one-click
    // prefill for a real saved address rather than converting them automatically.
    const hasLegacyAddress = Boolean(
        customer?.address?.trim() || customer?.city?.trim() || customer?.state?.trim() || customer?.pinCode?.trim()
    );
    const showLegacyPrompt = !isLoading && addresses.length === 0 && hasLegacyAddress;

    const openCreate = (prefill: CustomerAddressInput = emptyValues) => {
        setEditingAddress(null);
        setCreateValues(prefill);
        setFormOpen(true);
    };

    const openCreateFromLegacy = () =>
        openCreate({
            ...emptyValues,
            recipientName: (customer?.name ?? "").slice(0, ADDRESS_MAX.recipientName),
            phone: digitsOnly(customer?.phone ?? "", 10),
            addressLine1: (customer?.address ?? "").slice(0, ADDRESS_MAX.addressLine1),
            city: (customer?.city ?? "").slice(0, ADDRESS_MAX.city),
            state: (customer?.state ?? "").slice(0, ADDRESS_MAX.state),
            pinCode: digitsOnly(customer?.pinCode ?? "", 6),
        });

    const formInitialValues: CustomerAddressInput = editingAddress
        ? {
              recipientName: editingAddress.recipientName,
              phone: editingAddress.phone,
              addressLine1: editingAddress.addressLine1,
              addressLine2: editingAddress.addressLine2 || "",
              city: editingAddress.city,
              state: editingAddress.state,
              pinCode: editingAddress.pinCode,
              country: editingAddress.country || "India",
              addressType: editingAddress.addressType || "Other",
          }
        : createValues;

    // Fields that open with a value (edit, or legacy prefill) show their validation error straight
    // away — e.g. a stored PIN that isn't 6 digits — instead of only after the user touches them.
    const formInitialTouched = Object.fromEntries(
        Object.entries(formInitialValues).map(([key, value]) => [key, Boolean(value)])
    );

    const openEdit = (address: CustomerAddress) => {
        setEditingAddress(address);
        setFormOpen(true);
    };

    const handleSubmit = async (values: CustomerAddressInput, { setSubmitting, setErrors }: any) => {
        try {
            if (editingAddress) {
                await updateMutation.mutateAsync({ customerId, addressId: editingAddress.id, data: values });
                toast.success("Address updated");
            } else {
                await createMutation.mutateAsync({ customerId, data: values });
                toast.success("Address added");
            }
            setFormOpen(false);
            setEditingAddress(null);
        } catch (err: any) {
            // Server-side validation errors land on their fields; everything else is a toast.
            const fieldErrors = getApiFieldErrors(err);
            if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
            toast.error(getApiErrorMessage(err, "Failed to save address"));
        } finally {
            setSubmitting(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteMutation.mutateAsync({ customerId, addressId: deleteId });
            toast.success("Address removed");
        } catch (err: any) {
            toast.error(getApiErrorMessage(err, "Failed to remove address"));
        } finally {
            setDeleteId(null);
        }
    };

    const handleSetDefault = async (addressId: number) => {
        try {
            await setDefaultMutation.mutateAsync({ customerId, addressId });
            toast.success("Default address updated");
        } catch (err: any) {
            toast.error(getApiErrorMessage(err, "Failed to update default address"));
        }
    };

    return (
        <div className="space-y-4 bg-white p-8 rounded-lg border">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-semibold flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#b08d28]" />
                        Saved Addresses
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Delivery/billing addresses for this customer. The default address is used at checkout
                        and on invoices/receipts.
                    </p>
                </div>
                {hasCreate && (
                    <Button type="button" size="sm" onClick={() => openCreate()}>
                        <Plus className="w-4 h-4 mr-1" /> Add Address
                    </Button>
                )}
            </div>

            {showLegacyPrompt && (
                <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="text-sm">
                        <p className="font-medium text-amber-800">Address on file (not yet a saved address)</p>
                        <p className="text-amber-700">
                            {[customer?.address, customer?.city, customer?.state, customer?.pinCode]
                                .filter((part) => part?.trim())
                                .join(", ")}
                        </p>
                    </div>
                    {hasCreate && (
                        <Button type="button" size="sm" variant="outline" onClick={openCreateFromLegacy}>
                            <Plus className="w-4 h-4 mr-1" /> Save as address
                        </Button>
                    )}
                </div>
            )}

            {isLoading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
            ) : addresses.length === 0 ? (
                !showLegacyPrompt && <p className="text-sm text-muted-foreground py-4">No saved addresses yet.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map((address) => (
                        <div
                            key={address.id}
                            className="border rounded-lg p-4 space-y-1 relative"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{address.recipientName}</span>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                            {address.addressType}
                                        </span>
                                        {address.isDefault && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                                                <Star className="w-3 h-3" /> Default
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{address.phone}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    {hasUpdate && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openEdit(address)}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                    )}
                                    {hasDelete && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setDeleteId(address.id)}
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <p className="text-sm">
                                {address.addressLine1}
                                {address.addressLine2 ? `, ${address.addressLine2}` : ""}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {address.city}, {address.state} - {address.pinCode}, {address.country}
                            </p>
                            {hasUpdate && !address.isDefault && (
                                <Button
                                    type="button"
                                    variant="link"
                                    className="px-0 h-auto text-xs"
                                    onClick={() => handleSetDefault(address.id)}
                                >
                                    Set as default
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={formOpen} onOpenChange={(open) => { if (!open) { setFormOpen(false); setEditingAddress(null); } }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingAddress ? "Edit Address" : "Add Address"}</DialogTitle>
                    </DialogHeader>
                    <Formik
                        initialValues={formInitialValues}
                        initialTouched={formInitialTouched}
                        validationSchema={AddressSchema}
                        onSubmit={handleSubmit}
                        validateOnMount
                        enableReinitialize
                    >
                        {({ errors, touched, isSubmitting, isValid, setFieldValue }) => (
                            <Form className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Recipient Name *</Label>
                                        <Field
                                            as={Input}
                                            name="recipientName"
                                            placeholder="Recipient name"
                                            maxLength={ADDRESS_MAX.recipientName}
                                        />
                                        {touched.recipientName && (
                                            <p className="text-sm text-red-500">{errors.recipientName as string}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label>Phone *</Label>
                                        <Field
                                            as={Input}
                                            name="phone"
                                            placeholder="10-digit mobile number"
                                            inputMode="numeric"
                                            maxLength={10}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                setFieldValue("phone", digitsOnly(e.target.value, 10))
                                            }
                                        />
                                        {touched.phone && (
                                            <p className="text-sm text-red-500">{errors.phone as string}</p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <Label>Address Line 1 *</Label>
                                    <Field
                                        as={Input}
                                        name="addressLine1"
                                        placeholder="House no, street, area"
                                        maxLength={ADDRESS_MAX.addressLine1}
                                    />
                                    {touched.addressLine1 && (
                                        <p className="text-sm text-red-500">{errors.addressLine1 as string}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Address Line 2</Label>
                                    <Field
                                        as={Input}
                                        name="addressLine2"
                                        placeholder="Landmark, apartment (optional)"
                                        maxLength={ADDRESS_MAX.addressLine2}
                                    />
                                    {touched.addressLine2 && (
                                        <p className="text-sm text-red-500">{errors.addressLine2 as string}</p>
                                    )}
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <Label>City *</Label>
                                        <Field as={Input} name="city" placeholder="City" maxLength={ADDRESS_MAX.city} />
                                        {touched.city && (
                                            <p className="text-sm text-red-500">{errors.city as string}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label>State *</Label>
                                        <Field as={Input} name="state" placeholder="State" maxLength={ADDRESS_MAX.state} />
                                        {touched.state && (
                                            <p className="text-sm text-red-500">{errors.state as string}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label>PIN Code *</Label>
                                        <Field
                                            as={Input}
                                            name="pinCode"
                                            placeholder="6-digit PIN code"
                                            inputMode="numeric"
                                            maxLength={6}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                setFieldValue("pinCode", digitsOnly(e.target.value, 6))
                                            }
                                        />
                                        {touched.pinCode && (
                                            <p className="text-sm text-red-500">{errors.pinCode as string}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Country</Label>
                                        <Field as={Input} name="country" placeholder="Country" maxLength={ADDRESS_MAX.country} />
                                        {touched.country && (
                                            <p className="text-sm text-red-500">{errors.country as string}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label>Type</Label>
                                        <Field
                                            as={Input}
                                            name="addressType"
                                            placeholder="Home / Office / Other"
                                            maxLength={ADDRESS_MAX.addressType}
                                        />
                                        {touched.addressType && (
                                            <p className="text-sm text-red-500">{errors.addressType as string}</p>
                                        )}
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => { setFormOpen(false); setEditingAddress(null); }}
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting || !isValid}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {editingAddress ? "Update Address" : "Add Address"}
                                    </Button>
                                </DialogFooter>
                            </Form>
                        )}
                    </Formik>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteId !== null}
                title="Delete Address?"
                message="This action cannot be undone. Deleting the default address does not automatically promote another one."
                onConfirm={confirmDelete}
                onCancel={() => setDeleteId(null)}
                confirmText="Delete"
                variant="destructive"
            />
        </div>
    );
};
