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

const AddressSchema = Yup.object().shape({
    recipientName: Yup.string().trim().required("Recipient name is required"),
    phone: Yup.string()
        .matches(/^[6-9]\d{9}$/, "Invalid Indian mobile number")
        .required("Phone is required"),
    addressLine1: Yup.string().trim().required("Address is required"),
    addressLine2: Yup.string().optional(),
    city: Yup.string().trim().required("City is required"),
    state: Yup.string().trim().required("State is required"),
    pinCode: Yup.string().matches(/^\d{6}$/, "PIN code must be 6 digits").required("PIN code is required"),
    country: Yup.string().optional(),
    addressType: Yup.string().optional(),
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
}

export const CustomerAddresses = ({ customerId }: CustomerAddressesProps) => {
    const { permissions, user } = useAuth();
    const { hasCreate, hasUpdate, hasDelete } = getModulePermissions(permissions, user, "Customer");

    const { data: addresses = [], isLoading } = useCustomerAddresses(customerId);
    const createMutation = useCreateCustomerAddress();
    const updateMutation = useUpdateCustomerAddress();
    const deleteMutation = useDeleteCustomerAddress();
    const setDefaultMutation = useSetDefaultCustomerAddress();

    const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const openCreate = () => {
        setEditingAddress(null);
        setFormOpen(true);
    };

    const openEdit = (address: CustomerAddress) => {
        setEditingAddress(address);
        setFormOpen(true);
    };

    const handleSubmit = async (values: CustomerAddressInput, { setSubmitting }: any) => {
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
            toast.error(err?.response?.data?.message || "Failed to save address");
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
            toast.error(err?.response?.data?.message || "Failed to remove address");
        } finally {
            setDeleteId(null);
        }
    };

    const handleSetDefault = async (addressId: number) => {
        try {
            await setDefaultMutation.mutateAsync({ customerId, addressId });
            toast.success("Default address updated");
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to update default address");
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
                        Reusable delivery/billing addresses for this customer. Does not replace the legacy
                        address fields above, which remain in use for existing flows.
                    </p>
                </div>
                {hasCreate && (
                    <Button type="button" size="sm" onClick={openCreate}>
                        <Plus className="w-4 h-4 mr-1" /> Add Address
                    </Button>
                )}
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
            ) : addresses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No saved addresses yet.</p>
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
                        initialValues={
                            editingAddress
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
                                : emptyValues
                        }
                        validationSchema={AddressSchema}
                        onSubmit={handleSubmit}
                        enableReinitialize
                    >
                        {({ errors, touched, isSubmitting }) => (
                            <Form className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Recipient Name *</Label>
                                        <Field as={Input} name="recipientName" placeholder="Recipient name" />
                                        {touched.recipientName && (
                                            <p className="text-sm text-red-500">{errors.recipientName as string}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label>Phone *</Label>
                                        <Field as={Input} name="phone" placeholder="10-digit mobile number" />
                                        {touched.phone && (
                                            <p className="text-sm text-red-500">{errors.phone as string}</p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <Label>Address Line 1 *</Label>
                                    <Field as={Input} name="addressLine1" placeholder="House no, street, area" />
                                    {touched.addressLine1 && (
                                        <p className="text-sm text-red-500">{errors.addressLine1 as string}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Address Line 2</Label>
                                    <Field as={Input} name="addressLine2" placeholder="Landmark, apartment (optional)" />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <Label>City *</Label>
                                        <Field as={Input} name="city" placeholder="City" />
                                        {touched.city && (
                                            <p className="text-sm text-red-500">{errors.city as string}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label>State *</Label>
                                        <Field as={Input} name="state" placeholder="State" />
                                        {touched.state && (
                                            <p className="text-sm text-red-500">{errors.state as string}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label>PIN Code *</Label>
                                        <Field as={Input} name="pinCode" placeholder="6-digit PIN code" />
                                        {touched.pinCode && (
                                            <p className="text-sm text-red-500">{errors.pinCode as string}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Country</Label>
                                        <Field as={Input} name="country" placeholder="Country" />
                                    </div>
                                    <div>
                                        <Label>Type</Label>
                                        <Field as={Input} name="addressType" placeholder="Home / Office / Other" />
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
                                    <Button type="submit" disabled={isSubmitting}>
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
