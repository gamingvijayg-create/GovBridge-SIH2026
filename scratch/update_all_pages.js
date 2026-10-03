const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Updated HomePage with Achievements & Impact Section
const newHomePage = `    function HomePage() {
      return (
        <div className="space-y-16 pb-20">
          {/* Hero Section */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 lg:pt-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column Text */}
              <div className="lg:col-span-7 space-y-6">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                  Bridging Government Needs with <span className="text-blue-600">Startup Innovation</span>
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
                  An end-to-end procurement mechanism that helps government departments discover, pilot, procure and scale innovative solutions from eligible startups.
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <a href="#/problem-statements" className="inline-flex items-center gap-2 px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition transform hover:-translate-y-0.5">
                    Explore Problem Statements <span>→</span>
                  </a>
                  <a href="#/pilots" className="inline-flex items-center gap-2 px-7 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition transform hover:-translate-y-0.5">
                    🧪 Sandbox & Milestones
                  </a>
                  <a href="#/startup/register" className="inline-flex items-center gap-2 px-7 py-3.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold rounded-xl transition">
                    Register Startup <span>🚀</span>
                  </a>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 pt-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">✓</span>
                  Trusted platform for collaboration, transparency & innovation
                </div>
              </div>

              {/* Right Column Graphic Illustration */}
              <div className="lg:col-span-5 relative">
                <div className="bg-gradient-to-tr from-blue-50 to-indigo-50/50 rounded-3xl p-8 border border-blue-100 shadow-xl relative overflow-hidden">
                  <div className="text-center space-y-6 relative z-10">
                    <div className="flex justify-center items-center gap-8">
                      <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-100 text-center">
                        <div className="text-3xl">🏛️</div>
                        <div className="text-xs font-bold text-slate-800 mt-1">Government</div>
                        <div className="text-[10px] text-blue-600 font-semibold">Post Needs</div>
                      </div>
                      <div className="text-2xl text-blue-500 font-bold">🤝</div>
                      <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-100 text-center">
                        <div className="text-3xl">🚀</div>
                        <div className="text-xs font-bold text-slate-800 mt-1">Startup</div>
                        <div className="text-[10px] text-emerald-600 font-semibold">Solve & Scale</div>
                      </div>
                    </div>
                    
                    <div className="bg-white/80 backdrop-blur p-4 rounded-xl border border-slate-200/60 shadow-sm text-left text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">🔍 Discover Startups</span>
                        <span className="bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded text-[10px]">AI Matched</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">📝 Procure Smartly</span>
                        <span className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded text-[10px]">GeM Aligned</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 5 Metric Stat Cards Bar */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-md grid grid-cols-2 md:grid-cols-5 gap-6 text-center divide-x divide-slate-100">
              <div className="space-y-1">
                <div className="text-blue-600 text-2xl font-black">15+</div>
                <div className="text-xs font-semibold text-slate-500">Government Departments</div>
              </div>
              <div className="space-y-1 pl-4">
                <div className="text-emerald-600 text-2xl font-black">20+</div>
                <div className="text-xs font-semibold text-slate-500">Registered Startups</div>
              </div>
              <div className="space-y-1 pl-4">
                <div className="text-indigo-600 text-2xl font-black">30+</div>
                <div className="text-xs font-semibold text-slate-500">Problem Statements</div>
              </div>
              <div className="space-y-1 pl-4">
                <div className="text-purple-600 text-2xl font-black">17+</div>
                <div className="text-xs font-semibold text-slate-500">Pilots Completed</div>
              </div>
              <div className="space-y-1 pl-4">
                <div className="text-amber-600 text-2xl font-black">45+</div>
                <div className="text-xs font-semibold text-slate-500">Scaled Solutions</div>
              </div>
            </div>
          </section>

          {/* NEW: Platform Achievements & Impact Highlights */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-4">
                <div>
                  <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30 uppercase tracking-widest">
                    🏆 Proven Government Impact
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold mt-2">Platform Achievements & Success Stories</h2>
                </div>
                <a href="#/pilots" className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition">
                  Go to Milestone & Sandbox Portal →
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 space-y-2">
                  <div className="text-2xl font-extrabold text-emerald-400">6 Teams</div>
                  <div className="font-bold text-white">Active Pilot Sandboxes</div>
                  <p className="text-slate-300 text-[11px]">Real-world deployments across Agriculture, Healthcare, Urban Mobility, and Water Quality.</p>
                </div>

                <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 space-y-2">
                  <div className="text-2xl font-extrabold text-blue-400">₹3.2 Crore</div>
                  <div className="font-bold text-white">Funds Sanctioned & Paid</div>
                  <p className="text-slate-300 text-[11px]">Milestone-linked disbursement with 100% financial audit compliance.</p>
                </div>

                <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 space-y-2">
                  <div className="text-2xl font-extrabold text-amber-400">12 Teams</div>
                  <div className="font-bold text-white">GeM Scale-Up Winners</div>
                  <p className="text-slate-300 text-[11px]">Successfully transitioned from pilot validation to pan-India direct government tenders.</p>
                </div>

                <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 space-y-2">
                  <div className="text-2xl font-extrabold text-purple-400">98.4%</div>
                  <div className="font-bold text-white">STQC Security Pass Rate</div>
                  <p className="text-slate-300 text-[11px]">Zero critical vulnerabilities across sovereign government cloud sandboxes.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Persona Grid Section */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <h2 className="text-2xl font-bold text-center text-slate-900">I am here as</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Persona 1 */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 hover:shadow-lg transition space-y-4">
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl shadow-md">
                  🏛️
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Department Official</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Post problem statements, discover startups and run pilots
                  </p>
                </div>
                <a href="#/login" className="inline-block text-xs font-bold text-blue-600 hover:text-blue-700">
                  Login / Register →
                </a>
              </div>

              {/* Persona 2 */}
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 hover:shadow-lg transition space-y-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xl shadow-md">
                  🚀
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Startup</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Find opportunities, participate in pilots and grow with government
                  </p>
                </div>
                <a href="#/startup/register" className="inline-block text-xs font-bold text-emerald-600 hover:text-emerald-700">
                  Login / Register →
                </a>
              </div>

              {/* Persona 3 */}
              <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-6 hover:shadow-lg transition space-y-4">
                <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center text-xl shadow-md">
                  👥
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Evaluator / Expert</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Evaluate solutions and help select the best innovations
                  </p>
                </div>
                <a href="#/login" className="inline-block text-xs font-bold text-purple-600 hover:text-purple-700">
                  Login / Register →
                </a>
              </div>

              {/* Persona 4 */}
              <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-6 hover:shadow-lg transition space-y-4">
                <div className="w-12 h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center text-xl shadow-md">
                  💼
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Procurement Officer</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Manage procurement, contracts and scale-up processes
                  </p>
                </div>
                <a href="#/login" className="inline-block text-xs font-bold text-amber-600 hover:text-amber-700">
                  Login / Register →
                </a>
              </div>
            </div>
          </section>

          {/* How It Works Flow Section */}
          <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pt-6">
            <h2 className="text-2xl font-bold text-center text-slate-900">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
              <div className="bg-white border border-slate-200 p-5 rounded-2xl text-center space-y-3 relative">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center mx-auto text-lg">
                  📝
                </div>
                <h4 className="font-bold text-slate-900 text-sm">1. Challenge</h4>
                <p className="text-xs text-slate-500">Departments post outcome-based problem statements</p>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl text-center space-y-3 relative">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 font-bold flex items-center justify-center mx-auto text-lg">
                  🔍
                </div>
                <h4 className="font-bold text-slate-900 text-sm">2. Discover</h4>
                <p className="text-xs text-slate-500">Startups discover and express interest via AI evaluation</p>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl text-center space-y-3 relative">
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 font-bold flex items-center justify-center mx-auto text-lg">
                  📊
                </div>
                <h4 className="font-bold text-slate-900 text-sm">3. Evaluate</h4>
                <p className="text-xs text-slate-500">Experts evaluate solutions and shortlist the best</p>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl text-center space-y-3 relative">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 font-bold flex items-center justify-center mx-auto text-lg">
                  🚀
                </div>
                <h4 className="font-bold text-slate-900 text-sm">4. Pilot</h4>
                <p className="text-xs text-slate-500">Run structured pilots with clear milestones and KPIs</p>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl text-center space-y-3 relative">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center mx-auto text-lg">
                  📈
                </div>
                <h4 className="font-bold text-slate-900 text-sm">5. Procure & Scale</h4>
                <p className="text-xs text-slate-500">Procure successful solutions and scale the impact</p>
              </div>
            </div>

            <div className="text-center pt-4">
              <a href="#/how-it-works" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition">
                📊 Explore Full 11-Stage Interactive Visual Flowchart →
              </a>
            </div>
          </section>
        </div>
      );
    }`;

// 2. Updated LoginPage with Forgot Password OTP Flow
const newLoginPage = `    function LoginPage({ setAuthUser }) {
      const [email, setEmail] = useState('');
      const [password, setPassword] = useState('');

      // Forgot Password State
      const [showForgotModal, setShowForgotModal] = useState(false);
      const [forgotIdentifier, setForgotIdentifier] = useState('');
      const [forgotOtp, setForgotOtp] = useState('');
      const [newPassword, setNewPassword] = useState('');
      const [forgotStep, setForgotStep] = useState(1); // 1: Send OTP, 2: Reset
      const [demoOtp, setDemoOtp] = useState('');

      const handleLogin = async (e) => {
        e.preventDefault();
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const json = await res.json();
          if (json.success) {
            setAuth(json.token, json.user);
            setAuthUser(json.user);
            if (json.user.role === 'admin') window.location.hash = '#/admin/dashboard';
            else window.location.hash = '#/pilots';
          } else {
            alert('Login failed: ' + json.error);
          }
        } catch(err) { alert(err.message); }
      };

      const handleSendForgotOtp = async (e) => {
        e.preventDefault();
        if (!forgotIdentifier.trim()) {
          alert('Please enter registered Email ID or Company Name');
          return;
        }
        try {
          const res = await fetch('/api/auth/forgot-password-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: forgotIdentifier })
          });
          const json = await res.json();
          if (json.success) {
            setDemoOtp(json.otp);
            setForgotStep(2);
            alert(\`🔑 OTP Sent! (Demo OTP Code: \${json.otp})\`);
          } else {
            alert('Error: ' + json.error);
          }
        } catch(err) { alert(err.message); }
      };

      const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!forgotOtp || !newPassword) {
          alert('Please enter the OTP and your new password.');
          return;
        }
        try {
          const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: forgotIdentifier, otp: forgotOtp, newPassword })
          });
          const json = await res.json();
          if (json.success) {
            alert('🔒 Password Reset Successful! You can now log in with your new password.');
            setShowForgotModal(false);
            setForgotStep(1);
            setForgotIdentifier('');
            setForgotOtp('');
            setNewPassword('');
          } else {
            alert('Reset Error: ' + json.error);
          }
        } catch(err) { alert(err.message); }
      };

      return (
        <div className="max-w-md mx-auto px-4 py-16">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 text-center">Login to GovBridge</h2>
            
            <form onSubmit={handleLogin} className="space-y-4 text-xs font-semibold text-slate-700">
              <div>
                <label>Email Address / Company Name (Username)</label>
                <input type="text" required className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-600" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@govbridge.gov.in or AgriSense Innovations" />
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <label>Password</label>
                  <button type="button" onClick={()=>setShowForgotModal(true)} className="text-blue-600 text-[11px] font-bold hover:underline">
                    Forgot Password?
                  </button>
                </div>
                <input type="password" required className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-600" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <button type="submit" className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition">
                Sign In →
              </button>
            </form>

            <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
              Default Admin: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">admin@govbridge.gov.in</code> / <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">Admin@123456</code>
            </div>
          </div>

          {/* Forgot Password Modal */}
          {showForgotModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-3xl p-8 max-w-md w-full space-y-6 relative">
                <button onClick={()=>setShowForgotModal(false)} className="absolute top-6 right-6 font-bold text-slate-400">✕</button>
                
                <div>
                  <h3 className="text-lg font-bold text-slate-900">🔐 Reset Your Password</h3>
                  <p className="text-xs text-slate-500 mt-1">An OTP will be generated and verified to reset your password securely.</p>
                </div>

                {forgotStep === 1 ? (
                  <form onSubmit={handleSendForgotOtp} className="space-y-4 text-xs">
                    <div>
                      <label className="font-bold text-slate-700">Registered Email ID or Company Name</label>
                      <input 
                        type="text"
                        required
                        className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-600"
                        placeholder="contact@agrisense.in"
                        value={forgotIdentifier}
                        onChange={e=>setForgotIdentifier(e.target.value)}
                      />
                    </div>

                    <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md">
                      📲 Send Password Reset OTP
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
                    {demoOtp && (
                      <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded-xl font-bold text-center">
                        Demo OTP: <span className="text-base tracking-widest text-emerald-900">{demoOtp}</span>
                      </div>
                    )}

                    <div>
                      <label className="font-bold text-slate-700">Enter 6-Digit OTP Code</label>
                      <input 
                        type="text"
                        required
                        className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-600 text-center font-bold text-base tracking-widest"
                        placeholder="123456"
                        value={forgotOtp}
                        onChange={e=>setForgotOtp(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700">New Password</label>
                      <input 
                        type="password"
                        required
                        className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-600"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={e=>setNewPassword(e.target.value)}
                      />
                    </div>

                    <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md">
                      🔒 Verify OTP & Reset Password
                    </button>
                  </form>
                )}

              </div>
            </div>
          )}

        </div>
      );
    }`;

// Replace HomePage
const startHome = content.indexOf('function HomePage() {');
const endHome = content.indexOf('function StartupRegisterPage() {');
if (startHome !== -1 && endHome !== -1) {
  content = content.substring(0, startHome) + newHomePage + '\n\n    // ==========================================\n    // STARTUP EVALUATION FORM & AI MATCHING PAGE\n    // ==========================================\n    ' + content.substring(endHome);
}

// Replace LoginPage
const startLogin = content.indexOf('function LoginPage({ setAuthUser }) {');
const endLogin = content.indexOf('function Footer() {');
if (startLogin !== -1 && endLogin !== -1) {
  content = content.substring(0, startLogin) + newLoginPage + '\n\n    // ==========================================\n    ' + content.substring(endLogin);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated HomePage and LoginPage in public/index.html!');
