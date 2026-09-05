// components/user/UserForm.tsx
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


import { useAllShops } from "@/hooks/useShop"; // assuming you have this
import {
    useCreateUser,
    useUpdateUser,
    type User,
    type CreateUserData,
    type UpdateUserData,
} from "@/hooks/useUser";
import { DateInput } from "@/components/ui/DatePicker";
import { Switch } from "@/components/ui/switch";

const strongPasswordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&*!?._-])[A-Za-z\d@#$%^&*!?._-]{8,50}$/;


const UserSchema = Yup.object().shape({
    username: Yup.string().required("Username is required"),
    password: Yup.string().when("$isEdit", {
        is: false,
        then: (schema) =>
            schema
                .required("Password is required")
                .matches(
                    strongPasswordRegex,
                    "Password must be 8–50 chars and include uppercase, lowercase, number, and special character"
                ),
        otherwise: (schema) => schema.optional(),
    }),
    fullName: Yup.string()
        .trim()
        .max(80, "Max 80 characters allowed")
        .required("Full name is required"),
    email: Yup.string().email("Invalid email").required("Email is required"),
    phone: Yup.string()
        .trim()
        .matches(/^[0-9]{10}$/, "Phone must be 10 digits")
        .required("Phone is required"),
    employeeId: Yup.string()
        .trim()
        .matches(/^[A-Za-z0-9-]+$/, "Only letters, numbers, hyphens allowed")
        .max(20, "Max 20 characters allowed")
        .required("Employee ID is required"),
    designation: Yup.string()
        .trim()
        .max(80, "Max 80 characters allowed")
        .required("Designation is required"),
    dateOfJoining: Yup.string().required("Date of joining is required"),
    shopId: Yup.number().required("Please assign a shop"),
    isActive: Yup.boolean(),
});


interface UserFormProps {
    user?: User;
    onSuccess: (msg: string) => void;
    onCancel: () => void;
}


export const UserForm = ({ user, onSuccess, onCancel }: UserFormProps) => {
    const isEdit = !!user;
    const { data: shops = [] } = useAllShops();
    const createMutation = useCreateUser();
    const updateMutation = useUpdateUser();


    const initialValues = {
        username: user?.username || "",
        password: "",
        fullName: user?.fullName || "",
        email: user?.email || "",
        phone: user?.phone || "",
        employeeId: user?.employeeId || "",
        designation: user?.designation || "",
        dateOfJoining: user?.dateOfJoining?.split("T")[0] ?? null,
        shopId: user?.shopId || "",
        isActive: user?.isActive ?? true,
    };


    const handleSubmit = async (values: any, { setSubmitting }: any) => {
        try {
            if (isEdit) {
                await updateMutation.mutateAsync({
                    id: user!.id,
                    data: {
                        id: user!.id,
                        username: values.username,
                        fullName: values.fullName,
                        email: values.email,
                        phone: values.phone,
                        employeeId: values.employeeId,
                        designation: values.designation,
                        dateOfJoining: values.dateOfJoining,
                        shopId: Number(values.shopId),
                        isActive: values.isActive,
                    } as UpdateUserData,
                });
                onSuccess("User updated successfully!");
            } else {
                await createMutation.mutateAsync({
                    ...values,
                    shopId: Number(values.shopId),
                } as CreateUserData);
                onSuccess("User created successfully!");
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.details || err?.response?.data?.message);
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
                <Form className="space-y-8 bg-white p-8 rounded-lg border pb-[calc(9rem+env(safe-area-inset-bottom))] md:pb-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label>Username *</Label>
                            <Field as={Input} name="username" disabled={isEdit} placeholder="Enter username" />
                            {touched.username && errors.username && (
                                <p className="text-sm text-red-500">{errors.username}</p>
                            )}
                        </div>


                        {!isEdit && (
                            <div className="space-y-2">
                                <Label>Password *</Label>
                                <Field as={Input} placeholder="Enter strong password" type="password" name="password" />
                                {touched.password && errors.password && (
                                    <p className="text-sm text-red-500">{errors.password}</p>
                                )}
                            </div>
                        )}


                        <div className="space-y-2">
                            <Label>Full Name *</Label>
                            <Field placeholder="Enter full name" as={Input} name="fullName" />
                            {touched.fullName && errors.fullName && (
                                <p className="text-sm text-red-500">{errors.fullName}</p>
                            )}
                        </div>


                        <div className="space-y-2">
                            <Label>Email *</Label>
                            <Field placeholder="Enter email address" as={Input} type="email" name="email" />
                            {touched.email && errors.email && (
                                <p className="text-sm text-red-500">{errors.email}</p>
                            )}
                        </div>


                        <div className="space-y-2">
                            <Label>Phone *</Label>
                            <Field placeholder="10-digit mobile number" as={Input} name="phone" />
                            {touched.phone && errors.phone && (
                                <p className="text-sm text-red-500">{errors.phone}</p>
                            )}
                        </div>


                        <div className="space-y-2">
                            <Label>Employee ID *</Label>
                            <Field placeholder="EMP-001" as={Input} name="employeeId" />
                            {touched.employeeId && errors.employeeId && (
                                <p className="text-sm text-red-500">{errors.employeeId}</p>
                            )}
                        </div>


                        <div className="space-y-2">
                            <Label>Designation *</Label>
                            <Field placeholder="e.g. Sales Executive" as={Input} name="designation" />
                            {touched.designation && errors.designation && (
                                <p className="text-sm text-red-500">{errors.designation}</p>
                            )}
                        </div>


                        <div className="space-y-2">
                            <Label>Date of Joining *</Label>
                            <DateInput
                                value={values.dateOfJoining}
                                onValueChange={(date) => setFieldValue("dateOfJoining", date)}
                                placeholder="Select joining date"
                            />
                            {touched.dateOfJoining && errors.dateOfJoining && (
                                <p className="text-sm text-red-500">{errors.dateOfJoining}</p>
                            )}
                        </div>


                        <div className="space-y-2">
                            <Label>Assign Shop *</Label>
                            <Select
                                value={String(values.shopId)}
                                onValueChange={(v) => setFieldValue("shopId", Number(v))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select shop" />
                                </SelectTrigger>
                                <SelectContent>
                                    {shops?.map((shop: any) => (
                                        <SelectItem key={shop.id} value={String(shop.id)}>
                                            {shop.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {touched.shopId && errors.shopId && (
                                <p className="text-sm text-red-500">{errors.shopId}</p>
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


                    <div className="hidden md:flex justify-end gap-4 pt-8 border-t">
                        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting} size="lg">
                            {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                            {isEdit ? "Update User" : "Create User"}
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
            )}
        </Formik>
    );
};
