import { useState } from 'react';

export default function SigninView({ onSignIn, onBack, onSignup }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      return;
    }
    setErrorMessage('');
    setIsLoading(true);
    try {
      await onSignIn({ identifier, password });
    } catch (error) {
      setErrorMessage(error.message || 'Sign in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-20 px-6">
      <div className="max-w-md mx-auto bg-white rounded-[32px] p-8 shadow-xl border border-slate-100">
        <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Sign in to AegisAI</h2>
        <p className="text-sm text-slate-500 mb-6">Enter email, username, or phone with password to continue.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Email / Username / Phone</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-300"
              placeholder="Enter email, username, or phone"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-300"
              placeholder="Enter your password"
              required
            />
          </div>

          {errorMessage && <p className="text-sm font-medium text-red-600">{errorMessage}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-2xl transition-all"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600 text-center">
          Don&apos;t have an account?{' '}
          <button onClick={onSignup} className="text-orange-500 font-bold hover:text-orange-600 cursor-pointer" type="button">
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
}
