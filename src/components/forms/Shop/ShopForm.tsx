// pages/shop/ShopForm.tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Formik, Form, Field, type FormikHelpers } from "formik";
import * as Yup from "yup";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  useCreateShop,
  useUpdateShop,
  useUploadShopLogo,
} from "@/hooks/useShop";
import { useAllSalesChannels } from "@/hooks/useSalesChannelRegistry";

const ShopSchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .max(100, "Shop name cannot exceed 100 characters")
    .required("Shop name is required"),

  shopCode: Yup.string()
    .trim()
    .max(50, "Shop code cannot exceed 50 characters")
    .required("Shop code is required"),

  pinCode: Yup.string()
    .matches(/^\d{6}$/, "Pin code must be 6 digits")
    .required("Pin code is required"),

  address: Yup.string()
    .trim()
    .max(250, "Address cannot exceed 250 characters")
    .required("Address is required"),

  city: Yup.string()
    .trim()
    .max(50, "City cannot exceed 50 characters")
    .required("City is required"),

  state: Yup.string()
    .trim()
    .max(50, "State cannot exceed 50 characters")
    .required("State is required"),

  phone: Yup.string()
    .matches(/^[0-9]{10}$/, "Phone must be exactly 10 digits")
    .required("Phone is required"),

  email: Yup.string()
    .email("Invalid email")
    .required("Email is required"),

  gstNo: Yup.string()
    .matches(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      "Invalid GST No"
    )
    .required("GST No is required"),

  invoiceDisplayName: Yup.string()
    .trim()
    .max(150, "Invoice display name cannot exceed 150 characters"),

  salesChannel: Yup.string().required("Sales channel is required"),

  isActive: Yup.boolean().default(true),
});

interface ShopFormProps {
  shop?: {
    id: number;
    name?: string;
    shopCode?: string;
    pinCode?: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    email?: string;
    salesChannel?: string;
    gstNo?: string;
    latitude?: number | string | null;
    longitude?: number | string | null;
    invoiceDisplayName?: string;
    secondaryLogoPath?: string | null;
    isActive?: boolean;
  };
  onSuccess: (msg: string) => void;
  onCancel: () => void;
  username?: string;
}

type ShopFormValues = {
  name: string;
  shopCode: string;
  pinCode: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  salesChannel: string;
  gstNo: string;
  invoiceDisplayName: string;
  latitude: number | "";
  longitude: number | "";
  isActive: boolean;
  logoFile: File | null;
};

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

export const ShopForm = ({
  shop,
  onSuccess,
  onCancel,
  username,
}: ShopFormProps) => {
  const isEdit = !!shop;
  const createMutation = useCreateShop();
  const updateMutation = useUpdateShop();
  const uploadLogoMutation = useUploadShopLogo();

  // ✅ Fetch sales channels from API
  const { data: salesChannels = [], isLoading: salesChannelsLoading } =
    useAllSalesChannels();

  const initialValues: ShopFormValues = {
    name: shop?.name || "",
    shopCode: shop?.shopCode || "",
    pinCode: shop?.pinCode || "",
    address: shop?.address || "",
    city: shop?.city || "",
    state: shop?.state || "",
    phone: shop?.phone || "",
    email: shop?.email || "",
    gstNo: shop?.gstNo || "",
    salesChannel: shop?.salesChannel || "",
    invoiceDisplayName: shop?.invoiceDisplayName || "",
    latitude: (shop?.latitude ?? "") as number | "",
    longitude: (shop?.longitude ?? "") as number | "",
    isActive: shop?.isActive ?? true,
    logoFile: null,
  };

  const handleSubmit = async (
    values: ShopFormValues,
    { setSubmitting }: FormikHelpers<ShopFormValues>
  ) => {
    try {
      const basePayload = {
        name: values.name,
        shopCode: values.shopCode,
        pinCode: values.pinCode,
        address: values.address,
        city: values.city,
        state: values.state,
        phone: values.phone,
        email: values.email,
        gstNo: values.gstNo,
        salesChannel: values.salesChannel, // ✅ sends the name string e.g. "Offline"
        invoiceDisplayName: values.invoiceDisplayName,
        latitude: values.latitude === "" ? 0 : Number(values.latitude),
        longitude: values.longitude === "" ? 0 : Number(values.longitude),
        isActive: values.isActive,
      };

      let savedShopId = shop?.id;

      if (isEdit && shop?.id) {
        await updateMutation.mutateAsync({
          id: shop.id,
          data: {
            ...basePayload,
            updatedBy: username ?? "Admin",
          },
        });
        savedShopId = shop.id;
      } else {
        const createdShop = await createMutation.mutateAsync({
          ...basePayload,
          createdBy: username ?? "Admin",
        });
        savedShopId = createdShop.id;
      }

      if (values.logoFile && savedShopId) {
        await uploadLogoMutation.mutateAsync({
          id: savedShopId,
          file: values.logoFile,
        });
      }

      onSuccess(
        isEdit
          ? values.logoFile
            ? "Shop updated and logo uploaded successfully!"
            : "Shop updated successfully!"
          : values.logoFile
          ? "Shop created and logo uploaded successfully!"
          : "Shop created successfully!"
      );
    } catch (err: unknown) {
      const message = (err as ApiError)?.response?.data?.message;
      toast.error(message || "Failed to save shop");
    } finally {
      setSubmitting(false);
    }
  };

  const FormError = ({ error }: { error: unknown }) => {
    if (!error) return null;
    return <p className="mt-1 text-sm text-red-500">{String(error)}</p>;
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={ShopSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({ values, errors, touched, isSubmitting, setFieldValue }) => {
        const isBusy =
          isSubmitting ||
          createMutation.isPending ||
          updateMutation.isPending ||
          uploadLogoMutation.isPending;

        return (
          <Form
            className={cn(
              "space-y-8 bg-white p-8 rounded-lg border max-w-7xl mx-auto",
              "pb-[calc(9rem+env(safe-area-inset-bottom))] md:pb-8"
            )}
          >
            {/* Basic Info */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="name">Shop Name *</Label>
                <Field
                  as={Input}
                  name="name"
                  placeholder="e.g. Golden Jewels - MG Road"
                />
                <FormError error={touched.name && errors.name} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shopCode">Shop Code *</Label>
                <Field
                  as={Input}
                  name="shopCode"
                  placeholder="e.g. SHOP001"
                  disabled={isEdit}
                />
                <FormError error={touched.shopCode && errors.shopCode} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceDisplayName">Invoice Display Name</Label>
                <Field
                  as={Input}
                  name="invoiceDisplayName"
                  placeholder="e.g. Golden Jewels"
                />
                <FormError
                  error={
                    touched.invoiceDisplayName && errors.invoiceDisplayName
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gstNo">GST No *</Label>
                <Field
                  as={Input}
                  name="gstNo"
                  placeholder="22AAAAA0000A1Z5"
                />
                <FormError error={touched.gstNo && errors.gstNo} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Field as={Input} name="phone" placeholder="9876543210" />
                <FormError error={touched.phone && errors.phone} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Field
                  as={Input}
                  name="email"
                  type="email"
                  placeholder="shop@example.com"
                />
                <FormError error={touched.email && errors.email} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address *</Label>
                <Field as={Input} name="address" placeholder="Full address" />
                <FormError error={touched.address && errors.address} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Field as={Input} name="city" placeholder="Ahmedabad" />
                <FormError error={touched.city && errors.city} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Field as={Input} name="state" placeholder="Gujarat" />
                <FormError error={touched.state && errors.state} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pinCode">Pin Code *</Label>
                <Field as={Input} name="pinCode" placeholder="362550" />
                <FormError error={touched.pinCode && errors.pinCode} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Field
                  as={Input}
                  name="latitude"
                  type="number"
                  step="any"
                  placeholder="23.024349"
                />
                <FormError error={touched.latitude && errors.latitude} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Field
                  as={Input}
                  name="longitude"
                  type="number"
                  step="any"
                  placeholder="72.5301521"
                />
                <FormError error={touched.longitude && errors.longitude} />
              </div>

              {/* ✅ Sales Channel Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="salesChannel">Sales Channel *</Label>
                <select
                  id="salesChannel"
                  name="salesChannel"
                  value={values.salesChannel}
                  onChange={(e) =>
                    setFieldValue("salesChannel", e.target.value)
                  }
                  disabled={salesChannelsLoading}
                  className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                    "ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    touched.salesChannel && errors.salesChannel
                      ? "border-red-500"
                      : ""
                  )}
                >
                  <option value="" disabled>
                    {salesChannelsLoading
                      ? "Loading channels..."
                      : "Select a channel"}
                  </option>
                  {salesChannels
                    .filter((ch) => ch.isActive)
                    .map((ch) => (
                      <option
                        key={ch.id}
                        value={ch.name} // ✅ sends name as value e.g. "Offline"
                      >
                        {ch.name} {/* ✅ displays name as label */}
                      </option>
                    ))}
                </select>
                <FormError
                  error={touched.salesChannel && errors.salesChannel}
                />
              </div>

              <div className="flex items-center space-x-3">
                <Switch
                  id="isActive"
                  checked={values.isActive}
                  onCheckedChange={(checked) =>
                    setFieldValue("isActive", checked)
                  }
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Shop is Active
                </Label>
              </div>
            </div>

            {/* Logo Upload Section */}
            <div className="rounded-lg border p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Shop Logo</h3>
                <p className="text-sm text-muted-foreground">
                  Upload a logo image. It will be saved after the shop record
                  is created or updated.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-[180px_1fr]">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="logoFile">Upload Logo</Label>
                    <Input
                      id="logoFile"
                      name="logoFile"
                      type="file"
                      accept="image/*"
                      onChange={(
                        event: React.ChangeEvent<HTMLInputElement>
                      ) => {
                        const file =
                          event.currentTarget.files?.[0] ?? null;
                        setFieldValue("logoFile", file);
                      }}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Recommended: square PNG logo with transparent background.
                  </p>

                  {shop?.secondaryLogoPath && !values.logoFile ? (
                    <p className="text-xs text-muted-foreground">
                      A logo already exists for this shop. Choosing a new
                      file will replace it.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Desktop actions */}
            <div className="hidden justify-end gap-4 border-t pt-6 md:flex">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isBusy}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isBusy} size="lg">
                {isBusy && (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                )}
                {isEdit ? "Update Shop" : "Create Shop"}
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
                  disabled={isBusy}
                  className="w-full"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isBusy}
                  size="lg"
                  className="w-full"
                >
                  {isBusy && (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  )}
                  {isEdit ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
};