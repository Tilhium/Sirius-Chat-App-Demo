# Deployment Guide / Yayınlama Kılavuzu 🌍

This document explains how to deploy the Real-Time Messaging App globally so anyone on the internet can access it.
Bu belge, Gerçek Zamanlı Mesajlaşma Uygulamasını herkesin internet üzerinden erişebileceği şekilde nasıl küresel olarak (global) yayınlayacağınızı açıklar.

---

## 🇹🇷 TÜRKÇE - Uygulamayı Globale Açma Rehberi

Uygulamanız iki ayrı parçadan (Backend ve Frontend) oluştuğu için ikisini de farklı platformlara veya aynı sunucuya yükleyebilirsiniz. En kolay, ücretsiz ve yaygın yöntem şudur: **Backend için Render, Frontend için Vercel veya Netlify kullanmak.**

### Adım 1: Veritabanı (MongoDB Atlas) Hazırlığı
1. Eğer MongoDB Atlas kullanıyorsanız, `Network Access` (Ağ Erişimi) ayarlarına gidin.
2. `0.0.0.0/0` (Allow access from anywhere - Her yerden erişime izin ver) seçeneğinin ekli olduğundan emin olun. Aksi takdirde sunucunuz veritabanına bağlanamaz.

### Adım 2: Backend (Sunucu) Yayınlama (Render.com)
1. Kodlarınızı GitHub'a yükleyin.
2. [Render.com](https://render.com) adresine gidin ve GitHub ile giriş yapın.
3. Sağ üstten **New > Web Service** seçeneğine tıklayın.
4. GitHub deponuzu (repository) seçin.
5. Ayarları şu şekilde yapın:
   - **Root Directory:** `server`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start` (veya `node index.js`)
6. **Environment Variables** (Ortam Değişkenleri) bölümünde, bilgisayarınızdaki `.env` dosyasında bulunan bilgileri ekleyin:
   - `MONGO_URI` = Sizin MongoDB bağlantı linkiniz
   - `JWT_SECRET` = Kendi belirlediğiniz gizli şifre
7. **Create Web Service** butonuna basın. Birkaç dakika içinde Render size bir link verecektir (örn: `https://chat-app-backend.onrender.com`). Bu linki kopyalayın.

### Adım 3: Frontend (İstemci) Yayınlama (Vercel)
1. `client/src/pages/Chat.jsx` ve `client/src/pages/Login.jsx` (ve varsa `Profile.jsx`) dosyalarını açın.
2. İçlerindeki `const SERVER_URL = 'http://localhost:5000';` kısmını bulup, Render'dan aldığınız canlı link ile değiştirin:
   `const SERVER_URL = 'https://chat-app-backend.onrender.com';`
3. Bu değişiklikleri yapıp GitHub'a tekrar push'layın (yükleyin).
4. [Vercel.com](https://vercel.com) adresine gidin ve giriş yapın.
5. **Add New > Project** seçeneğine tıklayarak GitHub deponuzu seçin.
6. **Root Directory** kısmını `client` olarak değiştirin (Çok Önemli!).
7. Vercel, uygulamanın Vite & React olduğunu otomatik anlayacaktır. **Deploy** butonuna tıklayın.
8. Kurulum bittiğinde Vercel size uygulamanızın canlı linkini verecektir. Artık uygulamanızı globale açtınız! 🎉

---

## 🇬🇧 ENGLISH - How to Deploy the App Globally

Since your application consists of two parts (Backend and Frontend), you need to host them. The easiest and most common free method is: **Render for the Backend, and Vercel or Netlify for the Frontend.**

### Step 1: Database (MongoDB Atlas) Preparation
1. Go to your MongoDB Atlas dashboard and navigate to `Network Access`.
2. Make sure you have added `0.0.0.0/0` (Allow access from anywhere). Otherwise, your live server won't be able to connect to the database.

### Step 2: Deploying the Backend (Render.com)
1. Push your code to GitHub.
2. Go to [Render.com](https://render.com) and log in with GitHub.
3. Click **New > Web Service** on the top right.
4. Select your GitHub repository.
5. Configure the settings as follows:
   - **Root Directory:** `server`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start` (or `node index.js`)
6. In the **Environment Variables** section, add the variables from your local `.env` file:
   - `MONGO_URI` = Your MongoDB connection string
   - `JWT_SECRET` = Your secure secret key
7. Click **Create Web Service**. After a few minutes, Render will provide a live URL (e.g., `https://chat-app-backend.onrender.com`). Copy this URL.

### Step 3: Deploying the Frontend (Vercel)
1. Open your `client/src/pages/Chat.jsx`, `client/src/pages/Login.jsx` (and `Profile.jsx` if applicable) files.
2. Find the line: `const SERVER_URL = 'http://localhost:5000';`
3. Replace `http://localhost:5000` with the live URL you got from Render:
   `const SERVER_URL = 'https://chat-app-backend.onrender.com';`
4. Commit and push these changes to GitHub.
5. Go to [Vercel.com](https://vercel.com) and log in.
6. Click **Add New > Project** and import your GitHub repository.
7. **IMPORTANT:** Change the **Root Directory** to `client`.
8. Vercel will automatically detect that it's a Vite (React) app. Click **Deploy**.
9. Once the build finishes, Vercel will give you a live URL for your frontend. Your app is now live globally! 🎉
