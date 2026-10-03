const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

const newComponent = `    function PilotLifecyclePage({ user }) {
      const [pilots, setPilots] = useState([]);
      const [selectedPilot, setSelectedPilot] = useState(null);
      const [activeTab, setActiveTab] = useState('daily_updates'); // 'sandbox', 'daily_updates', 'contract', 'performance', 'payment', 'expenditures', 'scale_gate'
      const [loading, setLoading] = useState(true);

      // Milestone & Scale Gate state
      const [evidenceNotes, setEvidenceNotes] = useState('');
      const [evidenceUrl, setEvidenceUrl] = useState('');
      const [activeMilestoneModal, setActiveMilestoneModal] = useState(null);
      const [scaleDecision, setScaleDecision] = useState('Scale');
      const [scaleJustification, setScaleJustification] = useState('');

      // Daily Update Form State
      const [updateTitle, setUpdateTitle] = useState('');
      const [updateDesc, setUpdateDesc] = useState('');
      const [updateProgress, setUpdateProgress] = useState(50);
      const [updateMediaType, setUpdateMediaType] = useState('photo');
      const [updateMediaUrl, setUpdateMediaUrl] = useState('');
      const [isPostingUpdate, setIsPostingUpdate] = useState(false);
      const [adminComments, setAdminComments] = useState({});

      // Expenditure Form State
      const [expCategory, setExpCategory] = useState('Cloud & Hardware');
      const [expDesc, setExpDesc] = useState('');
      const [expAmount, setExpAmount] = useState('');
      const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
      const [expReceiptUrl, setExpReceiptUrl] = useState('');
      const [isPostingExp, setIsPostingExp] = useState(false);

      const fetchPilots = async () => {
        setLoading(true);
        try {
          const res = await fetch('/api/pilots');
          const json = await res.json();
          if (json.success && json.data) {
            setPilots(json.data);
            if (json.data.length > 0 && !selectedPilot) {
              setSelectedPilot(json.data[0]);
            } else if (selectedPilot) {
              const updated = json.data.find(p => p._id === selectedPilot._id);
              if (updated) setSelectedPilot(updated);
            }
          }
        } catch(err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };

      useEffect(() => {
        fetchPilots();
      }, []);

      // Handle Camera / File Upload for Daily Update Evidence
      const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setUpdateMediaUrl(reader.result);
            if (file.type.startsWith('video/')) {
              setUpdateMediaType('video');
            } else {
              setUpdateMediaType('photo');
            }
          };
          reader.readAsDataURL(file);
        }
      };

      // Submit Daily Progress Update
      const handlePostDailyUpdate = async (e) => {
        e.preventDefault();
        if (!selectedPilot) return;
        if (!updateTitle.trim()) {
          alert('Please enter an update title');
          return;
        }

        setIsPostingUpdate(true);
        try {
          const res = await fetch(\`/api/pilots/\${selectedPilot._id}/daily-updates\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: updateTitle,
              description: updateDesc,
              progressPercentage: Number(updateProgress),
              mediaType: updateMediaType,
              mediaUrl: updateMediaUrl,
              uploadedBy: user && user.name ? \`\${user.name} (\${selectedPilot.startupName})\` : selectedPilot.startupName
            })
          });
          const json = await res.json();
          if (json.success) {
            alert('✅ Daily progress update with photo/video posted successfully!');
            setUpdateTitle('');
            setUpdateDesc('');
            setUpdateMediaUrl('');
            fetchPilots();
          } else {
            alert('Error: ' + json.error);
          }
        } catch(err) { alert(err.message); }
        finally { setIsPostingUpdate(false); }
      };

      // Admin Review Daily Update
      const handleAdminReviewUpdate = async (updateId) => {
        if (!selectedPilot) return;
        const comment = adminComments[updateId] || 'Reviewed and approved by Admin.';
        try {
          const res = await fetch(\`/api/pilots/\${selectedPilot._id}/daily-updates/\${updateId}/review\`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminComment: comment })
          });
          const json = await res.json();
          if (json.success) {
            alert('✅ Marked as Reviewed by Admin! The startup can now see your review tag.');
            fetchPilots();
          } else {
            alert('Error: ' + json.error);
          }
        } catch(err) { alert(err.message); }
      };

      // Log Team Expenditure
      const handlePostExpenditure = async (e) => {
        e.preventDefault();
        if (!selectedPilot) return;
        if (!expDesc.trim() || !expAmount) {
          alert('Please provide expense description and amount');
          return;
        }

        setIsPostingExp(true);
        try {
          const res = await fetch(\`/api/pilots/\${selectedPilot._id}/expenditures\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              category: expCategory,
              description: expDesc,
              amount: Number(expAmount),
              spendDate: expDate,
              receiptUrl: expReceiptUrl
            })
          });
          const json = await res.json();
          if (json.success) {
            alert('✅ Expenditure item logged successfully!');
            setExpDesc('');
            setExpAmount('');
            setExpReceiptUrl('');
            fetchPilots();
          } else {
            alert('Error: ' + json.error);
          }
        } catch(err) { alert(err.message); }
        finally { setIsPostingExp(false); }
      };

      const handleRequestPayment = async (milestoneId) => {
        if (!selectedPilot) return;
        try {
          const res = await fetch(\`/api/pilots/\${selectedPilot._id}/milestones/\${milestoneId}/request-payment\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ evidenceNotes, evidenceUrl })
          });
          const json = await res.json();
          if (json.success) {
            alert('✅ Payment Request submitted to Department Admin!');
            setActiveMilestoneModal(null);
            setEvidenceNotes('');
            setEvidenceUrl('');
            fetchPilots();
          } else {
            alert('Error: ' + json.error);
          }
        } catch(err) { alert(err.message); }
      };

      const handleApprovePayment = async (milestoneId) => {
        if (!selectedPilot) return;
        try {
          const res = await fetch(\`/api/pilots/\${selectedPilot._id}/milestones/\${milestoneId}/approve-payment\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          const json = await res.json();
          if (json.success) {
            alert('🎉 Milestone Payment Approved & Funds Disbursed!');
            fetchPilots();
          } else {
            alert('Error: ' + json.error);
          }
        } catch(err) { alert(err.message); }
      };

      const handleScaleDecisionSubmit = async () => {
        if (!selectedPilot) return;
        try {
          const res = await fetch(\`/api/pilots/\${selectedPilot._id}/scale-up-decision\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              decision: scaleDecision,
              justification: scaleJustification,
              validatorNotes: 'Independent Committee Audit completed.'
            })
          });
          const json = await res.json();
          if (json.success) {
            alert(\`🚀 Scale-Up Gate Decision recorded: \${scaleDecision}!\`);
            fetchPilots();
          } else {
            alert('Error: ' + json.error);
          }
        } catch(err) { alert(err.message); }
      };

      if (loading) {
        return (
          <div className="max-w-7xl mx-auto px-4 py-20 text-center">
            <div className="text-xl font-bold text-slate-700 animate-pulse">Loading Pilot & Milestone Data...</div>
          </div>
        );
      }

      // Financial Math Helpers
      const allocatedBudget = selectedPilot ? (selectedPilot.allocatedBudget || 5000000) : 5000000;
      const totalPaid = selectedPilot ? (selectedPilot.milestones || []).filter(m => m.paymentStatus === 'Paid').reduce((s, m) => s + (m.amount || 0), 0) : 0;
      const totalRequested = selectedPilot ? (selectedPilot.milestones || []).filter(m => m.paymentStatus === 'Requested').reduce((s, m) => s + (m.amount || 0), 0) : 0;
      const remainingBalance = allocatedBudget - totalPaid;
      const totalSpent = selectedPilot ? (selectedPilot.expenditures || []).reduce((s, e) => s + (e.amount || 0), 0) : 0;

      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30 uppercase tracking-widest">
                  SIH 2026 End-to-End Lifecycle
                </span>
                <span className="text-xs text-slate-400">GovBridge Sandbox & Financial Control</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Pilot, Daily Sandbox Progress & Financial Gate Manager
              </h1>
              <p className="text-slate-300 max-w-3xl text-sm leading-relaxed">
                Track live running processes of approved companies with daily photo/video proof, monitor admin review statuses, and inspect allocated budgets, payments disbursed, and expenditure breakdowns.
              </p>
            </div>
          </div>

          {/* 6-Team Approved Companies Admin Matrix Switcher */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
                  🏛️ Approved Pilot Teams (6 Active Sandboxes)
                </h3>
                <p className="text-xs text-slate-500">Select any team to view their daily progress updates, photo evidence, and payment balances.</p>
              </div>
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full border border-blue-200">
                {pilots.length} Active Teams
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pilots.map((p, idx) => {
                const isSelected = selectedPilot && selectedPilot._id === p._id;
                const pPaid = (p.milestones || []).filter(m => m.paymentStatus === 'Paid').reduce((s, m) => s + (m.amount || 0), 0);
                const pAlloc = p.allocatedBudget || 5000000;
                const pBal = pAlloc - pPaid;
                const pUnreviewed = (p.dailyUpdates || []).filter(u => !u.adminReviewed).length;

                return (
                  <div 
                    key={p._id}
                    onClick={() => setSelectedPilot(p)}
                    className={\`p-4 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between space-y-3 \${
                      isSelected 
                        ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20' 
                        : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                    }\`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Team #{idx + 1}</span>
                        <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{p.startupName}</h4>
                        <div className="text-xs text-slate-500 truncate max-w-[200px]">{p.department}</div>
                      </div>
                      {pUnreviewed > 0 ? (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300 animate-pulse">
                          ⏳ {pUnreviewed} Pending
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                          ✅ Up to date
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-100 p-2.5 rounded-xl">
                      <div>
                        <div className="text-slate-400 font-semibold">Disbursed</div>
                        <div className="font-extrabold text-emerald-700">₹{(pPaid / 100000).toFixed(1)} L</div>
                      </div>
                      <div>
                        <div className="text-slate-400 font-semibold">Remaining</div>
                        <div className="font-extrabold text-blue-700">₹{(pBal / 100000).toFixed(1)} L</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedPilot && (
            <div className="space-y-8">

              {/* Selected Pilot Header & Quick Financial Summary */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-3xl text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <div className="text-xs font-bold uppercase text-blue-400 tracking-wider">Active Sandbox Selected</div>
                  <h2 className="text-2xl font-extrabold">{selectedPilot.startupName}</h2>
                  <p className="text-xs text-slate-300 mt-1">{selectedPilot.title}</p>
                </div>

                <div className="flex flex-wrap gap-4 text-center">
                  <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10">
                    <div className="text-[10px] uppercase text-slate-400 font-bold">Total Budget</div>
                    <div className="text-sm font-extrabold text-white">₹{allocatedBudget.toLocaleString()}</div>
                  </div>
                  <div className="bg-emerald-500/20 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-emerald-400/30">
                    <div className="text-[10px] uppercase text-emerald-300 font-bold">Paid (evalo pannirukom)</div>
                    <div className="text-sm font-extrabold text-emerald-400">₹{totalPaid.toLocaleString()}</div>
                  </div>
                  <div className="bg-blue-500/20 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-blue-400/30">
                    <div className="text-[10px] uppercase text-blue-300 font-bold">Balance (innu evalo)</div>
                    <div className="text-sm font-extrabold text-blue-400">₹{remainingBalance.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
                {[
                  { id: 'daily_updates', label: \`📹 Daily Sandbox Progress (\${(selectedPilot.dailyUpdates || []).length})\`, icon: '⚡' },
                  { id: 'payment', label: '💳 Payment Details & Balance', icon: '💰' },
                  { id: 'expenditures', label: \`📊 Payment History & Spend Details (\${(selectedPilot.expenditures || []).length})\`, icon: '📜' },
                  { id: 'sandbox', label: '🧪 Sandbox Specification', icon: '📝' },
                  { id: 'contract', label: '📋 Milestone Contract', icon: '📄' },
                  { id: 'scale_gate', label: '🚀 Scale-Up Decision Gate', icon: '🏆' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={\`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 \${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }\`}
                  >
                    <span>{tab.icon}</span> {tab.label}
                  </button>
                ))}
              </div>

              {/* TAB 1: DAILY PROGRESS UPDATES WITH CAMERA & ADMIN REVIEW TRACKING */}
              {activeTab === 'daily_updates' && (
                <div className="space-y-8">
                  
                  {/* Upload Daily Progress Form */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                        <span>📹</span> Post Daily Sandbox Progress (Photo/Video Evidence)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Approved companies must upload daily progress notes with photo or video proof. Updates are strictly visible to your Team and Department Admins.
                      </p>
                    </div>

                    <form onSubmit={handlePostDailyUpdate} className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="font-bold text-slate-700">Update Title</label>
                          <input 
                            type="text" 
                            required
                            className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-600"
                            placeholder="e.g. Installed Edge AI Sensor #04 at Site B"
                            value={updateTitle}
                            onChange={e=>setUpdateTitle(e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700">Progress Milestone Completion (%)</label>
                          <div className="flex items-center gap-3 mt-1">
                            <input 
                              type="range" 
                              min="0" 
                              max="100"
                              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                              value={updateProgress}
                              onChange={e=>setUpdateProgress(e.target.value)}
                            />
                            <span className="font-extrabold text-blue-600 text-sm w-12 text-right">{updateProgress}%</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700">Detailed Daily Progress Notes</label>
                        <textarea 
                          rows="3"
                          className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-600"
                          placeholder="Describe field operations conducted, accuracy scores achieved, test results..."
                          value={updateDesc}
                          onChange={e=>setUpdateDesc(e.target.value)}
                        ></textarea>
                      </div>

                      {/* Evidence Photo / Video Upload Options */}
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                        <label className="font-bold text-slate-800 flex items-center gap-2">
                          <span>📸</span> Photo / Video Evidence (Direct Camera Capture or File Upload)
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <span className="text-[11px] text-slate-500 font-semibold block mb-1">Option A: Capture / Choose File</span>
                            <input 
                              type="file"
                              accept="image/*,video/*"
                              capture="environment"
                              onChange={handleFileUpload}
                              className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer"
                            />
                          </div>

                          <div>
                            <span className="text-[11px] text-slate-500 font-semibold block mb-1">Option B: Image / Video URL Link</span>
                            <input 
                              type="url"
                              placeholder="https://images.unsplash.com/..."
                              value={updateMediaUrl}
                              onChange={e=>{ setUpdateMediaUrl(e.target.value); }}
                              className="w-full p-2 border border-slate-200 rounded-xl outline-none focus:border-blue-600"
                            />
                          </div>
                        </div>

                        {updateMediaUrl && (
                          <div className="mt-3 p-2 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
                            {updateMediaType === 'video' ? (
                              <div className="w-16 h-12 bg-slate-900 rounded-lg flex items-center justify-center text-white text-xs font-bold">🎥 Video</div>
                            ) : (
                              <img src={updateMediaUrl} alt="Preview" className="w-16 h-12 object-cover rounded-lg" />
                            )}
                            <div className="text-xs text-slate-600 font-semibold truncate flex-1">Evidence Preview Attached</div>
                            <button type="button" onClick={()=>setUpdateMediaUrl('')} className="text-red-500 font-bold px-2">✕</button>
                          </div>
                        )}
                      </div>

                      <button 
                        type="submit" 
                        disabled={isPostingUpdate}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition"
                      >
                        {isPostingUpdate ? 'Uploading Update...' : '🚀 Submit Daily Progress Update'}
                      </button>
                    </form>
                  </div>

                  {/* Daily Updates Feed */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <span>📜</span> Daily Sandbox Activity Log for {selectedPilot.startupName}
                    </h3>

                    {(selectedPilot.dailyUpdates || []).length === 0 ? (
                      <div className="bg-white p-8 rounded-3xl text-center text-slate-400 border border-slate-200 text-xs">
                        No daily updates submitted yet. Use the form above to post your first update!
                      </div>
                    ) : (
                      (selectedPilot.dailyUpdates || []).map((upd) => (
                        <div key={upd._id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                          
                          {/* Update Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-extrabold text-slate-900 text-base">{upd.title}</h4>
                                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                                  {upd.progressPercentage}% Completed
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                Posted by <b>{upd.uploadedBy}</b> • {new Date(upd.uploadedAt).toLocaleString()}
                              </div>
                            </div>

                            {/* KEY REQUIREMENT: Admin Review Status Indicator */}
                            <div>
                              {upd.adminReviewed ? (
                                <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-extrabold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                                  <span>✅</span> Reviewed by Admin ({new Date(upd.adminReviewedAt).toLocaleDateString()})
                                </div>
                              ) : (
                                <div className="bg-amber-50 border border-amber-300 text-amber-800 text-xs font-extrabold px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-pulse">
                                  <span>⏳</span> Pending Admin Review
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Description & Evidence */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <div className="md:col-span-2 space-y-2">
                              <p className="text-slate-700 leading-relaxed">{upd.description || 'No notes provided.'}</p>
                              
                              {upd.adminComment && (
                                <div className="bg-emerald-50/80 border-l-4 border-emerald-500 p-3 rounded-r-xl text-emerald-900 font-medium">
                                  <b>Admin Note:</b> {upd.adminComment}
                                </div>
                              )}
                            </div>

                            {upd.mediaUrl && (
                              <div className="bg-slate-900 p-2 rounded-2xl overflow-hidden shadow-inner">
                                {upd.mediaType === 'video' ? (
                                  <video src={upd.mediaUrl} controls className="w-full h-36 object-cover rounded-xl" />
                                ) : (
                                  <img src={upd.mediaUrl} alt="Evidence Proof" className="w-full h-36 object-cover rounded-xl" />
                                )}
                                <div className="text-[10px] text-slate-300 font-semibold text-center mt-1 uppercase tracking-wider">
                                  📷 Verified Evidence Proof
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Admin Review Action Button (For Admins) */}
                          {user && user.role === 'admin' && !upd.adminReviewed && (
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-3 pt-2 text-xs">
                              <input 
                                type="text"
                                className="flex-1 p-2 border border-slate-300 rounded-xl outline-none focus:border-blue-600"
                                placeholder="Add admin review comment..."
                                value={adminComments[upd._id] || ''}
                                onChange={e=>setAdminComments({...adminComments, [upd._id]: e.target.value})}
                              />
                              <button 
                                onClick={()=>handleAdminReviewUpdate(upd._id)}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm whitespace-nowrap"
                              >
                                ✅ Mark as Reviewed by Admin
                              </button>
                            </div>
                          )}

                        </div>
                      ))
                    )}
                  </div>

                </div>
              )}

              {/* TAB 2: PAYMENT DETAILS & BALANCE (REQUIREMENT 2) */}
              {activeTab === 'payment' && (
                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-8">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <span>💳</span> Payment Details & Financial Summary
                    </h2>
                    <p className="text-xs text-slate-500">
                      View total allocated pilot budget, funds disbursed so far (evalo pannirukom), and remaining balance (innu evalo balance pay panna num).
                    </p>
                  </div>

                  {/* 3 Core Financial KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-3xl space-y-2 shadow-lg">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Allocated Budget</div>
                      <div className="text-3xl font-extrabold text-white">₹{allocatedBudget.toLocaleString()}</div>
                      <div className="text-[11px] text-slate-300">Sanctioned Government Pilot Fund</div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 text-white p-6 rounded-3xl space-y-2 shadow-lg">
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-300">Paid Amount (evalo pannirukom)</div>
                      <div className="text-3xl font-extrabold text-emerald-400">₹{totalPaid.toLocaleString()}</div>
                      <div className="text-[11px] text-emerald-200">Total Disbursed Milestone Payments</div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-900 to-indigo-900 text-white p-6 rounded-3xl space-y-2 shadow-lg">
                      <div className="text-xs font-bold uppercase tracking-wider text-blue-300">Remaining Balance (innu evalo balance)</div>
                      <div className="text-3xl font-extrabold text-blue-300">₹{remainingBalance.toLocaleString()}</div>
                      <div className="text-[11px] text-blue-200">Pending Future Milestone Disbursement</div>
                    </div>
                  </div>

                  {/* Visual Budget Progress Bar */}
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-3">
                    <div className="flex justify-between text-xs font-extrabold">
                      <span className="text-slate-700">Budget Disbursement Progress</span>
                      <span className="text-emerald-700">{((totalPaid / allocatedBudget) * 100).toFixed(1)}% Disbursed</span>
                    </div>
                    <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden flex">
                      <div className="bg-emerald-500 h-full" style={{ width: \`\${(totalPaid / allocatedBudget) * 100}%\` }}></div>
                      <div className="bg-amber-400 h-full" style={{ width: \`\${(totalRequested / allocatedBudget) * 100}%\` }}></div>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                      <span>🟩 Paid: ₹{totalPaid.toLocaleString()}</span>
                      <span>🟨 Requested: ₹{totalRequested.toLocaleString()}</span>
                      <span>🟦 Remaining: ₹{remainingBalance.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Milestone Payment Status Breakdown Table */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Milestone Payment Gate Breakdown</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                            <th className="p-3">Code</th>
                            <th className="p-3">Milestone Title</th>
                            <th className="p-3">Amount (INR)</th>
                            <th className="p-3">Verification</th>
                            <th className="p-3">Payment Status</th>
                            <th className="p-3">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                          {(selectedPilot.milestones || []).map((ms) => (
                            <tr key={ms._id} className="hover:bg-slate-50">
                              <td className="p-3 font-bold text-slate-900">{ms.milestoneCode}</td>
                              <td className="p-3">{ms.title}</td>
                              <td className="p-3 font-bold text-slate-900">₹{(ms.amount || 0).toLocaleString()}</td>
                              <td className="p-3">
                                <span className={\`px-2 py-0.5 rounded-full text-[10px] font-bold \${
                                  ms.verificationStatus === 'Verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }\`}>
                                  {ms.verificationStatus}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className={\`px-2.5 py-1 rounded-full text-[10px] font-extrabold \${
                                  ms.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                  ms.paymentStatus === 'Requested' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                  'bg-slate-100 text-slate-600'
                                }\`}>
                                  {ms.paymentStatus}
                                </span>
                              </td>
                              <td className="p-3">
                                {ms.paymentStatus === 'Unpaid' && (
                                  <button 
                                    onClick={()=>setActiveMilestoneModal(ms)}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg shadow-sm"
                                  >
                                    Request Payment
                                  </button>
                                )}
                                {user && user.role === 'admin' && ms.paymentStatus === 'Requested' && (
                                  <button 
                                    onClick={()=>handleApprovePayment(ms._id)}
                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-sm"
                                  >
                                    Approve & Disburse
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 3: PAYMENT HISTORY & SPEND DETAILS (REQUIREMENT 3) */}
              {activeTab === 'expenditures' && (
                <div className="space-y-8">
                  
                  {/* Log Expenditure Form */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                        <span>📊</span> Log Team Expenditure ("Ethuku Spend Pannom")
                      </h3>
                      <p className="text-xs text-slate-500">
                        Record team expenditure items (cloud servers, IoT hardware, AI APIs, salaries) so Admins and Teams can track where funds are utilized.
                      </p>
                    </div>

                    <form onSubmit={handlePostExpenditure} className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="font-bold text-slate-700">Expense Category</label>
                          <select 
                            className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-600 bg-white"
                            value={expCategory}
                            onChange={e=>setExpCategory(e.target.value)}
                          >
                            <option value="Cloud & Hardware">Cloud & Hardware</option>
                            <option value="R&D & AI APIs">R&D & AI APIs</option>
                            <option value="Field Testing & Operations">Field Testing & Operations</option>
                            <option value="Team Salaries">Team Salaries</option>
                            <option value="Certifications & Audits">Certifications & Audits</option>
                            <option value="Misc">Misc Expenses</option>
                          </select>
                        </div>

                        <div>
                          <label className="font-bold text-slate-700">Description</label>
                          <input 
                            type="text"
                            required
                            className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-600"
                            placeholder="e.g. Purchased 25 IoT Optical Sensor Nodes"
                            value={expDesc}
                            onChange={e=>setExpDesc(e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700">Amount Spent (INR)</label>
                          <input 
                            type="number"
                            required
                            className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-600"
                            placeholder="e.g. 450000"
                            value={expAmount}
                            onChange={e=>setExpAmount(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="font-bold text-slate-700">Spend Date</label>
                          <input 
                            type="date"
                            className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-600"
                            value={expDate}
                            onChange={e=>setExpDate(e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700">Receipt / Invoice Link (Optional)</label>
                          <input 
                            type="url"
                            className="w-full mt-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-600"
                            placeholder="https://drive.google.com/..."
                            value={expReceiptUrl}
                            onChange={e=>setExpReceiptUrl(e.target.value)}
                          />
                        </div>
                      </div>

                      <button 
                        type="submit"
                        disabled={isPostingExp}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition"
                      >
                        {isPostingExp ? 'Saving...' : '💾 Log Expenditure Record'}
                      </button>
                    </form>
                  </div>

                  {/* Payment & Expenditure Ledger */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900">📜 Payment History & Spend Ledger</h3>
                        <p className="text-xs text-slate-500">Itemized list of all expenditures logged by {selectedPilot.startupName}</p>
                      </div>
                      <div className="text-right text-xs">
                        <div className="text-slate-400 font-semibold">Total Logged Spent</div>
                        <div className="text-lg font-extrabold text-slate-900">₹{totalSpent.toLocaleString()}</div>
                      </div>
                    </div>

                    {(selectedPilot.expenditures || []).length === 0 ? (
                      <div className="text-center text-slate-400 py-6 text-xs">No expenditure records logged yet.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                              <th className="p-3">Category</th>
                              <th className="p-3">Description</th>
                              <th className="p-3">Date</th>
                              <th className="p-3">Amount</th>
                              <th className="p-3">Receipt</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                            {(selectedPilot.expenditures || []).map((exp) => (
                              <tr key={exp._id} className="hover:bg-slate-50">
                                <td className="p-3">
                                  <span className="bg-blue-50 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                                    {exp.category}
                                  </span>
                                </td>
                                <td className="p-3 font-semibold text-slate-900">{exp.description}</td>
                                <td className="p-3">{exp.spendDate}</td>
                                <td className="p-3 font-extrabold text-slate-900">₹{(exp.amount || 0).toLocaleString()}</td>
                                <td className="p-3">
                                  {exp.receiptUrl ? (
                                    <a href={exp.receiptUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold">
                                      View Receipt
                                    </a>
                                  ) : (
                                    <span className="text-slate-400">N/A</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* TAB 4: PILOT / SANDBOX SPECIFICATION */}
              {activeTab === 'sandbox' && (
                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
                  <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">🧪 Pilot / Sandbox Specification</h2>
                      <p className="text-xs text-slate-500">Detailed SOW, outcome metrics, IP terms & compliance baseline</p>
                    </div>
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                      Duration: {selectedPilot.durationMonths} Months
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                      <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <span>🎯</span> Outcome Objective
                      </div>
                      <p className="text-slate-600 leading-relaxed">{selectedPilot.outcomeObjective || 'Not specified'}</p>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                      <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <span>📊</span> Baseline + Target KPIs
                      </div>
                      <p className="text-slate-600 leading-relaxed">{selectedPilot.baselineTargetKPIs || 'Not specified'}</p>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                      <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <span>📍</span> Pilot Scope & Geographic Location
                      </div>
                      <p className="text-slate-600 leading-relaxed">{selectedPilot.scope || 'Not specified'}</p>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                      <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <span>🛡️</span> Cybersecurity & Compliance Controls
                      </div>
                      <p className="text-slate-600 leading-relaxed">{selectedPilot.cybersecurityControls}</p>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                      <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <span>⚖️</span> IP Ownership Terms
                      </div>
                      <p className="text-slate-600 leading-relaxed">{selectedPilot.ipOwnership}</p>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                      <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <span>🔍</span> Independent Validation Plan
                      </div>
                      <p className="text-slate-600 leading-relaxed">{selectedPilot.validationPlan}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: MILESTONE CONTRACT */}
              {activeTab === 'contract' && (
                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-xl font-bold text-slate-900">📋 Milestone Contract</h2>
                    <p className="text-xs text-slate-500">Structured outcome gates linked to baseline metrics & payment disbursement</p>
                  </div>

                  <div className="space-y-4">
                    {(selectedPilot.milestones || []).map((ms) => (
                      <div key={ms._id} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3 text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="bg-blue-100 text-blue-800 font-extrabold px-2.5 py-1 rounded-lg text-[11px]">
                              {ms.milestoneCode}
                            </span>
                            <h3 className="font-bold text-slate-900 text-sm mt-2">{ms.title}</h3>
                          </div>
                          <div className="text-right">
                            <div className="font-extrabold text-slate-900 text-sm">₹{(ms.amount || 0).toLocaleString()}</div>
                            <div className="text-[11px] text-slate-500">Due: {ms.dueDate}</div>
                          </div>
                        </div>

                        <p className="text-slate-600">{ms.description}</p>

                        <div className="grid grid-cols-2 gap-4 bg-white p-3 rounded-xl border border-slate-200">
                          <div>
                            <span className="text-slate-400 font-bold block">Baseline Metric</span>
                            <span className="font-semibold text-slate-800">{ms.baselineMetric || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold block">Target Metric</span>
                            <span className="font-semibold text-blue-700">{ms.targetMetric || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: PERFORMANCE & KPI RECORD */}
              {activeTab === 'performance' && (
                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-xl font-bold text-slate-900">📈 Performance & KPI Record</h2>
                    <p className="text-xs text-slate-500">Real-time outcome metrics vs baseline contract targets</p>
                  </div>

                  <div className="space-y-4">
                    {(selectedPilot.milestones || []).map((ms) => (
                      <div key={ms._id} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3 text-xs">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-slate-900 text-sm">{ms.milestoneCode}: {ms.title}</h4>
                          <span className={\`px-2.5 py-1 rounded-full font-bold text-[10px] \${
                            ms.verificationStatus === 'Verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }\`}>
                            {ms.verificationStatus}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="bg-white p-3 rounded-xl border border-slate-200">
                            <span className="text-slate-400 font-semibold block">Baseline</span>
                            <span className="font-bold text-slate-800">{ms.baselineMetric || 'N/A'}</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-200">
                            <span className="text-slate-400 font-semibold block">Target</span>
                            <span className="font-bold text-blue-600">{ms.targetMetric || 'N/A'}</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-200">
                            <span className="text-slate-400 font-semibold block">Actual Measured</span>
                            <span className="font-bold text-emerald-600">{ms.actualMetric || 'Pending Measurement'}</span>
                          </div>
                        </div>

                        {ms.evidenceNotes && (
                          <div className="bg-blue-50/60 p-3 rounded-xl text-blue-900">
                            <b>Evidence Logged:</b> {ms.evidenceNotes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 7: SCALE-UP DECISION GATE */}
              {activeTab === 'scale_gate' && (
                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-xl font-bold text-slate-900">🚀 Scale-Up Decision Gate</h2>
                    <p className="text-xs text-slate-500">Independent evaluation gate for transitioning pilot into national GeM direct tender procurement</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                    {[
                      { id: 'Scale', label: '🚀 Scale Up', desc: 'Transition to Pan-Gov Direct Procurement (GeM Tender Bridge)', color: 'border-emerald-500 bg-emerald-50 text-emerald-900' },
                      { id: 'Extend', label: '⏳ Extend Pilot', desc: 'Extend sandbox period for additional KPI verification', color: 'border-blue-500 bg-blue-50 text-blue-900' },
                      { id: 'Redesign', label: '🔄 Redesign', desc: 'Require architectural changes before re-evaluation', color: 'border-amber-500 bg-amber-50 text-amber-900' },
                      { id: 'Stop', label: '🛑 Stop Project', desc: 'Terminate pilot due to unmet baseline criteria', color: 'border-red-500 bg-red-50 text-red-900' }
                    ].map((opt) => (
                      <div
                        key={opt.id}
                        onClick={() => setScaleDecision(opt.id)}
                        className={\`p-5 rounded-2xl border-2 cursor-pointer transition space-y-2 \${
                          scaleDecision === opt.id ? opt.color + ' shadow-md' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                        }\`}
                      >
                        <h4 className="font-extrabold text-sm">{opt.label}</h4>
                        <p className="text-[11px] leading-relaxed opacity-90">{opt.desc}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                    <h4 className="font-bold text-slate-800 text-xs uppercase">Committee Justification & Audit Notes</h4>
                    <textarea
                      className="w-full p-3 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                      rows="3"
                      value={scaleJustification}
                      onChange={(e) => setScaleJustification(e.target.value)}
                      placeholder="Enter details of independent committee review, STQC report summary, and tender authorization notes..."
                    ></textarea>

                    <button
                      onClick={handleScaleDecisionSubmit}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                    >
                      🏆 Submit Final Scale-Up Decision Gate Result
                    </button>
                  </div>

                  {selectedPilot.scaleUpDecision && selectedPilot.scaleUpDecision.decision !== 'Pending' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 space-y-2">
                      <div className="text-xs font-bold text-emerald-800">Recorded Gate Decision:</div>
                      <div className="text-lg font-extrabold text-emerald-900">{selectedPilot.scaleUpDecision.decision}</div>
                      <div className="text-xs text-emerald-700"><b>GeM Tender Bridge Status:</b> {selectedPilot.scaleUpDecision.gemTenderBridgeStatus}</div>
                      <div className="text-xs text-emerald-700"><b>Justification:</b> {selectedPilot.scaleUpDecision.justification}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Payment Request Evidence Modal */}
          {activeMilestoneModal && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-3xl p-8 max-w-lg w-full space-y-6 relative">
                <button onClick={()=>setActiveMilestoneModal(null)} className="absolute top-6 right-6 font-bold text-slate-400">✕</button>
                <h3 className="text-lg font-bold text-slate-900">Request Payment: {activeMilestoneModal.title}</h3>
                
                <div className="text-xs space-y-3">
                  <div>
                    <label className="font-semibold text-slate-700">Evidence Proof Notes / Demo Link</label>
                    <textarea 
                      className="w-full mt-1 p-3 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                      rows="3"
                      value={evidenceNotes}
                      onChange={e=>setEvidenceNotes(e.target.value)}
                      placeholder="Describe KPI evidence achieved, test reports, live URL demo link..."
                    ></textarea>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700">Evidence File URL (Optional)</label>
                    <input 
                      type="text" 
                      className="w-full mt-1 p-3 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600"
                      value={evidenceUrl}
                      onChange={e=>setEvidenceUrl(e.target.value)}
                      placeholder="https://drive.google.com/..."
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button onClick={()=>handleRequestPayment(activeMilestoneModal._id)} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md">
                    Submit Payment Package
                  </button>
                  <button onClick={()=>setActiveMilestoneModal(null)} className="px-5 py-3 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }`;

// Find start and end of function PilotLifecyclePage
const startIdx = content.indexOf('function PilotLifecyclePage({ user }) {');
const endMarker = '    // ==========================================\n    // HOW IT WORKS';
const endIdx = content.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
  const updatedContent = content.substring(0, startIdx) + newComponent + '\n\n' + content.substring(endIdx);
  fs.writeFileSync(filePath, updatedContent, 'utf8');
  console.log('Successfully updated public/index.html with PilotLifecyclePage!');
} else {
  console.error('Could not locate start/end markers:', startIdx, endIdx);
}
