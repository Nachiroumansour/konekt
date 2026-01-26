import { AlertCircle, Check, Copy, LogOut, MessageSquare, Plus, QrCode, Server, Smartphone, Trash2, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// --- Components ---

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl transform transition-all animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-xl shadow-lg flex items-center space-x-3 animate-in slide-in-from-bottom-5 duration-300 z-50 ${
      type === 'error' ? 'bg-red-50 text-red-800 border border-red-100' : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
    }`}>
      {type === 'error' ? <AlertCircle className="h-5 w-5" /> : <Check className="h-5 w-5" />}
      <span className="font-medium text-sm">{message}</span>
    </div>
  );
};

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [instances, setInstances] = useState([]);
  const [myInstances, setMyInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState(null);
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('idle'); // idle, qr, success

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'user' | 'instance', id: string }
  const [selectedUserForCredits, setSelectedUserForCredits] = useState(null);
  const [selectedUserForMessage, setSelectedUserForMessage] = useState(null); // null = all

  // Search & Selection States
  const [userSearch, setUserSearch] = useState('');
  const [instanceSearch, setInstanceSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Form States
  const [newInstanceName, setNewInstanceName] = useState('');
  const [creditsAmount, setCreditsAmount] = useState('1000');
  const [messageText, setMessageText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  // Toast State
  const [toast, setToast] = useState(null); // { message, type }

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const copyApiKey = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    showToast('Clé API copiée !');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [token, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, instancesRes, myInstancesRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/instances', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/instances', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (usersRes.status === 401 || usersRes.status === 403) {
        // Not admin or invalid token
        return;
      }

      const usersData = await usersRes.json();
      const instancesData = await instancesRes.json();
      const myInstancesData = await myInstancesRes.json();

      setUsers(usersData);
      setInstances(instancesData);
      setMyInstances(myInstancesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createInstance = async () => {
    if (!newInstanceName.trim()) return;

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
        fetchData();
        setIsCreateModalOpen(false);
        setNewInstanceName('');
        showToast('Instance créée avec succès');
      } else {
        const data = await res.json();
        showToast(data.error || 'Erreur création', 'error');
      }
    } catch (err) {
      showToast('Erreur lors de la création', 'error');
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
          fetchData();
          // Close modal after 2 seconds
          setTimeout(() => setSelectedInstance(null), 2000);
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

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    const { type, id } = deleteTarget;
    const url = type === 'user' ? `/api/admin/users/${id}` : `/api/instances/${id}`;

    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchData();
        showToast(type === 'user' ? 'Utilisateur supprimé' : 'Instance supprimée');
      } else {
        showToast('Erreur lors de la suppression', 'error');
      }
    } catch (err) {
      showToast('Erreur serveur', 'error');
    } finally {
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
    }
  };

  const openDeleteModal = (type, id) => {
    setDeleteTarget({ type, id });
    setIsDeleteModalOpen(true);
  };

  // Legacy wrappers to avoid breaking existing calls if any remain
  const deleteUser = (id) => openDeleteModal('user', id);
  const deleteInstance = (id) => openDeleteModal('instance', id);

  const handleAddCredits = async () => {
    if (!selectedUserForCredits) return;

    const amount = parseInt(creditsAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      showToast('Montant invalide', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${selectedUserForCredits.id}/credits`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ credits: amount }),
      });

      if (res.ok) {
        fetchData();
        setIsCreditsModalOpen(false);
        showToast('Crédits ajoutés avec succès');
      } else {
        showToast('Erreur lors de l\'ajout', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Erreur serveur', 'error');
    }
  };

  const openCreditsModal = (user) => {
    setSelectedUserForCredits(user);
    setCreditsAmount('1000');
    setIsCreditsModalOpen(true);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      showToast('Le message ne peut pas être vide', 'error');
      return;
    }

    const target = selectedUserForMessage ? selectedUserForMessage.id : 'all';

    try {
      const res = await fetch('/api/admin/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ target, message: messageText, mediaUrl }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(data.message);
        setIsMessageModalOpen(false);
        setMessageText('');
        setMediaUrl('');
      } else {
        const data = await res.json();
        showToast(data.error || 'Erreur lors de l\'envoi', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Erreur serveur', 'error');
    }
  };

  const openMessageModal = (user = null) => {
    setSelectedUserForMessage(user);
    setMediaUrl('');
    setMessageText('');
    setIsMessageModalOpen(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Filtered Data
  const filteredUsers = users.filter(u =>
    (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase())) ||
    (u.phone && u.phone.includes(userSearch))
  );

  const filteredInstances = instances.filter(i =>
    (i.session_name && i.session_name.toLowerCase().includes(instanceSearch.toLowerCase())) ||
    (i.user_phone && i.user_phone.includes(instanceSearch)) ||
    (i.id && i.id.includes(instanceSearch))
  );

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-white">
                Konekt Admin
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/docs" className="text-slate-400 hover:text-white font-medium text-sm">Documentation</Link>
              <div className="h-6 w-px bg-slate-700"></div>
              <button onClick={logout} className="flex items-center text-slate-400 hover:text-red-400 transition-colors text-sm font-medium">
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Utilisateurs Totaux</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{users.length}</p>
              </div>
              <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <User className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Instances Actives</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{instances.length}</p>
              </div>
              <div className="h-12 w-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Server className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Mes Instances</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{myInstances.length}</p>
              </div>
              <div className="h-12 w-12 bg-purple-50 rounded-xl flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* Users List */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-900">Utilisateurs</h2>
                <button
                  onClick={() => openMessageModal(null)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center"
                >
                  <MessageSquare className="h-3 w-3 mr-1.5" />
                  Message à tous
                </button>
              </div>
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <ul className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {filteredUsers.map((user) => (
                <li key={user.id} className={`px-6 py-4 hover:bg-slate-50 transition-colors ${selectedUsers.includes(user.id) ? 'bg-emerald-50/30' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="mr-4 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                      />
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                        {user.email ? user.email[0].toUpperCase() : 'U'}
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-slate-900">{user.email || 'Sans email'}</p>
                        <p className="text-xs text-slate-500 font-mono">{user.phone}</p>
                        <div className="flex items-center mt-1 space-x-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            user.message_count >= (user.message_limit || 25) ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {user.message_count} / {user.message_limit || 25} msgs
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openCreditsModal(user)}
                        className="px-2 py-1 text-xs font-bold rounded border border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                      >
                        + Crédits
                      </button>

                      <button
                        onClick={() => openMessageModal(user)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Envoyer un message"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => deleteUser(user.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* My Instances (Admin's own instances) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">Mes Instances Admin</h2>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-bold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
              >
                <Plus className="h-3 w-3 mr-1" />
                Créer
              </button>
            </div>
            <ul className="divide-y divide-slate-100">
              {myInstances.map((instance) => (
                <li key={instance.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`h-2.5 w-2.5 rounded-full mr-3 ${
                        instance.status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}></div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{instance.session_name}</p>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <p className="text-xs text-slate-500">{instance.status}</p>
                          <span className="text-slate-300">|</span>
                          <button
                            onClick={() => copyApiKey(instance.api_key)}
                            className="text-xs text-slate-500 hover:text-emerald-600 flex items-center transition-colors"
                            title="Copier la clé API"
                          >
                            {copiedKey === instance.api_key ? <Check className="h-3 w-3 mr-1 text-emerald-600" /> : <Copy className="h-3 w-3 mr-1" />}
                            API Key
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => showQr(instance)}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Scanner QR"
                      >
                        <QrCode className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteInstance(instance.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
              {myInstances.length === 0 && (
                <li className="px-6 py-8 text-center text-slate-500 text-sm">
                  Aucune instance admin créée.
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* All System Instances (Read Only View) */}
        <div className="mt-10 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-4">
            <h2 className="text-lg font-bold text-slate-900">Toutes les Instances Système</h2>
            <input
              type="text"
              placeholder="Rechercher une instance (nom, ID, téléphone propriétaire)..."
              value={instanceSearch}
              onChange={(e) => setInstanceSearch(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nom</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Propriétaire</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredInstances.map((instance) => (
                  <tr key={instance.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">{instance.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{instance.session_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        instance.status === 'CONNECTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {instance.status || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{instance.user_phone}</span>
                        <span className="text-xs text-slate-400">ID: {instance.user_id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => deleteInstance(instance.id)}
                        className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md transition-colors"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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
                  <p className="text-slate-500">L'instance <span className="font-semibold">{selectedInstance.session_name}</span> est connectée.</p>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Scanner avec WhatsApp</h3>
                  <p className="text-slate-500 text-sm mb-6">
                    Instance: <span className="font-semibold">{selectedInstance.session_name}</span>
                  </p>

                  <div className="bg-white p-4 rounded-xl border-2 border-slate-100 inline-block mb-6">
                    {qrCode ? (
                      <img src={qrCode} alt="QR Code" className="w-64 h-64 object-contain" />
                    ) : (
                      <div className="w-64 h-64 flex items-center justify-center bg-slate-50 rounded-lg">
                        <div className="flex flex-col items-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-2"></div>
                          <span className="text-xs text-slate-400">Génération...</span>
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

        {/* Create Instance Modal */}
        <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Nouvelle Instance Admin">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom de la session</label>
              <input
                type="text"
                value={newInstanceName}
                onChange={(e) => setNewInstanceName(e.target.value)}
                placeholder="Ex: Serveur OTP"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                autoFocus
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={createInstance}
                disabled={!newInstanceName.trim()}
                className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Créer
              </button>
            </div>
          </div>
        </Modal>

        {/* Add Credits Modal */}
        <Modal isOpen={isCreditsModalOpen} onClose={() => setIsCreditsModalOpen(false)} title="Ajouter des Crédits">
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Ajouter des crédits de messages pour <span className="font-semibold text-slate-900">{selectedUserForCredits?.email || selectedUserForCredits?.phone}</span>.
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de messages</label>
              <input
                type="number"
                value={creditsAmount}
                onChange={(e) => setCreditsAmount(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                min="1"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setIsCreditsModalOpen(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleAddCredits}
                className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Ajouter
              </button>
            </div>
          </div>
        </Modal>

        {/* Send Message Modal */}
        <Modal isOpen={isMessageModalOpen} onClose={() => setIsMessageModalOpen(false)} title="Envoyer un message">
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              {selectedUserForMessage
                ? <span>Message pour <span className="font-semibold text-slate-900">{selectedUserForMessage.email || selectedUserForMessage.phone}</span></span>
                : <span>Message pour <span className="font-semibold text-slate-900">TOUS les utilisateurs</span></span>
              }
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all min-h-[120px]"
                placeholder="Votre message ici..."
              />
            </div>
              <label className="block text-sm font-medium text-slate-700 mb-1">URL de l'image (Optionnel)</label>
              <input
                type="text"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="https://exemple.com/image.jpg"
              />
              <p className="text-xs text-slate-500 mt-1">L'envoi d'une image coûte 3 crédits.</p>
            </div>
            <div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setIsMessageModalOpen(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSendMessage}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Envoyer
              </button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirmer la suppression">
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-xl border border-red-100">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800">
                Êtes-vous sûr de vouloir supprimer {deleteTarget?.type === 'user' ? 'cet utilisateur' : 'cette instance'} ? Cette action est irréversible.
              </p>
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </Modal>

        {/* Toast Notification */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

      </main>
    </div>
  );
}
