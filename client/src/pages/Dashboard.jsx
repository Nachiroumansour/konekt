import { Check, Copy, LogOut, Plus, QrCode, RefreshCw, Smartphone, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';

export default function Dashboard() {
  const [instances, setInstances] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState(null);
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('idle'); // idle, qr, success
  const [copied, setCopied] = useState(false);

  // Create Instance Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  if (user && user.role === 'admin') {
    return <AdminDashboard />;
  }

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchInstances();
    fetchHistory();
  }, [token, navigate]);

  const fetchInstances = async () => {
    try {
      const res = await fetch('/api/instances', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      const data = await res.json();
      setInstances(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/messages', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateInstance = async (e) => {
    e.preventDefault();
    if (!newInstanceName.trim()) return;

    setIsCreating(true);
    try {
      const res = await fetch('/api/instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newInstanceName }),
      });

      if (res.ok) {
        fetchInstances();
        setIsCreateModalOpen(false);
        setNewInstanceName('');
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) {
      alert('Erreur lors de la création');
    } finally {
      setIsCreating(false);
    }
  };

  const deleteInstance = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette instance ?')) return;

    try {
      const res = await fetch(`/api/instances/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchInstances();
      } else {
        alert('Erreur lors de la suppression');
      }
    } catch (err) {
      alert('Erreur réseau');
    }
  };

  const showQr = async (instance) => {
    setSelectedInstance(instance);
    setQrCode(null);
    setConnectionStatus('idle');

    // Poll for QR
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/instances/${instance.id}/qr`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (data.connected) {
          setConnectionStatus('success');
          clearInterval(interval);
          fetchInstances();
          // Close modal after 1 second (faster UX)
          setTimeout(() => setSelectedInstance(null), 1000);
        } else if (data.dataUrl) {
          setQrCode(data.dataUrl);
          setConnectionStatus('qr');
        }
      } catch (err) {
        console.error(err);
      }
    }, 2000);

    // Stop polling after 60s
    setTimeout(() => clearInterval(interval), 60000);
  };

  const fallbackCopyText = (text) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  };

  const copyApiKey = async (key) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(key);
      } else if (!fallbackCopyText(key)) {
        throw new Error('Clipboard unavailable');
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy API key', err);
      alert('Copie impossible. Copiez la clé affichée manuellement.');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-2">
              <Link to="/" className="flex items-center space-x-2">
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500">
                  Konekt
                </span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/docs" className="text-slate-600 hover:text-emerald-600 font-medium text-sm">Documentation</Link>
              <div className="h-6 w-px bg-slate-200"></div>
              <button onClick={logout} className="flex items-center text-slate-600 hover:text-red-600 transition-colors text-sm font-medium">
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Mes Instances</h1>
            <p className="mt-1 text-slate-500">Gérez vos connexions WhatsApp et clés API</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 font-medium"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nouvelle Instance
          </button>
        </div>

        {instances.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="mx-auto h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Smartphone className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">Aucune instance active</h3>
            <p className="mt-2 text-slate-500 max-w-sm mx-auto">Connectez votre premier numéro WhatsApp pour commencer à envoyer des messages.</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-emerald-700 bg-emerald-100 hover:bg-emerald-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Créer une instance
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {instances.map((instance) => (
              <div key={instance.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-colors ${
                        instance.status === 'CONNECTED' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {instance.status === 'CONNECTED' ? (
                          <Smartphone className="h-6 w-6" />
                        ) : (
                          <QrCode className="h-6 w-6" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{instance.display_name || instance.session_name}</h3>
                        <div className="flex items-center mt-1">
                          <span className={`flex h-2 w-2 rounded-full mr-2 ${
                            instance.status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}></span>
                          <span className={`text-xs font-medium ${
                            instance.status === 'CONNECTED' ? 'text-emerald-700' : 'text-amber-700'
                          }`}>
                            {instance.status === 'CONNECTED' ? 'En ligne' : 'Hors ligne'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {instance.status !== 'CONNECTED' && (
                      <button
                        onClick={() => showQr(instance)}
                        className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors animate-pulse"
                        title="Scanner le QR Code"
                      >
                        <QrCode className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Clé API</label>
                      <div className="flex rounded-lg shadow-sm group-hover:shadow transition-shadow">
                        <div className="flex-1 min-w-0 px-3 py-2.5 rounded-l-lg border border-slate-200 bg-slate-50 text-xs text-slate-600 font-mono truncate">
                          {instance.api_key}
                        </div>
                        <button
                          onClick={() => copyApiKey(instance.api_key)}
                          className="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-emerald-600 transition-colors"
                        >
                          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-between items-center pt-4 border-t border-slate-100">
                    {instance.status === 'CONNECTED' ? (
                      <button
                        onClick={() => showQr(instance)}
                        className="flex items-center text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reconnecter
                      </button>
                    ) : (
                      <button
                        onClick={() => showQr(instance)}
                        className="flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200"
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        Connecter WhatsApp
                      </button>
                    )}

                    <button
                      onClick={() => deleteInstance(instance.id)}
                      className="flex items-center text-sm font-medium text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* History Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Historique des Messages</h2>
            <button onClick={fetchHistory} className="text-emerald-600 hover:text-emerald-700 font-medium text-sm flex items-center">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Destinataire</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Message</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Statut</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-slate-500 text-sm">
                        Aucun message envoyé pour le moment.
                      </td>
                    </tr>
                  ) : (
                    history.map((msg) => (
                      <tr key={msg.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {new Date(msg.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          {msg.phone}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
                          {msg.message}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            msg.status === 'SENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {msg.status === 'SENT' ? 'Envoyé' : 'Échec'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Create Instance Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl transform transition-all animate-in zoom-in duration-300">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Nouvelle Instance</h3>
              <p className="text-slate-500 mb-6">Donnez un nom à votre session WhatsApp pour l'identifier facilement.</p>

              <form onSubmit={handleCreateInstance}>
                <div className="mb-6">
                  <label htmlFor="instanceName" className="block text-sm font-medium text-slate-700 mb-2">
                    Nom de la session
                  </label>
                  <input
                    type="text"
                    id="instanceName"
                    value={newInstanceName}
                    onChange={(e) => setNewInstanceName(e.target.value)}
                    placeholder="ex: Marketing, Support Client..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-slate-900"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !newInstanceName.trim()}
                    className="flex-1 px-4 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isCreating ? (
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Créer'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* QR Code Modal */}
        {selectedInstance && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl transform transition-all">
              {connectionStatus === 'success' ? (
                <div className="flex flex-col items-center py-8 animate-in zoom-in duration-300">
                  <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                    <Check className="h-10 w-10 text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Connexion Réussie !</h3>
                  <p className="text-slate-500">Votre instance est maintenant connectée et prête à l'emploi.</p>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Scanner avec WhatsApp</h3>
                  <p className="text-slate-500 text-sm mb-6">
                    Ouvrez WhatsApp sur votre téléphone, allez dans Réglages {'>'} Appareils connectés
                  </p>

                  <div className="bg-white p-4 rounded-xl border-2 border-slate-100 inline-block mb-6">
                    {qrCode ? (
                      <img src={qrCode} alt="QR Code" className="w-64 h-64 object-contain" />
                    ) : (
                      <div className="w-64 h-64 flex items-center justify-center bg-slate-50 rounded-lg">
                        <div className="flex flex-col items-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-2"></div>
                          <span className="text-xs text-slate-400">Génération du QR...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedInstance(null)}
                    className="w-full px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Fermer
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
