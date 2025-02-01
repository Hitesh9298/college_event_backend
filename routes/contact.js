import express from 'express';
import Contact from '../models/Contact.js';  // Note the .js extension

const router = express.Router();
router.post('/', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Validate input
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ message: 'All fields are required' });
        }

       // Create new contact message
       const newContact = new Contact({
        name,
        email,
        subject,
        message
    });

    await newContact.save();

    res.status(201).json({ message: 'Message sent successfully' });
} catch (error) {
    console.error('Error in contact route:', error);
    res.status(500).json({ message: 'Server error' });
}
});
export default router;