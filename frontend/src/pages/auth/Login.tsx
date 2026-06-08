import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const LoginSchema = Yup.object().shape({
  identifier: Yup.string().required('Email or PRN is required'),
  password: Yup.string().min(4, 'Too short!').required('Password is required'),
});

const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (values: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await login(values.identifier, values.password);
      const user = response.data.user;

      if (user.role === 'SUPER_ADMIN') {
        navigate('/super-admin/dashboard');
      } else if (user.role === 'BRANCH_ADMIN') {
        navigate('/branch-admin/dashboard');
      } else if (user.role === 'STUDENT') {
        navigate('/student/select-exam');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Logo */}
      <div className="mb-6">
        <img src="/logo.svg" alt="Dnyansetu Logo" className="h-14 w-auto object-contain" />
      </div>

      <h2 className="text-xl font-bold text-center text-text-dark mb-1">Sign in to continue</h2>
      <p className="text-text-muted text-center mb-7 text-sm">Please sign in to start your application</p>

      {error && (
        <div className="w-full mb-5 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg text-center font-medium animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      )}

      <Formik
        initialValues={{ identifier: '', password: '' }}
        validationSchema={LoginSchema}
        onSubmit={handleSubmit}
      >
        {({ errors, touched }) => (
          <Form className="w-full space-y-5">
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1.5" htmlFor="identifier">
                Email Address or PRN
              </label>
              <Field
                id="identifier"
                name="identifier"
                type="text"
                placeholder="Enter email or PRN"
                className={`input-field ${errors.identifier && touched.identifier ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
              />
              <ErrorMessage name="identifier" component="div" className="text-red-500 text-xs mt-1" />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-dark mb-1.5" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Field
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  className={`input-field pr-11 ${errors.password && touched.password ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <ErrorMessage name="password" component="div" className="text-red-500 text-xs mt-1" />
              <div className="flex justify-end mt-1.5">
                <button type="button" className="text-xs text-gray-400 hover:text-secondary transition-colors">
                  Forgot password?
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base rounded-lg mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default LoginPage;
