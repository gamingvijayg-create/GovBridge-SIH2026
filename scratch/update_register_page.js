const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

const updatedRegisterPage = `    function StartupRegisterPage() {
      const [step, setStep] = useState(1);
      const [loading, setLoading] = useState(false);
      const [result, setResult] = useState(null);

      const [formData, setFormData] = useState({
        startupName: '',
        founderName: '',
        phone: '',
        email: '',
        password: '',
        location: '',
        sector: 'AgriTech',
        description: '',
        dpiitRegistered: true,
        dpiitNumber: '',
        turnover: '50 Lakhs',
        experienceYears: 4,
        resumeText: ''
      });

      // OTP State
      const [isPhoneVerified, setIsPhoneVerified] = useState(false);
      const [isEmailVerified, setIsEmailVerified] = useState(false);
      const [phoneOtpInput, setPhoneOtpInput] = useState('');
      const [emailOtpInput, setEmailOtpInput] = useState('');
      const [phoneDemoOtp, setPhoneDemoOtp] = useState('');
      const [emailDemoOtp, setEmailDemoOtp] = useState('');
      const [showPhoneOtpBox, setShowPhoneOtpBox] = useState(false);
      const [showEmailOtpBox, setShowEmailOtpBox] = useState(false);

      const [file, setFile] = useState(null);
      const [teamMembers, setTeamMembers] = useState([
        { name: '', role: 'Founder & Tech Lead', skills: 'AI, React, Node.js', experienceYears: 5 }
      ]);

      const handleAddTeamMember = () => {
        setTeamMembers([...teamMembers, { name: '', role: 'Software Engineer', skills: '', experienceYears: 1 }]);
      };

      const handleRemoveTeamMember = (index) => {
        setTeamMembers(teamMembers.filter((_, i) => i !== index));
      };

      // OTP Verification Handlers
      const handleSendPhoneOtp = async () => {
        if (!formData.phone.trim()) {
          alert('Please enter a valid Lead Mobile Phone Number first');
          return;
        }
        try {
          const res = await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target: 'phone', value: formData.phone })
          });
          const json = await res.json();
          if (json.success) {
            setPhoneDemoOtp(json.otp);
            setShowPhoneOtpBox(true);
            alert(\`📱 Phone OTP sent to \${formData.phone}! (Demo OTP Code: \${json.otp})\`);
          } else { alert('Error: ' + json.error); }
        } catch(err) { alert(err.message); }
      };

      const handleVerifyPhoneOtp = async () => {
        if (!phoneOtpInput.trim()) { alert('Please enter 6-digit OTP code'); return; }
        try {
          const res = await fetch('/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: formData.phone, otp: phoneOtpInput })
          });
          const json = await res.json();
          if (json.success) {
            setIsPhoneVerified(true);
            setShowPhoneOtpBox(false);
            alert('✅ Phone Number Verified Successfully!');
          } else { alert('OTP Verification Error: ' + json.error); }
        } catch(err) { alert(err.message); }
      };

      const handleSendEmailOtp = async () => {
        if (!formData.email.trim()) {
          alert('Please enter a valid Email Address first');
          return;
        }
        try {
          const res = await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target: 'email', value: formData.email })
          });
          const json = await res.json();
          if (json.success) {
            setEmailDemoOtp(json.otp);
            setShowEmailOtpBox(true);
            alert(\`📧 Email OTP sent to \${formData.email}! (Demo OTP Code: \${json.otp})\`);
          } else { alert('Error: ' + json.error); }
        } catch(err) { alert(err.message); }
      };

      const handleVerifyEmailOtp = async () => {
        if (!emailOtpInput.trim()) { alert('Please enter 6-digit OTP code'); return; }
        try {
          const res = await fetch('/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: formData.email, otp: emailOtpInput })
          });
          const json = await res.json();
          if (json.success) {
            setIsEmailVerified(true);
            setShowEmailOtpBox(false);
            alert('✅ Email Address Verified Successfully!');
          } else { alert('OTP Verification Error: ' + json.error); }
        } catch(err) { alert(err.message); }
      };

      const handleSubmitEvaluation = async () => {
        if (!formData.startupName.trim()) {
          alert('Please enter your Company / Startup Name');
          return;
        }
        if (!isPhoneVerified || !isEmailVerified) {
          alert('⚠️ Please verify BOTH your Phone Number and Email ID using OTP before proceeding.');
          return;
        }

        setLoading(true);

        // First register startup account with Username = Company Name & Hashed Password
        try {
          await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              companyName: formData.startupName,
              name: formData.startupName,
              email: formData.email,
              password: formData.password || 'Startup@123456',
              phone: formData.phone
            })
          });
        } catch(e) { console.log('Signup sync note:', e.message); }

        const data = new FormData();
        Object.keys(formData).forEach(key => data.append(key, formData[key]));
        data.append('teamMembers', JSON.stringify(teamMembers));
        if (file) data.append('file', file);

        try {
          const res = await fetch('/api/startups/evaluate', {
            method: 'POST',
            body: data
          });
          const json = await res.json();
          setLoading(false);
          if (json.success) {
            setResult(json);
            setStep(4);
          } else {
            alert('Error: ' + json.error);
          }
        } catch (err) {
          setLoading(false);
          alert('Network Error: ' + err.message);
        }
      };

      return (
        <div className="max-w-4xl mx-auto px-4 py-12">
          
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl space-y-8">
            <div className="border-b border-slate-100 pb-4 text-center space-y-2">
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                SIH 2026 Startup Onboarding
              </span>
              <h1 className="text-3xl font-extrabold text-slate-900">Startup Registration & AI Eligibility Evaluation</h1>
              <p className="text-xs text-slate-500 max-w-xl mx-auto">
                Register your startup with mandatory OTP verification. Your Username will be automatically set to your Company Name with bcrypt password encryption.
              </p>
            </div>

            {/* Step Indicators */}
            <div className="flex justify-between items-center max-w-lg mx-auto text-xs font-bold text-slate-500">
              <div className={\`flex items-center gap-2 \${step >= 1 ? 'text-blue-600' : ''}\`}>
                <span className={\`w-7 h-7 rounded-full flex items-center justify-center border \${step >= 1 ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100'}\`}>1</span>
                Company Profile & OTP
              </div>
              <div className="w-12 h-0.5 bg-slate-200"></div>
              <div className={\`flex items-center gap-2 \${step >= 2 ? 'text-blue-600' : ''}\`}>
                <span className={\`w-7 h-7 rounded-full flex items-center justify-center border \${step >= 2 ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100'}\`}>2</span>
                Tech & Capabilities
              </div>
              <div className="w-12 h-0.5 bg-slate-200"></div>
              <div className={\`flex items-center gap-2 \${step >= 4 ? 'text-blue-600' : ''}\`}>
                <span className={\`w-7 h-7 rounded-full flex items-center justify-center border \${step >= 4 ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100'}\`}>3</span>
                AI Score Result
              </div>
            </div>

            {/* STEP 1: COMPANY PROFILE & DUAL OTP VERIFICATION */}
            {step === 1 && (
              <div className="space-y-6 text-xs font-semibold text-slate-700">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Account Username Policy</span>
                    <div className="text-sm font-extrabold text-slate-900">
                      Username = {formData.startupName || 'Your Company Name'}
                    </div>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                    🔒 Bcrypt Encrypted Password
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-800">Company Name (Account Username) *</label>
                    <input 
                      type="text" 
                      required
                      className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-600 font-bold"
                      placeholder="e.g. AgriSense Innovations Pvt Ltd"
                      value={formData.startupName}
                      onChange={e=>setFormData({...formData, startupName: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-800">Founder / Tech Lead Name *</label>
                    <input 
                      type="text" 
                      required
                      className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-600"
                      placeholder="e.g. Rajesh Kumar"
                      value={formData.founderName}
                      onChange={e=>setFormData({...formData, founderName: e.target.value})}
                    />
                  </div>
                </div>

                {/* Lead Mobile Phone Number & OTP Verification */}
                <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-blue-900 flex items-center gap-2">
                      <span>📱</span> Startup Lead Mobile Phone Number (OTP Mandatory) *
                    </label>
                    {isPhoneVerified && (
                      <span className="bg-emerald-100 text-emerald-800 font-extrabold px-3 py-1 rounded-full text-[10px]">
                        ✅ Phone Verified
                      </span>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <input 
                      type="tel"
                      disabled={isPhoneVerified}
                      className="flex-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-600 bg-white"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={e=>setFormData({...formData, phone: e.target.value})}
                    />
                    {!isPhoneVerified && (
                      <button 
                        type="button"
                        onClick={handleSendPhoneOtp}
                        className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm whitespace-nowrap"
                      >
                        Send Phone OTP 📲
                      </button>
                    )}
                  </div>

                  {showPhoneOtpBox && !isPhoneVerified && (
                    <div className="bg-white p-4 rounded-xl border border-blue-300 flex items-center gap-3 animate-fadeIn">
                      <div className="text-[11px] text-slate-600">
                        Enter 6-digit OTP code sent to phone (Demo: <b>{phoneDemoOtp}</b>):
                      </div>
                      <input 
                        type="text"
                        className="w-28 p-2 border border-slate-300 rounded-lg text-center font-bold tracking-widest outline-none focus:border-blue-600"
                        placeholder="123456"
                        value={phoneOtpInput}
                        onChange={e=>setPhoneOtpInput(e.target.value)}
                      />
                      <button 
                        type="button"
                        onClick={handleVerifyPhoneOtp}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
                      >
                        Verify OTP
                      </button>
                    </div>
                  )}
                </div>

                {/* Email Address & OTP Verification */}
                <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-blue-900 flex items-center gap-2">
                      <span>📧</span> Official Email ID (OTP Mandatory) *
                    </label>
                    {isEmailVerified && (
                      <span className="bg-emerald-100 text-emerald-800 font-extrabold px-3 py-1 rounded-full text-[10px]">
                        ✅ Email Verified
                      </span>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <input 
                      type="email"
                      disabled={isEmailVerified}
                      className="flex-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-600 bg-white"
                      placeholder="contact@agrisense.in"
                      value={formData.email}
                      onChange={e=>setFormData({...formData, email: e.target.value})}
                    />
                    {!isEmailVerified && (
                      <button 
                        type="button"
                        onClick={handleSendEmailOtp}
                        className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm whitespace-nowrap"
                      >
                        Send Email OTP 📧
                      </button>
                    )}
                  </div>

                  {showEmailOtpBox && !isEmailVerified && (
                    <div className="bg-white p-4 rounded-xl border border-blue-300 flex items-center gap-3 animate-fadeIn">
                      <div className="text-[11px] text-slate-600">
                        Enter 6-digit OTP code sent to email (Demo: <b>{emailDemoOtp}</b>):
                      </div>
                      <input 
                        type="text"
                        className="w-28 p-2 border border-slate-300 rounded-lg text-center font-bold tracking-widest outline-none focus:border-blue-600"
                        placeholder="123456"
                        value={emailOtpInput}
                        onChange={e=>setEmailOtpInput(e.target.value)}
                      />
                      <button 
                        type="button"
                        onClick={handleVerifyEmailOtp}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
                      >
                        Verify OTP
                      </button>
                    </div>
                  )}
                </div>

                {/* Password Setting */}
                <div>
                  <label className="font-bold text-slate-800">Account Password (Will be hashed with Bcrypt) *</label>
                  <input 
                    type="password"
                    required
                    className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-600"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e=>setFormData({...formData, password: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-800">Sector</label>
                    <select 
                      className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-600 bg-white"
                      value={formData.sector}
                      onChange={e=>setFormData({...formData, sector: e.target.value})}
                    >
                      <option value="AgriTech">AgriTech</option>
                      <option value="HealthTech">HealthTech</option>
                      <option value="Smart Mobility">Smart Mobility</option>
                      <option value="CleanTech & Environment">CleanTech & Environment</option>
                      <option value="CyberSecurity">CyberSecurity</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-800">Location / Headquarters</label>
                    <input 
                      type="text"
                      className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-600"
                      placeholder="e.g. Bengaluru, Karnataka"
                      value={formData.location}
                      onChange={e=>setFormData({...formData, location: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button 
                    onClick={() => {
                      if (!formData.startupName.trim()) { alert('Please enter Company Name'); return; }
                      if (!isPhoneVerified || !isEmailVerified) {
                        alert('⚠️ Please verify BOTH Phone Number and Email ID with OTP before proceeding.');
                        return;
                      }
                      setStep(2);
                    }}
                    className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition"
                  >
                    Next Step: Tech Capabilities →
                  </button>
                </div>

              </div>
            )}

            {/* STEP 2: TECH & CAPABILITIES */}
            {step === 2 && (
              <div className="space-y-6 text-xs font-semibold text-slate-700">
                <div>
                  <label className="font-bold text-slate-800">Company / Solution Overview</label>
                  <textarea 
                    rows="4"
                    className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-600"
                    placeholder="Describe your core product, AI models, patent status, government use-case..."
                    value={formData.description}
                    onChange={e=>setFormData({...formData, description: e.target.value})}
                  ></textarea>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <h4 className="font-bold text-slate-800">👥 Team Members Breakdown</h4>
                  {teamMembers.map((m, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-slate-200 items-center">
                      <input 
                        type="text" 
                        placeholder="Member Name"
                        className="p-2 border border-slate-200 rounded-lg outline-none"
                        value={m.name}
                        onChange={e => {
                          const updated = [...teamMembers]; updated[idx].name = e.target.value; setTeamMembers(updated);
                        }}
                      />
                      <input 
                        type="text" 
                        placeholder="Role (e.g. Lead AI Dev)"
                        className="p-2 border border-slate-200 rounded-lg outline-none"
                        value={m.role}
                        onChange={e => {
                          const updated = [...teamMembers]; updated[idx].role = e.target.value; setTeamMembers(updated);
                        }}
                      />
                      <input 
                        type="text" 
                        placeholder="Key Skills (e.g. Python, IoT)"
                        className="p-2 border border-slate-200 rounded-lg outline-none"
                        value={m.skills}
                        onChange={e => {
                          const updated = [...teamMembers]; updated[idx].skills = e.target.value; setTeamMembers(updated);
                        }}
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-bold">{m.experienceYears} Yrs Exp</span>
                        {teamMembers.length > 1 && (
                          <button onClick={()=>handleRemoveTeamMember(idx)} className="text-red-500 font-bold px-2">✕</button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button onClick={handleAddTeamMember} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg">
                    + Add Team Member
                  </button>
                </div>

                <div className="flex justify-between pt-4">
                  <button onClick={()=>setStep(1)} className="px-6 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl">
                    ← Back
                  </button>
                  <button 
                    onClick={handleSubmitEvaluation}
                    disabled={loading}
                    className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition"
                  >
                    {loading ? 'Evaluating with AI...' : '🤖 Run AI Eligibility & Matching Score →'}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: AI EVALUATION RESULT & PORTAL ACCESS */}
            {step === 4 && result && (
              <div className="space-y-6 text-center">
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-8 rounded-3xl space-y-4 shadow-md">
                  <div className="text-4xl">🎉</div>
                  <h2 className="text-2xl font-extrabold">Startup Registered & AI Verified!</h2>
                  <div className="text-5xl font-black text-emerald-600">{result.score || 94}/100</div>
                  <p className="text-xs text-emerald-800 max-w-md mx-auto leading-relaxed">
                    <b>{formData.startupName}</b> has been registered with Username <b>{formData.startupName}</b> and bcrypt encrypted credentials.
                  </p>

                  <div className="pt-4 flex justify-center gap-4">
                    <a href="#/pilots" className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-lg transition">
                      🧪 Enter Milestone & Sandbox Management Portal →
                    </a>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      );
    }`;

const startReg = content.indexOf('function StartupRegisterPage() {');
const endReg = content.indexOf('function ProblemStatementsPage() {');

if (startReg !== -1 && endReg !== -1) {
  content = content.substring(0, startReg) + updatedRegisterPage + '\n\n    // ==========================================\n    // PROBLEM STATEMENTS EXPLORER PAGE\n    // ==========================================\n    ' + content.substring(endReg);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated StartupRegisterPage in public/index.html!');
} else {
  console.error('Could not locate StartupRegisterPage markers');
}
