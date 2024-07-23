const { validationResult } = require('express-validator');
const { User } = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Token } = require('../models/token');
const mailSender = require('../helper/email_sender');

exports.register = async function (req, res) {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((error) => ({
            field: error.path,
            message: error.msg,
        }));
        return res.status(400).json({ errors: errorMessages });
    }

    try {
        // Check if the user already exists
        const existingUser = await User.findOne({ email: req.body.email });
        if (existingUser) {
            return res.status(400).json({
                type: 'Auth Error',
                message: 'User already exists',
            });
        }

        // Create a new user
        const hashedPassword = await bcrypt.hash(req.body.password, 8);
        const user = new User({
            ...req.body,
            passwordHash: hashedPassword,
        });

        // Save the user to the database
        const savedUser = await user.save();
        if (!savedUser) {
            return res.status(500).json({
                type: 'Internal Server Error',
                message: 'Could not create a new user',
            });
        }

        // Exclude sensitive information from the response
       // const { passwordHash, ...userWithoutPassword } = savedUser.toObject();
       // return res.status(201).json(userWithoutPassword);

        
         // Include sensitive information in the response
        return res.status(201).json(savedUser.toObject());

        
    } catch (error) {
        return res.status(500).json({ type: error.name, message: error.message });
    }
};

exports.login = async function (req, res) {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found. Check your email and try again.' });
        }
        if (!bcrypt.compareSync(password, user.passwordHash)) {
            return res.status(400).json({ message: 'Incorrect password' });
        }

        const accessToken = jwt.sign(
            { id: user.id, isAdmin: user.isAdmin },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '24h' }
        );
        const refreshToken = jwt.sign(
            { id: user.id }, // Missing payload added
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '60d' }
        );

        const token = await Token.findOne({ userId: user.id });
        if (token) await token.deleteOne();
        await new Token({
            userId: user.id,
            accessToken,
            refreshToken,
        }).save();

        user.passwordHash = undefined;
        return res.json({ ...user._doc, accessToken, refreshToken });
    } catch (error) {
        return res.status(500).json({ type: error.name, message: error.message });
    }
};

exports.verifyToken = async function (req, res) {
    try { 
        const accessToken = req.headers.authorization;
        if (!accessToken) return res.json(false);

        accessToken  = accessToken.replace('Bearer ', '').trim();
        const token = await Token.findOne({ accessToken });

        if (!token) return res.json(false);
        const tokenData = jwt.decode(token.refreshToken);

        const user = await User.findById(tokenData.id);
        if (!user) return res.json(false);

        const isValid = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        if (!isValid) return res.json(false);
        return res.json(true);

    } catch (error) {
        return res.status(500).json({ type: error.name, message: error.message });
    }
};

exports.forgotPassword = async function (req, res) {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res
                .status(404)
                .json({ message: 'User not found. Check your email and try again.' });
        }
        const otp = Math.floor(1000 + Math.random() * 9000);


        user.resetPasswordOtp = otp;
        user.resetPasswordOtpExpires = Date.now() + 600000;


        await user.save();

        const response = await mailSender.sendMail(
            email,
            'Password Reset OTP',
            `Your OTP for Password reset is ${otp}`
        );
        if (response.statusCode === 500) {
            return res.status(500).json({
                message: 'Error in sending email',
            });
        } else if(response.statusCode === 200) {
            return res.json({message: 'Password Reset OTP sent successfully'});
        }
    } catch (error) {
        return res.status(500).json({ type: error.name, message: error.message });
    }
};

exports.verifyPasswordResetOTP = async function (req, res) {
    // Implementation for verify password reset OTP
};

exports.resetPassword = async function (req, res) {
    // Implementation for reset password
};
