import { Modal } from 'antd';
import { useSession } from 'next-auth/client';
import LoginView from '../components/login-view';

export const useLoginModal = () => {
  const [modal, context] = Modal.useModal();
  const [session] = useSession();

  const loginModal = (props) => {
    return new Promise((resolve) => {
      const login = modal.confirm({
        title: null,
        content: (
          <div className="-mb-4">
            <LoginView
              onLogin={(user) => {
                login.destroy();
                resolve(user);
              }}
              {...props}
            />
          </div>
        ),
        centered: true,
        closable: true,
        icon: false,
        onCancel: () => {
          login.destroy();
          resolve(session?.user || undefined);
        },
        okButtonProps: { className: 'hidden' },
        cancelButtonProps: { className: 'hidden' },
      });
    });
  };

  return [loginModal, context];
};
