const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

const updatedHandlers = `      // OTP Verification Handlers
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
            setShowPhoneOtpBox(true);
            setPhoneOtpInput(''); // Input field is blank for user to type OTP from SMS app
            alert('📱 Verification OTP code dispatched to your Mobile Phone SMS Messenger (' + formData.phone + '). Please check your phone SMS inbox and enter the 6-digit code below.');
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
            setShowEmailOtpBox(true);
            setEmailOtpInput(''); // Blank for user to type from Email inbox
            alert('📧 Verification OTP code dispatched to your Email Inbox (' + formData.email + '). Please check your email inbox and enter the 6-digit code below.');
          } else { alert('Error: ' + json.error); }
        } catch(err) { alert(err.message); }
      };`;

// Replace in content
const oldStart = content.indexOf('// OTP Verification Handlers');
const oldEnd = content.indexOf('const handleVerifyEmailOtp = async () => {');
const nextSection = content.indexOf('const handleSubmitEvaluation = async () => {');

if (oldStart !== -1 && nextSection !== -1) {
  content = content.substring(0, oldStart) + updatedHandlers + '\n\n' + content.substring(oldEnd);
  
  // Also remove demo OTP badges from HTML markup
  content = content.replace(/\(Demo: <b>\{phoneDemoOtp\}<\/b>\)/g, '');
  content = content.replace(/\(Demo: <b>\{emailDemoOtp\}<\/b>\)/g, '');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully cleaned screen OTP display in public/index.html!');
} else {
  console.error('Could not locate handler start/end');
}
