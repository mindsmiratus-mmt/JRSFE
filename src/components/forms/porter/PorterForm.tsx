// pages/porter/PorterForm.tsx
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";

import {
  useCreatePorter,
  useUpdatePorter,
  type Porter,
} from "@/hooks/usePorter";

interface PorterFormProps {
  porter?: Porter;
  onSuccess: (msg: string) => void;
  onCancel: () => void;
}

interface FormValues {
  name: string;
  phone: string;
  email: string;
  address: string;
  identityProof: string;
  identityNumber: string;
  remarks: string;
  isActive: boolean;
}

const PorterSchema = Yup.object().shape({
  name: Yup.string().trim().required("Name is required"),
  phone: Yup.string().trim().required("Phone is required"),
  email: Yup.string().trim().email("Enter a valid email"),
  address: Yup.string().trim(),
  identityProof: Yup.string().trim(),
  identityNumber: Yup.string().trim(),
  remarks: Yup.string().trim(),
  isActive: Yup.boolean().required(),
});

const cleanOptional = (value: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export const PorterForm = ({
  porter,
  onSuccess,
  onCancel,
}: PorterFormProps) => {
  const isEdit = !!porter;

  const createMutation = useCreatePorter();
  const updateMutation = useUpdatePorter();

  const initialValues: FormValues = {
    name: porter?.name ?? "",
    phone: porter?.phone ?? "",
    email: porter?.email ?? "",
    address: porter?.address ?? "",
    identityProof: porter?.identityProof ?? "",
    identityNumber: porter?.identityNumber ?? "",
    remarks: porter?.remarks ?? "",
    isActive: porter?.isActive ?? true,
  };

  const handleSubmit = async (
    values: FormValues,
    { setSubmitting }: any
  ) => {
    const payload = {
      name: values.name.trim(),
      phone: values.phone.trim(),
      email: cleanOptional(values.email),
      address: cleanOptional(values.address),
      identityProof: cleanOptional(values.identityProof),
      identityNumber: cleanOptional(values.identityNumber),
      remarks: cleanOptional(values.remarks),
      isActive: values.isActive,
      createdBy: "Admin",
    };

    try {
      if (isEdit && porter?.id) {
        await updateMutation.mutateAsync({
          id: porter.id,
          data: {
            name: payload.name,
            phone: payload.phone,
            email: payload.email,
            address: payload.address,
            identityProof: payload.identityProof,
            identityNumber: payload.identityNumber,
            remarks: payload.remarks,
            isActive: payload.isActive,
          } as any,
        });

        onSuccess("Porter updated successfully!");
      } else {
        await createMutation.mutateAsync(payload as any);
        onSuccess("Porter created successfully!");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm p-8">
      <Formik
        initialValues={initialValues}
        validationSchema={PorterSchema}
        enableReinitialize
        onSubmit={handleSubmit}
      >
        {({ values, errors, touched, isSubmitting, setFieldValue }) => (
          <Form className="space-y-8 pb-[calc(9rem+env(safe-area-inset-bottom))] md:pb-0">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Field
                  as={Input}
                  id="name"
                  name="name"
                  placeholder="Enter porter name"
                />
                {touched.name && errors.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Field
                  as={Input}
                  id="phone"
                  name="phone"
                  placeholder="Enter phone number"
                />
                {touched.phone && errors.phone && (
                  <p className="text-sm text-red-600 mt-1">{errors.phone}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Field
                  as={Input}
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter email"
                />
                {touched.email && errors.email && (
                  <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <Label htmlFor="identityProof">Identity Proof</Label>
                <Field
                  as={Input}
                  id="identityProof"
                  name="identityProof"
                  placeholder="Aadhaar / PAN / License etc."
                />
                {touched.identityProof && errors.identityProof && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.identityProof}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="identityNumber">Identity Number</Label>
                <Field
                  as={Input}
                  id="identityNumber"
                  name="identityNumber"
                  placeholder="Enter identity number"
                />
                {touched.identityNumber && errors.identityNumber && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.identityNumber}
                  </p>
                )}
              </div>

              <div className="flex flex-col justify-end">
                <Label className="mb-2">Status</Label>
                <div className="flex items-center gap-3 h-10">
                  <Switch
                    checked={values.isActive}
                    onCheckedChange={(checked) =>
                      setFieldValue("isActive", checked)
                    }
                  />
                  <span className="text-sm text-gray-700">
                    {values.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Field
                as="textarea"
                id="address"
                name="address"
                placeholder="Enter address"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              {touched.address && errors.address && (
                <p className="text-sm text-red-600 mt-1">{errors.address}</p>
              )}
            </div>

            <div>
              <Label htmlFor="remarks">Remarks</Label>
              <Field
                as="textarea"
                id="remarks"
                name="remarks"
                placeholder="Enter remarks"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              {touched.remarks && errors.remarks && (
                <p className="text-sm text-red-600 mt-1">{errors.remarks}</p>
              )}
            </div>

            <div className="hidden md:flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
              >
                {(isSubmitting ||
                  createMutation.isPending ||
                  updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEdit ? "Update Porter" : "Create Porter"}
              </Button>
            </div>

            <div
              className="fixed bottom-0 inset-x-0 z-40 border-t bg-white/95 backdrop-blur md:hidden"
              style={{
                paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
              }}
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

                  <Button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      createMutation.isPending ||
                      updateMutation.isPending
                    }
                  >
                    {(isSubmitting ||
                      createMutation.isPending ||
                      updateMutation.isPending) && (
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
    </div>
  );
};