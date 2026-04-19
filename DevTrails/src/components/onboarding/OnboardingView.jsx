import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Shield, 
  Check, 
  Fingerprint, 
  User, 
  ArrowRight, 
  Smartphone, 
  RefreshCw,
  CreditCard,
  MapPin
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getLocationRiskProfile, sendOtp, verifyOtp, checkDuplicateFields } from '../../services/api';

export default function OnboardingView({ onComplete }) {
  const [step, setStep] = useState(1);
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpStatus, setOtpStatus] = useState('');
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [receivedOtp, setReceivedOtp] = useState(''); // For development/demo
  const [otpTimer, setOtpTimer] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [locationStatus, setLocationStatus] = useState('');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationRisk, setLocationRisk] = useState('Low');
  const [locationRiskSummary, setLocationRiskSummary] = useState('Auto-detected from historical weather patterns');
  const [locationName, setLocationName] = useState('Detecting...');
  const [localKycDuplicate, setLocalKycDuplicate] = useState({ aadhaar: false, pan: false });
  const [localProfileDuplicate, setLocalProfileDuplicate] = useState({ email: false, username: false });
  const [remoteDuplicate, setRemoteDuplicate] = useState({ email: false, username: false, aadhaar: false, pan: false });

  const profileDuplicate = {
    email: localProfileDuplicate.email || remoteDuplicate.email,
    username: localProfileDuplicate.username || remoteDuplicate.username
  };

  const kycDuplicate = {
    aadhaar: localKycDuplicate.aadhaar || remoteDuplicate.aadhaar,
    pan: localKycDuplicate.pan || remoteDuplicate.pan
  };

  const localOtpFallbackEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_LOCAL_OTP_FALLBACK === 'true';
  const localOtpKey = (phone) => `aegis_local_otp_${String(phone || '').replace(/\D/g, '')}`;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    phone: '',
    company: '',
    companyOther: '',
    upi: '',
    city: '',
    plan: '', // No default - user must select
    aadhaar: '',
    pan: '',
    consent: true
  });

  const isStep1Valid = () => {
    const companyValid = formData.company === 'Others' 
      ? formData.companyOther.trim().length > 0 
      : formData.company.trim().length > 0;
    
    return (
      formData.firstName.trim().length > 0 &&
      formData.lastName.trim().length > 0 &&
      /\S+@\S+\.\S+/.test(formData.email) &&
      formData.phone.length === 10 &&
      companyValid &&
      !profileDuplicate.email
    );
  };

  const isStep2Valid = () => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    const baseValid = formData.aadhaar.length === 12 && panRegex.test(formData.pan.toUpperCase());
    return baseValid && otpSent && otpVerified && !kycDuplicate.aadhaar && !kycDuplicate.pan;
  };

  const isStep3Valid = () => {
    const usernameValid = formData.username.trim().length >= 4;
    const passwordValid = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(formData.password);
    const confirmValid = formData.password === formData.confirmPassword;
    return usernameValid && passwordValid && confirmValid && !profileDuplicate.username;
  };

  const isStep4Valid = () => formData.city.trim().length > 0;

  const isStep6Valid = () => {
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    return upiRegex.test(formData.upi.trim());
  };

  const hasAnyDuplicate = () => (
    profileDuplicate.email ||
    profileDuplicate.username ||
    kycDuplicate.aadhaar ||
    kycDuplicate.pan
  );

  const normalizeDuplicatePayload = (payload = {}) => ({
    email: String(payload.email || '').trim(),
    username: String(payload.username || '').trim(),
    aadhaar: String(payload.aadhaar || '').replace(/\D/g, ''),
    pan: String(payload.pan || '').trim().toUpperCase()
  });

  const refreshDuplicateState = async (payload = {}) => {
    const normalizedPayload = normalizeDuplicatePayload(payload);

    try {
      const response = await checkDuplicateFields(normalizedPayload);
      const data = response?.data || {};
      setRemoteDuplicate({
        email: Boolean(data.emailExists),
        username: Boolean(data.usernameExists),
        aadhaar: Boolean(data.aadhaarExists),
        pan: Boolean(data.panExists)
      });
      return data;
    } catch (error) {
      return { error: true };
    }
  };

  const handleDuplicateBlur = async () => {
    await refreshDuplicateState({
      email: formData.email,
      username: formData.username,
      aadhaar: formData.aadhaar,
      pan: formData.pan
    });
  };

  const handleStepAdvance = async (nextAction, payload = {}) => {
    const result = await refreshDuplicateState(payload);
    if (!result || result.error) {
      setOtpStatus('Unable to verify the entered details right now. Please wait and try again.');
      return;
    }

    const emailExists = Boolean(result?.emailExists);
    const usernameExists = Boolean(result?.usernameExists);
    const aadhaarExists = Boolean(result?.aadhaarExists);
    const panExists = Boolean(result?.panExists);

    if (emailExists || usernameExists || aadhaarExists || panExists) {
      if (emailExists) setStep(1);
      else if (aadhaarExists || panExists) setStep(2);
      else if (usernameExists) setStep(3);
      return;
    }

    nextAction();
  };

  const getPlans = (riskLevel) => {
    if (riskLevel === 'High') {
      return [
        { id: 'essential', name: 'Essential', weekly: '80', perRide: '0.60', maxEvent: '350', maxWeekly: '800', payouts: { rain: 200, heat: 150, aqi: 150, flood: 350 } },
        { id: 'standard', name: 'Standard', weekly: '120', perRide: '0.85', maxEvent: '700', maxWeekly: '1400', payouts: { rain: 350, heat: 250, aqi: 250, flood: 700 }, popular: true },
        { id: 'premium', name: 'Premium', weekly: '180', perRide: '1.25', maxEvent: '1200', maxWeekly: '2400', payouts: { rain: 500, heat: 350, aqi: 350, flood: 1200 } }
      ];
    }
    return [
      { id: 'basic', name: 'Basic', weekly: '70', perRide: '0.50', maxEvent: '400', maxWeekly: '800', payouts: { rain: 200, heat: 150, aqi: 150, flood: 400 } },
      { id: 'standard', name: 'Standard', weekly: '100', perRide: '0.70', maxEvent: '600', maxWeekly: '1200', payouts: { rain: 300, heat: 200, aqi: 200, flood: 600 }, popular: true },
      { id: 'premium', name: 'Premium', weekly: '150', perRide: '1.00', maxEvent: '1000', maxWeekly: '2000', payouts: { rain: 400, heat: 300, aqi: 300, flood: 1000 } }
    ];
  };

  useEffect(() => {
    const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
    const normalizeUsername = (value) => String(value || '').trim().toLowerCase();
    const normalizeAadhaar = (value) => String(value || '').replace(/\D/g, '');
    const normalizePan = (value) => String(value || '').trim().toUpperCase();

    let users = [];
    try {
      const raw = localStorage.getItem('aegis_local_users');
      const parsed = raw ? JSON.parse(raw) : [];
      users = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      users = [];
    }

    const email = normalizeEmail(formData.email);
    const username = normalizeUsername(formData.username);
    const aadhaar = normalizeAadhaar(formData.aadhaar);
    const pan = normalizePan(formData.pan);

    const emailExists = email.length > 0 && users.some((u) => normalizeEmail(u?.email) === email);
    const usernameExists = username.length > 0 && users.some((u) => normalizeUsername(u?.username) === username);

    const aadhaarExists = aadhaar.length === 12 && users.some((u) => normalizeAadhaar(u?.aadhaar) === aadhaar);
    const panExists = pan.length === 10 && users.some((u) => normalizePan(u?.pan) === pan);

    setLocalProfileDuplicate({ email: emailExists, username: usernameExists });
    setLocalKycDuplicate({ aadhaar: aadhaarExists, pan: panExists });
  }, [formData.email, formData.username, formData.aadhaar, formData.pan]);

  useEffect(() => {
    let isActive = true;
    const timer = setTimeout(async () => {
      const email = String(formData.email || '').trim();
      const username = String(formData.username || '').trim();
      const aadhaar = String(formData.aadhaar || '').replace(/\D/g, '');
      const pan = String(formData.pan || '').trim().toUpperCase();

      const shouldCheckEmail = /\S+@\S+\.\S+/.test(email);
      const shouldCheckUsername = username.length >= 4;
      const shouldCheckAadhaar = aadhaar.length === 12;
      const shouldCheckPan = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);

      if (!shouldCheckEmail && !shouldCheckUsername && !shouldCheckAadhaar && !shouldCheckPan) {
        if (isActive) {
          setRemoteDuplicate({ email: false, username: false, aadhaar: false, pan: false });
        }
        return;
      }

      try {
        const response = await checkDuplicateFields({
          email: shouldCheckEmail ? email : '',
          username: shouldCheckUsername ? username : '',
          aadhaar: shouldCheckAadhaar ? aadhaar : '',
          pan: shouldCheckPan ? pan : ''
        });

        if (!isActive) return;

        const data = response?.data || {};
        setRemoteDuplicate({
          email: Boolean(data.emailExists),
          username: Boolean(data.usernameExists),
          aadhaar: Boolean(data.aadhaarExists),
          pan: Boolean(data.panExists)
        });
      } catch (error) {
        if (!isActive) return;
        setRemoteDuplicate({ email: false, username: false, aadhaar: false, pan: false });
      }
    }, 350);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [formData.email, formData.username, formData.aadhaar, formData.pan]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let processedValue = value;

    if (name === 'phone') {
      processedValue = value.replace(/\D/g, '').slice(0, 10);
      setOtpSent(false);
      setOtpValue('');
      setOtpStatus('');
      setOtpVerified(false);
      setReceivedOtp('');
      setOtpTimer(0);
    } else if (name === 'aadhaar') {
      processedValue = value.replace(/\D/g, '').slice(0, 12);
      if (processedValue.length !== 12) {
        setOtpSent(false);
        setOtpValue('');
        setOtpStatus('');
        setOtpVerified(false);
        setReceivedOtp('');
        setOtpTimer(0);
      }
    } else if (name === 'pan') {
      processedValue = value.toUpperCase().slice(0, 10);
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : processedValue
    }));
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleSendOtp = async (isResend = false) => {
    if (formData.phone.length !== 10) {
      setOtpStatus('Enter a valid 10-digit phone number in Basic Details first.');
      return;
    }

    if (hasAnyDuplicate()) {
      setOtpStatus('Please fix duplicate Email, Username, Aadhaar, or PAN before sending OTP.');
      return;
    }

    setIsOtpLoading(true);
    setOtpStatus(isResend ? 'Regenerating OTP...' : 'Sending OTP to your phone...');
    
    try {
      const response = await sendOtp(formData.phone);
      if (response?.success) {
        setOtpSent(true);
        setOtpValue('');
        setOtpVerified(false);
        setReceivedOtp(response?.data?.otp || ''); // For dev/demo
        setOtpTimer(60);
        setOtpStatus(
          response?.data?.deliveryMode === 'fallback'
            ? `⚠ Backend SMS unavailable. Demo OTP generated for ${formData.phone}`
            : isResend
              ? `✓ New OTP generated for ${formData.phone}`
              : `✓ OTP sent to ${formData.phone}`
        );
        if (response?.data?.otp) {
          sessionStorage.setItem(localOtpKey(formData.phone), JSON.stringify({
            otp: response.data.otp,
            expiresAt: Date.now() + 10 * 60 * 1000
          }));
        }
      } else {
        setOtpStatus(response?.message || 'Failed to send OTP. Please try again.');
      }
    } catch (error) {
      console.error('Send OTP error:', error);

      if (localOtpFallbackEnabled) {
        const fallbackOtp = String(Math.floor(100000 + Math.random() * 900000));
        sessionStorage.setItem(localOtpKey(formData.phone), JSON.stringify({
          otp: fallbackOtp,
          expiresAt: Date.now() + 10 * 60 * 1000
        }));
        setOtpSent(true);
        setOtpValue('');
        setOtpVerified(false);
        setReceivedOtp(fallbackOtp);
        setOtpTimer(60);
        setOtpStatus(`⚠ Backend unavailable. Demo OTP generated locally for ${formData.phone}`);
        return;
      }

      setOtpStatus(`Error: ${error.message}`);
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) {
      setOtpStatus('OTP must be exactly 6 digits.');
      return;
    }

    setIsOtpLoading(true);
    setOtpStatus('Verifying OTP...');

    try {
      const response = await verifyOtp(formData.phone, otpValue);
      if (response?.success) {
        setOtpVerified(true);
        setOtpTimer(0);
        setOtpStatus('✅ OTP verified successfully!');
      } else {
        if (localOtpFallbackEnabled) {
          const storedOtpRaw = sessionStorage.getItem(localOtpKey(formData.phone));
          if (storedOtpRaw) {
            const storedOtp = JSON.parse(storedOtpRaw);
            if (storedOtp?.otp === otpValue && Date.now() <= Number(storedOtp?.expiresAt || 0)) {
              setOtpVerified(true);
              setOtpTimer(0);
              setOtpStatus('✅ Demo OTP verified successfully!');
              return;
            }
          }
        }

        setOtpStatus(response?.message || 'Invalid OTP. Please try again.');
      }
    } catch (error) {
      console.error('Verify OTP error:', error);

      if (localOtpFallbackEnabled) {
        const storedOtpRaw = sessionStorage.getItem(localOtpKey(formData.phone));
        if (storedOtpRaw) {
          try {
            const storedOtp = JSON.parse(storedOtpRaw);
            if (storedOtp?.otp === otpValue && Date.now() <= Number(storedOtp?.expiresAt || 0)) {
              setOtpVerified(true);
              setOtpTimer(0);
              setOtpStatus('✅ Demo OTP verified successfully!');
              return;
            }
          } catch (parseError) {
            console.warn('Could not parse local OTP fallback', parseError);
          }
        }
      }

      setOtpStatus(`Error: ${error.message}`);
    } finally {
      setIsOtpLoading(false);
    }
  };

  const detectCurrentCity = () => {
    if (!navigator.geolocation) {
      setLocationStatus('❌ Geolocation is not supported by this browser.');
      return;
    }

    setIsDetectingLocation(true);
    setLocationStatus('📍 Detecting your location...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Try Nominatim first (OpenStreetMap)
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
              { timeout: 5000 }
            );
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            const city = 
              data?.address?.city || 
              data?.address?.town || 
              data?.address?.village || 
              data?.address?.state_district || 
              data?.address?.county ||
              data?.address?.state || '';

            if (city) {
              setFormData(prev => ({ ...prev, city }));
              setLocationStatus(`✅ Detected: ${city} (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`);
            }

            try {
              const riskResponse = await getLocationRiskProfile(latitude, longitude);
              const detectedCity = riskResponse?.data?.city || city || 'Current Location';
              const detectedLocationName = riskResponse?.data?.location_name || detectedCity;
              const risk = riskResponse?.data?.classification || 'Low';
              setFormData(prev => ({ ...prev, city: detectedCity }));
              setLocationName(detectedLocationName);
              setLocationRisk(risk);
              setLocationRiskSummary(riskResponse?.data?.label || 'Auto-detected from historical weather patterns');
              setLocationStatus(`✅ Detected: ${detectedLocationName} (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`);
            } catch (riskError) {
              console.warn('Location risk lookup failed:', riskError.message);
              setLocationRisk('Low');
              setLocationRiskSummary('Historical weather lookup unavailable, using default low risk');
              if (!city) {
                setFormData(prev => ({ ...prev, city: 'Current Location' }));
                setLocationName('Current Location');
                setLocationStatus('⚠️ Could not resolve city name. Using current location automatically.');
              }
            }
          } catch (nominatimError) {
            console.warn('Nominatim failed, relying on backend coordinate lookup:', nominatimError.message);
            try {
              const riskResponse = await getLocationRiskProfile(latitude, longitude);
              const detectedCity = riskResponse?.data?.city || 'Current Location';
              const detectedLocationName = riskResponse?.data?.location_name || detectedCity;
              const risk = riskResponse?.data?.classification || 'Low';
              setFormData(prev => ({ ...prev, city: detectedCity }));
              setLocationName(detectedLocationName);
              setLocationRisk(risk);
              setLocationRiskSummary(riskResponse?.data?.label || 'Auto-detected from historical weather patterns');
              setLocationStatus(`✅ Detected: ${detectedLocationName} (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`);
            } catch (riskError) {
              console.warn('Location risk lookup failed:', riskError.message);
              setFormData(prev => ({ ...prev, city: 'Current Location' }));
              setLocationName('Current Location');
              setLocationRisk('Low');
              setLocationRiskSummary('Historical weather lookup unavailable, using default low risk');
              setLocationStatus('⚠️ Could not resolve city. Using current location automatically.');
            }
          }
        } catch (error) {
          console.error('Location detection error:', error);
          setLocationStatus('❌ Error detecting location. Please enable location access or retry.');
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (error) => {
        console.warn('Geolocation error:', error);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus('📍 Permission denied. Please enable location and try again.');
        } else if (error.code === error.TIMEOUT) {
          setLocationStatus('⏱️ Location detection timed out. Please try again or allow location access.');
        } else {
          setLocationStatus('❌ Could not detect location. Please enable location access or retry.');
        }
        setIsDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (step === 4 && !formData.city && !isDetectingLocation) {
      detectCurrentCity();
    }
  }, [step]);

  useEffect(() => {
    if (!otpSent || otpVerified || otpTimer <= 0) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setOtpTimer((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [otpSent, otpVerified, otpTimer]);

  useEffect(() => {
    if (otpSent && !otpVerified && otpTimer === 0) {
      handleSendOtp(true);
    }
  }, [otpSent, otpVerified, otpTimer]);

  const renderStepper = () => {
    const steps = ['Profile', 'eKYC', 'Account', 'Location', 'Plan', 'Payment', 'Review'];
    return (
      <div className="flex items-center justify-center mb-12 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max px-2">
          {steps.map((label, index) => {
            const stepNumber = index + 1;
            return (
              <div key={label} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-2">
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
                    step === stepNumber
                      ? "bg-orange-500 text-white"
                      : step > stepNumber
                        ? "bg-green-500 text-white"
                        : "bg-slate-50 text-slate-300 border border-slate-100"
                  )}>
                    {step > stepNumber ? <Check size={14} /> : stepNumber}
                  </div>
                  <span className={cn("text-[7px] font-black uppercase tracking-widest", step >= stepNumber ? "text-slate-900" : "text-slate-300")}>{label}</span>
                </div>
                {stepNumber < steps.length && (
                  <div className={cn("w-4 h-[2px] -mt-5 transition-all", step > stepNumber ? "bg-green-500" : "bg-slate-100")} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const applyDuplicateError = (message) => {
    const normalizedMessage = String(message || '').toLowerCase();

    if (normalizedMessage.includes('email already exists')) {
      setRemoteDuplicate((prev) => ({ ...prev, email: true }));
      setStep(1);
      return true;
    }

    if (normalizedMessage.includes('aadhaar already exists')) {
      setRemoteDuplicate((prev) => ({ ...prev, aadhaar: true }));
      setStep(2);
      return true;
    }

    if (normalizedMessage.includes('pan already exists')) {
      setRemoteDuplicate((prev) => ({ ...prev, pan: true }));
      setStep(2);
      return true;
    }

    if (normalizedMessage.includes('username already exists')) {
      setRemoteDuplicate((prev) => ({ ...prev, username: true }));
      setStep(3);
      return true;
    }

    return false;
  };

  const handleCompleteOnboarding = async () => {
    setSubmitError('');
    setIsSubmitting(true);
    try {
      await onComplete({
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
        password: formData.password,
        email: formData.email,
        phone: formData.phone,
        company: formData.company === 'Others' ? formData.companyOther : formData.company,
        aadhaar: formData.aadhaar,
        pan: formData.pan,
        plan: formData.plan,
        risk: locationRisk,
        city: formData.city,
        upi: formData.upi
      });
    } catch (error) {
      const message = error.message || 'Registration failed. Please try again.';
      const handled = applyDuplicateError(message);
      setSubmitError(handled ? '' : message);
      if (handled) {
        window.scrollTo(0, 0);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 8) {
    return (
      <div className="min-h-screen bg-slate-50 pt-32 pb-20 px-6 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 p-12 max-w-xl w-full text-center"
        >
          <div className="relative inline-block mb-8">
            <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white">
                <Check size={32} strokeWidth={3} />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#8B5CF6] border-4 border-white flex items-center justify-center text-white">
              <Check size={14} strokeWidth={3} />
            </div>
          </div>

          <h2 className="text-4xl font-black text-slate-900 mb-4">You&apos;re Now Covered!</h2>
          <p className="text-slate-500 mb-10 leading-relaxed">
            Welcome to AEGIS AI, {formData.firstName}! <br />
            Your safety net is active. You&apos;re covered for all your gig work rides with AI-powered instant claim processing.
          </p>

          <div className="grid grid-cols-3 gap-4 mb-10">
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
              <Shield className="text-blue-500 mx-auto mb-2" size={24} />
              <h4 className="text-[10px] font-bold text-blue-900 uppercase mb-1">Instant Claims</h4>
              <p className="text-[8px] text-blue-700">AI processes your claims in under 60 seconds</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
              <RefreshCw className="text-orange-500 mx-auto mb-2" size={24} />
              <h4 className="text-[10px] font-bold text-orange-900 uppercase mb-1">Pay Per Ride</h4>
              <p className="text-[8px] text-orange-700">Only pay micro-premiums when you&apos;re actively working</p>
            </div>
            <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
              <Check className="text-green-500 mx-auto mb-2" size={24} />
              <h4 className="text-[10px] font-bold text-green-900 uppercase mb-1">Zero Paperwork</h4>
              <p className="text-[8px] text-green-700">Fully digital — file claims via app in seconds</p>
            </div>
          </div>

          <div className="bg-orange-500 rounded-3xl p-8 mb-10 text-white text-left relative overflow-hidden">
            <p className="text-sm font-bold uppercase tracking-widest mb-2 opacity-80">Your Plan</p>
            <h3 className="text-3xl font-black mb-1">{getPlans(locationRisk).find(p => p.id === formData.plan)?.name} Plan</h3>
            <p className="text-sm font-medium opacity-90 mb-6">₹{getPlans(locationRisk).find(p => p.id === formData.plan)?.weekly} per week + ₹{getPlans(locationRisk).find(p => p.id === formData.plan)?.perRide} per ride</p>
            
            <div className="space-y-3">
              <p className="text-sm font-bold flex items-center gap-2">What&apos;s Next? <ArrowRight size={16} /></p>
              <ol className="text-xs space-y-2 opacity-90 list-decimal ml-4">
                <li>Access your dashboard to manage coverage</li>
                <li>Start your next ride with full protection!</li>
              </ol>
            </div>
          </div>

              <button 
                onClick={handleCompleteOnboarding}
                disabled={isSubmitting}
            className="w-full bg-orange-500 text-white py-5 rounded-2xl font-bold text-lg hover:bg-orange-600 transition-all active:scale-95 shadow-xl shadow-orange-200 flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'Creating your account...' : 'Go To Your Account'}
          </button>
          {submitError && <p className="mt-3 text-sm font-semibold text-red-600">{submitError}</p>}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-[1fr_1.2fr] gap-12 items-start">
        {/* Left Column */}
        <div className="space-y-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-900 rounded-[40px] p-10 text-white relative overflow-hidden shadow-2xl"
          >
            <div className="relative z-10">
              <div className="bg-orange-500/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 border border-orange-500/30">
                <Shield className="text-orange-500" size={32} />
              </div>
              <h2 className="text-4xl font-black mb-6">Join the Safety Net.</h2>
              <p className="text-slate-400 text-lg mb-10 leading-relaxed">
                Complete your profile to activate parametric insurance. No medical tests, no paperwork.
              </p>

              <div className="space-y-6">
                {[
                  "Micro-premiums deducted automatically per ride",
                  "Instant UPI payouts when weather disrupts your work",
                  "eKYC verified — blockchain-anchored identity",
                  "AI-driven triggers — zero human bias in claims"
                ].map((benefit, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                      <Check size={14} className="text-white" />
                    </div>
                    <span className="font-medium text-slate-200">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[100px]" />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#F5F3FF] rounded-[32px] p-8 border border-[#E9E4FF]"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-[#8B5CF6] p-3 rounded-2xl text-white">
                <Fingerprint size={24} />
              </div>
              <h3 className="text-xl font-bold text-[#4C1D95]">About eKYC Verification</h3>
            </div>
            <p className="text-[#6D28D9] mb-8 leading-relaxed text-sm">
              AegisAI uses Aadhaar-based eKYC to verify your identity before activating coverage. Your data is encrypted and anchored on a blockchain ledger — only you control access.
            </p>
            <div className="space-y-4">
              {[
                "Aadhaar OTP-based identity verification",
                "PAN card cross-verification",
                "Mobile OTP confirms account ownership",
                "Blockchain hash stored for audit trail"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-[#7C3AED]">
                  <ArrowRight size={16} />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Column - Form */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[40px] shadow-xl shadow-slate-200/50 border border-slate-100 p-8 md:p-12"
        >
          {renderStepper()}

          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-left mb-10">
                <h3 className="text-3xl font-black text-slate-900 mb-2">Basic Details</h3>
                <p className="text-slate-500 text-sm">Let&apos;s start with some basic information about you</p>
              </div>

              <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); if (isStep1Valid()) handleStepAdvance(nextStep, { email: formData.email, username: formData.username, aadhaar: formData.aadhaar, pan: formData.pan }); }}>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">First Name <span className="text-orange-500">*</span></label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="Enter your first name"
                        className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                      />
                    </div>
                    {!formData.firstName && <p className="text-[10px] text-red-500 font-bold ml-1">This field is required</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Last Name <span className="text-orange-500">*</span></label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Enter your last name"
                        className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Email <span className="text-orange-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="email" 
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      onBlur={handleDuplicateBlur}
                      placeholder="Enter your email address"
                      className={cn(
                        "w-full bg-white border rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:ring-2 transition-all",
                        profileDuplicate.email
                          ? "border-red-400 ring-2 ring-red-200"
                          : "border-slate-200 focus:ring-orange-500/20 focus:border-orange-500"
                      )}
                    />
                  </div>
                  {profileDuplicate.email && (
                    <p className="text-[10px] text-red-500 font-bold ml-1">Email already exists</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Phone Number <span className="text-orange-500">*</span></label>
                  <div className="relative">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="tel" 
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Enter 10-digit phone number"
                      maxLength={10}
                      className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Company Name <span className="text-orange-500">*</span></label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select 
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all appearance-none"
                    >
                      <option value="">Select your company</option>
                      <option value="Zomato">Zomato</option>
                      <option value="Swiggy">Swiggy</option>
                      <option value="Zepto">Zepto</option>
                      <option value="Blinkit">Blinkit</option>
                      <option value="Uber Eats">Uber Eats</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                  {formData.company === 'Others' && (
                    <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        placeholder="Enter your company name"
                        value={formData.companyOther || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, companyOther: e.target.value }))}
                        className="w-full bg-white border border-orange-200 rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                      />
                    </div>
                  )}
                </div>

                <button 
                  type="submit"
                  disabled={!isStep1Valid()}
                  className="w-full bg-orange-500 text-white py-5 rounded-2xl font-bold text-lg hover:bg-orange-600 transition-all active:scale-95 shadow-xl shadow-orange-200 flex items-center justify-center gap-2 mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to eKYC <ArrowRight size={20} />
                </button>
              </form>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-left mb-10">
                <h3 className="text-3xl font-black text-slate-900 mb-2">eKYC Verification</h3>
                <p className="text-slate-500 text-sm">Secure verification to protect your identity</p>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-8 flex items-start gap-4">
                <Shield size={24} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-blue-900 mb-1">Your data is secure</h4>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Your data is encrypted and used only for verification. We comply with all privacy regulations.
                  </p>
                </div>
              </div>

              <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); if (isStep2Valid()) handleStepAdvance(nextStep, { email: formData.email, username: formData.username, aadhaar: formData.aadhaar, pan: formData.pan }); else setOtpStatus('Please send and verify the OTP before continuing.'); }}>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Aadhaar Number <span className="text-orange-500">*</span></label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text"
                      name="aadhaar"
                      value={formData.aadhaar}
                      onChange={handleInputChange}
                      onBlur={handleDuplicateBlur}
                      placeholder="Enter 12-digit Aadhaar number"
                      maxLength={12}
                      className={cn(
                        "w-full bg-white border rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:ring-2 transition-all",
                        kycDuplicate.aadhaar
                          ? "border-red-400 ring-2 ring-red-200"
                          :
                        formData.aadhaar.length === 12 
                          ? "border-orange-500 ring-2 ring-orange-500/20" 
                          : "border-slate-200 focus:ring-orange-500/20 focus:border-orange-500"
                      )}
                    />
                  </div>
                  {kycDuplicate.aadhaar && (
                    <p className="text-[10px] text-red-500 font-bold ml-1">Aadhaar already exists</p>
                  )}
                  {formData.aadhaar.length === 12 ? (
                    <div className="space-y-2 ml-1 animate-in fade-in slide-in-from-top-1 duration-300">
                      <div className="flex items-center gap-1.5 text-green-600 text-[10px] font-bold">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Valid format
                      </div>
                      <p className="text-[10px] text-slate-400">(OTP will be sent to your registered phone number)</p>
                      <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold">
                        <Smartphone size={12} />
                        Registered number: {formData.phone}
                      </div>
                      <button 
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isOtpLoading || otpSent || hasAnyDuplicate()}
                        className="bg-blue-600 text-white text-[10px] font-bold px-6 py-2.5 rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isOtpLoading ? 'Sending...' : otpSent ? 'OTP Sent' : 'Send OTP'}
                      </button>
                      {otpStatus && <p className="text-[10px] text-blue-700 font-medium">{otpStatus}</p>}

                      {otpSent && (
                        <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-top-2 duration-500">
                          <div className={`flex items-center gap-1.5 text-[11px] font-medium ${otpVerified ? 'text-green-600' : 'text-blue-600'}`}>
                            <Check size={12} strokeWidth={3} />
                            {otpVerified ? '✓ OTP Verified' : `OTP sent to ${formData.phone}`}
                          </div>

                          {receivedOtp && !otpVerified && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                              <p className="text-[9px] text-amber-600 font-semibold uppercase">Demo/Dev Mode - OTP Code:</p>
                              <p className="text-lg font-black text-amber-700 mt-1 letterspace">{receivedOtp}</p>
                              <p className="text-[9px] text-amber-600 mt-1">Copy &amp; paste this code below or use for real SMS testing</p>
                            </div>
                          )}

                          {!otpVerified && (
                            <div className="relative space-y-2">
                              <input 
                                type="text"
                                value={otpValue}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                  setOtpValue(val);
                                }}
                                placeholder="Enter 6-digit OTP"
                                maxLength={6}
                                disabled={isOtpLoading}
                                className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 transition-all disabled:opacity-50"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={handleVerifyOtp}
                                  disabled={isOtpLoading || otpValue.length !== 6}
                                  className="w-full bg-green-600 text-white text-[11px] font-bold py-2.5 px-4 rounded-lg hover:bg-green-700 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {isOtpLoading ? 'Verifying...' : 'Verify OTP'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSendOtp(true)}
                                  disabled={isOtpLoading}
                                  className="w-full bg-blue-600 text-white text-[11px] font-bold py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {isOtpLoading ? 'Sending...' : 'Resend OTP'}
                                </button>
                              </div>
                              <p className="text-[10px] text-slate-500">
                                Auto regenerate in {Math.floor(otpTimer / 60)}:{String(otpTimer % 60).padStart(2, '0')}
                              </p>
                              {isOtpLoading && <p className="text-[10px] text-blue-600">Verifying...</p>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 ml-1">(OTP will be sent to your registered phone number)</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">PAN Number <span className="text-orange-500">*</span></label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      name="pan"
                      value={formData.pan}
                      onChange={handleInputChange}
                      onBlur={handleDuplicateBlur}
                      placeholder="ABCDE1234F"
                      maxLength={10}
                      className={cn(
                        "w-full bg-white border rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all uppercase",
                        kycDuplicate.pan ? "border-red-400 ring-2 ring-red-200" : "border-slate-200"
                      )}
                    />
                  </div>
                  {kycDuplicate.pan && (
                    <p className="text-[10px] text-red-500 font-bold ml-1">PAN already exists</p>
                  )}
                  <p className="text-[10px] text-slate-400 ml-1">Format: 5 letters, 4 numbers, 1 letter (e.g., ABCDE1234F)</p>
                </div>

                <button 
                  type="submit"
                  disabled={!isStep2Valid()}
                  className="w-full bg-orange-500 text-white py-5 rounded-2xl font-bold text-lg hover:bg-orange-600 transition-all active:scale-95 shadow-xl shadow-orange-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Verify & Continue
                </button>

                <button 
                  type="button"
                  onClick={prevStep}
                  className="w-full text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
                >
                  Back
                </button>
              </form>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-left mb-10">
                <h3 className="text-3xl font-black text-slate-900 mb-2">Create Password For Your Account</h3>
                <p className="text-slate-500 text-sm">Set your username and password for future sign in</p>
              </div>

              <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); if (isStep3Valid()) handleStepAdvance(nextStep, { email: formData.email, username: formData.username, aadhaar: formData.aadhaar, pan: formData.pan }); }}>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Username <span className="text-orange-500">*</span></label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    onBlur={handleDuplicateBlur}
                    placeholder="Choose a username"
                    className={cn(
                      "w-full bg-white border rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 transition-all",
                      profileDuplicate.username
                        ? "border-red-400 ring-2 ring-red-200"
                        : "border-slate-200 focus:ring-orange-500/20 focus:border-orange-500"
                    )}
                  />
                  {profileDuplicate.username && (
                    <p className="text-[10px] text-red-500 font-bold ml-1">Username already exists</p>
                  )}
                  {formData.username && formData.username.trim().length < 4 && (
                    <p className="text-[10px] text-red-500 font-bold ml-1">Username must be at least 4 characters</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Password <span className="text-orange-500">*</span></label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Create a password"
                    className="w-full bg-white border border-slate-200 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  />
                  <p className="text-[10px] text-slate-500 ml-1">
                    Strong passwords should be at least 8 characters long, combining uppercase/lowercase letters, numbers, and symbols
                  </p>
                  {formData.password && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(formData.password) && (
                    <p className="text-[10px] text-red-500 font-bold ml-1">Please enter a strong password matching the above rules</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Confirm Password <span className="text-orange-500">*</span></label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Re-enter your password"
                    className="w-full bg-white border border-slate-200 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  />
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-[10px] text-red-500 font-bold ml-1">Passwords do not match</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="w-full bg-white border border-slate-200 text-slate-600 py-5 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all active:scale-95"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={!isStep3Valid()}
                    className="w-full bg-orange-500 text-white py-5 rounded-2xl font-bold text-lg hover:bg-orange-600 transition-all active:scale-95 shadow-xl shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue to Location
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-left mb-10">
                <h3 className="text-3xl font-black text-slate-900 mb-2">Location & Risk Classification</h3>
                <p className="text-slate-500 text-sm">Your location is detected automatically and risk is derived from historical weather patterns</p>
              </div>

              <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); if(isStep4Valid()) nextStep(); }}>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-white p-3 border border-slate-200">
                      <MapPin size={18} className="text-slate-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">Automatic location detection</p>
                      <p className="text-xs text-slate-500 mt-1">We detect your current location automatically. If it is incorrect, you can retry detection.</p>
                      <p className="text-[11px] text-slate-700 mt-2 font-semibold">Location name: {locationName || formData.city || 'Detecting...'}</p>
                      {formData.city && <p className="text-[11px] text-slate-700 mt-1 font-semibold">Region: {locationRisk} Risk Zone</p>}
                      {locationStatus && <p className="text-[11px] text-slate-600 mt-3">{locationStatus}</p>}
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={detectCurrentCity}
                          disabled={isDetectingLocation}
                          className="rounded-xl bg-slate-900 text-white px-4 py-2.5 text-xs font-bold hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isDetectingLocation ? 'Detecting...' : 'Retry Detect'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {formData.city && (
                  <div className={cn(
                    "rounded-2xl p-4 border animate-in fade-in slide-in-from-top-2 duration-300",
                    locationRisk === 'Low' 
                      ? "bg-green-50 border-green-100 text-green-800" 
                      : "bg-orange-50 border-orange-100 text-orange-800"
                  )}>
                    <div className="flex items-center gap-3 mb-1">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center",
                        locationRisk === 'Low' ? "bg-green-500 text-white" : "bg-orange-500 text-white"
                      )}>
                        <Check size={14} strokeWidth={3} />
                      </div>
                      <h4 className="font-bold">{locationRisk} Risk Zone ✅</h4>
                    </div>
                    <p className="text-xs opacity-90 ml-9">
                      {locationRisk === 'Low' 
                        ? "Great news! This area is classified as lower risk based on historical rainfall and temperature trends."
                        : "This area is classified as higher risk based on historical weather trends, so plan pricing is adjusted accordingly."}
                    </p>
                    <p className="text-[10px] opacity-70 ml-9 mt-2">{locationRiskSummary}</p>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-8">
                  <h4 className="font-bold text-blue-900 mb-3">How we calculate risk</h4>
                  <ul className="space-y-2">
                    {[
                      "Past temperature from historical weather data",
                      "Past rainfall from historical weather data",
                      "Claim fraud signals such as frequency and mismatch checks"
                    ].map((point, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-blue-700">
                        <div className="w-1 h-1 rounded-full bg-blue-500" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button"
                    onClick={prevStep}
                    className="w-full bg-white border border-slate-200 text-slate-600 py-5 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all active:scale-95"
                  >
                    Back
                  </button>
                  <button 
                    type="submit"
                    disabled={!isStep4Valid()}
                    className="w-full bg-orange-500 text-white py-5 rounded-2xl font-bold text-lg hover:bg-orange-600 transition-all active:scale-95 shadow-xl shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Select Plan
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 5 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-left mb-6">
                <h3 className="text-3xl font-black text-slate-900 mb-2">Select Insurance Plan</h3>
                <p className="text-slate-500 text-sm">Choose the plan that best fits your needs</p>
                <p className="text-slate-400 text-[10px] mt-1">Per ride: ₹0.50 – ₹1.25 depending on risk zone</p>
              </div>

              <div className="bg-green-50 border border-green-100 rounded-2xl p-4 mb-8 text-green-800 font-bold text-sm">
                {formData.city} - {locationRisk} Risk Zone
              </div>

              {!formData.plan && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-amber-800 text-sm">
                  ⚠️ Please select a plan to continue
                </div>
              )}

              <div className="overflow-x-auto mb-8">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-100">
                      <th className="pb-4 font-bold">Plan</th>
                      <th className="pb-4 font-bold text-center">Weekly Premium</th>
                      <th className="pb-4 font-bold text-center">Per-ride Deduction</th>
                      <th className="pb-4 font-bold text-center">Max Coverage/Event</th>
                      <th className="pb-4 font-bold text-center">Max Weekly Payout</th>
                      <th className="pb-4 font-bold text-right">Select</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {getPlans(locationRisk).map((plan) => (
                      <tr 
                        key={plan.id}
                        onClick={() => setFormData(prev => ({ ...prev, plan: plan.id }))}
                        className={cn(
                          "border-b border-slate-50 cursor-pointer transition-colors group",
                          formData.plan === plan.id ? "bg-blue-50/50" : "hover:bg-slate-50"
                        )}
                      >
                        <td className="py-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            {plan.name}
                            {plan.popular && (
                              <span className="bg-blue-100 text-blue-600 text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">Popular</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 text-center font-bold text-slate-700">₹{plan.weekly}</td>
                        <td className="py-4 text-center font-black text-orange-500">₹{plan.perRide}</td>
                        <td className="py-4 text-center font-bold text-slate-700">₹{plan.maxEvent}</td>
                        <td className="py-4 text-center font-bold text-slate-700">₹{plan.maxWeekly}</td>
                        <td className="py-4 text-right">
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mx-auto",
                            formData.plan === plan.id ? "border-blue-500 bg-blue-500" : "border-slate-200 group-hover:border-slate-300"
                          )}>
                            {formData.plan === plan.id && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-8">
                <p className="text-[10px] text-blue-700 leading-relaxed">
                  <span className="font-bold">Note:</span> Weekly premium is auto-deducted. Per-ride deduction applies only on active work days.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  type="button"
                  onClick={prevStep}
                  className="w-full bg-white border border-slate-200 text-slate-600 py-5 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all active:scale-95"
                >
                  Back
                </button>
                <button 
                  type="button"
                  onClick={nextStep}
                  disabled={!formData.plan}
                  className="w-full bg-orange-500 text-white py-5 rounded-2xl font-bold text-lg hover:bg-orange-600 transition-all active:scale-95 shadow-xl shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Set Payment
                </button>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-left mb-10">
                <h3 className="text-3xl font-black text-slate-900 mb-2">Payment Setup</h3>
                <p className="text-slate-500 text-sm">Add your UPI ID for instant claim payouts</p>
              </div>

              <div className="bg-green-50 border border-green-100 rounded-2xl p-6 mb-8 flex items-start gap-4">
                <div className="bg-green-500 p-2 rounded-lg text-white">
                  <RefreshCw size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-green-900 mb-1 flex items-center gap-2">
                    Lightning-fast payouts
                  </h4>
                  <p className="text-xs text-green-700 leading-relaxed">
                    Claims are processed instantly and money is transferred directly to your UPI ID within seconds.
                  </p>
                </div>
              </div>

              <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); if(isStep6Valid()) nextStep(); }}>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">UPI ID <span className="text-orange-500">*</span></label>
                  <div className="relative">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      name="upi"
                      value={formData.upi}
                      onChange={handleInputChange}
                      placeholder="yourname@paytm"
                      className={cn(
                        "w-full bg-white border rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:ring-2 transition-all",
                        formData.upi.includes('@') ? "border-orange-500 ring-2 ring-orange-500/20" : "border-slate-200 focus:ring-orange-500/20 focus:border-orange-500"
                      )}
                    />
                  </div>
                  {formData.upi && !isStep6Valid() && (
                    <p className="text-[10px] text-red-500 font-bold ml-1">Invalid UPI ID format</p>
                  )}
                  <p className="text-[10px] text-slate-400 ml-1">For instant claim payouts</p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 mb-8">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Popular UPI Apps</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { name: 'PhonePe', handle: '@ybl' },
                      { name: 'Google Pay', handle: '@okaxis' },
                      { name: 'Paytm', handle: '@paytm' }
                    ].map((app) => (
                      <button
                        key={app.name}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, upi: `${formData.firstName.toLowerCase()}${app.handle}` }))}
                        className="bg-white border border-slate-100 p-3 rounded-xl hover:border-orange-200 hover:bg-orange-50 transition-all text-center group"
                      >
                        <p className="text-[10px] font-bold text-slate-700 group-hover:text-orange-600">{app.name}</p>
                        <p className="text-[8px] text-slate-400">{app.handle}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button"
                    onClick={prevStep}
                    className="w-full bg-white border border-slate-200 text-slate-600 py-5 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all active:scale-95"
                  >
                    Back
                  </button>
                  <button 
                    type="submit"
                    disabled={!isStep6Valid()}
                    className="w-full bg-orange-500 text-white py-5 rounded-2xl font-bold text-lg hover:bg-orange-600 transition-all active:scale-95 shadow-xl shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Review Details
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 7 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-left mb-10">
                <h3 className="text-3xl font-black text-slate-900 mb-2">Review Your Details</h3>
                <p className="text-slate-500 text-sm">Please verify your information before submitting</p>
              </div>

              <div className="space-y-6 mb-10">
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                  <div className="flex items-center gap-3 mb-4">
                    <User className="text-orange-500" size={18} />
                    <h4 className="font-bold text-slate-900">Personal Information</h4>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Name</span>
                      <span className="font-bold text-slate-900">{formData.firstName} {formData.lastName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Email</span>
                      <span className="font-bold text-slate-900">{formData.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Phone</span>
                      <span className="font-bold text-slate-900 flex items-center gap-1"><Smartphone size={14} /> {formData.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Company</span>
                      <span className="font-bold text-slate-900 flex items-center gap-1"><CreditCard size={14} /> {formData.company === 'Others' ? formData.companyOther : formData.company}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">UPI ID</span>
                      <span className="font-bold text-slate-900">{formData.upi}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100">
                  <div className="flex items-center gap-3 mb-4">
                    <CreditCard className="text-blue-500" size={18} />
                    <h4 className="font-bold text-blue-900">KYC Information</h4>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-600/70">Aadhaar</span>
                      <span className="font-bold text-blue-900">XXXX XXXX {formData.aadhaar.slice(-4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-600/70">PAN</span>
                      <span className="font-bold text-blue-900 flex items-center gap-1"><CreditCard size={14} /> {formData.pan}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50/50 rounded-2xl p-6 border border-green-100">
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="text-green-500" size={18} />
                    <h4 className="font-bold text-green-900">Location & Risk Assessment</h4>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-600/70">City</span>
                      <span className="font-bold text-green-900">{formData.city}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600/70">Risk Level</span>
                      <span className={cn(
                        "font-bold flex items-center gap-1",
                        locationRisk === 'Low' ? "text-green-500" : "text-orange-500"
                      )}>
                        <Check size={14} /> {locationRisk} Risk
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-orange-500 rounded-3xl p-8 mb-10 text-white flex justify-between items-center relative overflow-hidden">
                <div>
                  <p className="text-sm font-bold flex items-center gap-2 mb-1"><RefreshCw size={16} /> Your Premium</p>
                  <p className="text-xs opacity-90">Plus ₹{getPlans(locationRisk).find(p => p.id === formData.plan)?.perRide} per ride — Pay as you work!</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black">₹{getPlans(locationRisk).find(p => p.id === formData.plan)?.weekly}</p>
                  <p className="text-[10px] uppercase font-bold opacity-80">per week</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  type="button"
                  onClick={prevStep}
                  className="w-full bg-white border border-slate-200 text-slate-600 py-5 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all active:scale-95"
                >
                  Back
                </button>
                <button 
                  type="button"
                  onClick={handleCompleteOnboarding}
                  disabled={isSubmitting}
                  className="w-full bg-orange-500 text-white py-5 rounded-2xl font-bold text-lg hover:bg-orange-600 transition-all active:scale-95 shadow-xl shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creating your account...' : 'Confirm & Create Account'}
                </button>
              </div>
              {submitError && <p className="mt-3 text-sm font-semibold text-red-600">{submitError}</p>}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
