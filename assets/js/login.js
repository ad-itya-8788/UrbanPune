document.addEventListener('DOMContentLoaded', function () 
{
  // API URL - Change this to your actual backend URL
  const API_URL = '/api'; // FIXED: Changed to relative URL for better compatibility

  // DOM Elements
  const loginTab = document.getElementById('login-tab');
  const registerTab = document.getElementById('register-tab');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const otpVerification = document.getElementById('otp-verification');
  const showLogin = document.getElementById('show-login');
  const showRegister = document.getElementById('show-register');
  const backToForms = document.getElementById('back-to-forms');
  const otpMobileNumber = document.getElementById('otp-mobile-number');
  const verificationMobile = document.getElementById('verification-mobile');
  const verificationType = document.getElementById('verification-type');
  const verificationFirstName = document.getElementById('verification-firstName');
  const verificationLastName = document.getElementById('verification-lastName');
  const resendOtpBtn = document.getElementById('resend-otp-btn');
  const countdownElement = document.getElementById('countdown');
  const fullOtpInput = document.getElementById('full-otp');
  const loginSpinner = document.getElementById('loginSpinner');
  const registerSpinner = document.getElementById('registerSpinner');
  const verifySpinner = document.getElementById('verifySpinner');

  // Tab switching functions
  function switchToLogin() {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    otpVerification.classList.add('d-none');
    document.getElementById('loginInitForm').reset();
    document.getElementById('registerInitForm').reset();
    resetOtpInputs();
  }

  function switchToRegister() {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.style.display = 'block';
    loginForm.style.display = 'none';
    otpVerification.classList.add('d-none');
    document.getElementById('loginInitForm').reset();
    document.getElementById('registerInitForm').reset();
    resetOtpInputs();
  }

  // Event listeners for tab switching
  loginTab.addEventListener('click', switchToLogin);
  registerTab.addEventListener('click', switchToRegister);
  showLogin.addEventListener('click', function (e) {
    e.preventDefault();
    switchToLogin();
  });
  showRegister.addEventListener('click', function (e) {
    e.preventDefault();
    switchToRegister();
  });
  backToForms.addEventListener('click', function (e) {
    e.preventDefault();
    if (verificationType.value === 'login') {
      switchToLogin();
    } else {
      switchToRegister();
    }
  });

  // OTP Input Handling
  const otpInputs = document.querySelectorAll('.otp-input');

  otpInputs.forEach((input, index) => {
    // Handle input
    input.addEventListener('input', function (e) {
      // Allow only numbers
      this.value = this.value.replace(/[^0-9]/g, '');

      if (this.value.length === 1) {
        if (index < otpInputs.length - 1) {
          otpInputs[index + 1].focus();
        }
      }
      updateFullOtp();
    });

    // Handle paste event for OTP
    input.addEventListener('paste', function (e) {
      e.preventDefault();
      const pastedData = (e.clipboardData || window.clipboardData).getData('text');
      const numericData = pastedData.replace(/[^0-9]/g, '').substring(0, 6);

      if (numericData.length > 0) {
        // Fill all inputs with pasted data
        for (let i = 0; i < otpInputs.length; i++) {
          if (i < numericData.length) {
            otpInputs[i].value = numericData[i];
          }
        }

        // Focus on the appropriate input
        if (numericData.length < otpInputs.length) {
          otpInputs[numericData.length].focus();
        } else {
          otpInputs[otpInputs.length - 1].focus();
        }

        updateFullOtp();
      }
    });

    // Handle backspace
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && this.value.length === 0) {
        if (index > 0) {
          otpInputs[index - 1].focus();
        }
      }
    });
  });

  function updateFullOtp() {
    let otp = '';
    otpInputs.forEach(input => {
      otp += input.value;
    });
    fullOtpInput.value = otp;
  }

  function resetOtpInputs() {
    otpInputs.forEach(input => {
      input.value = '';
    });
    fullOtpInput.value = '';
  }

  // Initialize OTP verification
  function initOtpVerification(mobile, type, firstName = '', lastName = '') {
    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    otpVerification.classList.remove('d-none');

    otpMobileNumber.textContent = mobile;
    verificationMobile.value = mobile;
    verificationType.value = type;

    // Store registration data if available
    if (type === 'register') {
      verificationFirstName.value = firstName;
      verificationLastName.value = lastName;
    }

    // Focus on first OTP input
    otpInputs[0].focus();

    startCountdown();
  }

  // Countdown timer for resend OTP
  let countdownInterval;
  function startCountdown() {
    clearInterval(countdownInterval);

    let timeLeft = 60;
    resendOtpBtn.style.pointerEvents = 'none';
    resendOtpBtn.style.opacity = '0.5';
    countdownElement.textContent = `(${timeLeft}s)`;

    countdownInterval = setInterval(() => {
      timeLeft--;
      countdownElement.textContent = `(${timeLeft}s)`;

      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
        resendOtpBtn.style.pointerEvents = 'auto';
        resendOtpBtn.style.opacity = '1';
        countdownElement.textContent = '';
      }
    }, 1000);
  }

  // Helper function to clean mobile number
  function cleanMobileNumber(mobile) {
    if (!mobile) return '';
    return String(mobile).replace(/\D/g, '').substring(0, 10);
  }

  // Handle resend OTP
  resendOtpBtn.addEventListener('click', async function (e) {
    e.preventDefault();
    if (this.style.pointerEvents === 'none') return;

    const mobile = verificationMobile.value;
    const type = verificationType.value;
    const firstName = verificationFirstName.value;
    const lastName = verificationLastName.value;
    const cleanedMobile = cleanMobileNumber(mobile);

    // Show loading state
    this.style.pointerEvents = 'none';
    this.style.opacity = '0.5';

    try {
      // FIXED: Proper request body structure
      const requestBody = {
        mobile: cleanedMobile,
        type: type
      };

      // Add firstName and lastName for registration
      if (type === 'register') {
        requestBody.firstName = firstName;
        requestBody.lastName = lastName;
      }

      const response = await fetch(`${API_URL}/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        credentials: 'include' // FIXED: Include credentials for session cookies
      });

      const data = await response.json();

      if (data.success) {
        // Show success notification
        Swal.fire({
          title: 'OTP Resent!',
          text: `A new verification code has been sent to ${mobile}`,
          icon: 'success',
          confirmButtonColor: '#4a6bff',
          timer: 3000,
          timerProgressBar: true
        });

        startCountdown();
        resetOtpInputs();
        otpInputs[0].focus();
      } else {
        // Show error notification
        Swal.fire({
          title: 'Error',
          text: data.message || 'Failed to resend OTP',
          icon: 'error',
          confirmButtonColor: '#4a6bff'
        });

        // Reset resend button
        this.style.pointerEvents = 'auto';
        this.style.opacity = '1';
      }
    } catch (error) {
      console.error('Error resending OTP:', error);

      // Show error notification
      Swal.fire({
        title: 'Error',
        text: 'Failed to connect to server',
        icon: 'error',
        confirmButtonColor: '#4a6bff'
      });

      // Reset resend button
      this.style.pointerEvents = 'auto';
      this.style.opacity = '1';
    }
  });

  // Form submissions
  document.getElementById('loginInitForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    this.classList.add('was-validated');

    if (this.checkValidity()) {
      const mobile = document.getElementById('loginMobile').value;
      const cleanedMobile = cleanMobileNumber(mobile);

      // Show loading state
      loginSpinner.classList.remove('d-none');

      try {
        const response = await fetch(`${API_URL}/send-otp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mobile: cleanedMobile,
            type: 'login'
          }),
          credentials: 'include' // FIXED: Include credentials for session cookies
        });

        const data = await response.json();

        // Hide loading state
        loginSpinner.classList.add('d-none');

        if (data.success) {
          // Show success notification
          Swal.fire({
            title: 'OTP Sent!',
            text: `A verification code has been sent to ${mobile}`,
            icon: 'success',
            confirmButtonColor: '#4a6bff',
            timer: 3000,
            timerProgressBar: true
          });

          initOtpVerification(cleanedMobile, 'login');
        } else {
          // Show error notification
          Swal.fire({
            title: 'Error',
            text: data.message || 'Failed to send OTP',
            icon: 'error',
            confirmButtonColor: '#4a6bff'
          });
        }
      } catch (error) {
        console.error('Error sending OTP:', error);

        // Hide loading state
        loginSpinner.classList.add('d-none');

        // Show error notification
        Swal.fire({
          title: 'Error',
          text: 'Failed to connect to server',
          icon: 'error',
          confirmButtonColor: '#4a6bff'
        });
      }
    }
  });

  document.getElementById('registerInitForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    this.classList.add('was-validated');

    if (this.checkValidity()) {
      const mobile = document.getElementById('phone').value;
      const firstName = document.getElementById('firstName').value;
      const lastName = document.getElementById('lastName').value;
      const cleanedMobile = cleanMobileNumber(mobile);

      // Show loading state
      registerSpinner.classList.remove('d-none');

      try {
        const response = await fetch(`${API_URL}/send-otp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mobile: cleanedMobile,
            type: 'register',
            firstName,
            lastName
          }),
          credentials: 'include' // FIXED: Include credentials for session cookies
        });

        const data = await response.json();

        // Hide loading state
        registerSpinner.classList.add('d-none');

        if (data.success) {
          // Show success notification
          Swal.fire({
            title: 'OTP Sent!',
            text: `A verification code has been sent to ${mobile}`,
            icon: 'success',
            confirmButtonColor: '#4a6bff',
            timer: 3000,
            timerProgressBar: true
          });

          initOtpVerification(cleanedMobile, 'register', firstName, lastName);
        } else {
          // Show error notification
          Swal.fire({
            title: 'Error',
            text: data.message || 'Failed to send OTP',
            icon: 'error',
            confirmButtonColor: '#4a6bff'
          });
        }
      } catch (error) {
        console.error('Error sending OTP:', error);

        // Hide loading state
        registerSpinner.classList.add('d-none');

        // Show error notification
        Swal.fire({
          title: 'Error',
          text: 'Failed to connect to server',
          icon: 'error',
          confirmButtonColor: '#4a6bff'
        });
      }
    }
  });

  document.getElementById('otpVerificationForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const otp = fullOtpInput.value;
    const mobile = verificationMobile.value;
    const type = verificationType.value;
    const firstName = verificationFirstName.value;
    const lastName = verificationLastName.value;
    const cleanedMobile = cleanMobileNumber(mobile);

    if (otp.length !== 6) {
      Swal.fire({
        title: 'Invalid OTP',
        text: 'Please enter a 6-digit OTP',
        icon: 'error',
        confirmButtonColor: '#4a6bff'
      });
      return;
    }

    // Show loading state
    verifySpinner.classList.remove('d-none');

    try {
      // FIXED: Proper request body structure
      const requestBody = {
        mobile: cleanedMobile,
        otp: otp,
        type: type
      };

      // Add firstName and lastName for registration
      if (type === 'register') {
        requestBody.firstName = firstName;
        requestBody.lastName = lastName;
      }

      const response = await fetch(`${API_URL}/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        credentials: 'include' // FIXED: Include credentials for session cookies
      });

      const data = await response.json();

      // Hide loading state
      verifySpinner.classList.add('d-none');

      if (data.success) {
        Swal.fire({
          title: 'Success!',
          text: 'Verification successful! Redirecting...',
          icon: 'success',
          confirmButtonColor: '#4a6bff',
          timer: 2000,
          timerProgressBar: true
        }).then(() => {
          // FIXED: Redirect to rooms page instead of dashboard
          window.location.href = data.redirectTo || '/rooms';
        });
      } else {
        Swal.fire({
          title: 'Invalid OTP',
          text: data.message || 'The OTP you entered is incorrect. Please try again.',
          icon: 'error',
          confirmButtonColor: '#4a6bff'
        });
        resetOtpInputs();
        otpInputs[0].focus();
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);

      // Hide loading state
      verifySpinner.classList.add('d-none');

      // Show error notification
      Swal.fire({
        title: 'Error',
        text: 'Failed to connect to server',
        icon: 'error',
        confirmButtonColor: '#4a6bff'
      });
    }
  });

  // Mobile number validation
  const phoneInputs = document.querySelectorAll('input[type="tel"]');
  phoneInputs.forEach(input => {
    input.addEventListener('input', function () {
      this.value = this.value.replace(/[^0-9]/g, '').substring(0, 10);
    });
  });

  // Name validation
  const nameInputs = document.querySelectorAll('#firstName, #lastName');
  nameInputs.forEach(input => {
    input.addEventListener('input', function () {
      this.value = this.value.replace(/[^A-Za-z\s]/g, '');
    });
  });

  // Prevent form submission on Enter key for OTP inputs
  otpInputs.forEach(input => {
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (fullOtpInput.value.length === 6) {
          document.getElementById('otpVerificationForm').dispatchEvent(new Event('submit'));
        }
      }
    });
  });

  // Check for URL parameters to show error messages
  function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const msg = urlParams.get('msg');

    if (msg) {
      let title = 'Notice';
      let text = '';
      let icon = 'info';

      switch (msg) {
        case 'logged_out':
          text = 'You have been successfully logged out.';
          icon = 'success';
          break;
        case 'session_error':
          text = 'There was an error with your session. Please login again.';
          icon = 'error';
          break;
        case 'invalid':
          text = 'Invalid credentials. Please try again.';
          icon = 'error';
          break;
        case 'invalid_mobile':
          text = 'Please enter a valid 10-digit mobile number.';
          icon = 'warning';
          break;
        case 'duplicate':
          text = 'This mobile number is already registered. Please login instead.';
          icon = 'warning';
          switchToLogin();
          break;
        case 'Please login first':
          text = 'Please login to access that page.';
          icon = 'info';
          break;
        default:
          text = msg;
      }

      Swal.fire({
        title,
        text,
        icon,
        confirmButtonColor: '#4a6bff',
        timer: 3000,
        timerProgressBar: true
      });
    }
  }

  // Check URL parameters on page load
  checkUrlParams();

  console.log('Login page loaded and ready for production');
});
