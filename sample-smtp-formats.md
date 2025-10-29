# SMTP Configuration Sample Files

## TXT Format (smtp-config.txt)
GMAIL1|gmail|your-email@gmail.com|your-app-password|Primary Gmail
OUTLOOK1|outlook|business@outlook.com|outlook-password|Business Outlook
CUSTOM1|custom|admin@company.com|smtp-password|Company SMTP|mail.company.com|587

## JSON Format (smtp-config.json)
{
  "GMAIL1": {
    "service": "gmail",
    "user": "your-email@gmail.com", 
    "password": "your-app-password",
    "label": "Primary Gmail"
  },
  "OUTLOOK1": {
    "service": "outlook",
    "user": "business@outlook.com",
    "password": "outlook-password", 
    "label": "Business Outlook"
  },
  "CUSTOM1": {
    "service": "custom",
    "user": "admin@company.com",
    "password": "smtp-password",
    "label": "Company SMTP",
    "host": "mail.company.com",
    "port": 587
  }
}