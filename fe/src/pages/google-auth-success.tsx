import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

export default function GoogleAuthSuccessPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { setUser, setToken, fetchMe } = useAuth();
    const hasProcessed = useRef(false);

    useEffect(() => {
        const process = async () => {
            // Ngăn chặn chạy lại nếu đã xử lý rồi
            if (hasProcessed.current) {
                return;
            }

            const token = searchParams.get('token');
            const userStr = searchParams.get('user');
            const error = searchParams.get('error');

            if (error) {
                hasProcessed.current = true;
                toast.error('Google authentication failed', {
                    position: 'top-center',
                    closeButton: true,
                });
                navigate('/auth/sign-in');
                return;
            }

            if (token && userStr) {
                try {
                    const user = JSON.parse(decodeURIComponent(userStr));
                    hasProcessed.current = true;
                    setToken(token);
                    setUser(user);
                    await fetchMe();

                    toast.success('Signed in successfully with Google', {
                        position: 'top-center',
                        closeButton: true,
                    });

                    navigate('/');
                } catch (error) {
                    hasProcessed.current = true;
                    console.error('Failed to parse user data:', error);
                    toast.error('Authentication failed', {
                        position: 'top-center',
                        closeButton: true,
                    });
                    navigate('/auth/sign-in');
                }
            } else {
                hasProcessed.current = true;
                toast.error('Missing authentication data', {
                    position: 'top-center',
                    closeButton: true,
                });
                navigate('/auth/sign-in');
            }
        };

        process();
    }, [searchParams, navigate, setUser, setToken, fetchMe]);

    return (
        <div className='flex h-full w-full items-center justify-center'>
            <div className='text-center'>
                <h2 className='text-xl font-semibold'>Processing Google Sign In...</h2>
                <p className='text-muted-foreground mt-2'>Please wait while we complete your authentication.</p>
            </div>
        </div>
    );
}
