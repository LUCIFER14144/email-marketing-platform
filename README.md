# Advanced Email Sending Platform 📧

A professional-grade web-based email sending platform with bulk email capabilities, file uploads, click tracking, open rate monitoring, and global accessibility. Built with HTML frontend and Node.js backend.

## 🚀 Advanced Features

### 📁 **File Upload System**
- **SMTP Configuration Upload**: Load email providers from .txt or .json files
- **Bulk Email Lists**: Upload recipient lists in .txt, .csv, or .json formats
- **Drag & Drop Support**: Easy file handling with format validation

### 📧 **Professional Email Sending**
- **Single Email**: Send individual emails with HTML support
- **Bulk Email Campaigns**: Send to thousands of recipients with progress tracking
- **Multiple Providers**: Switch between Gmail, Outlook, Yahoo, and custom SMTP
- **Rate Limiting**: Automatic delays to prevent provider blocking

### 📊 **Advanced Analytics & Tracking**
- **Open Rate Tracking**: Monitor which emails are opened with tracking pixels
- **Click Tracking**: Track link clicks in your emails automatically
- **Campaign Statistics**: Detailed metrics for each bulk email campaign
- **Real-time Dashboard**: Live campaign performance monitoring

### 🌍 **Global Accessibility**
- **Remote Access**: Access from anywhere in the world using public IP
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Security First**: Environment variables and secure credential handling

### 🔧 **Technical Features**
- **Multi-tab Interface**: Single Email, Bulk Email, File Upload, and Statistics tabs
- **Input Validation**: Client-side and server-side validation
- **Error Handling**: Comprehensive error reporting and recovery
- **Background Processing**: Non-blocking bulk email sending

## 📁 Project Structure

```
webemailsending/
├── public/
│   ├── index.html      # Main web interface
│   ├── styles.css      # Responsive styling
│   └── script.js       # Client-side functionality
├── src/
│   └── server.js       # Express server with email API
├── .env.example        # Environment variables template
├── .gitignore          # Git ignore rules
└── package.json        # Project dependencies
```

## 🛠️ Setup Instructions

### 1. Configure Multiple Email Providers
Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your multiple email configurations:

```env
# Server Configuration
PORT=3000

# Primary Gmail Account
GMAIL1_SERVICE=gmail
GMAIL1_USER=your-primary-email@gmail.com
GMAIL1_PASSWORD=your-app-password-1
GMAIL1_LABEL=Primary Gmail

# Secondary Gmail Account
GMAIL2_SERVICE=gmail
GMAIL2_USER=your-secondary-email@gmail.com
GMAIL2_PASSWORD=your-app-password-2
GMAIL2_LABEL=Secondary Gmail

# Business Outlook Account
OUTLOOK1_SERVICE=outlook
OUTLOOK1_USER=business@outlook.com
OUTLOOK1_PASSWORD=your-app-password-3
OUTLOOK1_LABEL=Business Outlook

# Personal Yahoo Account
YAHOO1_SERVICE=yahoo
YAHOO1_USER=personal@yahoo.com
YAHOO1_PASSWORD=your-app-password-4
YAHOO1_LABEL=Personal Yahoo
```

### 2. Gmail Setup (Recommended)
1. Enable 2-factor authentication on your Gmail account
2. Generate an app password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password
3. Use the 16-character app password in your `.env` file

### 3. Install Dependencies
```bash
npm install
```

### 4. Start the Application
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

### 5. Access the Application
Open your browser and navigate to: `http://localhost:3000`

## 🔧 API Endpoints

### GET `/api/providers`
Get list of available email providers.

**Response:**
```json
{
  "success": true,
  "providers": [
    {
      "id": "GMAIL1",
      "label": "Primary Gmail",
      "user": "your-primary-email@gmail.com"
    },
    {
      "id": "OUTLOOK1", 
      "label": "Business Outlook",
      "user": "business@outlook.com"
    }
  ]
}
```

### POST `/send-email`
Send an email through the selected SMTP provider.

**Request Body:**
```json
{
  "providerId": "GMAIL1",
  "from": "Your Name (optional)",
  "to": "recipient@example.com", 
  "subject": "Email Subject",
  "message": "Email content"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email sent successfully via Primary Gmail!",
  "messageId": "unique-message-id",
  "provider": "Primary Gmail"
}
```

### GET `/health`
Health check endpoint for monitoring.

## 📧 Multiple Email Provider Configuration

### Provider Naming Convention
Each provider configuration uses a unique prefix (e.g., `GMAIL1`, `OUTLOOK1`, `CUSTOM1`):

### Gmail Accounts
```env
# Primary Gmail
GMAIL1_SERVICE=gmail
GMAIL1_USER=primary@gmail.com
GMAIL1_PASSWORD=app-password-1
GMAIL1_LABEL=Primary Gmail

# Secondary Gmail  
GMAIL2_SERVICE=gmail
GMAIL2_USER=secondary@gmail.com
GMAIL2_PASSWORD=app-password-2
GMAIL2_LABEL=Marketing Gmail
```

### Outlook/Hotmail Accounts
```env
OUTLOOK1_SERVICE=outlook
OUTLOOK1_USER=business@outlook.com
OUTLOOK1_PASSWORD=app-password
OUTLOOK1_LABEL=Business Outlook

OUTLOOK2_SERVICE=outlook
OUTLOOK2_USER=personal@hotmail.com
OUTLOOK2_PASSWORD=app-password-2
OUTLOOK2_LABEL=Personal Hotmail
```

### Yahoo Accounts
```env
YAHOO1_SERVICE=yahoo
YAHOO1_USER=personal@yahoo.com
YAHOO1_PASSWORD=app-password
YAHOO1_LABEL=Personal Yahoo
```

### Custom SMTP Servers
```env
CUSTOM1_SERVICE=custom
CUSTOM1_HOST=smtp.your-company.com
CUSTOM1_PORT=587
CUSTOM1_USER=you@company.com
CUSTOM1_PASSWORD=smtp-password
CUSTOM1_LABEL=Company Email

CUSTOM2_SERVICE=custom
CUSTOM2_HOST=mail.your-domain.com
CUSTOM2_PORT=465
CUSTOM2_USER=admin@domain.com
CUSTOM2_PASSWORD=smtp-password-2
CUSTOM2_LABEL=Domain Admin
```

### Adding More Providers
You can add unlimited providers by following the naming pattern:
- `PROVIDERNAME_SERVICE` - Email service type
- `PROVIDERNAME_USER` - Email address
- `PROVIDERNAME_PASSWORD` - App password or SMTP password
- `PROVIDERNAME_LABEL` - Display name in the interface
- `PROVIDERNAME_HOST` - SMTP host (for custom only)
- `PROVIDERNAME_PORT` - SMTP port (for custom only)

## 🎨 Features Overview

### Frontend Features
- Responsive design that works on all devices
- Real-time form validation
- Loading animations and feedback
- Character counter for messages
- Error handling with user-friendly messages

### Backend Features
- Express.js REST API
- CORS enabled for cross-origin requests
- Input sanitization and validation
- Structured error handling
- Environment-based configuration

### Security Features
- Environment variables for sensitive data
- Input validation on both client and server
- Rate limiting ready (can be easily added)
- HTTPS ready for production deployment

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Environment Variables for Production
Ensure these environment variables are set:
- `EMAIL_SERVICE`
- `EMAIL_USER`
- `EMAIL_PASSWORD`
- `PORT` (optional, defaults to 3000)

## 🔍 Troubleshooting

### Common Issues

1. **"Authentication failed"**
   - Ensure 2-factor authentication is enabled
   - Use app password, not regular password
   - Check EMAIL_USER and EMAIL_PASSWORD in `.env`

2. **"Connection refused"**
   - Check internet connection
   - Verify EMAIL_SERVICE is correct
   - Try different SMTP port if using custom settings

3. **"Invalid email address"**
   - Ensure recipient email is properly formatted
   - Check for extra spaces or special characters

### Debug Mode
Add this to your `.env` for detailed logging:
```env
NODE_ENV=development
```

## 📝 License

ISC License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

If you encounter any issues or have questions:
1. Check the troubleshooting section above
2. Review your `.env` configuration
3. Ensure all dependencies are installed correctly
4. Check the console for detailed error messages

---

**Happy Emailing! 📧✨**