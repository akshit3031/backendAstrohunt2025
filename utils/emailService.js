import nodemailer from "nodemailer";

const client = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: "astronomy@nitkkr.ac.in",
        pass: "pdgp yndo zsno hmml"
    }
});



const sendEmail = async (toEmail, otp) => {
    try{
        const mailOptions = {
            from: "astronomy@nitkkr.ac.in",
            to: toEmail,
            subject: "OTP for registration",
            text: `${otp}`
        }
        await client.sendMail(mailOptions);
    }
    catch(error){
        throw new Error("Failed to send email");
    }
}

export {sendEmail};