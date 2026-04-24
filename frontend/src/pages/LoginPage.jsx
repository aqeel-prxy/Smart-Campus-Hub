import { useState } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const BACKEND_BASE_URL = API_BASE_URL.endsWith('/api')
    ? API_BASE_URL.slice(0, -4)
    : API_BASE_URL;

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    console.log('LoginPage rendered'); // Debugging log

    const handleAuth = async (e, action) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        console.log(`handleAuth called with action: ${action}`); // Debugging log

        if (!email || !password) {
            setError('Please enter both email and password.');
            setLoading(false);
            return;
        }

        try {
            const endpoint =
                action === 'login'
                    ? `${API_BASE_URL}/auth/login`
                    : `${API_BASE_URL}/auth/register`;

            const response = await fetch(endpoint, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const responseText = await response.text();
            let data = {};
            try {
                data = responseText ? JSON.parse(responseText) : {};
            } catch {
                data = { message: responseText || 'Unexpected server response.' };
            }

            if (response.ok) {
                if (action === 'login') {
                    window.location.href = '/dashboard';
                } else {
                    setMessage('Registration successful! You can now log in.');
                    setPassword('');
                }
            } else {
                setError(data?.message || 'Authentication failed.');
            }
        } catch (err) {
            console.error('Error during authentication:', err); // Debugging log
            setError(`Server not reachable. Is backend running at ${API_BASE_URL}?`);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        console.log('Google login initiated'); // Debugging log
        setError('');
        window.location.href = `${BACKEND_BASE_URL}/oauth2/authorization/google`;
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-slate-950 px-4 py-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_#2563eb33,_transparent_40%),radial-gradient(circle_at_bottom_right,_#14b8a633,_transparent_35%)]" />
            <div className="relative max-w-5xl mx-auto min-h-[80vh] grid lg:grid-cols-2 gap-6 items-center">
                <section className="hidden lg:block p-8">
                    <p className="uppercase tracking-[0.35em] text-cyan-300 text-xs mb-4">Smart Campus Hub</p>
                    <h1 className="text-5xl font-black leading-tight text-white">
                        Run Campus Operations
                        <span className="block text-cyan-300">from one control room.</span>
                    </h1>
                    <p className="mt-5 text-slate-300 max-w-md">
                        Access facilities, bookings, incidents, and notifications in a unified workflow platform.
                    </p>
                    <div className="mt-8 grid grid-cols-2 gap-3 max-w-md">
                        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                            <p className="text-xs text-slate-400">Modules</p>
                            <p className="text-lg font-semibold text-cyan-300">A - E</p>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                            <p className="text-xs text-slate-400">Security</p>
                            <p className="text-lg font-semibold text-emerald-300">OAuth + RBAC</p>
                        </div>
                    </div>
                </section>

                <section className="w-full max-w-md mx-auto rounded-3xl border border-slate-800 bg-slate-900/80 backdrop-blur p-8 shadow-2xl">
                    <h2 className="text-2xl font-bold text-white">Sign in to continue</h2>
                    <p className="text-slate-400 text-sm mt-1 mb-6">Use your campus account credentials.</p>

                    {error && (
                        <div className="mb-4 rounded-lg border border-rose-700 bg-rose-900/30 px-3 py-2 text-rose-200 text-sm">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="mb-4 rounded-lg border border-emerald-700 bg-emerald-900/30 px-3 py-2 text-emerald-200 text-sm">
                            {message}
                        </div>
                    )}

                    <form className="space-y-3">
                        <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />

                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />

                        <button
                            type="submit"
                            onClick={(e) => handleAuth(e, 'login')}
                            disabled={loading}
                            className="w-full rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2.5 transition-colors disabled:opacity-60"
                        >
                            {loading ? 'Please wait...' : 'Login'}
                        </button>

                        <button
                            type="button"
                            onClick={(e) => handleAuth(e, 'register')}
                            disabled={loading}
                            className="w-full rounded-lg border border-slate-600 hover:border-cyan-400 text-slate-200 font-semibold py-2.5 transition-colors"
                        >
                            Create account
                        </button>
                    </form>

                    <div className="my-5 h-px bg-slate-800" />

                    <button
                        onClick={handleGoogleLogin}
                        className="w-full rounded-lg bg-white text-slate-900 font-semibold py-2.5 hover:bg-slate-200 transition-colors"
                    >
                        Continue with Google
                    </button>
                </section>
            </div>
        </div>
    );
};

export default LoginPage;