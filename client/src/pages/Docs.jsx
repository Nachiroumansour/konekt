import { AlertCircle, Check, ChevronRight, Copy, Globe, Key, LayoutDashboard, Menu, Play, Terminal, X, Zap } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const CodeBlock = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-900/50 my-4">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
        <span className="text-xs font-mono text-slate-400 uppercase">{language}</span>
        <button
          onClick={copyToClipboard}
          className="text-slate-400 hover:text-white transition-colors"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="text-sm font-mono text-slate-300">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

const Section = ({ id, title, children }) => (
  <section id={id} className="mb-16 scroll-mt-24">
    <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
      <span className="bg-emerald-500/10 text-emerald-500 p-2 rounded-lg mr-3">
        <ChevronRight className="h-5 w-5" />
      </span>
      {title}
    </h2>
    {children}
  </section>
);

export default function Docs() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('curl');

  const apiBaseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://konekt.livelink.store';

  // Test Console State
  const [testApiKey, setTestApiKey] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testMediaUrl, setTestMediaUrl] = useState('');
  const [testResponse, setTestResponse] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  const handleTestSend = async (e) => {
    e.preventDefault();
    if (!testApiKey || !testPhone || !testMessage) return;

    setTestLoading(true);
    setTestResponse(null);

    try {
      const res = await fetch(`${apiBaseUrl}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WA-SECRET': testApiKey
        },
        body: JSON.stringify({ phone: testPhone, message: testMessage, mediaUrl: testMediaUrl })
      });

      const rawBody = await res.text();
      let data;

      try {
        data = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        data = {
          error: rawBody || 'Réponse non JSON reçue',
          contentType: res.headers.get('content-type') || 'unknown'
        };
      }

      setTestResponse({ ok: res.ok, status: res.status, data });
    } catch (err) {
      setTestResponse({ ok: false, status: 'Error', data: { error: err.message } });
    } finally {
      setTestLoading(false);
    }
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  const codeExamples = {
    curl: `curl -X POST ${apiBaseUrl}/send \\
  -H "Content-Type: application/json" \\
  -H "X-WA-SECRET: YOUR_API_KEY" \\
  -d '{"phone": "221770000000", "message": "Hello from Konekt!", "mediaUrl": "https://example.com/image.jpg"}'`,
    node: `const axios = require('axios');

await axios.post('${apiBaseUrl}/send', {
  phone: '221770000000',
  message: 'Hello from Konekt!',
  mediaUrl: 'https://example.com/image.jpg' // Optionnel
}, {
  headers: {
    'X-WA-SECRET': 'YOUR_API_KEY'
  }
});`,
    python: `import requests

url = "${apiBaseUrl}/send"
payload = {
    "phone": "221770000000",
    "message": "Hello from Konekt!",
    "mediaUrl": "https://example.com/image.jpg" # Optionnel
}
headers = {
    "Content-Type": "application/json",
    "X-WA-SECRET": "YOUR_API_KEY"
}

response = requests.post(url, json=payload, headers=headers)
print(response.text)`,
    php: `<?php
$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => '${apiBaseUrl}/send',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS => json_encode([
    "phone" => "221770000000",
    "message" => "Hello from Konekt!",
    "mediaUrl" => "https://example.com/image.jpg" // Optionnel
  ]),
  CURLOPT_HTTPHEADER => array(
    'Content-Type: application/json',
    'X-WA-SECRET: YOUR_API_KEY'
  ),
));

$response = curl_exec($curl);
curl_close($curl);
echo $response;`,
    batchCurl: `curl -X POST ${apiBaseUrl}/send-batch \\
  -H "Content-Type: application/json" \\
  -H "X-WA-SECRET: YOUR_API_KEY" \\
  -d '{
    "numbers": ["221770000000", "221770000001"],
    "message": "Votre message de diffusion ici"
  }'`,
    batchNode: `const axios = require('axios');

await axios.post('${apiBaseUrl}/send-batch', {
  numbers: ['221770000000', '221770000001'],
  message: 'Votre message de diffusion ici'
}, {
  headers: { 'X-WA-SECRET': 'YOUR_API_KEY' }
});`
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-300 selection:bg-emerald-500/30 selection:text-emerald-200">

      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-3">
              <span className="text-xl font-bold text-white">Konekt Docs</span>
            </div>

            <div className="hidden md:flex items-center space-x-6">
              <Link to="/dashboard" className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
              <a href="https://konekt.me/221770000000" target="_blank" rel="noreferrer" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg transition-all">
                Support
              </a>
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-slate-400">
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        <div className="flex flex-col md:flex-row gap-10">

          {/* Sidebar Navigation */}
          <aside className={`fixed md:sticky top-24 left-0 w-64 h-[calc(100vh-8rem)] overflow-y-auto bg-slate-950 md:bg-transparent z-40 transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0 p-4 border-r border-slate-800' : '-translate-x-full md:translate-x-0'}`}>
            <div className="space-y-8">
              <div>
                <h5 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Démarrage</h5>
                <ul className="space-y-2">
                  <li><button onClick={() => scrollToSection('intro')} className="text-slate-400 hover:text-emerald-400 text-sm">Introduction</button></li>
                  <li><button onClick={() => scrollToSection('quickstart')} className="text-slate-400 hover:text-emerald-400 text-sm">Guide Rapide</button></li>
                  <li><button onClick={() => scrollToSection('connect')} className="text-slate-400 hover:text-emerald-400 text-sm">Connexion WhatsApp</button></li>
                </ul>
              </div>
              <div>
                <h5 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">API Reference</h5>
                <ul className="space-y-2">
                  <li><button onClick={() => scrollToSection('auth')} className="text-slate-400 hover:text-emerald-400 text-sm">Authentification</button></li>
                  <li><button onClick={() => scrollToSection('send')} className="text-slate-400 hover:text-emerald-400 text-sm">Envoyer un Message</button></li>
                  <li><button onClick={() => scrollToSection('send-batch')} className="text-slate-400 hover:text-emerald-400 text-sm">Envoi Groupé</button></li>
                  <li><button onClick={() => scrollToSection('history')} className="text-slate-400 hover:text-emerald-400 text-sm">Historique</button></li>
                  <li><button onClick={() => scrollToSection('otp')} className="text-slate-400 hover:text-emerald-400 text-sm">Envoyer un OTP</button></li>
                </ul>
              </div>
              <div>
                <h5 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Outils</h5>
                <ul className="space-y-2">
                  <li><button onClick={() => scrollToSection('console')} className="text-slate-400 hover:text-emerald-400 text-sm">Console de Test</button></li>
                  <li><button onClick={() => scrollToSection('errors')} className="text-slate-400 hover:text-emerald-400 text-sm">Codes Erreur</button></li>
                </ul>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">

            <Section id="intro" title="Introduction">
              <p className="text-lg text-slate-400 leading-relaxed mb-6">
                Bienvenue sur la documentation de l'API Konekt. Notre API vous permet d'envoyer des messages WhatsApp programmatiques de manière simple et fiable.
                Idéal pour les notifications, les codes OTP, les rappels de rendez-vous et le service client automatisé.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                  <Zap className="h-6 w-6 text-amber-400 mb-2" />
                  <h3 className="font-bold text-white mb-1">Rapide</h3>
                  <p className="text-sm text-slate-500">Délivrance instantanée des messages.</p>
                </div>
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                  <Key className="h-6 w-6 text-emerald-400 mb-2" />
                  <h3 className="font-bold text-white mb-1">Sécurisé</h3>
                  <p className="text-sm text-slate-500">Authentification par clé API unique.</p>
                </div>
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                  <Globe className="h-6 w-6 text-blue-400 mb-2" />
                  <h3 className="font-bold text-white mb-1">Simple</h3>
                  <p className="text-sm text-slate-500">Intégration REST standard.</p>
                </div>
              </div>
            </Section>

            <Section id="quickstart" title="Guide de Démarrage">
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold">1</div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Créer un compte</h3>
                    <p className="text-slate-400">Inscrivez-vous sur la plateforme Konekt et connectez-vous à votre tableau de bord.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold">2</div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Créer une Instance</h3>
                    <p className="text-slate-400">Dans le Dashboard, cliquez sur "Nouvelle Instance". Donnez-lui un nom (ex: "Mon Business").</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold">3</div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Scanner le QR Code</h3>
                    <p className="text-slate-400">Cliquez sur l'icône QR Code de votre instance. Ouvrez WhatsApp sur votre téléphone, allez dans "Appareils connectés" et scannez le code.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold">4</div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Récupérer votre API Key</h3>
                    <p className="text-slate-400">Une fois connecté, votre API Key (X-WA-SECRET) est affichée sur la carte de l'instance. Copiez-la.</p>
                  </div>
                </div>
              </div>
            </Section>

            <Section id="connect" title="Connexion WhatsApp">
              <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
                <h3 className="text-lg font-bold text-white mb-4">Comment scanner le QR Code ?</h3>
                <ol className="list-decimal list-inside space-y-3 text-slate-400">
                  <li>Ouvrez WhatsApp sur votre téléphone.</li>
                  <li>Appuyez sur <strong>Menu</strong> (Android) ou <strong>Réglages</strong> (iPhone).</li>
                  <li>Sélectionnez <strong>Appareils connectés</strong>.</li>
                  <li>Appuyez sur <strong>Connecter un appareil</strong>.</li>
                  <li>Pointez votre téléphone vers l'écran pour scanner le QR Code affiché dans le Dashboard Konekt.</li>
                </ol>
                <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-200">
                    Assurez-vous que votre téléphone reste connecté à internet pour que l'instance puisse envoyer des messages.
                  </p>
                </div>
              </div>
            </Section>

            <Section id="auth" title="Authentification">
              <p className="text-slate-400 mb-4">
                Toutes les requêtes API doivent inclure votre clé API dans l'en-tête HTTP <code className="text-emerald-400">X-WA-SECRET</code>.
              </p>
              <CodeBlock language="http" code={`X-WA-SECRET: votre_api_key_ici`} />
            </Section>

            <Section id="send" title="Envoyer un Message">
              <p className="text-slate-400 mb-4">
                Endpoint pour envoyer un message texte simple.
              </p>

              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 font-mono font-bold rounded">POST</span>
                <code className="text-slate-200">{`${apiBaseUrl}/send`}</code>
              </div>

              <h4 className="text-white font-bold mb-2 mt-6">Paramètres (JSON)</h4>
              <ul className="space-y-2 text-slate-400 mb-6">
                <li><code className="text-emerald-400">phone</code> (string, requis): Le numéro de téléphone du destinataire avec l'indicatif pays (ex: "221770000000").</li>
                <li><code className="text-emerald-400">message</code> (string, requis): Le contenu du message.</li>
                <li><code className="text-emerald-400">mediaUrl</code> (string, optionnel): URL de l'image à envoyer. Coût: 3 crédits.</li>
              </ul>

              <div className="mb-6">
                <div className="flex space-x-2 mb-2 overflow-x-auto pb-2">
                  {Object.keys(codeExamples).map(lang => (
                    <button
                      key={lang}
                      onClick={() => setActiveTab(lang)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === lang
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
                <CodeBlock language={activeTab} code={codeExamples[activeTab]} />
              </div>
            </Section>

            <Section id="send-batch" title="Envoi Groupé (Batch)">
              <p className="text-slate-400 mb-4">
                Envoyez plusieurs messages en une seule requête HTTP. Idéal pour les notifications de masse.
              </p>

              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 font-mono font-bold rounded">POST</span>
                <code className="text-slate-200">{`${apiBaseUrl}/send-batch`}</code>
              </div>

              <h4 className="text-white font-bold mb-2 mt-6">Paramètres (JSON)</h4>
              <ul className="space-y-2 text-slate-400 mb-6">
                <li><code className="text-emerald-400">numbers</code> (array of strings, requis): Liste des numéros de téléphone destinataires.</li>
                <li><code className="text-emerald-400">message</code> (string, requis): Le message à envoyer à tous les numéros.</li>
              </ul>

              <div className="mb-6">
                <h5 className="text-sm font-bold text-slate-500 uppercase mb-2">Exemple cURL</h5>
                <CodeBlock language="bash" code={codeExamples.batchCurl} />
                <h5 className="text-sm font-bold text-slate-500 uppercase mb-2 mt-4">Exemple Node.js</h5>
                <CodeBlock language="javascript" code={codeExamples.batchNode} />
              </div>
            </Section>

            <Section id="history" title="Historique des Messages">
              <p className="text-slate-400 mb-4">
                Récupérez la liste des 50 derniers messages envoyés par votre instance.
              </p>

              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 font-mono font-bold rounded">GET</span>
                <code className="text-slate-200">{`${apiBaseUrl}/api/messages`}</code>
              </div>

              <div className="mb-6">
                <CodeBlock language="bash" code={`curl -X GET ${apiBaseUrl}/api/messages \
  -H "X-WA-SECRET: YOUR_API_KEY"`} />
              </div>
            </Section>

            <Section id="console" title="Console de Test">
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-800">
                  <h3 className="text-lg font-bold text-white flex items-center">
                    <Terminal className="h-5 w-5 mr-2 text-emerald-500" />
                    Testeur d'API en direct
                  </h3>
                  <p className="text-slate-500 text-sm mt-1">Envoyez un message réel depuis votre instance connectée.</p>
                </div>

                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <form onSubmit={handleTestSend} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">API Key (X-WA-SECRET)</label>
                      <input
                        type="text"
                        value={testApiKey}
                        onChange={(e) => setTestApiKey(e.target.value)}
                        placeholder="Collez votre clé API ici"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Numéro Destinataire</label>
                      <input
                        type="text"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="ex: 221770000000"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Message</label>
                      <textarea
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        placeholder="Votre message..."
                        rows={4}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL Média (Optionnel)</label>
                      <input
                        type="text"
                        value={testMediaUrl}
                        onChange={(e) => setTestMediaUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none font-mono text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={testLoading || !testApiKey || !testPhone || !testMessage}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center"
                    >
                      {testLoading ? (
                        <span className="animate-pulse">Envoi en cours...</span>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2 fill-current" />
                          Envoyer le Test
                        </>
                      )}
                    </button>
                  </form>

                  <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-sm overflow-auto max-h-[400px]">
                    <div className="text-slate-500 mb-2 text-xs uppercase font-bold">Réponse API</div>
                    {testResponse ? (
                      <div className={testResponse.ok ? 'text-emerald-400' : 'text-red-400'}>
                        <div className="mb-2">Status: {testResponse.status}</div>
                        <pre className="whitespace-pre-wrap break-words">{JSON.stringify(testResponse.data, null, 2)}</pre>
                      </div>
                    ) : (
                      <div className="text-slate-600 italic">
                        En attente d'une requête...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Section>

            <Section id="errors" title="Codes Erreur">
              <div className="overflow-hidden rounded-xl border border-slate-800">
                <table className="min-w-full divide-y divide-slate-800">
                  <thead className="bg-slate-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Code HTTP</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Description</th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-900/50 divide-y divide-slate-800">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-emerald-400">200 OK</td>
                      <td className="px-6 py-4 text-sm text-slate-400">Message envoyé avec succès.</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-amber-400">400 Bad Request</td>
                      <td className="px-6 py-4 text-sm text-slate-400">Paramètres manquants (phone, message).</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-red-400">401 Unauthorized</td>
                      <td className="px-6 py-4 text-sm text-slate-400">Clé API manquante ou invalide.</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-red-400">402 Payment Required</td>
                      <td className="px-6 py-4 text-sm text-slate-400">Quota de messages atteint ou abonnement expiré.</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-red-400">503 Service Unavailable</td>
                      <td className="px-6 py-4 text-sm text-slate-400">Instance WhatsApp non connectée.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Section>

          </main>
        </div>
      </div>
    </div>
  );
}
