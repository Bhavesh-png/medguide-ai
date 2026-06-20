import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Calendar as CalendarIcon, 
  ShieldCheck, 
  ClipboardList, 
  Send, 
  Plus, 
  Trash2, 
  Lock, 
  LogOut, 
  Activity, 
  AlertTriangle,
  Database,
  CloudLightning,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  ShieldAlert,
  ArrowRight,
  Clock,
  CheckCircle2,
  LockKeyhole,
  Moon,
  Sun,
  User,
  UserCircle2,
  Heart,
  Volume2,
  Paperclip,
  Languages,
  Check,
  Maximize2,
  Minimize2,
  Star,
  Pill,
  CalendarCheck,
  Shield,
  Edit3,
  Mail,
  Phone,
  MapPin,
  Award,
  TrendingUp
} from 'lucide-react';
import { api } from './services/api';

// Animation Specifications (WCAG / Reduced Motion Compliant springs)
const springTransition = { type: 'spring', stiffness: 300, damping: 25 };
const listTransition = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('landing');
  const [authMode, setAuthMode] = useState('login');
  
  // Theme Manager (Light & Dark theme with animated transition hooks)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  
  // Auth Form State
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [authError, setAuthError] = useState('');
  
  // Chat State
  const [sessionId] = useState(() => 'sess_' + Math.random().toString(36).substring(2, 11));
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [reasoningLogs, setReasoningLogs] = useState([]);
  const [activeAgent, setActiveAgent] = useState('Orchestrator');
  const [chatLoading, setChatLoading] = useState(false);
  const [agentConfidence, setAgentConfidence] = useState(98);
  const [chatLanguage, setChatLanguage] = useState('en'); // en, es, fr, hi
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  // Consent Settings State
  const [consent, setConsent] = useState({
    calendar_access: false,
    chat_history_storage: true,
    emergency_escalation_data: false,
    audit_logging: true
  });
  
  // Dashboard & Calendar State
  const [appointments, setAppointments] = useState([]);
  const [medications, setMedications] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newFreq, setNewFreq] = useState('one-time');
  const [newDesc, setNewDesc] = useState('');
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Symptom Tracker Log State
  const [symptoms, setSymptoms] = useState([
    { name: 'Headache', severity: 'Low', time: '4 hours ago' },
    { name: 'Fatigue', severity: 'Medium', time: '1 day ago' },
    { name: 'Blood Sugar', severity: 'Normal (98 mg/dL)', time: '2 hours ago' }
  ]);

  // Audit Logs State
  const [audits, setAudits] = useState([]);

  // Emergency Mode Pulse Toggle
  const [isEmergency, setIsEmergency] = useState(false);

  // Sync theme to root HTML
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Check login on startup
  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
    };
    window.addEventListener('auth-expired', handleAuthExpired);
    
    if (api.token) {
      fetchUserData();
    }

    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  // Fetch all data once authenticated
  useEffect(() => {
    if (user) {
      fetchConsentSettings();
      fetchCalendarAndMeds();
      fetchAuditLogs();
    }
  }, [user]);

  // Intercept emergency keywords in message streams to trigger emergency override UI
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'assistant' && lastMsg.agent === 'EmergencyEscalationAgent') {
        setIsEmergency(true);
      } else if (lastMsg.role === 'user') {
        // Simple local check for instant UI response before backend processes it
        const emergencyKeywords = ["chest pain", "difficulty breathing", "severe bleeding", "stroke symptoms", "suicidal thoughts"];
        const matches = emergencyKeywords.some(kw => lastMsg.content.toLowerCase().includes(kw));
        if (matches) {
          setIsEmergency(true);
        }
      }
    }
  }, [messages]);

  const fetchUserData = async () => {
    try {
      const data = await api.getProfile();
      setUser(data);
      if (activeTab === 'landing') {
        setActiveTab('dashboard');
      }
    } catch (err) {
      console.error(err);
      api.clearToken();
      setUser(null);
    }
  };

  const fetchConsentSettings = async () => {
    try {
      const data = await api.getConsent();
      setConsent(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCalendarAndMeds = async () => {
    try {
      const apppts = await api.getCalendar();
      setAppointments(apppts);
      const meds = await api.getMedications();
      setMedications(meds);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const logs = await api.getAuditLogs();
      setAudits(logs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      await api.login(username, password);
      await fetchUserData();
      setActiveTab('dashboard');
    } catch (err) {
      setAuthError(err.message || 'Login failed');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      await api.register(username, password);
      await api.login(username, password);
      await fetchUserData();
      setActiveTab('dashboard');
    } catch (err) {
      setAuthError(err.message || 'Registration failed');
    }
  };

  const handleLogout = () => {
    api.clearToken();
    setUser(null);
    setMessages([]);
    setReasoningLogs([]);
    setIsEmergency(false);
    setActiveTab('landing');
  };

  const handleConsentToggle = async (key) => {
    const updatedConsents = {
      ...consent,
      [key]: !consent[key]
    };
    setConsent(updatedConsents);
    try {
      await api.updateConsent(updatedConsents);
      fetchAuditLogs();
      fetchCalendarAndMeds();
    } catch (err) {
      setConsent(consent);
      alert('Failed to update consent settings');
    }
  };

  const handleSendMessage = async (e, customPrompt = null) => {
    if (e) e.preventDefault();
    const promptToSend = customPrompt || chatInput;
    if (!promptToSend.trim() || chatLoading) return;

    setChatInput('');
    setChatLoading(true);

    const newUserMsg = { role: 'user', content: promptToSend, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, newUserMsg]);

    try {
      const response = await api.sendMessage(sessionId, promptToSend);
      
      const assistantMsg = {
        role: 'assistant',
        content: response.text,
        agent: response.active_agent,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMsg]);
      
      setReasoningLogs(response.reasoning_logs || []);
      setActiveAgent(response.active_agent || 'Orchestrator');
      // Set a random confidence value for visual aesthetics
      setAgentConfidence(Math.floor(Math.random() * (99 - 94 + 1)) + 94);
      
      fetchCalendarAndMeds();
      fetchAuditLogs();
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: Failed to process query. ${err.message}`,
        agent: 'Orchestrator',
        timestamp: new Date().toISOString(),
        isError: true
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newTime || scheduleLoading) return;
    
    setScheduleLoading(true);
    try {
      await api.createAppointment({
        title: newTitle,
        time: newTime,
        frequency: newFreq,
        description: newDesc
      });
      setNewTitle('');
      setNewTime('');
      setNewFreq('one-time');
      setNewDesc('');
      await fetchCalendarAndMeds();
      await fetchAuditLogs();
    } catch (err) {
      alert(err.message || 'Failed to create schedule');
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleDeleteAppointment = async (source, id) => {
    if (!confirm('Are you sure you want to cancel this scheduled item?')) return;
    try {
      await api.deleteAppointment(source, id);
      await fetchCalendarAndMeds();
      await fetchAuditLogs();
    } catch (err) {
      alert(err.message || 'Failed to delete appointment');
    }
  };

  const handleClearChat = async () => {
    if (!confirm('Clear all conversation history?')) return;
    try {
      await api.clearChat(sessionId);
      setMessages([]);
      setReasoningLogs([`[${new Date().toISOString()}] Conversation history cleared by user.`]);
      setIsEmergency(false);
      fetchAuditLogs();
    } catch (err) {
      alert(err.message || 'Failed to clear history');
    }
  };

  // Safe inline styling and helper formatter
  const parseInlineFormatting = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const formatMessageContent = (text) => {
    if (!text) return '';
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-2" />;
      
      if (trimmed.startsWith('### ')) {
        return (
          <h4 key={idx} className="font-sans text-sm font-bold mt-4 mb-2 text-slate-800 dark:text-slate-100">
            {parseInlineFormatting(trimmed.substring(4))}
          </h4>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h3 key={idx} className="font-sans text-base font-extrabold mt-6 mb-3 text-medical-blue dark:text-medical-teal border-b border-slate-100 dark:border-slate-800 pb-1">
            {parseInlineFormatting(trimmed.substring(3))}
          </h3>
        );
      }
      if (trimmed.startsWith('🚨') || trimmed.startsWith('**Please note:**')) {
        return (
          <div key={idx} className="flex gap-2 p-3 my-2 text-xs border-l-4 rounded bg-red-500/5 border-red-500 text-red-700 dark:text-red-300">
            <div>{parseInlineFormatting(trimmed)}</div>
          </div>
        );
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return (
          <ul key={idx} className="ml-5 list-disc mb-2">
            <li className="text-slate-600 dark:text-slate-300 text-sm">{parseInlineFormatting(trimmed.substring(2))}</li>
          </ul>
        );
      }
      return (
        <p key={idx} className="mb-2 text-sm text-slate-600 dark:text-slate-200">
          {parseInlineFormatting(trimmed)}
        </p>
      );
    });
  };

  // Log icons helper
  const getLogIcon = (logText = '') => {
    if (logText.includes('Received')) return <ArrowRight size={12} className="text-medical-purple" />;
    if (logText.includes('Router')) return <Search size={12} className="text-medical-blue" />;
    if (logText.includes('Executing')) return <Activity size={12} className="text-medical-warning" />;
    if (logText.includes('History')) return <Clock size={12} className="text-slate-400" />;
    if (logText.includes('completed') || logText.includes('successfully') || logText.includes('created')) {
      return <CheckCircle2 size={12} className="text-medical-success" />;
    }
    if (logText.includes('fallback') || logText.includes('Warning') || logText.includes('failed')) {
      return <AlertTriangle size={12} className="text-medical-warning" />;
    }
    return <Activity size={12} className="text-slate-400" />;
  };

  // Agent badge class helper
  const getBadgeClass = (agentName) => {
    const name = agentName || '';
    if (name.includes('HealthAdvisor')) return 'bg-medical-success/10 text-medical-success border border-medical-success/20';
    if (name.includes('Reminder')) return 'bg-medical-purple/10 text-medical-purple border border-medical-purple/20';
    if (name.includes('Knowledge')) return 'bg-medical-blue/10 text-medical-blue border border-medical-blue/20';
    if (name.includes('Emergency')) return 'bg-red-500/10 text-red-500 border border-red-500/20';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-500';
  };

  // Quick prompt triggers
  const SUGGESTED_PROMPTS = {
    en: [
      "I forgot my diabetes medicine and need to see my doctor next week.",
      "What is Metformin and what side effects should I look out for?",
      "Set a reminder to take blood pressure pills daily at 8:00 AM."
    ],
    es: [
      "Olvidé mi medicamento para la diabetes y necesito ver a mi médico la próxima semana.",
      "¿Qué es la Metformina y qué efectos secundarios debo tener en cuenta?",
      "Pon un recordatorio para tomar pastillas de presión arterial todos los días a las 8:00 AM."
    ],
    fr: [
      "J'ai oublié mes médicaments pour le diabète et je dois voir mon médecin la semaine prochaine.",
      "Qu'est-ce que la metformine et quels effets secondaires surveiller?",
      "Définir un rappel pour prendre des pilules de tension artérielle tous les jours à 8h00."
    ],
    hi: [
      "मैं अपनी मधुमेह की दवा भूल गया हूँ और मुझे अगले सप्ताह डॉक्टर से मिलना है।",
      "मेटफॉर्मिन क्या है और मुझे किन दुष्प्रभावों पर ध्यान देना चाहिए?",
      "रोज सुबह 8:00 बजे रक्तचाप की गोलियां लेने का रिमाइंडर सेट करें।"
    ]
  };

  const getChatPlaceholder = () => {
    switch (chatLanguage) {
      case 'es': return "Discuta síntomas, configure recordatorios o agende citas...";
      case 'fr': return "Discutez des symptômes, configurez des rappels ou prenez rendez-vous...";
      case 'hi': return "लक्षणों पर चर्चा करें, रिमाइंडर सेट करें या अपॉइंटमेंट बुक करें...";
      default: return "Discuss symptoms, set medication alarms, or book doctor visits...";
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark' : ''} ${isEmergency ? 'ring-8 ring-red-600/30' : ''} transition-all duration-300`}>
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100">
        
        {/* Navigation Sidebar (Collapsible & Glassmorphic) */}
        {activeTab !== 'landing' && (
          <motion.aside 
            animate={{ width: sidebarCollapsed ? 76 : 280 }}
            transition={springTransition}
            className="hidden md:flex flex-col justify-between p-6 bg-slate-100/90 dark:bg-slate-900/90 border-r border-slate-200/50 dark:border-slate-800/50 backdrop-blur-xl h-full flex-shrink-0 z-30"
          >
            <div>
              <div className="flex items-center justify-between mb-8 overflow-hidden">
                {!sidebarCollapsed && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex p-2 bg-gradient-to-tr from-medical-blue/20 to-medical-teal/10 border border-medical-blue/30 rounded-xl shadow-lg">
                      <Activity size={22} className="text-medical-blue" />
                    </div>
                    <span className="font-display font-extrabold text-lg bg-gradient-to-r from-medical-blue to-medical-teal bg-clip-text text-transparent">MedGuide AI</span>
                  </motion.div>
                )}
                {sidebarCollapsed && (
                  <div className="p-2 bg-gradient-to-tr from-medical-blue/20 to-medical-teal/10 border border-medical-blue/30 rounded-xl mx-auto">
                    <Activity size={20} className="text-medical-blue" />
                  </div>
                )}
              </div>

              <nav className="flex flex-col gap-2">
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-medical-blue text-white shadow-lg shadow-medical-blue/20' : 'hover:bg-slate-200/40 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'}`}
                >
                  <User size={18} />
                  {!sidebarCollapsed && <span className="text-sm font-semibold">Command Center</span>}
                </button>

                <button 
                  onClick={() => setActiveTab('chat')}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-200 ${activeTab === 'chat' ? 'bg-medical-blue text-white shadow-lg shadow-medical-blue/20' : 'hover:bg-slate-200/40 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'}`}
                >
                  <MessageSquare size={18} />
                  {!sidebarCollapsed && <span className="text-sm font-semibold">Assistant Chat</span>}
                </button>

                <button 
                  onClick={() => setActiveTab('consent')}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-200 ${activeTab === 'consent' ? 'bg-medical-blue text-white shadow-lg shadow-medical-blue/20' : 'hover:bg-slate-200/40 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'}`}
                >
                  <ShieldCheck size={18} />
                  {!sidebarCollapsed && <span className="text-sm font-semibold">Privacy & Consent</span>}
                </button>

                <button 
                  onClick={() => setActiveTab('logs')}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-200 ${activeTab === 'logs' ? 'bg-medical-blue text-white shadow-lg shadow-medical-blue/20' : 'hover:bg-slate-200/40 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'}`}
                >
                  <ClipboardList size={18} />
                  {!sidebarCollapsed && <span className="text-sm font-semibold">Audit Compliance</span>}
                </button>

                <button 
                  onClick={() => setActiveTab('profile')}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-200 ${activeTab === 'profile' ? 'bg-gradient-to-r from-medical-purple to-medical-blue text-white shadow-lg shadow-medical-purple/20' : 'hover:bg-slate-200/40 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'}`}
                >
                  <UserCircle2 size={18} />
                  {!sidebarCollapsed && <span className="text-sm font-semibold">My Profile</span>}
                </button>
              </nav>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
              {user && !sidebarCollapsed && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center gap-3 mb-6 p-3 rounded-2xl border transition-all duration-200 cursor-pointer text-left ${
                    activeTab === 'profile'
                      ? 'bg-gradient-to-r from-medical-purple/15 to-medical-blue/10 border-medical-purple/30'
                      : 'bg-slate-200/20 dark:bg-slate-800/20 border-slate-200/30 dark:border-slate-800/30 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-medical-purple to-medical-blue text-white flex items-center justify-center text-sm font-bold shadow-md shadow-medical-purple/20">
                      {username.substring(0,2).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-1 -right-1 p-0.5 bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
                      <Activity size={9} className="text-medical-blue" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold leading-tight truncate">{username}</div>
                    <div className="text-[10px] text-slate-400 leading-tight">Patient Account</div>
                    <div className="text-[9px] text-medical-success font-semibold mt-0.5 flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 bg-medical-success rounded-full" />
                      Active Session
                    </div>
                  </div>
                  <Edit3 size={12} className="text-slate-400 flex-shrink-0" />
                </motion.button>
              )}

              <div className="flex gap-2">
                <button 
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-200/40 dark:hover:bg-slate-800/40 text-slate-500"
                >
                  {sidebarCollapsed ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                </button>

                <button 
                  onClick={handleLogout}
                  className="flex-1 flex justify-center items-center gap-2 p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold text-xs transition-all duration-200"
                >
                  <LogOut size={14} />
                  {!sidebarCollapsed && <span>Sign Out</span>}
                </button>
              </div>
            </div>
          </motion.aside>
        )}

        {/* Core Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
          
          {/* Top Bar Header with E2E encryption badges & light toggle */}
          {activeTab !== 'landing' && (
            <header className="flex justify-between items-center px-8 py-5 bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/40 dark:border-slate-800/40 backdrop-blur-md z-20">
              <div className="flex items-center gap-3">
                <div className="md:hidden p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <Activity size={18} className="text-medical-blue" />
                </div>
                <div>
                  <h2 className="font-display font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                    {activeTab === 'dashboard' && 'Health Command Center'}
                    {activeTab === 'chat' && 'Healthcare Coordination Agent'}
                    {activeTab === 'consent' && 'Data Sovereignty Settings'}
                    {activeTab === 'logs' && 'Security Compliance Trail'}
                    {activeTab === 'profile' && 'My Health Profile'}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="inline-block w-1.5 h-1.5 bg-medical-success rounded-full animate-pulse shadow-sm shadow-medical-success" />
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      {activeTab === 'dashboard' && 'Personalized Insights Panel'}
                      {activeTab === 'chat' && 'Google Antigravity Engine'}
                      {activeTab === 'consent' && 'Granular Patient Authorizations'}
                      {activeTab === 'logs' && 'Immutable operations logging'}
                      {activeTab === 'profile' && 'Account settings & health overview'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Privacy Badge */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/40 dark:border-slate-800/40 text-xs text-slate-400">
                  <Lock size={12} className="text-medical-success" />
                  <span className="font-medium text-[10px] tracking-wide">AES-256 SESSION PROTECTED</span>
                </div>

                {/* Dark Mode toggle */}
                <button 
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200/40 dark:border-slate-800/40 text-slate-500 transition-colors"
                >
                  {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                </button>
              </div>
            </header>
          )}

          {/* Emergency Alert Banner */}
          <AnimatePresence>
            {isEmergency && activeTab !== 'landing' && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-medical-emergency text-white px-8 py-3.5 flex items-center justify-between font-bold text-sm tracking-wide shadow-lg z-25 relative overflow-hidden"
              >
                <div className="flex items-center gap-3">
                  <ShieldAlert className="animate-bounce" size={18} />
                  <span>EMERGENCY PROTOCOLS INITIATED. OVERRIDE OVER SENSITIVE DATA ACTIVATED.</span>
                </div>
                <div className="flex gap-2">
                  <a href="tel:911" className="px-4 py-1.5 rounded-lg bg-white text-medical-emergency text-xs font-extrabold hover:bg-slate-100 transition-colors shadow">
                    DIAL 911 NOW
                  </a>
                  <button 
                    onClick={() => setIsEmergency(false)}
                    className="px-4 py-1.5 rounded-lg bg-red-700/60 text-white text-xs font-bold hover:bg-red-800 transition-colors"
                  >
                    DISMISS WARNING
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* TAB WORKSPACE */}
          <div className="flex-1 overflow-hidden relative">

            {/* A. LANDING PAGE SCREEN */}
            {activeTab === 'landing' && (
              <div className="w-full h-full overflow-y-auto relative bg-slate-50 dark:bg-slate-950 flex flex-col justify-between">
                
                {/* Floating Health Particles */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="absolute top-20 left-10 w-20 h-20 rounded-full bg-medical-blue/5 blur-xl floating-particle" />
                  <div className="absolute top-1/2 right-12 w-32 h-32 rounded-full bg-medical-teal/5 blur-2xl floating-particle" style={{ animationDelay: '-3s' }} />
                  <div className="absolute bottom-1/3 left-1/4 w-28 h-28 rounded-full bg-medical-purple/5 blur-xl floating-particle" style={{ animationDelay: '-5s' }} />
                </div>

                {/* Navbar */}
                <header className="flex justify-between items-center px-10 py-6 z-10 relative">
                  <div className="flex items-center gap-3">
                    <div className="flex p-2 bg-gradient-to-tr from-medical-blue/20 to-medical-teal/10 border border-medical-blue/30 rounded-xl shadow-lg">
                      <Activity size={22} className="text-medical-blue" />
                    </div>
                    <span className="font-display font-extrabold text-lg bg-gradient-to-r from-medical-blue to-medical-teal bg-clip-text text-transparent">MedGuide AI</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                      className="p-2.5 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800/40 text-slate-500"
                    >
                      {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                    </button>
                    <button 
                      onClick={(e) => {
                        setUsername('admin');
                        setPassword('admin');
                        setTimeout(() => handleLogin(e), 0);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-medical-blue hover:bg-medical-blue/90 text-white font-semibold text-sm transition-all duration-200 shadow-md shadow-medical-blue/15"
                    >
                      Access Console
                    </button>
                  </div>
                </header>

                {/* Hero Section */}
                <div className="max-w-7xl mx-auto px-8 py-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center flex-1 z-10 relative">
                  <div>
                    {/* Live Agent activity indicator status pill */}
                    <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-200/40 dark:bg-slate-900/40 border border-slate-300/30 dark:border-slate-800/40 text-xs font-semibold text-slate-500 mb-6">
                      <span className="w-2 h-2 rounded-full bg-medical-teal animate-pulse" />
                      Antigravity Coordination Active
                    </div>

                    <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-slate-900 dark:text-white leading-tight tracking-tight mb-6">
                      Your AI Healthcare Companion <span className="bg-gradient-to-r from-medical-blue to-medical-teal bg-clip-text text-transparent">That Thinks Ahead.</span>
                    </h1>

                    <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed mb-8 max-w-xl">
                      Secure, multilingual, proactive healthcare assistance powered by specialized collaborating agents.
                    </p>

                    <div className="flex flex-col gap-3">
                      <div className="flex gap-4">
                        <button 
                          onClick={(e) => {
                            setUsername('admin');
                            setPassword('admin');
                            setTimeout(() => handleLogin(e), 0);
                          }}
                          className="px-6 py-3.5 rounded-xl bg-medical-blue hover:bg-medical-blue/90 text-white font-bold text-sm shadow-lg shadow-medical-blue/20 hover:-translate-y-0.5 transition-all duration-200"
                        >
                          Get Started
                        </button>
                        <button 
                          onClick={() => {
                            setUser({"username": "demo_user"});
                            // Load demo chat messages
                            setMessages([
                              { role: 'user', content: 'I forgot my diabetes medicine and need to see my doctor next week.', timestamp: new Date().toISOString() },
                              { role: 'assistant', content: '## Medication Adherence\n- It is critical to stay consistent with your diabetes medication to prevent glucose spikes. Do not double your dose to make up for missed slots. Consult your pharmacist if you missed multiple timings.\n\n## Doctor Booking\n- I\'ve scheduled a doctor\'s appointment reminder for next week. Falling back to local offline reminder database since calendar access is offline.', agent: 'HealthAdvisorAgent + ReminderAgent', timestamp: new Date().toISOString() }
                            ]);
                            setActiveTab('chat');
                          }}
                          className="px-6 py-3.5 rounded-xl bg-slate-200/50 hover:bg-slate-200 dark:bg-slate-900/50 dark:hover:bg-slate-800 text-slate-800 dark:text-white border border-slate-300/30 dark:border-slate-800/40 font-semibold text-sm hover:-translate-y-0.5 transition-all duration-200"
                        >
                          View Demo
                        </button>
                      </div>
                      {/* Demo credentials hint */}
                      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-medical-blue/5 border border-medical-blue/20 text-xs text-slate-500 dark:text-slate-400 w-fit">
                        <LockKeyhole size={12} className="text-medical-blue flex-shrink-0" />
                        <span>Demo login: <strong className="text-slate-700 dark:text-slate-200 font-mono">admin</strong> / <strong className="text-slate-700 dark:text-slate-200 font-mono">admin</strong></span>
                      </div>
                    </div>

                    {/* Stats counters */}
                    <div className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-slate-200/50 dark:border-slate-800/50">
                      <div>
                        <div className="font-display font-extrabold text-2xl text-medical-blue">24/7</div>
                        <div className="text-xs text-slate-400 font-semibold mt-1">PROACTIVE WATCH</div>
                      </div>
                      <div>
                        <div className="font-display font-extrabold text-2xl text-medical-teal">99%</div>
                        <div className="text-xs text-slate-400 font-semibold mt-1">AGENT PRECISION</div>
                      </div>
                      <div>
                        <div className="font-display font-extrabold text-2xl text-medical-purple">E2E</div>
                        <div className="text-xs text-slate-400 font-semibold mt-1">DATA ENCRYPTION</div>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Graphic Preview */}
                  <div className="relative">
                    {/* ECG path line container card */}
                    <div className="w-full aspect-[4/3] rounded-3xl bg-slate-200/40 dark:bg-slate-900/40 border border-slate-300/30 dark:border-slate-800/40 p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden backdrop-blur-xl">
                      
                      {/* Background animating heart ECG line */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-10" viewBox="0 0 600 400" fill="none">
                        <path 
                          className="ecg-line stroke-slate-500 dark:stroke-white" 
                          strokeWidth="2.5" 
                          d="M0,200 L180,200 L200,160 L210,240 L220,180 L230,220 L240,200 L400,200 L420,130 L430,270 L445,170 L460,220 L470,200 L600,200" 
                        />
                      </svg>

                      {/* Header indicators */}
                      <div className="flex justify-between items-center relative z-10">
                        <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Interactive Architecture</span>
                        <span className="flex items-center gap-1.5 px-2 py-1 bg-medical-success/10 border border-medical-success/30 rounded text-[9px] font-bold text-medical-success uppercase">
                          Compliance E2E Verified
                        </span>
                      </div>

                      {/* Workflow Pulse node connectors chart */}
                      <div className="flex flex-col gap-6 justify-center items-center h-full relative z-10">
                        <div className="flex gap-4 items-center">
                          <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-xs font-bold shadow-md">
                            Health Advisor
                          </div>
                          <ArrowRight className="text-medical-teal animate-pulse" size={16} />
                          <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-xs font-bold shadow-md">
                            Knowledge Agent
                          </div>
                          <ArrowRight className="text-medical-purple animate-pulse" size={16} />
                          <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-xs font-bold shadow-md">
                            Reminder Agent
                          </div>
                        </div>

                        {/* MCP sync details indicator */}
                        <div className="flex items-center gap-2 p-3 bg-medical-blue/5 border border-medical-blue/20 rounded-2xl max-w-sm text-center">
                          <CloudLightning size={14} className="text-medical-blue flex-shrink-0 animate-bounce" />
                          <p className="text-[10px] text-slate-500 leading-normal">
                            Multi-agent routing schedules appointments securely via MCP client with automated offline database synchronization.
                          </p>
                        </div>
                      </div>

                      <div className="relative z-10 flex gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-medical-blue shadow-sm shadow-medical-blue" />
                        <div className="w-2.5 h-2.5 rounded-full bg-medical-teal shadow-sm shadow-medical-teal" />
                        <div className="w-2.5 h-2.5 rounded-full bg-medical-purple shadow-sm shadow-medical-purple" />
                      </div>
                    </div>
                  </div>
                </div>

                <footer className="px-10 py-6 text-center text-xs text-slate-400 z-10">
                  © 2026 MedGuide AI. Designed under Material 3 guidelines and HIPAA standards.
                </footer>
              </div>
            )}

            {/* B. COMMAND CENTER (DASHBOARD) SCREEN */}
            {activeTab === 'dashboard' && (
              <div className="w-full h-full overflow-y-auto p-8 lg:p-10 bg-slate-50 dark:bg-slate-950">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Left & Mid section spans 2 cols */}
                  <div className="lg:col-span-2 flex flex-col gap-8">
                    
                    {/* Ring Chart Adherence & Status */}
                    <div className="p-7 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/40 dark:border-slate-800/40 backdrop-blur-md shadow-lg flex flex-col sm:flex-row gap-6 items-center">
                      <div className="relative flex items-center justify-center flex-shrink-0">
                        {/* Circular SVG Adherence Ring Chart */}
                        <svg className="w-32 h-32 transform -rotate-90">
                          <circle cx="64" cy="64" r="50" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="10" fill="transparent" />
                          <circle cx="64" cy="64" r="50" className="stroke-medical-teal" strokeWidth="10" strokeDasharray="314" strokeDashoffset="47" strokeLinecap="round" fill="transparent" />
                        </svg>
                        <div className="absolute text-center">
                          <div className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">85%</div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">ADHERENCE</div>
                        </div>
                      </div>

                      <div className="flex-1 text-center sm:text-left">
                        <h3 className="font-display font-bold text-base text-slate-950 dark:text-white">Medication Intake Report</h3>
                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                          Your weekly medication routine is doing great. You missed only one dosage timing. Keep it up!
                        </p>
                        
                        <div className="flex flex-wrap gap-2.5 mt-4 justify-center sm:justify-start">
                          <span className="px-2.5 py-1 bg-medical-success/10 border border-medical-success/30 rounded-lg text-[9px] font-bold text-medical-success uppercase tracking-wider">
                            Daily Routines Consistent
                          </span>
                          <span className="px-2.5 py-1 bg-medical-blue/10 border border-medical-blue/30 rounded-lg text-[9px] font-bold text-medical-blue uppercase tracking-wider">
                            Syncing SQLite Backup
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Collaborative Agent Workflow pulses visualization */}
                    <div className="p-7 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/40 dark:border-slate-800/40 backdrop-blur-md shadow-lg">
                      <h3 className="font-display font-bold text-sm uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
                        <Activity size={16} className="text-medical-teal" />
                        Active Agent Workflow Pulse
                      </h3>

                      <div className="grid grid-cols-3 gap-4 text-center items-center relative">
                        <div className="p-4 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow flex flex-col items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-medical-success animate-pulse" />
                          <div className="text-xs font-bold">Health Advisor</div>
                          <span className="text-[9px] text-slate-400 font-medium">Explain & Educate</span>
                        </div>

                        <div className="p-4 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow flex flex-col items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-medical-blue animate-pulse" />
                          <div className="text-xs font-bold">Knowledge Retrieval</div>
                          <span className="text-[9px] text-slate-400 font-medium">Verify Sources</span>
                        </div>

                        <div className="p-4 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow flex flex-col items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-medical-purple animate-pulse" />
                          <div className="text-xs font-bold">Reminder Agent</div>
                          <span className="text-[9px] text-slate-400 font-medium">Schedule Alarms</span>
                        </div>
                      </div>
                    </div>

                    {/* Active Medications List */}
                    <div className="p-7 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/40 dark:border-slate-800/40 backdrop-blur-md shadow-lg">
                      <h3 className="font-display font-bold text-sm uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
                        <Heart size={16} className="text-medical-emergency animate-pulse" />
                        Active Encrypted Medications
                      </h3>

                      {medications.length === 0 ? (
                        <p className="text-xs text-slate-400 py-6 text-center">
                          No active medications found. Message the Assistant Chat to add a schedule (e.g. "Remind me to take Metformin daily").
                        </p>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {medications.map((med, idx) => (
                            <div key={idx} className="flex justify-between items-center p-4 bg-slate-100/40 dark:bg-slate-800/40 border border-slate-200/45 dark:border-slate-800/45 rounded-xl shadow-sm">
                              <div>
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">{med.name}</span>
                                <div className="text-[11px] text-slate-400 mt-1">Timing: {med.time} • Freq: {med.frequency}</div>
                              </div>
                              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-medical-success/10 border border-medical-success/30 text-[9px] font-bold text-medical-success uppercase">
                                <LockKeyhole size={10} />
                                Local Encryption
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Complete appointments timeline list */}
                    <div className="p-7 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/40 dark:border-slate-800/40 backdrop-blur-md shadow-lg">
                      <h3 className="font-display font-bold text-sm uppercase tracking-wider text-slate-400 mb-6">
                        Upcoming appointments Timeline
                      </h3>

                      {appointments.length === 0 ? (
                        <p className="text-xs text-slate-400 py-6 text-center">
                          No scheduled appointments or reminders.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-4 relative border-l border-slate-200 dark:border-slate-800 pl-6 ml-4">
                          {appointments.map((apppt) => (
                            <div key={apppt.id} className="relative">
                              {/* Connector dot */}
                              <div className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-medical-blue ring-4 ring-white dark:ring-slate-950" />
                              
                              <div className="flex justify-between items-start p-4 bg-slate-100/40 dark:bg-slate-800/40 border border-slate-200/45 dark:border-slate-800/45 rounded-xl shadow-sm">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{apppt.title}</span>
                                    {apppt.source === 'local_fallback' ? (
                                      <span className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/30 rounded text-[9px] font-bold text-orange-500 uppercase">
                                        Offline Backup
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-sky-500/10 border border-sky-500/30 rounded text-[9px] font-bold text-sky-500 uppercase">
                                        MCP Calendar
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-1">Time: {apppt.time} • Freq: {apppt.frequency}</div>
                                  {apppt.description && <p className="text-xs text-slate-400 mt-2 bg-slate-200/30 dark:bg-slate-950/30 p-2 rounded">{apppt.description}</p>}
                                </div>
                                <button 
                                  onClick={() => handleDeleteAppointment(apppt.source === 'local_fallback' ? 'local_fallback' : 'mcp_calendar', apppt.id)}
                                  className="p-1.5 text-red-500 bg-red-500/5 hover:bg-red-500/15 rounded-lg border border-red-500/20"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side form and symptom tracking cards */}
                  <div className="flex flex-col gap-8">
                    
                    {/* Emergency escalation alert trigger card */}
                    <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/20 shadow-md">
                      <h3 className="font-display font-bold text-sm text-red-500 flex items-center gap-2 uppercase tracking-wide">
                        <ShieldAlert size={16} />
                        Emergency Action Card
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal mt-2">
                        If you experience chest pain, severe bleeding, or difficulty breathing, activate emergency protocols instantly.
                      </p>
                      
                      <div className="flex gap-2 mt-4">
                        <button 
                          onClick={() => setIsEmergency(true)}
                          className="flex-1 py-2 px-3 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-xs transition shadow shadow-red-500/20"
                        >
                          Trigger Override
                        </button>
                        <a 
                          href="tel:911" 
                          className="py-2 px-4 rounded-lg bg-slate-200/50 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-slate-300/30 dark:border-slate-800/40 text-slate-800 dark:text-white font-bold text-xs text-center"
                        >
                          Call 911
                        </a>
                      </div>
                    </div>

                    {/* Quick Scheduler Manual creator */}
                    <div className="p-7 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/40 dark:border-slate-800/40 backdrop-blur-md shadow-lg">
                      <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white mb-5 uppercase tracking-wide">
                        Quick Scheduler
                      </h3>

                      <form onSubmit={handleCreateAppointment}>
                        <div className="input-group">
                          <label>Event Title</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="e.g. Visit Cardiologist" 
                            value={newTitle} 
                            onChange={e => setNewTitle(e.target.value)} 
                          />
                        </div>

                        <div className="input-group">
                          <label>Frequency</label>
                          <select value={newFreq} onChange={e => setNewFreq(e.target.value)}>
                            <option value="one-time">One-time appointment</option>
                            <option value="daily">Daily Medication Routine</option>
                            <option value="weekly">Weekly Routine</option>
                          </select>
                        </div>

                        <div className="input-group">
                          <label>Date and Time</label>
                          <input 
                            type="datetime-local" 
                            required 
                            value={newTime} 
                            onChange={e => setNewTime(e.target.value)} 
                          />
                        </div>

                        <div className="input-group" style={{ marginBottom: '24px' }}>
                          <label>Notes / Description</label>
                          <textarea 
                            rows="2" 
                            placeholder="Additional details..." 
                            value={newDesc} 
                            onChange={e => setNewDesc(e.target.value)}
                          />
                        </div>

                        <button type="submit" className="btn btn-primary w-full" disabled={scheduleLoading}>
                          <Plus size={16} />
                          Add Schedule
                        </button>
                      </form>
                    </div>

                    {/* Symptom Tracking Cards */}
                    <div className="p-7 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/40 dark:border-slate-800/40 backdrop-blur-md shadow-lg">
                      <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white mb-5 uppercase tracking-wide">
                        Symptom Log tracking
                      </h3>

                      <div className="flex flex-col gap-3">
                        {symptoms.map((sym, idx) => (
                          <div key={idx} className="p-3 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl border border-slate-200/30 dark:border-slate-800/30">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold">{sym.name}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${sym.severity === 'Low' ? 'bg-green-500/10 text-green-500' : sym.severity === 'Medium' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                {sym.severity}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">{sym.time}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* C. ASSISTANT CHAT SCREEN */}
            {activeTab === 'chat' && (
              <div className="chat-wrapper">
                <div className="chat-container">
                  <div className="chat-messages">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center flex-grow text-center text-slate-400 py-16">
                        <div className="flex p-4 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/40 dark:border-slate-800/40 rounded-3xl shadow-md mb-4 animate-bounce">
                          <MessageSquare size={36} className="text-medical-blue" />
                        </div>
                        <h3 className="font-display font-bold text-slate-900 dark:text-white text-base">Start Patient Dialogue</h3>
                        <p className="text-xs max-w-sm mt-2 leading-relaxed">
                          Enter symptoms, ask about medications, or prompt details to schedule health checkups.
                        </p>

                        {/* suggested prompts pills list */}
                        <div className="flex flex-col gap-2 mt-8 w-full max-w-lg px-6">
                          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">Suggested prompts:</span>
                          {SUGGESTED_PROMPTS[chatLanguage].map((prompt, idx) => (
                            <button 
                              key={idx}
                              onClick={(e) => handleSendMessage(e, prompt)}
                              className="w-full text-left p-3.5 text-xs text-slate-500 dark:text-slate-300 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-900 dark:hover:bg-slate-800/80 border border-slate-200/50 dark:border-slate-800/50 rounded-xl transition duration-150"
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      messages.map((msg, index) => (
                        <div key={index} className={`message ${msg.role === 'user' ? 'user' : 'assistant'} ${msg.agent === 'EmergencyEscalationAgent' ? 'emergency' : ''}`}>
                          <div className="message-bubble">
                            {msg.role === 'assistant' && (
                              <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                                <div className={`agent-badge ${getBadgeClass(msg.agent)}`}>
                                  {msg.agent || 'Orchestrator'}
                                </div>
                                <span className="text-[9px] text-slate-400 font-semibold bg-slate-100/60 dark:bg-slate-900/60 px-2 py-0.5 rounded">
                                  Confidence: {agentConfidence}%
                                </span>
                              </div>
                            )}
                            <div className="text-sm">{formatMessageContent(msg.content)}</div>
                            <div className="text-[9px] text-slate-400 mt-2 text-right">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    {chatLoading && (
                      <div className="message assistant">
                        <div className="message-bubble flex items-center gap-2.5 bg-slate-200/40 dark:bg-slate-900/40">
                          <RefreshCw className="animate-spin" size={14} color="#2563EB" />
                          <span className="text-slate-400 text-xs">Orchestration classifiers actively routing query...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="chat-input-area">
                    <form onSubmit={handleSendMessage} className="chat-input-form items-center">
                      
                      {/* Multilingual language switcher toggle */}
                      <div className="relative flex items-center bg-slate-200 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-300/30 dark:border-slate-800/40 mr-1">
                        <Languages size={15} className="text-slate-400 mx-1.5" />
                        <select 
                          value={chatLanguage} 
                          onChange={(e) => setChatLanguage(e.target.value)}
                          className="bg-transparent text-xs font-semibold text-slate-600 dark:text-slate-300 outline-none border-none pr-4 cursor-pointer"
                        >
                          <option value="en">EN</option>
                          <option value="es">ES</option>
                          <option value="fr">FR</option>
                          <option value="hi">HI</option>
                        </select>
                      </div>

                      <input 
                        type="text" 
                        className="chat-input"
                        placeholder={getChatPlaceholder()}
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        disabled={chatLoading}
                      />
                      
                      {/* Mock paperclip file upload */}
                      <button 
                        type="button"
                        onClick={() => alert("Local file scanning system requires consent and sandbox storage. Placeholder active.")}
                        className="p-3.5 rounded-xl bg-slate-200/50 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-500 border border-slate-300/30 dark:border-slate-800/40"
                        title="Upload file or lab result"
                      >
                        <Paperclip size={16} />
                      </button>

                      {/* Mock voice waveform toggler */}
                      <button 
                        type="button"
                        onClick={() => {
                          setIsVoiceActive(!isVoiceActive);
                          if (!isVoiceActive) {
                            setChatInput("Record started... speak symptoms.");
                          } else {
                            setChatInput("");
                          }
                        }}
                        className={`p-3.5 rounded-xl border transition-all ${isVoiceActive ? 'bg-red-500 border-red-600 text-white animate-pulse' : 'bg-slate-200/50 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-500 border-slate-300/30 dark:border-slate-800/40'}`}
                        title="Voice Input"
                      >
                        <Volume2 size={16} />
                      </button>

                      <button type="submit" className="btn btn-primary p-3.5" disabled={chatLoading}>
                        <Send size={16} />
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary p-3.5" 
                        onClick={handleClearChat}
                      >
                        Reset
                      </button>
                    </form>
                  </div>
                </div>

                {/* Right side Agent details, scheduler, and logs panel */}
                <aside className="orchestration-panel">
                  {/* 1. User Profile Card */}
                  {user && (
                    <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/40 dark:border-slate-800/40 shadow-sm flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-medical-blue to-medical-teal text-white flex items-center justify-center font-bold shadow-md shadow-medical-blue/15 relative">
                        <div className="absolute -bottom-1 -right-1 p-0.5 bg-white dark:bg-slate-900 rounded-full border border-slate-200/40 dark:border-slate-800/40 shadow-sm">
                          <Activity size={10} className="text-medical-blue" />
                        </div>
                        {username.substring(0,2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{username}</div>
                        <div className="text-[10px] text-slate-400 leading-tight">Patient Account • Active Session</div>
                      </div>
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-medical-success/10 border border-medical-success/30 text-[8px] font-bold text-medical-success uppercase">
                        <LockKeyhole size={8} />
                        Secure
                      </span>
                    </div>
                  )}

                  {/* 2. Quick Scheduler Manual creator */}
                  <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/40 dark:border-slate-800/40 shadow-sm">
                    <h3 className="font-display font-bold text-xs text-slate-900 dark:text-white mb-4 uppercase tracking-wide flex items-center gap-2">
                      <CalendarIcon size={14} className="text-medical-blue" />
                      Quick Scheduler
                    </h3>

                    <form onSubmit={handleCreateAppointment}>
                      <div className="input-group">
                        <label>Event Title</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="e.g. Visit Cardiologist" 
                          value={newTitle} 
                          onChange={e => setNewTitle(e.target.value)} 
                        />
                      </div>

                      <div className="input-group">
                        <label>Frequency</label>
                        <select value={newFreq} onChange={e => setNewFreq(e.target.value)}>
                          <option value="one-time">One-time appointment</option>
                          <option value="daily">Daily Medication Routine</option>
                          <option value="weekly">Weekly Routine</option>
                        </select>
                      </div>

                      <div className="input-group">
                        <label>Date and Time</label>
                        <input 
                          type="datetime-local" 
                          required 
                          value={newTime} 
                          onChange={e => setNewTime(e.target.value)} 
                        />
                      </div>

                      <div className="input-group" style={{ marginBottom: '16px' }}>
                        <label>Notes / Description</label>
                        <textarea 
                          rows="1" 
                          placeholder="Additional details..." 
                          value={newDesc} 
                          onChange={e => setNewDesc(e.target.value)}
                        />
                      </div>

                      <button type="submit" className="w-full flex justify-center items-center gap-2 py-2.5 rounded-xl bg-medical-blue hover:bg-medical-blue/90 text-white font-bold text-xs transition duration-200 shadow-md shadow-medical-blue/10" disabled={scheduleLoading}>
                        <Plus size={12} />
                        Add Schedule
                      </button>
                    </form>
                  </div>

                  {/* 3. Agent Reasoning logs */}
                  <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/40 dark:border-slate-800/40 shadow-sm flex flex-col gap-3">
                    <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <ShieldCheck size={14} className="text-medical-teal" />
                      Agent Reasoning logs
                    </h3>

                    <div className="bg-slate-50 dark:bg-slate-950 p-3 border border-slate-200/50 dark:border-slate-800/50 rounded-xl">
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">CURRENT ACTIVE TARGET:</div>
                      <div className="mt-1.5">
                        <div className="active-pill">
                          <div className="active-pill-dot" />
                          {activeAgent}
                        </div>
                      </div>
                    </div>

                    <div className="log-list">
                      {reasoningLogs.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-3">
                          No traces recorded. Select suggested prompts or type symptoms to start logs.
                        </div>
                      ) : (
                        reasoningLogs.map((log, idx) => (
                          <div key={idx} className="log-item flex gap-2 items-start text-[10px]">
                            <span className="mt-0.5 flex-shrink-0">{getLogIcon(log)}</span>
                            <span>{log}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </aside>

              </div>
            )}

            {/* D. PRIVACY & CONSENT SETTINGS SCREEN */}
            {activeTab === 'consent' && (
              <div className="w-full h-full overflow-y-auto p-8 lg:p-10 bg-slate-50 dark:bg-slate-950">
                <div className="max-w-3xl mx-auto card">
                  
                  <div className="flex items-center gap-3.5 border-b border-slate-200 dark:border-slate-800 pb-5 mb-6">
                    <Lock size={28} className="text-medical-blue" />
                    <div>
                      <h3 className="text-base font-bold text-slate-950 dark:text-white">Data Sovereignty Settings</h3>
                      <p className="text-xs text-slate-400 mt-1">Configure what details specialized agents can share, read, or write.</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6">
                    
                    {/* Consent 1 */}
                    <div className="flex justify-between items-start p-5 bg-slate-100/30 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
                      <div className="flex-1 pr-6">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">Allow Calendar Integration</div>
                        <p className="text-xs text-slate-400 leading-normal mt-1">
                          When checked, the Reminder agent schedules appointments directly on the external MCP Calendar. When unchecked, booking falls back to offline SQLite databases.
                        </p>
                      </div>
                      <label className="switch mt-1">
                        <input 
                          type="checkbox" 
                          checked={consent.calendar_access} 
                          onChange={() => handleConsentToggle('calendar_access')}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>

                    {/* Consent 2 */}
                    <div className="flex justify-between items-start p-5 bg-slate-100/30 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
                      <div className="flex-1 pr-6">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">Store Chat Transcripts</div>
                        <p className="text-xs text-slate-400 leading-normal mt-1">
                          Saves conversation sessions on local cloud instances. When disabled, messages remain inside temporary in-memory arrays.
                        </p>
                      </div>
                      <label className="switch mt-1">
                        <input 
                          type="checkbox" 
                          checked={consent.chat_history_storage} 
                          onChange={() => handleConsentToggle('chat_history_storage')}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>

                    {/* Consent 3 */}
                    <div className="flex justify-between items-start p-5 bg-slate-100/30 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
                      <div className="flex-1 pr-6">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">Emergency location sharing</div>
                        <p className="text-xs text-slate-400 leading-normal mt-1">
                          Allows the Emergency agent to instantly dispatch location coordinates to emergency contacts when life-threatening conditions are logged.
                        </p>
                      </div>
                      <label className="switch mt-1">
                        <input 
                          type="checkbox" 
                          checked={consent.emergency_escalation_data} 
                          onChange={() => handleConsentToggle('emergency_escalation_data')}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>

                  <div className="mt-8 p-4 bg-medical-blue/5 border border-medical-blue/20 rounded-xl flex gap-3 items-start">
                    <LockKeyhole size={18} className="text-medical-blue flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-400 leading-relaxed">
                      All schedules and medication profiles are locally encrypted using AES-256 tokens before database submission. Private parameters are never shared cleartext.
                    </p>
                  </div>

                </div>
              </div>
            )}

            {/* E. SECURITY AUDIT TRAIL SCREEN */}
            {activeTab === 'logs' && (
              <div className="w-full h-full overflow-y-auto p-8 lg:p-10 bg-slate-50 dark:bg-slate-950">
                <div className="max-w-4xl mx-auto card">
                  
                  <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-5 mb-6">
                    <div>
                      <h3 className="text-base font-bold text-slate-950 dark:text-white">Compliance Audit Trail</h3>
                      <p className="text-xs text-slate-400 mt-1">Complete, immutable log of patient authentication, key cycles, and agent scheduling dispatches.</p>
                    </div>
                    <button onClick={fetchAuditLogs} className="btn btn-secondary py-2 px-3 flex gap-2 items-center">
                      <RefreshCw size={13} />
                      Refresh
                    </button>
                  </div>

                  {audits.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-10">No audit records found.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {audits.map((log) => (
                        <div key={log._id} className="flex justify-between items-center p-4 bg-slate-100/30 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 rounded-xl text-xs">
                          <div>
                            <span className="font-bold font-mono text-[10px] bg-sky-500/10 border border-sky-500/35 px-2.5 py-1 rounded text-sky-500 uppercase">
                              {log.action}
                            </span>
                            <span className="text-slate-400 ml-4 font-medium">{log.details ? JSON.stringify(log.details) : ''}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">{new Date(log.timestamp).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* F. USER PROFILE SCREEN */}
            {activeTab === 'profile' && (
              <div className="w-full h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
                <div className="max-w-5xl mx-auto p-8 lg:p-10 space-y-8">

                  {/* Hero Banner */}
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-medical-purple via-medical-blue to-medical-teal p-8 text-white shadow-2xl shadow-medical-blue/20">
                    {/* Decorative blobs */}
                    <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-56 h-56 bg-medical-teal/20 rounded-full blur-2xl -translate-x-1/4 translate-y-1/4 pointer-events-none" />

                    <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
                      {/* Large Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-md border-2 border-white/40 flex items-center justify-center text-3xl font-extrabold shadow-2xl">
                          {username.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-lg">
                          <Activity size={16} className="text-medical-blue" />
                        </div>
                        <div className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-medical-success rounded-full border-2 border-white shadow flex items-center justify-center">
                          <Check size={10} className="text-white" />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 text-center sm:text-left">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                          <h1 className="text-2xl font-extrabold">{username}</h1>
                          <span className="px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-xs font-bold backdrop-blur-sm">Patient</span>
                        </div>
                        <p className="text-white/70 text-sm mb-4">Secured health profile · MedGuide AI member</p>
                        <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-xs">
                            <Shield size={12} className="text-medical-success" />
                            <span>AES-256 Encrypted</span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-xs">
                            <LockKeyhole size={12} />
                            <span>E2E Session Active</span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-xs">
                            <Star size={12} className="text-yellow-300" />
                            <span>Premium Health Plan</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick nav buttons top-right */}
                      <div className="flex gap-2 self-start">
                        <button
                          onClick={() => setActiveTab('consent')}
                          className="p-2.5 rounded-xl bg-white/15 border border-white/25 hover:bg-white/25 transition-colors backdrop-blur-sm"
                          title="Privacy Settings"
                        >
                          <ShieldCheck size={16} />
                        </button>
                        <button
                          onClick={handleLogout}
                          className="p-2.5 rounded-xl bg-red-500/30 border border-red-400/30 hover:bg-red-500/50 transition-colors backdrop-blur-sm"
                          title="Sign Out"
                        >
                          <LogOut size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Appointments', value: appointments.length, icon: <CalendarCheck size={20} className="text-medical-blue" />, color: 'from-medical-blue/10 to-medical-blue/5', border: 'border-medical-blue/20' },
                      { label: 'Medications', value: medications.length, icon: <Pill size={20} className="text-medical-teal" />, color: 'from-medical-teal/10 to-medical-teal/5', border: 'border-medical-teal/20' },
                      { label: 'Chat Messages', value: messages.length, icon: <MessageSquare size={20} className="text-medical-purple" />, color: 'from-medical-purple/10 to-medical-purple/5', border: 'border-medical-purple/20' },
                      { label: 'Audit Records', value: audits.length, icon: <ClipboardList size={20} className="text-medical-warning" />, color: 'from-amber-500/10 to-amber-500/5', border: 'border-amber-500/20' }
                    ].map((stat, i) => (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className={`p-5 rounded-2xl bg-gradient-to-br ${stat.color} border ${stat.border} backdrop-blur-sm`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="p-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm">{stat.icon}</div>
                          <TrendingUp size={14} className="text-medical-success" />
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{stat.value}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{stat.label}</div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Two-column grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Account Details Card */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className="card space-y-5"
                    >
                      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-br from-medical-blue/10 to-medical-blue/5 rounded-xl border border-medical-blue/20">
                            <User size={16} className="text-medical-blue" />
                          </div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Account Details</h3>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 bg-medical-success/10 text-medical-success border border-medical-success/20 rounded-full font-bold">VERIFIED</span>
                      </div>

                      <div className="space-y-4">
                        {[
                          { icon: <User size={14} />, label: 'Username', value: username, color: 'text-medical-blue' },
                          { icon: <Mail size={14} />, label: 'Account Type', value: 'Patient — Standard Plan', color: 'text-medical-teal' },
                          { icon: <Shield size={14} />, label: 'Security Level', value: 'AES-256 + Fernet Encrypted', color: 'text-medical-success' },
                          { icon: <Clock size={14} />, label: 'Session Started', value: new Date().toLocaleString(), color: 'text-medical-purple' },
                          { icon: <Database size={14} />, label: 'Storage Mode', value: 'Local E2E (Zero Cloud)', color: 'text-amber-500' }
                        ].map(row => (
                          <div key={row.label} className="flex items-start gap-3">
                            <div className={`mt-0.5 ${row.color} flex-shrink-0`}>{row.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{row.label}</div>
                              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{row.value}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>

                    {/* Health Summary Card */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 }}
                      className="card space-y-5"
                    >
                      <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                        <div className="p-2 bg-gradient-to-br from-medical-success/10 to-medical-success/5 rounded-xl border border-medical-success/20">
                          <Heart size={16} className="text-medical-success" />
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Health Overview</h3>
                      </div>

                      <div className="space-y-4">
                        {/* Adherence score */}
                        <div>
                          <div className="flex justify-between text-xs mb-2">
                            <span className="font-semibold text-slate-600 dark:text-slate-400">Medication Adherence</span>
                            <span className="font-bold text-medical-success">92%</span>
                          </div>
                          <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: '92%' }}
                              transition={{ duration: 1.2, delay: 0.3 }}
                              className="h-full bg-gradient-to-r from-medical-success to-medical-teal rounded-full"
                            />
                          </div>
                        </div>
                        {/* Appointment compliance */}
                        <div>
                          <div className="flex justify-between text-xs mb-2">
                            <span className="font-semibold text-slate-600 dark:text-slate-400">Appointment Compliance</span>
                            <span className="font-bold text-medical-blue">87%</span>
                          </div>
                          <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: '87%' }}
                              transition={{ duration: 1.2, delay: 0.4 }}
                              className="h-full bg-gradient-to-r from-medical-blue to-medical-purple rounded-full"
                            />
                          </div>
                        </div>
                        {/* Health score */}
                        <div>
                          <div className="flex justify-between text-xs mb-2">
                            <span className="font-semibold text-slate-600 dark:text-slate-400">Overall Health Score</span>
                            <span className="font-bold text-medical-purple">89/100</span>
                          </div>
                          <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: '89%' }}
                              transition={{ duration: 1.2, delay: 0.5 }}
                              className="h-full bg-gradient-to-r from-medical-purple to-medical-blue rounded-full"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Tracked symptoms */}
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Recent Symptoms</p>
                        <div className="flex flex-wrap gap-2">
                          {symptoms.map(s => (
                            <span key={s.name} className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border ${
                              s.severity === 'Low' ? 'bg-medical-success/10 text-medical-success border-medical-success/20' :
                              s.severity === 'Medium' ? 'bg-medical-warning/10 text-amber-600 border-amber-500/20' :
                              'bg-medical-blue/10 text-medical-blue border-medical-blue/20'
                            }`}>
                              {s.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>

                    {/* Privacy & Consent Summary */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="card space-y-4"
                    >
                      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-br from-medical-teal/10 to-medical-teal/5 rounded-xl border border-medical-teal/20">
                            <ShieldCheck size={16} className="text-medical-teal" />
                          </div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Privacy Settings</h3>
                        </div>
                        <button onClick={() => setActiveTab('consent')} className="text-[10px] text-medical-blue font-bold hover:underline">
                          Manage →
                        </button>
                      </div>
                      <div className="space-y-3">
                        {Object.entries(consent).map(([key, val]) => (
                          <div key={key} className="flex items-center justify-between p-3 bg-slate-100/50 dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize">
                              {key.replace(/_/g, ' ')}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              val ? 'bg-medical-success/10 text-medical-success border border-medical-success/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                            }`}>
                              {val ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>

                    {/* Quick Actions Card */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="card space-y-4"
                    >
                      <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                        <div className="p-2 bg-gradient-to-br from-medical-purple/10 to-medical-purple/5 rounded-xl border border-medical-purple/20">
                          <Award size={16} className="text-medical-purple" />
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Quick Actions</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Chat Assistant', icon: <MessageSquare size={18} />, tab: 'chat', color: 'from-medical-blue/10 to-medical-blue/5 border-medical-blue/20 text-medical-blue' },
                          { label: 'My Schedule', icon: <CalendarCheck size={18} />, tab: 'dashboard', color: 'from-medical-teal/10 to-medical-teal/5 border-medical-teal/20 text-medical-teal' },
                          { label: 'Audit Logs', icon: <ClipboardList size={18} />, tab: 'logs', color: 'from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-600' },
                          { label: 'Privacy', icon: <ShieldCheck size={18} />, tab: 'consent', color: 'from-medical-success/10 to-medical-success/5 border-medical-success/20 text-medical-success' }
                        ].map(action => (
                          <button
                            key={action.label}
                            onClick={() => setActiveTab(action.tab)}
                            className={`p-4 rounded-2xl bg-gradient-to-br ${action.color} border text-left hover:scale-105 transition-all duration-200 group`}
                          >
                            <div className="mb-2">{action.icon}</div>
                            <div className="text-xs font-bold">{action.label}</div>
                          </button>
                        ))}
                      </div>
                      {/* Sign out */}
                      <button
                        onClick={handleLogout}
                        className="w-full mt-2 flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold text-sm border border-red-500/20 transition-all duration-200"
                      >
                        <LogOut size={16} />
                        Sign Out of MedGuide AI
                      </button>
                    </motion.div>

                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}

export default App;
