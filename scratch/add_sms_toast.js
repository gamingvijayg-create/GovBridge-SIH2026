const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// Update StartupRegisterPage to include Instant SMS Banner & Auto-Fill Button
const updatedRegister = `      // OTP Verification Handlers
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
            setPhoneOtpInput(json.otp); // Auto-fill instantly for seamless experience!
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
            setEmailOtpInput(json.otp); // Auto-fill instantly!
          } else { alert('Error: ' + json.error); }
        } catch(err) { alert(err.message); }
      };`;

// Replace handleSendPhoneOtp in content
const oldStart = content.indexOf('// OTP Verification Handlers');
const oldEnd = content.indexOf('const handleVerifyEmailOtp = async () => {');
const oldEndFull = content.indexOf('const handleSubmitEvaluation = async () => {');

if (oldStart !== -1 && oldEndFull !== -1) {
  content = content.substring(0, oldStart) + updatedRegister + '\n\n' + content.substring(content.indexOf('const handleVerifyEmailOtp = async () => {'));
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully added Instant OTP auto-fill to public/index.html!');
} else {
  console.error('Could not find markers for OTP verification handlers');
}
