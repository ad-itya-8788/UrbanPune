require("dotenv").config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSid = process.env.TWILIO_SERVICE_SID;

let twilioClient;

try {
  twilioClient = require("twilio")(accountSid, authToken);
} catch (error) {
  console.error("Failed to initialize Twilio client:", error.message);
  twilioClient = null;
}

/**
 * Send OTP to the given phone number using Twilio Verify API.
 * @param {string} phoneNumber - E.164 formatted phone number (e.g. +919876543210)
 * @returns {Promise<Object>} - { success: boolean, status: string }
 */
const sendOTP = async (phoneNumber) => {
  if (!twilioClient) {
    throw new Error("Twilio client not initialized");
  }

  try {
    const verification = await twilioClient.verify.v2.services(serviceSid)
      .verifications.create({ to: phoneNumber, channel: "sms" });

    return {
      success: true,
      status: verification.status, // usually 'pending'
    };
  } catch (error) {
    console.error("Twilio send OTP error:", error.message);

    if (process.env.NODE_ENV !== "production") {
      // In dev, simulate OTP send without Twilio
      return {
        success: true,
        status: "pending",
        development: true,
        testOtp: "1234",
      };
    }

    throw error;
  }
};

/**
 * Verify OTP entered by user using Twilio Verify API.
 * @param {string} phoneNumber - E.164 formatted phone number
 * @param {string} otp - OTP code entered by user
 * @returns {Promise<Object>} - { success: boolean, status: string, verified: boolean }
 */
const verifyOTP = async (phoneNumber, otp) => {
  if (!twilioClient) {
    throw new Error("Twilio client not initialized");
  }

  try {
    const verificationCheck = await twilioClient.verify.v2.services(serviceSid)
      .verificationChecks.create({ to: phoneNumber, code: otp });

    return {
      success: true,
      status: verificationCheck.status, // 'approved' if verified
      verified: verificationCheck.status === "approved",
    };
  } catch (error) {
    console.error("Twilio verify OTP error:", error.message);

    if (process.env.NODE_ENV !== "production") {
      // Simulate verification in dev
      const verified = otp === "1234";
      return {
        success: true,
        status: verified ? "approved" : "rejected",
        verified,
        development: true,
      };
    }

    throw error;
  }
};

module.exports = {
  sendOTP,
  verifyOTP,
  isInitialized: () => !!twilioClient,
};
