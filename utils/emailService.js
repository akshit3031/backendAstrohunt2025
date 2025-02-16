import nodemailer from "nodemailer";

const client = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: "akshitgarg3031@gmail.com",
        pass: "#Akshit1093"
    }
});

client.sendMail(
    {
        from: "akshitgarg3031@gmail.com",
        to: "12213031@nitkkr.ac.in",
        subject: "Sending",
        text: "Hello"
    }

);


const sendEmail = async (toEmail, otp) => {
    try{
        const mailOptions = {
            from: "akshitgarg3031@gmail.com",
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
