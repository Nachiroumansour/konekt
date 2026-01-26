import { ArrowRight, Check, Code2, Cpu, Globe, Layout, Menu, Shield, Terminal, X } from 'lucide-react';
import { useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard';
import Dashboard from './pages/Dashboard';
import Docs from './pages/Docs';
import Login from './pages/Login';
import Register from './pages/Register';
import Verify from './pages/Verify';

function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sliderValue, setSliderValue] = useState(1000);
  const pricePerCredit = 10; // 10 FCFA par crédit

  const calculatePrice = (credits) => {
    return new Intl.NumberFormat('fr-FR').format(credits * pricePerCredit);
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-300 selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Background Grid Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-emerald-500 opacity-20 blur-[100px]"></div>
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-slate-950/60 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white">
                Konekt
              </span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Produit</a>
              <a href="#developers" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Développeurs</a>
              <a href="#pricing" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Tarifs</a>
              <Link to="/docs" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Docs</Link>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Connexion</Link>
              <Link to="/register" className="group relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white transition-all duration-200 bg-white/10 font-pj rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 hover:bg-white/20">
                Commencer
                <div className="absolute -inset-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 opacity-0 group-hover:opacity-20 blur transition duration-200" />
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-400 hover:text-white">
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-slate-950 px-4 py-6 space-y-4">
            <a href="#features" className="block text-base font-medium text-slate-400 hover:text-white">Produit</a>
            <a href="#developers" className="block text-base font-medium text-slate-400 hover:text-white">Développeurs</a>
            <a href="#pricing" className="block text-base font-medium text-slate-400 hover:text-white">Tarifs</a>
            <Link to="/docs" className="block text-base font-medium text-slate-400 hover:text-white">Docs</Link>
            <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
              <Link to="/login" className="block text-center text-base font-medium text-slate-300 hover:text-white">Connexion</Link>
              <Link to="/register" className="block text-center bg-emerald-600 text-white px-4 py-2 rounded-lg text-base font-medium hover:bg-emerald-500">
                Commencer
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 text-center lg:text-left">
              <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.1]">
                Engagez vos clients sur <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                  WhatsApp
                </span> sans limite.
              </h1>
              <p className="text-lg text-slate-400 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
                L'API la plus simple pour envoyer des notifications, images, OTP et rappels.
                <strong>Fini les abonnements mensuels</strong> : payez uniquement ce que vous consommez avec nos packs de crédits sans expiration.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <Link to="/register" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20 hover:shadow-emerald-900/40">
                  Créer un compte gratuit
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link to="/docs" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold rounded-xl text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
                  <Terminal className="mr-2 h-4 w-4" />
                  Documentation
                </Link>
              </div>

              <div className="mt-10 flex items-center justify-center lg:justify-start gap-6 text-slate-500 text-sm font-medium">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>Crédits sans expiration</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>Setup en 2 min</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>API Stable</span>
                </div>
              </div>
            </div>

            {/* Code Preview */}
            <div className="lg:w-1/2 w-full perspective-1000">
              <div className="relative rounded-xl bg-[#0D1117] shadow-2xl border border-white/10 overflow-hidden transform rotate-y-12 hover:rotate-0 transition-all duration-700 ease-out group">
                {/* Window Controls */}
                <div className="flex items-center px-4 py-3 border-b border-white/5 bg-white/5">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-[#FF5F56]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#27C93F]"></div>
                  </div>
                  <div className="ml-4 text-xs text-slate-500 font-mono flex items-center gap-2">
                    <span className="text-emerald-500">POST</span>
                    konekt.nexteranga.com/send
                  </div>
                </div>

                {/* Code Content */}
                <div className="p-6 overflow-x-auto">
                  <pre className="font-mono text-sm leading-relaxed">
                    <code className="text-slate-300">
                      <span className="text-purple-400">const</span> response <span className="text-purple-400">=</span> <span className="text-purple-400">await</span> fetch(<span className="text-emerald-300">'/send'</span>, {'{'}{'\n'}
                      {'  '}method: <span className="text-emerald-300">'POST'</span>,{'\n'}
                      {'  '}headers: {'{'}{'\n'}
                      {'    '}<span className="text-emerald-300">'X-WA-SECRET'</span>: <span className="text-emerald-300">'votre_api_key'</span>{'\n'}
                      {'  '}{'}'},{'\n'}
                      {'  '}body: JSON.<span className="text-blue-400">stringify</span>({'{'}{'\n'}
                      {'    '}phone: <span className="text-emerald-300">'221770000000'</span>,{'\n'}
                      {'    '}message: <span className="text-emerald-300">'Votre commande #42 est prête !'</span>{'\n'}
                      {'  '}{'}'}){'\n'}
                      {'}'});{'\n\n'}
                      <span className="text-slate-500">// Response</span>{'\n'}
                      <span className="text-emerald-400">{'{'} "status": "success", "credits_remaining": 499 {'}'}</span>
                    </code>
                  </pre>
                </div>

                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              </div>

              {/* Background Glows */}
              <div className="absolute -top-20 -right-20 w-72 h-72 bg-emerald-500/20 rounded-full blur-[100px] -z-10"></div>
              <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-[100px] -z-10"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div id="features" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Tout ce dont vous avez besoin</h2>
            <p className="text-slate-400">Une suite complète d'outils pour gérer vos communications WhatsApp à grande échelle.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Large Card */}
            <div className="md:col-span-2 bg-white/5 rounded-3xl p-8 border border-white/10 hover:border-emerald-500/50 transition-colors overflow-hidden relative group">
              <div className="relative z-10">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-6 border border-emerald-500/20">
                  <Layout className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Dashboard Intuitif</h3>
                <p className="text-slate-400 max-w-md">
                  Suivez votre consommation de crédits en temps réel. Recevez des alertes WhatsApp quand votre solde est bas.
                </p>
              </div>
              <div className="absolute right-0 bottom-0 w-1/2 h-full bg-gradient-to-l from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>

            {/* Tall Card */}
            <div className="bg-gradient-to-b from-emerald-900/20 to-slate-900/50 rounded-3xl p-8 border border-emerald-500/20 shadow-lg shadow-emerald-900/10 relative overflow-hidden">
              <div className="relative z-10">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-6 border border-emerald-500/20">
                  <Code2 className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Developer First</h3>
                <p className="text-slate-400 text-sm mb-6">
                  Intégration facile avec n'importe quel langage. Documentation claire et exemples de code.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                    Webhooks (Bientôt)
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                    API REST Simple
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                    Support Images & Médias
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                    Support Réactif
                  </div>
                </div>
              </div>
            </div>

            {/* Small Card 1 */}
            <div className="bg-white/5 rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-colors">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4 border border-blue-500/20">
                <Globe className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Liberté Totale</h3>
              <p className="text-slate-400 text-sm">Pas d'engagement. Vos crédits sont valables à vie tant que votre compte est actif.</p>
            </div>

            {/* Small Card 2 */}
            <div className="bg-white/5 rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-colors">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4 border border-purple-500/20">
                <Shield className="h-5 w-5 text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Sécurisé</h3>
              <p className="text-slate-400 text-sm">Authentification par clé API. Isolation des données clients.</p>
            </div>

            {/* Small Card 3 */}
            <div className="bg-white/5 rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-colors">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4 border border-orange-500/20">
                <Cpu className="h-5 w-5 text-orange-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Haute Dispo</h3>
              <p className="text-slate-400 text-sm">Infrastructure robuste conçue pour délivrer vos messages instantanément.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white">Tarification Ultra-Simple</h2>
            <p className="mt-4 text-xl text-emerald-400 font-semibold">10 FCFA / Crédit</p>
            <p className="text-slate-400 mt-2">Le tarif le plus bas du marché. Sans engagement.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-start">

            {/* Free Tier */}
            <div className="p-8 rounded-3xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white text-xl">Découverte</h3>
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20">Gratuit</span>
              </div>
              <div className="mt-4 flex items-baseline">
                <span className="text-5xl font-bold text-white">0</span>
                <span className="text-slate-400 ml-2">FCFA</span>
              </div>
              <p className="mt-4 text-slate-400">Pour tester l'API sans carte bancaire.</p>

              <Link to="/register" className="mt-8 block w-full py-3 px-4 bg-white/10 text-white font-medium rounded-xl text-center hover:bg-white/20 transition-colors border border-white/5">
                Créer un compte gratuit
              </Link>

              <ul className="mt-8 space-y-4 text-sm text-slate-400">
                <li className="flex items-center"><Check className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0"/> <strong>25 Crédits</strong> offerts</li>
                <li className="flex items-center"><Check className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0"/> Accès complet à l'API</li>
                <li className="flex items-center"><Check className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0"/> Pas de limite de temps</li>
              </ul>
            </div>

            {/* Custom Calculator */}
            <div className="p-8 rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-900/10 to-slate-900/50 relative shadow-2xl shadow-emerald-900/10">
              <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl">SUR MESURE</div>
              <h3 className="font-semibold text-white text-xl mb-6">Simulateur de Coût</h3>

              <div className="space-y-8">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-300">Nombre de crédits</span>
                    <span className="text-emerald-400 font-bold">{new Intl.NumberFormat('fr-FR').format(sliderValue)}</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="50000"
                    step="100"
                    value={sliderValue}
                    onChange={(e) => setSliderValue(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-2">
                    <span>100</span>
                    <span>50.000+</span>
                  </div>
                </div>

                <div className="bg-slate-950/50 rounded-2xl p-6 border border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-400">Prix Total</span>
                    <div className="text-right">
                      <span className="text-4xl font-bold text-white">{calculatePrice(sliderValue)}</span>
                      <span className="text-slate-400 ml-2">FCFA</span>
                    </div>
                  </div>
                  <div className="text-right text-xs text-emerald-500/80 font-mono">
                    Soit {pricePerCredit} FCFA / message
                  </div>
                </div>

                <Link to="/register" className="block w-full py-3 px-4 bg-emerald-500 text-white font-medium rounded-xl text-center hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/25">
                  Acheter {new Intl.NumberFormat('fr-FR').format(sliderValue)} Crédits
                </Link>

                <div className="grid grid-cols-2 gap-4 text-xs text-slate-400 pt-4 border-t border-white/5">
                  <div className="flex items-center"><Check className="h-3 w-3 text-emerald-500 mr-2"/> Validité à vie</div>
                  <div className="flex items-center"><Check className="h-3 w-3 text-emerald-500 mr-2"/> Support inclus</div>
                  <div className="flex items-center"><Check className="h-3 w-3 text-emerald-500 mr-2"/> Facture TVA</div>
                  <div className="flex items-center"><Check className="h-3 w-3 text-emerald-500 mr-2"/> Paiement Mobile</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">Konekt</span>
          </div>
          <div className="flex gap-8 text-sm text-slate-400">
            <a href="#" className="hover:text-white transition-colors">Conditions</a>
            <a href="#" className="hover:text-white transition-colors">Confidentialité</a>
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
          </div>
          <div className="text-sm text-slate-500">
            © 2025 Konekt Inc.
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify" element={<Verify />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/docs" element={<Docs />} />
    </Routes>
  );
}

export default App;
