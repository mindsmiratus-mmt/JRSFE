import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import {
    useCreateRole,
    useUpdateRole,
    useRoles,
    type Role,
} from "@/hooks/useRole";

/* =======================
   TYPES
======================= */

type Permission = {
    read: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
};

type Permissions = Record<string, Permission>;

type ApiPermission = {
    module: string;
    read: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
};

interface RoleFormProps {
    role?: Role;
    onSuccess: (msg: string) => void;
    onCancel: () => void;
}

interface MenuItem {
    name: string;
    path: string;
}

/* =======================
   MENU MODULES
======================= */

const menuItems: MenuItem[] = [
    { name: "Dashboard", path: "/admin/dashboard" },
    { name: "User Management", path: "/admin/user" },
    { name: "Role Management", path: "/admin/role" },
    { name: "Category", path: "/admin/category" },
    { name: "Current Rate", path: "/admin/currentrate" },
    { name: "Customer", path: "/admin/customer" },
    { name: "Invoice", path: "/admin/invoice" },
    { name: "Item", path: "/admin/item" },
    { name: "Shop", path: "/admin/shop" },
    { name: "Stock", path: "/admin/stock" },
    { name: "Tag", path: "/admin/tag" },
    {name:"Porter",path:"/admin/porter"},
    { name: "Vendor", path: "/admin/vendor" },
    { name: "Advance Order", path: "/admin/advance-order" },
    { name: "Stock Movement", path: "/admin/stock-movement" },
    { name: "Sale Item Avaliablity", path:"/admin/sale-item-avaiability"},
    { name: "Sale", path: "/admin/sale" },
    { name: "Return", path: "admin/return" },
    { name: "Stock Transfer", path: "/admin/stock-transfer" },
    { name: "Sale Report", path: "/admin/sale-report" },
    { name: "Sale Report (Itemwise)", path: "/admin/reports/sale-itemwise" },
    { name: "Sale Report (Billwise)", path: "/admin/reports/sale-billwise" },
    { name: "Purchase Report", path: "/admin/reports/purchase" },
    { name: "Received Report", path: "/admin/reports/received" },
    { name: "Transfer Report", path: "/admin/reports/transfer" },
    { name: "Available Stock Report", path: "/admin/reports/available-stock" },
    { name: "Return Report", path: "/admin/reports/return" },
    { name: "Metal Report", path: "/admin/reports/metal" }
];

/* =======================
   VALIDATION
======================= */

const RoleSchema = Yup.object().shape({
    name: Yup.string().trim().required("Role name is required"),
});

/* =======================
   FORM VALUES
======================= */

interface FormValues {
    name: string;
    parentRole: string;
    permissions: Permissions;
}

/* =======================
   COMPONENT
======================= */

export const RoleForm = ({ role, onSuccess, onCancel }: RoleFormProps) => {
    const isEdit = !!role;

    const { data: allRoles = [], isLoading } = useRoles();
    const createMutation = useCreateRole();
    const updateMutation = useUpdateRole();

    /* =======================
       DEFAULT PERMISSIONS
    ======================= */

    const defaultPerms: Permissions = menuItems.reduce((acc, item) => {
        acc[item.name] = {
            read: false,
            create: false,
            update: false,
            delete: false,
        };
        return acc;
    }, {} as Permissions);

    /* =======================
       API → FORM PERMISSIONS
    ======================= */

    const apiPermissions: ApiPermission[] =
        role?.permissions ?? (role as any)?.userRoles ?? [];

    const initialPermissions: Permissions = apiPermissions.reduce(
        (acc: Permissions, perm: ApiPermission) => {
            if (acc[perm.module]) {
                acc[perm.module] = {
                    read: !!perm.read,
                    create: !!perm.create,
                    update: !!perm.update,
                    delete: !!perm.delete,
                };
            }
            return acc;
        },
        { ...defaultPerms }
    );

    /* =======================
       INITIAL VALUES
    ======================= */

    const initialValues: FormValues = {
        name: role?.name ?? "",
        parentRole: role?.parentRole ?? "",
        permissions: initialPermissions,
    };

    const parentRoleOptions = allRoles.filter((r) => r.id !== role?.id);

    /* =======================
       SELECT ALL HELPERS
    ======================= */

    const toggleAllByPermission = (
        perm: keyof Permission,
        checked: boolean,
        setFieldValue: any
    ) => {
        menuItems.forEach((item) => {
            setFieldValue(`permissions.${item.name}.${perm}`, checked);
        });
    };

    const toggleAllPermissions = (
        checked: boolean,
        setFieldValue: any
    ) => {
        menuItems.forEach((item) => {
            ["read", "create", "update", "delete"].forEach((perm) => {
                setFieldValue(`permissions.${item.name}.${perm}`, checked);
            });
        });
    };

    const isAllChecked = (
        perm: keyof Permission,
        values: FormValues
    ) =>
        menuItems.every(
            (item) => values.permissions[item.name]?.[perm]
        );

    const isEverythingChecked = (values: FormValues) =>
        menuItems.every((item) =>
            ["read", "create", "update", "delete"].every(
                (perm) =>
                    values.permissions[item.name]?.[
                    perm as keyof Permission
                    ]
            )
        );

    /* =======================
       SUBMIT
    ======================= */

    const handleSubmit = async (
        values: FormValues,
        { setSubmitting }: any
    ) => {
        const payload = {
            name: values.name.trim(),
            parentRole: values.parentRole || null,
            userRoles: Object.entries(values.permissions).map(
                ([module, perms]) => ({
                    module,
                    ...perms,
                })
            ),
        };

        try {
            if (isEdit && role?.id) {
                await updateMutation.mutateAsync({
                    id: role.id,
                    data: {
                        ...payload,
                        id: role.id,
                    },
                });
                onSuccess("Role updated successfully!");
            } else {
                await createMutation.mutateAsync(payload);
                onSuccess("Role created successfully!");
            }
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message || "Something went wrong"
            );
        } finally {
            setSubmitting(false);
        }
    };

    /* =======================
       RENDER
    ======================= */

    return (
        <div className="bg-white rounded-lg border shadow-sm p-8">
            <Formik
                initialValues={initialValues}
                validationSchema={RoleSchema}
                enableReinitialize
                onSubmit={handleSubmit}
            >
                {({ values, errors, touched, isSubmitting, setFieldValue }) => (
                    <Form className="space-y-8 pb-[calc(9rem+env(safe-area-inset-bottom))] md:pb-0">
                        {/* Role Name */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <Label>Role Name *</Label>
                                <Field
                                    as={Input}
                                    name="name"
                                    placeholder="Role name"
                                />
                                {touched.name && errors.name && (
                                    <p className="text-sm text-red-600">
                                        {errors.name}
                                    </p>
                                )}
                            </div>

                            {/* Parent Role */}
                            <div>
                                <Label>Parent Role</Label>

                                {isLoading ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    <Select
                                        value={values.parentRole || "none"}
                                        onValueChange={(v) =>
                                            setFieldValue(
                                                "parentRole",
                                                v === "none" ? "" : v
                                            )
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select parent role" />
                                        </SelectTrigger>

                                        <SelectContent>
                                            <SelectItem value="none">
                                                — No parent role —
                                            </SelectItem>

                                            {parentRoleOptions.map((r) => (
                                                <SelectItem
                                                    key={r.id}
                                                    value={r.name}
                                                >
                                                    {r.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </div>

                        {/* Permissions – Desktop */}
                        <div className="hidden md:block border rounded-md overflow-x-auto">

                            <table className="w-full">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="p-3 text-left">
                                            <div className="flex items-center gap-3">
                                                <span>Module</span>
                                                <Switch
                                                    className="scale-90 md:scale-100"
                                                    checked={isEverythingChecked(values)}
                                                    onCheckedChange={(checked) =>
                                                        toggleAllPermissions(
                                                            checked,
                                                            setFieldValue
                                                        )
                                                    }
                                                />
                                                <span className="text-sm">All</span>
                                            </div>
                                        </th>

                                        {(["read", "create", "update", "delete"] as const).map(
                                            (perm) => (
                                                <th key={perm} className="p-3 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="capitalize">{perm}</span>
                                                        <Switch
                                                            className="scale-90 md:scale-100"
                                                            checked={isAllChecked(
                                                                perm,
                                                                values
                                                            )}
                                                            onCheckedChange={(checked) =>
                                                                toggleAllByPermission(
                                                                    perm,
                                                                    checked,
                                                                    setFieldValue
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                </th>
                                            )
                                        )}
                                    </tr>
                                </thead>

                                <tbody>
                                    {menuItems.map((item) => (
                                        <tr key={item.name} className="border-t">
                                            <td className="p-3 font-medium">
                                                {item.name}
                                            </td>
                                            {(["read", "create", "update", "delete"] as const).map(
                                                (perm) => (
                                                    <td key={perm} className="p-3 text-center">
                                                        <Switch
                                                            className="scale-90 md:scale-100"
                                                            checked={
                                                                values.permissions[item.name][perm]
                                                            }
                                                            onCheckedChange={(checked) =>
                                                                setFieldValue(
                                                                    `permissions.${item.name}.${perm}`,
                                                                    checked
                                                                )
                                                            }
                                                        />
                                                    </td>
                                                )
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile – Select All Controls */}
                        <div className="md:hidden border rounded-lg p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-sm">All Permissions</span>
                                <Switch
                                    checked={isEverythingChecked(values)}
                                    onCheckedChange={(checked) =>
                                        toggleAllPermissions(checked, setFieldValue)
                                    }
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {(["read", "create", "update", "delete"] as const).map(
                                    (perm) => (
                                        <div
                                            key={perm}
                                            className="flex items-center justify-between"
                                        >
                                            <span className="capitalize text-sm">
                                                All {perm}
                                            </span>
                                            <Switch
                                                checked={isAllChecked(perm, values)}
                                                onCheckedChange={(checked) =>
                                                    toggleAllByPermission(
                                                        perm,
                                                        checked,
                                                        setFieldValue
                                                    )
                                                }
                                            />
                                        </div>
                                    )
                                )}
                            </div>
                        </div>


                        {/* Permissions – Mobile */}
                        <div className="md:hidden space-y-4">
                            {menuItems.map((item) => (
                                <div
                                    key={item.name}
                                    className="border rounded-lg p-4 space-y-3"
                                >
                                    <div className="font-semibold text-sm">
                                        {item.name}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {(["read", "create", "update", "delete"] as const).map(
                                            (perm) => (
                                                <div
                                                    key={perm}
                                                    className="flex items-center justify-between"
                                                >
                                                    <span className="capitalize text-sm">
                                                        {perm}
                                                    </span>
                                                    <Switch
                                                        checked={
                                                            values.permissions[item.name][perm]
                                                        }
                                                        onCheckedChange={(checked) =>
                                                            setFieldValue(
                                                                `permissions.${item.name}.${perm}`,
                                                                checked
                                                            )
                                                        }
                                                    />
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>


                        {/* Actions (Desktop) */}
                        <div className="hidden md:flex justify-end gap-4">
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
                                {isEdit ? "Update Role" : "Create Role"}
                            </Button>
                        </div>

                        {/* Actions (Mobile Fixed Bar) */}
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
        </div>
    );
};
