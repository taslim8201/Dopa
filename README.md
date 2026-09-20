# OTT Netlify + Cloudinary Starter

This version is designed for Netlify and mobile-friendly administration.

## Architecture

- Netlify hosts the website and serverless function.
- Netlify Blobs stores episode metadata.
- Cloudinary stores the actual video and thumbnail files.
- The browser uploads videos directly to Cloudinary, so large videos do not pass through a Netlify Function.

Netlify Functions have a 6 MB buffered request/response payload limit (binary uploads are effectively about 4.5 MB after base64 overhead), so sending full-size videos through a Function is not suitable. Cloudinary's browser Upload Widget supports direct unsigned uploads.

## Deploy

Upload this project to Netlify. The site publish directory is `public/`, and functions are in `netlify/functions/`.

Set this environment variable in Netlify:

ADMIN_PASSWORD=your-strong-password

After deploying, open `/admin.html`.

## Cloudinary setup

Create a Cloudinary account.

In Cloudinary:
1. Open Settings.
2. Open Upload > Upload presets.
3. Create an upload preset.
4. Set Signing mode to Unsigned.
5. Save it.
6. Copy your Cloud Name and preset name.

In this site's Admin page, enter the Cloud Name and Upload Preset. They are stored only in that browser's localStorage.

The Admin page has two upload buttons:
- Upload video
- Upload thumbnail

After both are selected, click Publish Episode. Episode metadata is stored in Netlify Blobs and the media URLs point to Cloudinary.

## Important

Unsigned Cloudinary uploads expose the cloud name and preset to the browser. Restrict the unsigned preset as much as possible (for example, video/image resource types and reasonable upload limits) and use signed uploads for a higher-security production setup.

Only upload videos you own or are authorized to distribute.
