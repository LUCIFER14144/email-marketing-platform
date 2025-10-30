const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const csv = require('csv-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /txt|csv|json/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'text/plain';
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only .txt, .csv, and .json files are allowed'));
    }
  }
});

// HTML file upload configuration
const htmlUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Use username from session, fallback to 'unknown' if not available
      const username = req.session?.userId || req.userIP || 'unknown';
      const userDir = path.join(__dirname, '../uploads/html', username);
      
      try {
        if (!fs.existsSync(userDir)) {
          fs.mkdirSync(userDir, { recursive: true });
        }
        cb(null, userDir);
      } catch (error) {
        console.error('Error creating upload directory:', error);
        cb(error);
      }
    },
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      cb(null, `${timestamp}-${safeName}`);
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for HTML files
  fileFilter: (req, file, cb) => {
    const allowedTypes = /html|htm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype === 'text/html' || file.mimetype === 'text/plain';
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only .html and .htm files are allowed'));
    }
  }
});

// In-memory storage for uploaded providers and tracking data
let uploadedProviders = {};
let emailTracking = {};
let campaignStats = {};

// User-based storage (keyed by IP address)
let userSessions = {};
let userHtmlFiles = {}; // Store uploaded HTML files per user
let userProviders = {}; // Store SMTP providers per user

// User authentication storage
let users = {}; // Store registered users: { username: { password: hash, ip: string, createdAt: date } }
let userDataByUsername = {}; // Map username to their data

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // set to true if using https
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
// Serve static files from public directory
const publicPath = path.resolve(__dirname, '..', 'public');
console.log('Public path:', publicPath);
app.use(express.static(publicPath));

// Middleware to create user session based on IP
app.use((req, res, next) => {
  const userIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
    (req.connection.socket ? req.connection.socket.remoteAddress : null) || 
    req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
  
  // Clean and normalize IP
  const cleanIP = userIP.replace(/^::ffff:/, '');
  req.userIP = cleanIP;
  
  // Initialize user session if doesn't exist
  if (!userSessions[cleanIP]) {
    userSessions[cleanIP] = {
      ip: cleanIP,
      createdAt: new Date(),
      lastActive: new Date(),
      sessionId: Date.now().toString(36) + Math.random().toString(36).substr(2)
    };
    userHtmlFiles[cleanIP] = [];
    userProviders[cleanIP] = {};
  }
  
  // Update last active time
  userSessions[cleanIP].lastActive = new Date();
  
  next();
});

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Load all email providers from environment variables
const loadEmailProviders = () => {
  const providers = {};
  const envKeys = Object.keys(process.env);
  
  // Group environment variables by provider
  const providerGroups = {};
  
  envKeys.forEach(key => {
    const match = key.match(/^([A-Z0-9]+)_(SERVICE|USER|PASSWORD|HOST|PORT|LABEL)$/);
    if (match) {
      const [, providerName, configType] = match;
      if (!providerGroups[providerName]) {
        providerGroups[providerName] = {};
      }
      providerGroups[providerName][configType.toLowerCase()] = process.env[key];
    }
  });

  // Convert to provider configs
  Object.keys(providerGroups).forEach(providerName => {
    const config = providerGroups[providerName];
    if (config.service && config.user && config.password) {
      providers[providerName] = {
        id: providerName,
        label: config.label || `${config.service} (${config.user})`,
        service: config.service,
        user: config.user,
        password: config.password,
        host: config.host,
        port: config.port ? parseInt(config.port) : undefined
      };
    }
  });

  return providers;
};

// Create transporter for specific provider
const createTransporter = (providerId, username = null) => {
  let provider;
  
  if (username) {
    // Get provider from user-specific or environment providers
    const providers = getEmailProviders(username);
    provider = providers[providerId];
  } else {
    // Fallback to environment providers only
    const providers = loadEmailProviders();
    provider = providers[providerId];
  }
  
  if (!provider) {
    throw new Error(`Email provider '${providerId}' not found`);
  }

  const transportConfig = {
    auth: {
      user: provider.user,
      pass: provider.password
    }
  };

  if (provider.service === 'custom') {
    transportConfig.host = provider.host;
    transportConfig.port = provider.port || 587;
    transportConfig.secure = provider.port === 465;
  } else {
    transportConfig.service = provider.service;
  }

  return nodemailer.createTransport(transportConfig);
};

// Get available email providers for a specific user
const getEmailProviders = (username) => {
  const envProviders = loadEmailProviders();
  const userSpecificProviders = userDataByUsername[username]?.providers || {};
  return { ...envProviders, ...userSpecificProviders };
};

// Parse SMTP configuration from uploaded file
const parseSmtpFile = (filePath, fileType) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const providers = {};
  
  if (fileType === 'json') {
    const data = JSON.parse(content);
    Object.keys(data).forEach(key => {
      if (data[key].service && data[key].user && data[key].password) {
        providers[key] = {
          id: key,
          label: data[key].label || `${data[key].service} (${data[key].user})`,
          service: data[key].service,
          user: data[key].user,
          password: data[key].password,
          host: data[key].host,
          port: data[key].port
        };
      }
    });
  } else {
    // Parse text format: PROVIDER_NAME|service|user|password|label|host|port
    const lines = content.split('\n').filter(line => line.trim());
    lines.forEach((line, index) => {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 4) {
        const [name, service, user, password, label, host, port] = parts;
        providers[name || `UPLOADED_${index + 1}`] = {
          id: name || `UPLOADED_${index + 1}`,
          label: label || `${service} (${user})`,
          service: service,
          user: user,
          password: password,
          host: host,
          port: port ? parseInt(port) : undefined
        };
      }
    });
  }
  
  return providers;
};

// Parse email list from uploaded file
const parseEmailList = (filePath, fileType) => {
  return new Promise((resolve, reject) => {
    const emails = [];
    
    if (fileType === 'json') {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        if (Array.isArray(data)) {
          data.forEach(item => {
            if (typeof item === 'string') {
              emails.push({ email: item, name: '' });
            } else if (item.email) {
              emails.push({ email: item.email, name: item.name || '' });
            }
          });
        }
        resolve(emails);
      } catch (error) {
        reject(error);
      }
    } else if (fileType === 'csv') {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          const email = row.email || row.Email || row.EMAIL || Object.values(row)[0];
          const name = row.name || row.Name || row.NAME || Object.values(row)[1] || '';
          if (email && email.includes('@')) {
            emails.push({ email: email.trim(), name: name.trim() });
          }
        })
        .on('end', () => {
          resolve(emails);
        })
        .on('error', reject);
    } else {
      // Text format: one email per line or email|name format
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        lines.forEach(line => {
          const parts = line.split('|').map(p => p.trim());
          const email = parts[0];
          const name = parts[1] || '';
          if (email && email.includes('@')) {
            emails.push({ email, name });
          }
        });
        resolve(emails);
      } catch (error) {
        reject(error);
      }
    }
  });
};

// Generate tracking pixel and links
const generateTrackingContent = (campaignId, recipientEmail, originalContent) => {
  const trackingId = uuidv4();
  
  // Store tracking info
  emailTracking[trackingId] = {
    campaignId,
    recipientEmail,
    sentAt: new Date(),
    opened: false,
    openedAt: null,
    clicks: []
  };
  
  // Add tracking pixel
  const trackingPixel = `<img src="http://localhost:${PORT}/track/open/${trackingId}" width="1" height="1" style="display:none;" />`;
  
  // Replace links with tracked links
  const trackedContent = originalContent.replace(
    /<a\s+href="([^"]+)"([^>]*)>/gi,
    (match, url, attributes) => {
      const linkId = uuidv4();
      return `<a href="http://localhost:${PORT}/track/click/${trackingId}/${linkId}?url=${encodeURIComponent(url)}"${attributes}>`;
    }
  );
  
  return trackedContent + trackingPixel;
};

// Authentication Routes
// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const userIP = req.userIP;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }
    
    if (users[username]) {
      return res.status(400).json({ success: false, error: 'Username already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    users[username] = {
      username,
      password: hashedPassword,
      ip: userIP,
      createdAt: new Date(),
      lastLogin: new Date()
    };
    
    // Initialize user data
    userDataByUsername[username] = {
      htmlFiles: [],
      providers: {},
      campaigns: {}
    };
    
    // Set session
    req.session.userId = username;
    req.session.ip = userIP;
    
    res.json({ 
      success: true, 
      message: 'Registration successful',
      user: { username, ip: userIP }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const userIP = req.userIP;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }
    
    const user = users[username];
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }
    
    // Update last login and IP
    users[username].lastLogin = new Date();
    users[username].ip = userIP;
    
    // Set session
    req.session.userId = username;
    req.session.ip = userIP;
    
    res.json({ 
      success: true, 
      message: 'Login successful',
      user: { username, ip: userIP }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// Logout user
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logout successful' });
  });
});

// Check authentication status
app.get('/api/auth/status', (req, res) => {
  if (req.session.userId) {
    const user = users[req.session.userId];
    res.json({ 
      success: true, 
      authenticated: true,
      user: {
        username: req.session.userId,
        ip: req.session.ip,
        createdAt: user?.createdAt,
        lastLogin: user?.lastLogin
      }
    });
  } else {
    res.json({ success: true, authenticated: false });
  }
});

// Middleware to protect routes (require authentication)
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  req.username = req.session.userId;
  next();
};

// Routes
app.get('/', (req, res) => {
  const indexPath = path.resolve(__dirname, '..', 'public', 'index.html');
  console.log('Sending index.html from:', indexPath);
  res.sendFile(indexPath);
});

// Get user session info
app.get('/api/user-session', (req, res) => {
  const session = userSessions[req.userIP];
  res.json({
    success: true,
    session: {
      ip: session.ip,
      sessionId: session.sessionId,
      createdAt: session.createdAt,
      htmlFiles: userHtmlFiles[req.userIP] || [],
      totalUsers: Object.keys(userSessions).length
    }
  });
});

// Get available email providers for current user
app.get('/api/providers', (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    
    const providers = getEmailProviders(req.session.userId);
    const providerList = Object.values(providers).map(provider => ({
      id: provider.id,
      label: provider.label,
      user: provider.user
    }));
    console.log(`[${req.session.userId}] Providers loaded:`, providerList.length);
    res.json({ success: true, providers: providerList });
  } catch (error) {
    console.error('Error loading providers:', error);
    res.status(500).json({ success: false, error: 'Failed to load email providers' });
  }
});

// Upload HTML files (multiple files supported)
app.post('/api/upload-html', htmlUpload.array('htmlFiles', 10), (req, res) => {
  try {
    console.log('HTML upload request received');
    console.log('Files:', req.files);
    console.log('User:', req.session.userId);
    
    if (!req.session.userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    
    if (!req.files || req.files.length === 0) {
      console.log('No files received');
      return res.status(400).json({ success: false, error: 'No HTML files uploaded' });
    }
    
    const username = req.session.userId;
    
    // Ensure user data exists
    if (!userDataByUsername[username]) {
      userDataByUsername[username] = { htmlFiles: [], providers: {}, campaigns: {} };
    }
    
    const uploadedFiles = [];
    
    req.files.forEach(file => {
      const fileInfo = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        originalName: file.originalname,
        filename: file.filename,
        filePath: file.path,
        uploadedAt: new Date(),
        deviceType: req.body[`deviceType_${file.originalname}`] || 'both',
        description: req.body[`description_${file.originalname}`] || '',
        publicUrl: `${req.protocol}://${req.get('host')}/view/${username}/${file.filename}`,
        smartUrl: `${req.protocol}://${req.get('host')}/smart/${username}/${file.filename.split('-')[1] || file.filename}`
      };
      
      uploadedFiles.push(fileInfo);
      userDataByUsername[username].htmlFiles.push(fileInfo);
    });
    
    console.log(`[${username}] Uploaded ${uploadedFiles.length} files. Total files now: ${userDataByUsername[username].htmlFiles.length}`);
    
    res.json({
      success: true,
      message: `Successfully uploaded ${uploadedFiles.length} HTML file(s)`,
      files: uploadedFiles
    });
    
  } catch (error) {
    console.error('Error uploading HTML files:', error);
    res.status(500).json({ success: false, error: 'Failed to upload HTML files: ' + error.message });
  }
});

// Add multer error handling middleware for HTML uploads
app.use('/api/upload-html', (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error('Multer error:', error);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'File too large. Maximum size is 50MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ success: false, error: 'Too many files. Maximum is 10 files.' });
    }
    return res.status(400).json({ success: false, error: 'File upload error: ' + error.message });
  }
  
  console.error('Upload error:', error);
  res.status(500).json({ success: false, error: 'Server error during upload: ' + error.message });
});

// Update device type for uploaded HTML
app.post('/api/update-html-device', (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    
    const { fileId, deviceType, description } = req.body;
    const username = req.session.userId;
    
    if (!userDataByUsername[username]?.htmlFiles) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    
    const fileIndex = userDataByUsername[username].htmlFiles.findIndex(f => f.id === fileId);
    if (fileIndex === -1) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    
    userDataByUsername[username].htmlFiles[fileIndex].deviceType = deviceType;
    if (description !== undefined) {
      userDataByUsername[username].htmlFiles[fileIndex].description = description;
    }
    
    console.log(`[${username}] Updated file ${fileId} device type to ${deviceType}`);
    
    res.json({ success: true, message: 'File updated successfully' });
  } catch (error) {
    console.error('Error updating HTML file:', error);
    res.status(500).json({ success: false, error: 'Failed to update file: ' + error.message });
  }
});

// Upload SMTP configuration file (user-specific)
app.post('/api/upload-smtp', upload.single('smtpFile'), (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    const fileType = path.extname(req.file.originalname).toLowerCase().substring(1);
    const newProviders = parseSmtpFile(req.file.path, fileType);
    
    const username = req.session.userId;
    
    // Ensure user data exists
    if (!userDataByUsername[username]) {
      userDataByUsername[username] = { htmlFiles: [], providers: {}, campaigns: {} };
    }
    
    // Store providers for this specific user
    userDataByUsername[username].providers = { ...userDataByUsername[username].providers, ...newProviders };
    
    console.log(`[${username}] Loaded ${Object.keys(newProviders).length} SMTP providers. Total: ${Object.keys(userDataByUsername[username].providers).length}`);
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({ 
      success: true, 
      message: `Successfully loaded ${Object.keys(newProviders).length} SMTP configuration(s)`,
      providers: Object.values(newProviders).map(p => ({ id: p.id, label: p.label, user: p.user }))
    });
  } catch (error) {
    console.error('Error processing SMTP file:', error);
    res.status(500).json({ success: false, error: 'Failed to process SMTP file: ' + error.message });
  }
});

// Upload email list file
app.post('/api/upload-emails', upload.single('emailFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    const fileType = path.extname(req.file.originalname).toLowerCase().substring(1);
    const emails = await parseEmailList(req.file.path, fileType);
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({ 
      success: true, 
      message: `Successfully loaded ${emails.length} email address(es)`,
      emails: emails.slice(0, 10), // Return first 10 for preview
      totalCount: emails.length
    });
  } catch (error) {
    console.error('Error processing email file:', error);
    res.status(500).json({ success: false, error: 'Failed to process email file' });
  }
});

// Bulk email sending
app.post('/api/send-bulk', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  
  const { providerId, subject, message, from, emailList, trackingEnabled = true } = req.body;
  
  if (!providerId || !subject || !message || !emailList || !Array.isArray(emailList)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: providerId, subject, message, emailList' 
    });
  }
  
  const campaignId = uuidv4();
  campaignStats[campaignId] = {
    id: campaignId,
    subject,
    startTime: new Date(),
    totalEmails: emailList.length,
    sentCount: 0,
    failedCount: 0,
    openCount: 0,
    clickCount: 0,
    status: 'sending'
  };
  
  try {
    const username = req.session.userId;
    const providers = getEmailProviders(username);
    const selectedProvider = providers[providerId];
    
    console.log(`[${username}] Starting bulk email campaign. Provider: ${providerId}`);
    
    if (!selectedProvider) {
      return res.status(400).json({ 
        success: false, 
        error: 'Selected email provider not found. Please upload SMTP configuration first.' 
      });
    }
    
    const transporter = createTransporter(providerId, username);
    const results = [];
    
    // Send emails with delay to avoid rate limiting
    for (let i = 0; i < emailList.length; i++) {
      const recipient = emailList[i];
      
      try {
        let emailContent = message;
        
        // Add tracking if enabled
        if (trackingEnabled) {
          emailContent = generateTrackingContent(campaignId, recipient.email, message);
        }
        
        const mailOptions = {
          from: from ? `${from} <${selectedProvider.user}>` : selectedProvider.user,
          to: recipient.email,
          subject: subject,
          html: emailContent
        };
        
        const info = await transporter.sendMail(mailOptions);
        results.push({ email: recipient.email, status: 'sent', messageId: info.messageId });
        campaignStats[campaignId].sentCount++;
        
        console.log(`Bulk email ${i + 1}/${emailList.length} sent to ${recipient.email}`);
        
        // Add delay between emails (1 second)
        if (i < emailList.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`Failed to send to ${recipient.email}:`, error.message);
        results.push({ email: recipient.email, status: 'failed', error: error.message });
        campaignStats[campaignId].failedCount++;
      }
    }
    
    campaignStats[campaignId].status = 'completed';
    campaignStats[campaignId].endTime = new Date();
    
    res.json({
      success: true,
      message: `Bulk email campaign completed. ${campaignStats[campaignId].sentCount} sent, ${campaignStats[campaignId].failedCount} failed.`,
      campaignId,
      results: results.slice(0, 50), // Return first 50 results
      stats: campaignStats[campaignId]
    });
    
  } catch (error) {
    console.error('Bulk email error:', error);
    campaignStats[campaignId].status = 'failed';
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send bulk emails. Please check your configuration.' 
    });
  }
});

// Email tracking endpoints
app.get('/track/open/:trackingId', (req, res) => {
  const { trackingId } = req.params;
  
  if (emailTracking[trackingId] && !emailTracking[trackingId].opened) {
    emailTracking[trackingId].opened = true;
    emailTracking[trackingId].openedAt = new Date();
    
    // Update campaign stats
    const campaignId = emailTracking[trackingId].campaignId;
    if (campaignStats[campaignId]) {
      campaignStats[campaignId].openCount++;
    }
    
    console.log(`Email opened: ${emailTracking[trackingId].recipientEmail}`);
  }
  
  // Return 1x1 transparent pixel
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Content-Length', pixel.length);
  res.end(pixel);
});

app.get('/track/click/:trackingId/:linkId', (req, res) => {
  const { trackingId, linkId } = req.params;
  const { url } = req.query;
  
  if (emailTracking[trackingId]) {
    emailTracking[trackingId].clicks.push({
      linkId,
      url,
      clickedAt: new Date()
    });
    
    // Update campaign stats
    const campaignId = emailTracking[trackingId].campaignId;
    if (campaignStats[campaignId]) {
      campaignStats[campaignId].clickCount++;
    }
    
    console.log(`Link clicked: ${emailTracking[trackingId].recipientEmail} -> ${url}`);
  }
  
  // Redirect to original URL
  res.redirect(decodeURIComponent(url));
});

// Get campaign statistics
app.get('/api/stats/:campaignId', (req, res) => {
  const { campaignId } = req.params;
  const stats = campaignStats[campaignId];
  
  if (!stats) {
    return res.status(404).json({ success: false, error: 'Campaign not found' });
  }
  
  // Calculate additional metrics
  const openRate = stats.sentCount > 0 ? (stats.openCount / stats.sentCount * 100).toFixed(2) : 0;
  const clickRate = stats.openCount > 0 ? (stats.clickCount / stats.openCount * 100).toFixed(2) : 0;
  
  res.json({
    success: true,
    stats: {
      ...stats,
      openRate: `${openRate}%`,
      clickRate: `${clickRate}%`
    }
  });
});

// Get all campaigns
app.get('/api/campaigns', (req, res) => {
  const campaigns = Object.values(campaignStats).map(campaign => {
    const openRate = campaign.sentCount > 0 ? (campaign.openCount / campaign.sentCount * 100).toFixed(2) : 0;
    const clickRate = campaign.openCount > 0 ? (campaign.clickCount / campaign.openCount * 100).toFixed(2) : 0;
    
    return {
      ...campaign,
      openRate: `${openRate}%`,
      clickRate: `${clickRate}%`
    };
  });
  
  res.json({ success: true, campaigns });
});

app.post('/send-email', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  
  const { to, subject, message, from, providerId } = req.body;

  // Input validation
  if (!to || !subject || !message) {
    return res.status(400).json({ 
      success: false, 
      error: 'All fields (to, subject, message) are required' 
    });
  }

  // Provider validation
  if (!providerId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email provider must be selected' 
    });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid email address' 
    });
  }

  try {
    const username = req.session.userId;
    const providers = getEmailProviders(username);
    const selectedProvider = providers[providerId];
    
    if (!selectedProvider) {
      return res.status(400).json({ 
        success: false, 
        error: 'Selected email provider not found. Please upload SMTP configuration first.' 
      });
    }

    const transporter = createTransporter(providerId, username);
    
    const mailOptions = {
      from: from ? `${from} <${selectedProvider.user}>` : selectedProvider.user,
      to: to,
      subject: subject,
      text: message,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          ${message}
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 0.9em; color: #666;">
            Sent via: ${selectedProvider.label}
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent via ${selectedProvider.label}:`, info.messageId);
    
    res.json({ 
      success: true, 
      message: `Email sent successfully via ${selectedProvider.label}!`,
      messageId: info.messageId,
      provider: selectedProvider.label
    });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send email. Please check your configuration.' 
    });
  }
});

// Device detection function
const detectDevice = (userAgent) => {
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return mobileRegex.test(userAgent) ? 'mobile' : 'desktop';
};

// Smart link routing (detects device and serves appropriate HTML)
app.get('/smart/:username/:filename', (req, res) => {
  const { username, filename } = req.params;
  const userAgent = req.headers['user-agent'] || '';
  const deviceType = detectDevice(userAgent);
  
  if (!userDataByUsername[username]?.htmlFiles) {
    return res.status(404).send(`
      <h1>File Not Found</h1>
      <p>User "${username}" or files not found</p>
    `);
  }
  
  const userFiles = userDataByUsername[username].htmlFiles;
  
  // Find files with matching base name
  const matchingFiles = userFiles.filter(file => 
    file.originalName.toLowerCase().includes(filename.toLowerCase()) ||
    file.filename.includes(filename)
  );
  
  if (matchingFiles.length === 0) {
    return res.status(404).send(`
      <h1>File Not Found</h1>
      <p>The requested file "${filename}" was not found for user ${username}</p>
      <p>Available files: ${userFiles.map(f => f.originalName).join(', ')}</p>
    `);
  }
  
  // Look for device-specific file first
  let targetFile = matchingFiles.find(f => f.deviceType === deviceType);
  
  // If no device-specific file, use 'both' or fallback to first available
  if (!targetFile) {
    targetFile = matchingFiles.find(f => f.deviceType === 'both') || matchingFiles[0];
  }
  
  // Log the access
  console.log(`[${username}] Smart link accessed: ${filename} - Device: ${deviceType} - Serving: ${targetFile.originalName}`);
  
  // Serve the file
  res.sendFile(targetFile.filePath);
});

// Direct file viewing
// Direct file viewing (by username and filename)
app.get('/view/:username/:filename', (req, res) => {
  const { username, filename } = req.params;
  
  if (!userDataByUsername[username]?.htmlFiles) {
    return res.status(404).send('User or file not found');
  }
  
  const userFiles = userDataByUsername[username].htmlFiles;
  const file = userFiles.find(f => f.filename === filename);
  
  if (!file) {
    return res.status(404).send('File not found');
  }
  
  console.log(`[${username}] Serving file: ${file.originalName}`);
  res.sendFile(file.filePath);
});

// List user's HTML files
app.get('/api/html-files', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  
  const username = req.session.userId;
  const userFiles = userDataByUsername[username]?.htmlFiles || [];
  
  console.log(`[${username}] Fetching HTML files. Total: ${userFiles.length}`);
  
  res.json({
    success: true,
    files: userFiles.map(file => ({
      id: file.id,
      originalName: file.originalName,
      deviceType: file.deviceType,
      description: file.description,
      publicUrl: file.publicUrl,
      smartUrl: file.smartUrl,
      uploadedAt: file.uploadedAt
    }))
  });
});

// Delete HTML file
app.delete('/api/html-files/:fileId', (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    
    const { fileId } = req.params;
    const username = req.session.userId;
    
    if (!userDataByUsername[username]?.htmlFiles) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    
    const fileIndex = userDataByUsername[username].htmlFiles.findIndex(f => f.id === fileId);
    if (fileIndex === -1) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    
    const file = userDataByUsername[username].htmlFiles[fileIndex];
    
    // Delete physical file
    if (fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath);
    }
    
    // Remove from array
    userDataByUsername[username].htmlFiles.splice(fileIndex, 1);
    
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting HTML file:', error);
    res.status(500).json({ success: false, error: 'Failed to delete file' });
  }
});

// Serve invoice template (legacy)
app.get('/invoice', (req, res) => {
  const invoicePath = path.resolve(__dirname, '..', 'public', 'invoice.html');
  res.sendFile(invoicePath);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get server info including public access details
app.get('/api/server-info', (req, res) => {
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  const localIPs = [];
  
  Object.keys(networkInterfaces).forEach(interfaceName => {
    networkInterfaces[interfaceName].forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIPs.push(iface.address);
      }
    });
  });

  // Detect the actual deployment URL (works for Render, Heroku, etc.)
  const protocol = req.protocol;
  const host = req.get('host');
  const deployedUrl = `${protocol}://${host}`;
  
  // Check if we're on a deployed environment (not localhost)
  const isDeployed = !host.includes('localhost') && !host.includes('127.0.0.1');

  res.json({
    success: true,
    serverInfo: {
      port: PORT,
      localAccess: isDeployed ? deployedUrl : `http://localhost:${PORT}`,
      networkAccess: isDeployed ? [] : localIPs.map(ip => `http://${ip}:${PORT}`),
      deployedUrl: isDeployed ? deployedUrl : null,
      invoiceUrl: `/invoice`,
      fullInvoiceUrls: {
        local: isDeployed ? `${deployedUrl}/invoice` : `http://localhost:${PORT}/invoice`,
        network: isDeployed ? [] : localIPs.map(ip => `http://${ip}:${PORT}/invoice`)
      }
    }
  });
});

// Smart routing endpoint for device-specific HTML files
app.get('/smart-route', (req, res) => {
  const desktopFileId = req.query.desktop;
  const mobileFileId = req.query.mobile;
  
  // Simple device detection based on user agent
  const userAgent = req.get('User-Agent') || '';
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // Determine which file to serve
  let targetFileId;
  if (isMobile && mobileFileId) {
    targetFileId = mobileFileId;
  } else if (!isMobile && desktopFileId) {
    targetFileId = desktopFileId;
  } else {
    // Fallback: use whichever file is available
    targetFileId = desktopFileId || mobileFileId;
  }
  
  if (!targetFileId) {
    return res.status(404).send('No HTML file configured for this device type');
  }
  
  // Find the file in all users' files
  let targetFile = null;
  let fileUsername = null;
  
  for (const [username, userData] of Object.entries(userDataByUsername)) {
    if (userData.htmlFiles) {
      const file = userData.htmlFiles.find(f => f.id === targetFileId);
      if (file) {
        targetFile = file;
        fileUsername = username;
        break;
      }
    }
  }
  
  if (!targetFile) {
    return res.status(404).send('HTML file not found');
  }
  
  console.log(`[${fileUsername}] Smart route: Device=${isMobile ? 'mobile' : 'desktop'}, File=${targetFile.originalName}`);
  
  // Redirect to the file view endpoint
  res.redirect(`/view/${fileUsername}/${targetFile.filename}`);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Email sender server running on http://0.0.0.0:${PORT}`);
  console.log(`Access from anywhere: http://YOUR_PUBLIC_IP:${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`Make sure to configure your environment variables in .env file`);
  console.log(`Server successfully started on port ${PORT}`);
});

module.exports = app;