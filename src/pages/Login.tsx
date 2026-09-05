import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, type Shop } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from '@/components/ui/toast';
import { useMemo, useState } from 'react';
import { Loader2, MapPin, Store } from 'lucide-react';

const loginSchema = Yup.object().shape({
  username: Yup.string().required('Username is required'),
  password: Yup.string().required('Password is required'),
});

export const Login = () => {
  // FIX: Destructured `user` and `switchRole` from useAuth
  const { login, switchShop, isLoading, user, switchRole } = useAuth();
  const [showShopSelect, setShowShopSelect] = useState(false);
  const [shopSearch, setShopSearch] = useState('');
  const [assignedShops, setAssignedShops] = useState<Shop[]>([]);
  const [isSwitchingShop, setIsSwitchingShop] = useState<number | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (
    values: { username: string; password: string },
    { setSubmitting, setFieldError }: any
  ) => {
    try {
      const res = await login(values.username, values.password);
      const activeShops = (res.assignedShops ?? []).filter(
        (shop) => shop?.isActive !== false
      );

      if (activeShops.length > 0) {
        setAssignedShops(activeShops);
        setShowShopSelect(true);
        toast.success('Login successful. Please select a shop.');
      } else {
        toast.success('Login successful');
        navigate('/admin/dashboard');
      }
    } catch (error: any) {
      setFieldError(
        'password',
        error?.message || 'Invalid username or password'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectShop = async (shop: Shop) => {
    try {
      setIsSwitchingShop(shop.id);
      
      // 1. Switch the shop first
      await switchShop(shop);

      // 2. FIX: Automatically set the role associated with the selected shop
      if (user?.userRoles) {
        const matchingRole = user.userRoles.find(ur => ur.shop?.id === shop.id);
        if (matchingRole?.role?.id) {
          switchRole(matchingRole.role.id);
        }
      }

      toast.success(`Shop switched to ${shop.name}`);
      navigate('/admin/dashboard');
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to switch shop'
      );
    } finally {
      setIsSwitchingShop(null);
    }
  };

  const filteredShops = useMemo(() => {
    const keyword = shopSearch.trim().toLowerCase();

    if (!keyword) return assignedShops;

    return assignedShops.filter((shop) =>
      [shop.name, shop.address, shop.city, shop.state, shop.pinCode]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [assignedShops, shopSearch]);

  return (
    <div className="relative min-h-screen bg-[url('/login-bg.jpg')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <Card
          className="
            w-full max-w-md
            bg-white/95
            backdrop-blur-md
            shadow-2xl
            border
            border-[#ffce7a]/40
            rounded-2xl
          "
        >
          <CardHeader className="space-y-4">
            <div className="flex justify-center mb-3">
              <div
                className="
                  flex
                  items-center
                  justify-center
                  h-20
                  w-20
                  rounded-full
                  bg-[#2b463f]
                  shadow-lg
                  ring-2
                  ring-[#ffce7a]/50
                "
              >
                <img
                  src="/logo.webp"
                  alt="Jewellery Retail Shop"
                  className="h-10 w-auto object-contain"
                />
              </div>
            </div>

            <CardTitle className="text-2xl text-center font-bold text-[#500009]">
              {showShopSelect ? 'Select your shop' : 'Sign in to your account'}
            </CardTitle>

            <CardDescription className="text-center text-[#25120b]/70">
              {showShopSelect
                ? 'Choose the shop you want to continue with'
                : 'Enter your credentials to access the system'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {!showShopSelect && (
              <Formik
                initialValues={{ username: '', password: '' }}
                validationSchema={loginSchema}
                onSubmit={handleSubmit}
              >
                {({ errors, touched, isSubmitting }) => (
                  <Form className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Field
                        as={Input}
                        id="username"
                        name="username"
                        placeholder="Enter your username"
                        className="
                          border-[#25120b]/30
                          focus-visible:border-[#ffce7a]
                          focus-visible:ring-[#ffce7a]
                          rounded-lg
                        "
                      />
                      {errors.username && touched.username && (
                        <p className="text-sm text-destructive">{errors.username}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Field
                        as={Input}
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Enter your password"
                        className="
                          border-[#25120b]/30
                          focus-visible:border-[#ffce7a]
                          focus-visible:ring-[#ffce7a]
                          rounded-lg
                        "
                      />
                      {errors.password && touched.password && (
                        <p className="text-sm text-destructive">{errors.password}</p>
                      )}
                    </div>

                    <div className="flex justify-between">
                      <Link
                        to="/forgot-password"
                        className="
                          text-sm
                          text-[#b8023d]
                          hover:text-[#500009]
                          hover:underline
                        "
                      >
                        Forgot your password?
                      </Link>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading || isSubmitting}
                      className="
                        w-full
                        bg-[#fadc61]
                        text-[#25120b]
                        font-semibold
                        hover:bg-[#ffce7a]
                        transition
                        shadow-lg
                        rounded-lg
                        active:scale-[0.98]
                      "
                    >
                      {isLoading || isSubmitting ? 'Signing in...' : 'Sign in'}
                    </Button>
                  </Form>
                )}
              </Formik>
            )}

            {showShopSelect && (
              <div
                className="
                  border
                  border-[#ffce7a]/40
                  rounded-2xl
                  p-5
                  bg-white/95
                  shadow-lg
                  space-y-4
                "
              >
                <Input
                  placeholder="Search by shop name, city or address..."
                  value={shopSearch}
                  onChange={(e) => setShopSearch(e.target.value)}
                  className="
                    border-[#25120b]/30
                    focus-visible:border-[#ffce7a]
                    focus-visible:ring-[#ffce7a]
                    rounded-lg
                  "
                />

                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  {filteredShops.length > 0 ? (
                    filteredShops.map((shop) => {
                      const isCurrentLoading = isSwitchingShop === shop.id;

                      return (
                        <button
                          key={shop.id}
                          type="button"
                          onClick={() => handleSelectShop(shop)}
                          disabled={isCurrentLoading || isSwitchingShop !== null}
                          className="
                            w-full text-left
                            group flex flex-col gap-2
                            p-4 rounded-xl border
                            border-[#ffce7a]/30
                            bg-[#ffce7a]/10
                            hover:bg-[#ffce7a]/20
                            hover:ring-1 hover:ring-[#fadc61]
                            transition
                            disabled:opacity-60 disabled:cursor-not-allowed
                          "
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Store className="w-4 h-4 text-[#500009] shrink-0" />
                                <span className="text-sm font-semibold text-[#500009] truncate">
                                  {shop.name}
                                </span>
                              </div>

                              <div className="flex items-start gap-2 text-xs text-[#25120b]/70">
                                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                <span className="leading-relaxed">
                                  {shop.address}
                                  {shop.city && `, ${shop.city}`}
                                  {shop.state && `, ${shop.state}`}
                                  {shop.pinCode && ` - ${shop.pinCode}`}
                                </span>
                              </div>
                            </div>

                            {isCurrentLoading && (
                              <Loader2 className="w-4 h-4 animate-spin text-[#500009] shrink-0 mt-0.5" />
                            )}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-sm text-[#25120b]/60 text-center py-6">
                      No shops found
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};