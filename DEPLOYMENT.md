# Deployment Guide for GitHub Pages

This guide will help you deploy the RNS V2 Manager to GitHub Pages.

## 🌐 Live Deployment

The official RNS V2 Manager is currently hosted at:

**[https://radixnameservice.github.io/rns-management-client/](https://radixnameservice.github.io/rns-management-client/)**

This deployment is automatically updated whenever changes are pushed to the main branch.

---

## 🚀 Quick Deployment (Automated with GitHub Actions)

The easiest way to deploy is using the included GitHub Actions workflow.

### Step 1: Configure the Base Path

1. Open `vite.config.js`
2. Update the `base` property to match your repository name:
   ```javascript
   base: '/your-repo-name/',
   ```
   For example, if your repo is `rns-management-client`:
   ```javascript
   base: '/rns-management-client/',
   ```

### Step 2: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**
4. Save the settings

### Step 3: Push Your Code

```bash
git add .
git commit -m "Add GitHub Pages deployment"
git push origin main
```

The GitHub Action will automatically build and deploy your site!

Your site will be available at: `https://your-username.github.io/your-repo-name/`

---

## 📦 Manual Deployment (Alternative Method)

If you prefer to deploy manually using the `gh-pages` package:

### Step 1: Install gh-pages

```bash
npm install --save-dev gh-pages
```

### Step 2: Configure Base Path

Same as above - update `vite.config.js` with your repository name.

### Step 3: Deploy

Run the deployment command:

```bash
npm run deploy
```

This will:
1. Build your application
2. Create/update the `gh-pages` branch
3. Push the built files to GitHub Pages

### Step 4: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select **Deploy from a branch**
4. Select the `gh-pages` branch and `/ (root)` folder
5. Click **Save**

Wait a few minutes, and your site will be live at:
`https://your-username.github.io/your-repo-name/`

---

## 🌐 Custom Domain (Optional)

To use a custom domain:

1. Create a `CNAME` file in the `public/` directory:
   ```
   your-custom-domain.com
   ```

2. Update your DNS settings with your domain provider:
   - Add a CNAME record pointing to `your-username.github.io`
   - Or add A records pointing to GitHub's IP addresses

3. In GitHub Settings → Pages, enter your custom domain

4. Update `vite.config.js`:
   ```javascript
   base: '/',  // Use root for custom domains
   ```

---

## 🔍 Troubleshooting

### Site Shows 404
- Verify the `base` path in `vite.config.js` matches your repository name
- Check that GitHub Pages is enabled in repository settings
- Wait a few minutes after deployment for changes to propagate

### Assets Not Loading
- Ensure `base` path ends with a `/`
- Check browser console for path errors
- Verify all imports use relative paths

### Build Fails
- Run `npm run build` locally to check for errors
- Ensure all dependencies are in `package.json`
- Check that Node.js version matches (v16+)

### GitHub Action Fails
- Check the Actions tab for error details
- Verify `GITHUB_TOKEN` has Pages permissions
- Ensure the workflow file is in `.github/workflows/`

---

## 🔄 Updating Your Deployment

### Using GitHub Actions (Automatic)
Simply push to main branch:
```bash
git add .
git commit -m "Update site"
git push origin main
```

### Using Manual Deploy
Run the deploy command:
```bash
npm run deploy
```

---

## 📊 Monitoring Deployments

- **GitHub Actions**: Check the Actions tab in your repository
- **Manual deploys**: Check the `gh-pages` branch for deployment history
- **Live site**: Visit Settings → Pages to see deployment status and URL

---

## 🎯 Best Practices

1. **Always test locally** before deploying:
   ```bash
   npm run build
   npm run preview
   ```

2. **Use environment variables** for sensitive data (never commit secrets)

3. **Keep dependencies updated**:
   ```bash
   npm update
   ```

4. **Monitor build size** - GitHub Pages has a 1GB limit

5. **Set up branch protection** on `main` to prevent accidental deploys

---

## 📝 Additional Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Custom Domain Setup](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)

---

**Your RNS V2 Manager is now ready for deployment! 🎉**

