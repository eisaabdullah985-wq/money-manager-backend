const axios = require("axios");

const sendEmail = async ({ email, subject, message }) => {
  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "Money-Manager Support",
          email: process.env.EMAIL_FROM,
        },
        to: [{ email: email }],
        subject: subject,
        textContent: message,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Brevo API error:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = sendEmail;