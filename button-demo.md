# Email Button Demo

## How to Use the Button Builder

1. **Go to your email application**: http://localhost:3000

2. **In the message composer**, you'll see a "Button Builder" section with:
   - **Button Text**: Enter text like "View Invoice" or "Download Report"
   - **Button Link**: Enter the link like `http://192.168.31.232:3000/invoice`
   - **Button Style**: Choose color (Primary, Success, Warning, Danger, or Custom)
   - **Insert Button**: Click to add the button to your email

3. **Example Usage**:
   - Button Text: `View Your Invoice`
   - Button Link: `http://192.168.31.232:3000/invoice`
   - Style: Primary (Blue)

4. **The button will be inserted as HTML**:
```html
<div style="text-align: center; margin: 20px 0;">
    <a href="http://192.168.31.232:3000/invoice" style="
        display: inline-block;
        padding: 12px 30px;
        background-color: #007bff;
        color: #ffffff;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 600;
        font-size: 16px;
    ">
        View Your Invoice
    </a>
</div>
```

5. **When recipients click the button**:
   - They'll be redirected to your invoice page
   - The click will be tracked automatically
   - You can see click statistics in the Statistics tab

## Public Access Information

- **Local Access**: http://localhost:3000
- **Network Access**: http://192.168.31.232:3000
- **Invoice Template**: http://192.168.31.232:3000/invoice

## For Worldwide Access:
1. Find your public IP at: whatismyip.com
2. Configure router port forwarding for port 3000
3. Share: http://YOUR_PUBLIC_IP:3000