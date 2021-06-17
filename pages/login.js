import { getCsrfToken, getSession } from 'next-auth/client';
import LoginView from '../components/login-view';

export default function LoginPage(props) {
  return <LoginView {...props} />;
}

export const getServerSideProps = async (ctx) => {
  const session = await getSession(ctx);
  const csrfToken = await getCsrfToken(ctx);

  return {
    props: {
      session,
      csrfToken,
    },
  };
};
