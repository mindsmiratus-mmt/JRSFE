import { useAuth, type Shop } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useState, useRef, useEffect } from 'react';
import { User, Settings, LogOut, Menu } from 'lucide-react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { useChangePassword } from '@/hooks/useUser';
import logo from '@/assets/logo.webp';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useCurrentRates } from '@/hooks/useCurruntrate';

// Define the interface to fix TypeScript 'any' errors
interface TopNavUserRole {
  id?: number | string;
  role?: {
    id: number | string;
    name: string;
  };
  shop?: Shop; // Use the exact Shop interface from your AuthContext
}

const strongPasswordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&*!?._-])[A-Za-z\d@#$%^&*!?._-]{8,50}$/;

const changePasswordSchema = Yup.object().shape({
  currentPassword: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Current password is required'),

  newPassword: Yup.string()
    .required('New password is required')
    .matches(
      strongPasswordRegex,
      'Password must be 8–50 characters and include at least one uppercase letter, one lowercase letter, one number, and one special character (@#$%^&*!?._-)'
    ),

  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword')], 'Passwords do not match')
    .required('Confirm password is required'),
});

export const TopNavbar = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const { logout, user, activeRoleId, switchRole, switchShop, selectedShop } = useAuth();
  const navigate = useNavigate();
  
  // Cast the entire array so TypeScript knows every item is a TopNavUserRole
  const userRoles = (user?.userRoles as unknown as TopNavUserRole[]) ?? [];
  
  const [isOpen, setIsOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const changePasswordMutation = useChangePassword();
  const {
    data: allRates = [],
    isLoading,
    isError,
  } = useCurrentRates();

  // Filter only Gold rates and sort by purity (descending)
  const goldRates = allRates
    .filter(item => item.metalType === 'Gold')
    .sort((a, b) => parseFloat(b.purity) - parseFloat(a.purity)); // 24K first

  // FIX: Match the active role based on the pure role ID AND the selected shop
  const activeRoleObj = userRoles.find((ur) => {
    const isRoleMatch = String(ur.role?.id) === String(activeRoleId);
    const isShopMatch = selectedShop ? String(ur.shop?.id) === String(selectedShop.id) : true;
    return isRoleMatch && isShopMatch;
  });

  // Calculate the unique value required for the Select component to bind correctly
  const activeUniqueId = activeRoleObj 
    ? String(activeRoleObj.id || `${activeRoleObj.role?.id}-${userRoles.indexOf(activeRoleObj)}`) 
    : undefined;

  const activeRoleLabel = activeRoleObj?.shop?.name
    ? `${activeRoleObj?.role?.name || 'Role'} (${activeRoleObj?.shop?.name})`
    : activeRoleObj?.role?.name || 'Select role';

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
    setIsOpen(false);
  };

  const handleProfile = () => {
    navigate('/admin/profile');
    setIsOpen(false);
  };

  const handleChangePassword = () => {
    setChangePasswordOpen(true);
    setIsOpen(false);
  };

  const togglePopover = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(prev => !prev);
  };

  // --- NEW LOGIC: Handle switching both Shop (API) and Role (Context) ---
  const handleRoleShopChange = async (uniqueValue: string) => {
    const selectedUr = userRoles.find((ur, idx) => {
      const id = String(ur?.id || `${ur?.role?.id}-${idx}`);
      return id === uniqueValue;
    });

    if (!selectedUr) return;

    try {
      const targetShop = selectedUr.shop;

      // 1. If the role belongs to a specific shop and it's different from the current one, trigger switchShop API
      if (targetShop && targetShop.id !== selectedShop?.id) {
        await switchShop(targetShop); 
        toast.success(`Switched shop to ${targetShop.name}`);
      }

      // 2. FIX: Switch the active role locally using the pure Role ID (not the junction ID)
      const roleIdToSet = selectedUr.role?.id;
      if (roleIdToSet) {
        switchRole(Number(roleIdToSet));
      }

    } catch (error: any) {
      toast.error(error?.message || "Failed to switch shop");
    }
  };

  return (
    <>
      <nav className="bg-[#2b463f] border-b border-[#3d5f55] shadow-sm sticky top-0 z-40">
        <div className="px-4 lg:px-6">
          <div className="flex flex-col lg:flex-row lg:items-center py-2 lg:py-3 gap-3 lg:gap-4 lg:min-h-[64px]">
            
            {/* TOP ROW (Mobile) / LEFT SECTION (Desktop) */}
            <div className="flex items-center justify-between w-full lg:w-auto lg:flex-none">
              <div className="flex items-center gap-2">
                {/* MENU BUTTON */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-[#e6f2ef] hover:bg-[#3d5f55] h-9 w-9 lg:h-10 lg:w-10"
                  onClick={onMenuClick}
                >
                  <Menu className="h-5 w-5" />
                </Button>

                {/* CLICKABLE LOGO */}
                <img
                  src={logo}
                  alt="Jewellery Retail Shop"
                  className="h-8 lg:h-12 w-auto object-contain cursor-pointer transition-transform hover:scale-105"
                  onClick={() => navigate('/admin/dashboard')}
                  title="Go to Dashboard"
                />
                
                {/* SHOP DETAILS */}
                <div className="flex flex-col text-left leading-snug">
                  {selectedShop && (
                    <>
                      <span className="text-xs lg:text-sm font-semibold text-[#e6f2ef] truncate max-w-[120px] sm:max-w-[200px]">
                        {selectedShop?.name}
                      </span>
                      <span className="text-[10px] text-[#b7d1ca] truncate max-w-[120px] sm:max-w-[200px]">
                        {selectedShop?.address}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* USER PROFILE BUTTON (Mobile Only) */}
              <div className="relative lg:hidden">
                <Button
                  variant="ghost"
                  className="h-8 px-3 rounded-full flex items-center border border-[#3d5f55] hover:bg-[#3d5f55]"
                  onClick={togglePopover}
                >
                  <span className="text-xs font-medium text-[#e6f2ef] truncate max-w-[80px]">
                    {user?.username}
                  </span>
                </Button>
                {/* Mobile Popover */}
                {isOpen && (
                  <div
                    ref={popoverRef}
                    className="absolute right-0 top-full mt-2 w-48 bg-[#fffaf2] border border-[#fddc69]/40 rounded-lg shadow-lg z-50"
                  >
                    <div className="py-1">
                      <Button variant="ghost" className="w-full justify-start text-sm h-10 px-3 hover:bg-accent" onClick={handleProfile}>
                        <User className="mr-2 h-4 w-4" /> Profile
                      </Button>
                      <Button variant="ghost" className="w-full justify-start text-sm h-10 px-3 hover:bg-accent" onClick={handleChangePassword}>
                        <Settings className="mr-2 h-4 w-4" /> Change Password
                      </Button>
                      <div className="border-t border-border my-1" />
                      <Button variant="ghost" className="w-full justify-start text-sm h-10 px-3 hover:bg-destructive/20 text-destructive" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" /> Logout
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SCROLLING GOLD RATE TICKER (Mobile Order 3 / Desktop Center) */}
            <div className="flex justify-center w-full lg:flex-1 overflow-hidden order-3 lg:order-none pb-1 lg:pb-0">
              {isLoading ? (
                <span className="text-[11px] font-medium text-[#fadc61]">
                  Loading gold rates...
                </span>
              ) : isError || goldRates.length === 0 ? (
                <span className="text-[11px] font-medium text-[#fadc61]">
                  Gold rates unavailable
                </span>
              ) : (
                <div className="relative w-full max-w-4xl bg-[#233a34] lg:bg-transparent rounded-md py-1 lg:py-0">
                  <style>{`
                    @keyframes scroll-rtl {
                      0% { transform: translateX(0); }
                      100% { transform: translateX(-50%); }
                    }
                    .ticker-content {
                      display: inline-flex;
                      animation: scroll-rtl 30s linear infinite;
                    }
                    .ticker-wrapper:hover .ticker-content {
                      animation-play-state: paused;
                    }
                  `}</style>

                  <div className="ticker-wrapper overflow-hidden whitespace-nowrap">
                    <div className="ticker-content">
                      {[...goldRates, ...goldRates].map((rate, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] font-medium text-[#fadc61] mx-4"
                        >
                           {rate.id} : ₹{rate.rate.toLocaleString()}/{rate.unit}
                          <span className="mx-2 text-[#b7d1ca]">•</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ROLE SWITCHER & DESKTOP PROFILE (Mobile Order 2 / Desktop Right) */}
            <div className="flex items-center justify-between lg:justify-end w-full lg:w-auto gap-3 order-2 lg:order-none">
              
              {/* ROLE SWITCH DROPDOWN */}
              {userRoles.length > 1 && (
                <div className="w-full lg:w-[220px]">
                  <Select
                    value={activeUniqueId} // FIX: Bound to the correct unique ID
                    onValueChange={handleRoleShopChange}
                  >
                    <SelectTrigger className="h-8 text-xs px-3 w-full border-[#3d5f55] bg-[#233a34] text-[#e6f2ef]">
                      <span className="truncate flex-1 text-left">{activeRoleLabel}</span>
                    </SelectTrigger>

                    <SelectContent>
                      {userRoles.map((ur, idx) => {
                        const uniqueId = String(ur.id || `${ur.role?.id}-${idx}`);
                        const shopLabel = ur.shop?.name ? ` (${ur.shop.name})` : '';
                        
                        return (
                          <SelectItem key={uniqueId} value={uniqueId}>
                            {ur.role?.name}{shopLabel}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* USERNAME BUTTON (Desktop Only) */}
              <div className="relative hidden lg:block">
                <Button
                  variant="ghost"
                  className="h-8 px-3 rounded-full flex items-center border border-[#3d5f55] hover:bg-[#3d5f55]"
                  onClick={togglePopover}
                >
                  <span className="text-xs font-medium text-[#e6f2ef] truncate max-w-[100px]">
                    {user?.username}
                  </span>
                </Button>

                {/* Desktop Popover */}
                {isOpen && (
                  <div
                    ref={popoverRef}
                    className="absolute right-0 top-full mt-2 w-48 bg-[#fffaf2] border border-[#fddc69]/40 rounded-lg shadow-lg z-50"
                  >
                    <div className="py-1">
                      <Button variant="ghost" className="w-full justify-start text-sm h-10 px-3 hover:bg-accent" onClick={handleProfile}>
                        <User className="mr-2 h-4 w-4" /> Profile
                      </Button>
                      <Button variant="ghost" className="w-full justify-start text-sm h-10 px-3 hover:bg-accent" onClick={handleChangePassword}>
                        <Settings className="mr-2 h-4 w-4" /> Change Password
                      </Button>
                      <div className="border-t border-border my-1" />
                      <Button variant="ghost" className="w-full justify-start text-sm h-10 px-3 hover:bg-destructive/20 text-destructive" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" /> Logout
                      </Button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </nav>

      {/* CHANGE PASSWORD MODAL */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent
          onCloseAutoFocus={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>

          <Formik
            initialValues={{
              currentPassword: '',
              newPassword: '',
              confirmPassword: '',
            }}
            validationSchema={changePasswordSchema}
            validateOnChange={false}
            validateOnBlur={true}
            validateOnMount={false}
            onSubmit={(values, { setSubmitting }) => {
              const userId = user?.id ? Number(user.id) : null;

              if (!userId) {
                toast.error('User ID not found');
                setSubmitting(false);
                return;
              }

              changePasswordMutation.mutate(
                {
                  id: userId,
                  data: {
                    currentPassword: values.currentPassword,
                    newPassword: values.newPassword,
                    userId,
                  },
                },
                {
                  onSuccess: () => {
                    toast.success('Password changed successfully');
                    setChangePasswordOpen(false);
                  },
                  onError: (error: any) => {
                    toast.error(error?.message || 'Failed to change password');
                  },
                  onSettled: () => setSubmitting(false),
                }
              );
            }}
          >
            {({ errors, touched, resetForm, setTouched }) => {
              const handleCancel = () => {
                resetForm();
                setTouched({});
                setChangePasswordOpen(false);
              };

              return (
                <Form className="space-y-4" noValidate>
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Field
                      name="currentPassword"
                      as={Input}
                      id="currentPassword"
                      type="password"
                      autoComplete="current-password"
                      placeholder="Enter current password"
                    />
                    {touched.currentPassword && errors.currentPassword && (
                      <p className="text-sm text-red-600 mt-1">{errors.currentPassword}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Field
                      name="newPassword"
                      as={Input}
                      id="newPassword"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Enter new password"
                    />
                    {touched.newPassword && errors.newPassword && (
                      <p className="text-sm text-red-600 mt-1">{errors.newPassword}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Field
                      name="confirmPassword"
                      as={Input}
                      id="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Confirm new password"
                    />
                    {touched.confirmPassword && errors.confirmPassword && (
                      <p className="text-sm text-red-600 mt-1">{errors.confirmPassword}</p>
                    )}
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>

                    <Button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                      onClick={() =>
                        setTouched({
                          currentPassword: true,
                          newPassword: true,
                          confirmPassword: true,
                        })
                      }
                    >
                      {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                    </Button>
                  </DialogFooter>
                </Form>
              );
            }}
          </Formik>
        </DialogContent>
      </Dialog>
    </>
  );
};