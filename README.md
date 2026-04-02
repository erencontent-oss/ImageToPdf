# Car Image PDF Tool - Vercel Deployment

This app is ready to be deployed to Vercel.

## 1. Prerequisites
- A Vercel account.
- Node.js installed locally.

## 2. Installation
Install dependencies:
```bash
npm install sharp pdf-lib express multer cors
```

## 3. Vercel Configuration
Create a `vercel.json` in the root:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/generate.js",
      "use": "@vercel/node"
    },
    {
      "src": "index.html",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/generate",
      "dest": "/api/generate.js"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

## 4. Deployment
1. Push your code to GitHub.
2. Connect your repo to Vercel.
3. Vercel will automatically detect the settings and deploy.

## 5. Local Development
Run the server:
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.
