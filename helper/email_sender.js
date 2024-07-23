const nodemailer = require('nodemailer');

exports.sendMail = async (
    email,
    subject,
    body,
) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: subject,
        text: body
    };

    let response ;
     transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
            return {
                message: 'Error in Sending email',
                statusCode: 500}; 
        }
         console.log('Email sent:', info.response);
         
         
         response =  {
                message:'Reset OTP sent SUCCESSULLY',
                statusCode: 200
            };
     });
    return response;
};
