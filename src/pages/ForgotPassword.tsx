import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const forgotPasswordSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email address').required('Email is required'),
});

export const ForgotPassword = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Reset your password</CardTitle>
          <CardDescription className="text-center">
            Enter your email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Formik
            initialValues={{
              email: '',
            }}
            validationSchema={forgotPasswordSchema}
            onSubmit={async (_values, { setSubmitting, setStatus }) => {
              // TODO: Replace with actual API call
              setTimeout(() => {
                setStatus({ success: true, message: 'Password reset link has been sent to your email.' });
                setSubmitting(false);
              }, 1000);
            }}
          >
            {({ errors, touched, isSubmitting, status }) => (
              <Form className="space-y-4">
                {status?.success && (
                  <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">
                    {status.message}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Field
                    as={Input}
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    className={errors.email && touched.email ? 'border-destructive' : ''}
                  />
                  {errors.email && touched.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending...' : 'Send reset link'}
                </Button>

                <div className="text-center">
                  <Link
                    to="/login"
                    className="text-sm text-primary hover:underline"
                  >
                    Back to login
                  </Link>
                </div>
              </Form>
            )}
          </Formik>
        </CardContent>
      </Card>
    </div>
  );
};
