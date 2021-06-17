import { Alert, Button, Form, Input } from 'antd';
import { getCsrfToken, getSession, signIn, useSession } from 'next-auth/client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import queryString from 'query-string';
const returnErrorMessage = (code) => {
  if (!code) return '';
  // https://next-auth.js.org/configuration/pages#error-codes
  // if (code === 'Configuration') return 'There is a problem with the server configuration. Check if your options is correct.'
  if (code === 'AccessDenied') {
    return 'Usually occurs, when you restricted access through the signIn callback, or redirect callback';
  }
  if (code === 'Verification') {
    return 'The token has expired or has already been used';
  }
  if (code === 'OAuthSignin') {
    return 'Error in constructing an authorization URL';
  }
  if (code === 'OAuthCallback') {
    return 'Error in handling the response from an OAuth provider.';
  }
  if (code === 'OAuthCreateAccount') {
    return 'Could not create OAuth provider user in the database.';
  }
  if (code === 'EmailCreateAccount') {
    return 'Could not create email provider user in the database.';
  }
  if (code === 'Callback') {
    return 'Error in the OAuth callback handler route';
  }
  if (code === 'OAuthAccountNotLinked') {
    return 'If the email on the account is already linked, but not with this OAuth account';
  }
  if (code === 'EmailSignin') {
    return 'Sending the e-mail with the verification token failed';
  }
  return 'Error processing your login, please try again.';
};

let initialEmailSent = false;

export default function LoginView({ next, csrfToken, email, onLogin }) {
  const [hasStartedVerification, setHasStartedVerification] = useState(false);
  const [credentials, setCredentials] = useState();
  const [emailLoading, setEmailLoading] = useState(false);
  const [errorCode, setErrorCode] = useState('');
  const [emailForm] = Form.useForm();
  const [session] = useSession();

  useEffect(() => {
    const setToken = async () => {
      emailForm.setFields([
        { name: ['csrfToken'], value: await getCsrfToken() },
      ]);
    };
    if (!csrfToken) setToken();
  }, [csrfToken, emailForm]);

  function setCurrentState(email) {
    if (email) {
      setHasStartedVerification(true);
      setCredentials({ email });
      setEmailLoading(false);
      initialEmailSent = true;
    } else {
      setHasStartedVerification(false);
      setCredentials(undefined);
      setEmailLoading(false);
      initialEmailSent = false;
    }
  }

  const startVerification = useCallback(
    async ({ email = '' }) => {
      setEmailLoading(true);
      await signIn('email', { email, redirect: false, callbackUrl: next })
        .then((res) => {
          setCurrentState(email);
          return res;
        })
        .catch(() => {
          setCurrentState();
          return null;
        });
    },
    [next]
  );

  const checkVerification = async ({ verificationCode }) => {
    setEmailLoading(true);
    if (!credentials?.email) {
      setHasStartedVerification(false);
      setCredentials(undefined);
    } else {
      const result = await fetch(
        `/api/auth/callback/email?email=${credentials.email}&token=${verificationCode}`
      );
      if (result.ok) {
        const user = await getSession().then((session) => session?.user);
        console.log('SHOULD NOW BE LOGGED IN WITH', user);
        onLogin?.(user);
      } else {
        const {
          query: { error },
        } = queryString.parseUrl(result.url);
        setErrorCode(error);
      }
    }
    setEmailLoading(false);
  };

  useEffect(() => {
    if (email && !initialEmailSent) {
      startVerification({ email });
    }
  }, [email, startVerification]);

  return (
    <>
      {session?.user ? (
        <AlreadyLoggedIn next={next} session={session} />
      ) : hasStartedVerification ? (
        <EnterVerificationCode
          email={credentials?.email}
          onSubmit={checkVerification}
          // onResend={startVerification}
          onClear={() => {
            setHasStartedVerification(false);
            setCredentials(undefined);
            setEmailLoading(false);
            setErrorCode('');
          }}
          loading={emailLoading}
          error={returnErrorMessage(errorCode)}
          clearError={() => setErrorCode('')}
        />
      ) : (
        <Layout title="Log in">
          <EmailForm
            onSubmit={startVerification}
            loading={emailLoading}
            error={returnErrorMessage(errorCode)}
            initialValues={{ csrfToken }}
            clearError={() => setErrorCode('')}
            form={emailForm}
          />
        </Layout>
      )}
    </>
  );
}

function Layout({ title = '', children }) {
  return (
    <div className="container max-w-sm w-full flex place-items-center justify-center items-center text-left">
      <div>
        {title && (
          <h1 className="leading-tight text-lg mb-1 font-medium">{title}</h1>
        )}
        {children}
      </div>
    </div>
  );
}

function AlreadyLoggedIn({ next = '', session }) {
  const [text, setText] = useState(next || 'Home');

  useEffect(() => {
    if (next) setText(next);
    else if (typeof window !== 'undefined') setText(window.location.origin);
  }, [next]);

  return (
    <Layout>
      <div className="max-w-full text-center space-y-4 mx-auto">
        <div style={{ marginTop: -20 }}>
          <div>
            <h2 className="text-lg mb-1">
              You have been logged in to EezyQuote,{' '}
              {next
                ? 'you will now be redirect'
                : 'you can now close this tab.'}
            </h2>
            <p>
              {session?.user && (
                <div className="mb-2 text-gray-500 text-xs">
                  Logged In:{' '}
                  {session.user?.name
                    ? `${session.user?.name} (${session.user?.email})`
                    : session.user?.email}
                </div>
              )}
              <Link href={next || '/'}>
                <a className="font-bold">{text}</a>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const useStatus = (error) => {
  const [status, setStatus] = useState(error ? 'error' : undefined);

  useEffect(() => {
    if (error) setStatus('error');
    else setStatus(undefined);
  }, [error]);

  return [status, setStatus];
};

function EmailForm({
  onSubmit,
  loading,
  error,
  initialValues,
  clearError,
  form,
  autoFocus = false,
}) {
  const [status] = useStatus(error);

  return (
    <Form
      form={form}
      onFinish={onSubmit}
      size="large"
      className="max-w-full mx-auto"
      initialValues={initialValues}
      onFieldsChange={() => clearError()}
    >
      <Form.Item name="csrfToken" hidden>
        <Input disabled />
      </Form.Item>
      <Form.Item
        name="email"
        rules={[
          { required: true, message: 'Email is required!' },
          { type: 'email', message: 'The email is not valid!' },
        ]}
        validateTrigger={['onBlur']}
        validateStatus={status}
      >
        <Input
          className="h-12 font-medium"
          type="email"
          placeholder="e.g. example@domain.com"
          disabled={loading}
          autoComplete="email"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={autoFocus}
        />
      </Form.Item>
      {error && <Alert type="error" message={error} className="mb-2" />}
      <Button htmlType="submit" block type="primary" loading={loading}>
        Continue
      </Button>
    </Form>
  );
}

function EnterVerificationCode({
  onSubmit,
  onClear,
  email,
  loading,
  error,
  clearError,
}) {
  const [status] = useStatus(error);

  return (
    <Layout title="Enter your security code">
      <p>
        We have sent a security code to{' '}
        <b>
          {email}{' '}
          <span className="text-info cursor-pointer" onClick={() => onClear()}>
            ✍️
          </span>
        </b>
      </p>
      <Form
        onFinish={onSubmit}
        size="large"
        className="max-w-sm mx-auto"
        onFieldsChange={() => clearError()}
      >
        <Form.Item
          name="verificationCode"
          validateStatus={status}
          rules={[
            { required: true, message: 'The security code is required!' },
          ]}
          normalize={(value) => (value || '').toUpperCase()}
          initialValue="TEST"
        >
          <Input
            className="h-12 font-medium"
            placeholder="Security Code"
            autoComplete="one-time-code"
            type="text"
            disabled={loading}
          />
        </Form.Item>
        {error && <Alert type="error" message={error} className="mb-2" />}
        <Button htmlType="submit" block type="info" loading={loading}>
          Confirm
        </Button>
      </Form>
    </Layout>
  );
}
