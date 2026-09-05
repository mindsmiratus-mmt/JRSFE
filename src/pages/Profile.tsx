// components/user/UserForm.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, Pencil } from "lucide-react";
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

import { useAllShops } from "@/hooks/useShop";
import {
    useUser,
    useUpdateUser
} from "@/hooks/useUser";

import { DateInput } from "@/components/ui/DatePicker";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";


const UserSchema = Yup.object().shape({
    username: Yup.string().required("Username is required"),
    fullName: Yup.string().required("Full name is required"),
    email: Yup.string().email("Invalid email").required("Email is required"),
    phone: Yup.string().required("Phone is required"),
    employeeId: Yup.string().required("Employee ID is required"),
    designation: Yup.string().required("Designation is required"),
    dateOfJoining: Yup.string().required("Date of joining is required"),
    isActive: Yup.boolean(),
});


export const ProfileForm = () => {
    const { user } = useAuth();
    const userId = Number(user?.id);

    // 🔵  Fetch logged-in user details
    const { data: userData, isLoading } = useUser(userId);

    // 🔵  Fetch shops
    const { data: shops = [] } = useAllShops();

    // 🔵  Edit mode toggle
    const [isEditMode, setEditMode] = useState(false);

    const updateMutation = useUpdateUser();


    // ⛔ Show loader until user is fetched
    if (isLoading || !user) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-6 h-6 animate-spin" />
            </div>
        );
    }


    const initialValues = {
        username: userData?.username || "",
        // password: "",
        fullName: userData?.fullName || "",
        email: userData?.email || "",
        phone: userData?.phone || "",
        employeeId: userData?.employeeId || "",
        designation: userData?.designation || "",
        dateOfJoining: userData?.dateOfJoining?.split("T")[0] || null,
        shopId: userData?.shopId || "",
        isActive: userData?.isActive ?? true,
    };


    const handleSubmit = async (values: any, { setSubmitting }: any) => {
        try {
            await updateMutation.mutateAsync({
                id: userData?.id!,
                data: {
                    id: userData?.id!,
                    username: values.username,
                    fullName: values.fullName,
                    email: values.email,
                    phone: values.phone,
                    employeeId: values.employeeId,
                    designation: values.designation,
                    dateOfJoining: values.dateOfJoining,
                    shopId: Number(values.shopId),
                    isActive: values.isActive,
                },
            });

            toast.success("User updated successfully!");
            setEditMode(false);

        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to update user");
        } finally {
            setSubmitting(false);
        }
    };


    return (
        <Formik
            initialValues={initialValues}
            validationSchema={UserSchema}
            onSubmit={handleSubmit}
            enableReinitialize
        >
            {({ values, errors, touched, isSubmitting, setFieldValue }) => (
                <Form className="space-y-8 bg-white p-8 rounded-lg border">
                    {/* ---------- HEADER ---------- */}
                    <div className="flex justify-between items-center pb-4 border-b">
                        <h2 className="text-xl font-bold">Profile Details</h2>

                        <div className="flex items-center gap-4">

                            {/* 👁 Show this only IN EDIT MODE */}
                            {isEditMode && (
                                <Eye
                                    className="w-5 h-5 text-gray-600 cursor-pointer"
                                    onClick={() => setEditMode(false)}
                                />
                            )}

                            {/* ✏ Show this only IN VIEW MODE */}
                            {!isEditMode && (
                                <Pencil
                                    className="w-5 h-5 text-gray-600 cursor-pointer"
                                    onClick={() => setEditMode(true)}
                                />
                            )}
                        </div>
                    </div>


                    {/* ---------- FORM FIELDS ---------- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        <FieldWithError
                            label="Username *"
                            name="username"
                            disabled={!isEditMode}
                            placeholder="Username"
                        />

                        <FieldWithError
                            label="Full Name *"
                            name="fullName"
                            disabled={!isEditMode}
                            placeholder="Enter full name"
                        />

                        <FieldWithError
                            label="Email *"
                            name="email"
                            type="email"
                            disabled={!isEditMode}
                            placeholder="Enter email"
                        />

                        <FieldWithError
                            label="Phone *"
                            name="phone"
                            disabled={!isEditMode}
                            placeholder="Enter phone number"
                        />

                        <FieldWithError
                            label="Employee ID *"
                            name="employeeId"
                            disabled={!isEditMode}
                            placeholder="Enter employee ID"
                        />

                        <FieldWithError
                            label="Designation *"
                            name="designation"
                            disabled={!isEditMode}
                            placeholder="Enter designation"
                        />

                        {/* Date Picker */}
                        <div className="space-y-2">
                            <Label>Date of Joining *</Label>
                            <DateInput
                                disabled={!isEditMode}
                                value={values.dateOfJoining}
                                onValueChange={(date) =>
                                    setFieldValue("dateOfJoining", date)
                                }
                                placeholder="Pick a date"
                            />
                            {touched.dateOfJoining && errors.dateOfJoining && (
                                <p className="text-sm text-red-500">{errors.dateOfJoining}</p>
                            )}
                        </div>

                        {/* Assign Shop */}
                        <div className="space-y-2">
                            <Label>Assign Shop</Label>

                            <Select
                                disabled={!isEditMode}
                                value={String(values.shopId)}
                                onValueChange={(v) => setFieldValue("shopId", Number(v))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select shop" />
                                </SelectTrigger>
                                <SelectContent>
                                    {shops.map((shop: any) => (
                                        <SelectItem
                                            key={shop.id}
                                            value={String(shop.id)}
                                        >
                                            {shop.name} - {shop.address}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {touched.shopId && errors.shopId && (
                                <p className="text-sm text-red-500">{errors.shopId}</p>
                            )}
                        </div>


                        {/* Active Switch */}
                        <div className="flex items-center space-x-3 pt-4">
                            <Switch
                                id="isActive"
                                disabled={!isEditMode}
                                checked={values.isActive}
                                onCheckedChange={(checked) =>
                                    setFieldValue("isActive", checked)
                                }
                            />
                            <Label htmlFor="isActive">User is Active</Label>
                        </div>

                    </div>


                    {/* ---------- BUTTONS ---------- */}
                    {isEditMode && (
                        <div className="flex justify-end gap-4 pt-8 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditMode(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>

                            <Button type="submit" disabled={isSubmitting} size="lg">
                                {isSubmitting && (
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                )}
                                Save Changes
                            </Button>
                        </div>
                    )}
                </Form>
            )}
        </Formik>
    );
};


/* ---------------------------------
      SMALL REUSABLE FIELD WRAPPER
----------------------------------- */
const FieldWithError = ({ label, name, type = "text", disabled, placeholder }: any) => (
    <div className="space-y-2">
        <Label>{label}</Label>
        <Field
            as={Input}
            name={name}
            type={type}
            disabled={disabled}
            placeholder={placeholder}
        />
        <Field name={name}>
            {({ meta }: any) =>
                meta.touched && meta.error ? (
                    <p className="text-sm text-red-500">{meta.error}</p>
                ) : null
            }
        </Field>
    </div>
);
