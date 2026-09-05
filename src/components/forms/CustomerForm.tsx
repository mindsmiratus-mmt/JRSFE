// components/CustomerForm.tsx or inside your page/dialog

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
import { Textarea } from "../ui/textarea";

// ========================
// Validation Schema
// ========================
export const CustomerSchema = Yup.object().shape({
    name: Yup.string().trim().required("Name is required").min(2, "Name too short"),
    phone: Yup.string()
        .matches(/^[6-9]\d{9}$/, "Invalid Indian mobile number (10 digits)")
        .required("Phone is required"),
    email: Yup.string().email("Invalid email address").required("Email is required"),
    dateOfBirth: Yup.date()
        .nullable()
        .max(new Date(), "Date of birth cannot be in the future"),
    gender: Yup.string()
        .oneOf(["Male", "Female", "Other"], "Please select a valid gender")
        .required("Gender is required"),
    address: Yup.string().required("Address is required"),
    city: Yup.string().required("City is required"),
    state: Yup.string().required("State is required"),
    pinCode: Yup.string()
        .matches(/^\d{6}$/, "PIN code must be exactly 6 digits")
        .required("PIN code is required"),
    gstin: Yup.string()
        .length(15, "GSTIN must be 15 characters")
        .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format")
        .optional(),
    pan: Yup.string()
        .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format")
        .optional(),
    adharNo: Yup.string()
        .matches(/^\d{12}$/, "Aadhaar must be 12 digits")
        .optional(),
    referredBy: Yup.string().optional(),
});

// ========================
// Reusable Error Component
// ========================
const FormError = ({ error }: { error?: string }) => {
    if (!error) return null;
    return <p className="text-sm text-red-500 mt-1">{error}</p>;
};

// ========================
// Props Interface
// ========================
interface CustomerFormProps {
    initialValues: any;
    onSubmit: (values: any, actions: any) => void;
    onCancel: () => void;
    isSubmitting: boolean;
}

// ========================
// Main Form Component
// ========================
export const CustomerForm = ({
    initialValues,
    onSubmit,
    onCancel,
    isSubmitting,
}: CustomerFormProps) => {
    return (
        <Formik
            enableReinitialize
            initialValues={initialValues}
            validationSchema={CustomerSchema}
            onSubmit={onSubmit}
        >
            {({ errors, touched, setFieldValue, values }) => (
                <Form noValidate className="space-y-6">
                    {/* Personal Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name *</Label>
                            <Field as={Input} id="name" name="name" placeholder="Enter full name" />
                            {touched.name && <FormError error={errors.name as string} />}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number *</Label>
                            <Field as={Input} id="phone" name="phone" placeholder="98xxxxxxxx" />
                            {touched.phone && <FormError error={errors.phone as string} />}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Field as={Input} id="email" name="email" type="email" placeholder="customer@example.com" />
                            {touched.email && <FormError error={errors.email as string} />}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="dateOfBirth">Date of Birth</Label>
                            <Field as={Input} id="dateOfBirth" name="dateOfBirth" type="date" />
                            {touched.dateOfBirth && <FormError error={errors.dateOfBirth as string} />}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="gender">Gender *</Label>
                            <Select
                                value={values.gender}
                                onValueChange={(value) => setFieldValue("gender", value)}
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
                            {touched.gender && <FormError error={errors.gender as string} />}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="gstin">GSTIN (Optional)</Label>
                            <Field as={Input} id="gstin" name="gstin" placeholder="22AAAAA0000A1Z5" />
                            {touched.gstin && <FormError error={errors.gstin as string} />}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="pan">PAN (Optional)</Label>
                            <Field as={Input} id="pan" name="pan" placeholder="ABCDE1234F" />
                            {touched.pan && <FormError error={errors.pan as string} />}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="adharNo">Aadhaar Number (Optional)</Label>
                            <Field as={Input} id="adharNo" name="adharNo" placeholder="123456789012" />
                            {touched.adharNo && <FormError error={errors.adharNo as string} />}
                        </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-2">
                        <Label htmlFor="address">Address *</Label>
                        <Field
                            as={Textarea}
                            id="address"
                            name="address"
                            placeholder="Full address (street, area, landmark)"
                            className="min-h-24 resize-none"
                        />
                        {touched.address && <FormError error={errors.address as string} />}
                    </div>

                    {/* City, State, PIN */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="space-y-2">
                            <Label htmlFor="city">City *</Label>
                            <Field as={Input} id="city" name="city" placeholder="e.g. Mumbai" />
                            {touched.city && <FormError error={errors.city as string} />}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="state">State *</Label>
                            <Field as={Input} id="state" name="state" placeholder="e.g. Maharashtra" />
                            {touched.state && <FormError error={errors.state as string} />}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="pinCode">PIN Code *</Label>
                            <Field as={Input} id="pinCode" name="pinCode" placeholder="400001" />
                            {touched.pinCode && <FormError error={errors.pinCode as string} />}
                        </div>
                    </div>

                    {/* Referred By */}
                    <div className="space-y-2">
                        <Label htmlFor="referredBy">Referred By (Optional)</Label>
                        <Field as={Input} id="referredBy" name="referredBy" placeholder="Friend's name or referral code" />
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex justify-end gap-3 pt-6 border-t">
                        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Customer
                        </Button>
                    </div>
                </Form>
            )}
        </Formik>
    );
};