# Harshil Goyal — Web Development Services

A premium, minimalist web application built to sell web development services, showcase work portfolios, and manage client project inquiries. The design features a spacious achromatic layout, Geist typography, and a grayscale minimalist visual identity.

## 🚀 Key Features
- **Project Inquiry System**: Client inquiry form with rate-limiting, duplicate submission filtering, client-side validation, and instant email + WhatsApp alerts.
- **Service Details**: Interactive modal popups displaying scope, timeline, and dynamic pricing package choices.
- **Admin Lead Console**: A secure admin dashboard (`/admin`) to view stats (Total, New, In Discussion, In Progress, Completed), search and filter client leads, write follow-up notes, and export lead databases as JSON files.
- **Navigation Shortcuts**: Built-in keyboard shortcut: Press `Ctrl + 4` on the landing page to open the admin panel.
- **Stateless Vercel Support**: Ready for serverless deployment on Vercel with path fallback overrides.

---

## 🛠️ Local Installation & Launch

1. **Clone the repository**:
   ```bash
   git clone git@github.com:harshilgoyalup/sell-ai-websites.git
   cd sell-ai-websites
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file at the root of the project:
   ```env
   PORT=3000
   SESSION_SECRET=your-random-session-secret-string
   ADMIN_USER=admin
   ADMIN_PASS=admin123

   # Email Alerts Settings
   NOTIFICATION_EMAIL=arveharshil@gmail.com
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=arveharshil@gmail.com
   SMTP_PASS=your-gmail-app-password
   ```

4. **Start the server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Vercel Deployment & Secret Configuration

To deploy this application to Vercel, do **NOT** commit or upload the `.env` file to your Git repository. Committing secrets to public or private Git repositories is a critical security risk that makes them visible to anyone who has access to the repository.

Instead, configure them securely directly inside the Vercel console:

### 🔒 How to Add Environment Variables on Vercel:
1. Go to your **Vercel Dashboard** and open your project.
2. Navigate to **Settings** -> **Environment Variables**.
3. Add the following variables:
   - `SESSION_SECRET` = *(Some secure random string)*
   - `ADMIN_USER` = `admin` *(Your preferred admin login user)*
   - `ADMIN_PASS` = `your-admin-password` *(Your admin dashboard password)*
   - `NOTIFICATION_EMAIL` = `arveharshil@gmail.com`
   - `SMTP_HOST` = `smtp.gmail.com`
   - `SMTP_PORT` = `465`
   - `SMTP_USER` = `arveharshil@gmail.com`
   - `SMTP_PASS` = `your-gmail-app-password` *(Your generated 16-character Google App Password)*

Once configured, Vercel injects these secrets securely into the runtime environment without writing them to Git files.

---

## 🔒 Security & Validations
- **SQL Injection Prevention**: SQLite query parameterization is used for database inputs.
- **XSS Sanitization**: Dynamic HTML escaping filters out malicious script injections.
- **DDoS/Form Spam Prevention**: Endpoint rate limiting restricts the number of inquiries from a single IP.
- **Double Submission Filter**: Submissions block duplication within a 2-minute window.
- **Admin Access Protection**: Routing middleware redirects unauthorized visitors to the admin login page.
