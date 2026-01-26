import { Lock, Phone } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Auto-prepend\\ 221 if missing
    let formattedPhone = phone.replace(/\s+/g, ''); // Remove spaces
    if (!formattedPhone.startsWith('221') && !formattedPhone.startsWith('+221')) {
      formattedPhone = '221' + formattedPhone;
    }
    formattedPhone = formattedPhone.replace('+', ''); // Ensure no + is sent if backend expects pure numbers

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/dashboard');
      } else if (res.status === 403 && data.needsVerification) {
        navigate('/verify', { state: { phone: formattedPhone } });
      } else {
        setError(data.error || 'Erreur de connexion');
      }
    } catch (err) {
      setError('Erreur réseau');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-slate-100">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-slate-900">Connexion</h2>
          <p className="mt-2 text-sm text-slate-600">
            Accédez à votre tableau de bord
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">Numéro de téléphone</label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-500 sm:text-sm font-medium">+221</span>
                </div>
                <input
                  type="tel"
                  id="phone"
                  required
                  className="focus:ring-emerald-500 focus:border-emerald-500 block w-full pl-14 sm:text-sm border-slate-300 rounded-lg py-3 text-slate-900"
                  placeholder="77 000 00 00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-slate-400" />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label>
              <div className="relative rounded-md shadow-sm">
                <input
                  type="password"
                  id="password"
                  required
                  className="focus:ring-emerald-500 focus:border-emerald-500 block w-full pl-4 pr-10 sm:text-sm border-slate-300 rounded-lg py-3 text-slate-900"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all shadow-lg shadow-emerald-600/20"
            >
              Se connecter
            </button>
          </div>

          <div className="text-center mt-4">
            <p className="text-sm text-slate-600">
              Pas encore de compte ? <Link to="/register" className="font-medium text-emerald-600 hover:text-emerald-500">Inscrivez-vous gratuitement</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
