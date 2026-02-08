# Sinsane Website - Admin Panel Updates

## New Features Added

### 1. Image Upload for Blog Posts
- Direct thumbnail upload through the admin panel
- Images are stored in `/public/articles/img/`
- Drag-and-drop or click to upload
- Automatic file path assignment

### 2. Loadout Item Management
- Full CRUD operations for loadout items
- Add weapons, skins, categories, and sides
- Float value and StatTrak™ tracking
- Multiple screenshot uploads per item
- Screenshots stored in `/public/skins/img/`

### 3. User Management
- View all registered users
- Edit usernames
- Delete individual users
- Bulk delete functionality with checkbox selection
- Cannot delete your own admin account

### 4. Changelog Management
- Create and manage changelog entries
- Version tracking with dates
- Four categories: Added, Changed, Fixed, Removed
- Entries automatically displayed on changelog page

### 5. Blog Search Functionality
- Real-time search in blog page
- Search by title, description, or content
- Debounced input (300ms) for performance
- Results counter
- Works alongside sorting options

## Installation

1. Install dependencies:
```bash
npm install
```

2. Required dependencies:
- express
- sqlite3
- bcrypt
- express-session
- dotenv
- multer (for file uploads)

3. Create directory structure:
```
project/
├── server.js (in root)
├── public/
│   ├── admin.html
│   ├── blog.html
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── article.html
│   ├── loadout.html
│   ├── changelog.html
│   ├── articles/
│   │   └── img/
│   └── skins/
│       └── img/
└── src/
    └── db/
        └── sinsane.sqlite3
```

4. Create a `.env` file:
```
SESSION_SECRET=your-secret-key-here
PORT=3000
```

5. Start the server:
```bash
npm start
```

## Database Schema

### New Tables

**loadout_items**
- id (INTEGER PRIMARY KEY)
- weapon_name (TEXT)
- skin_name (TEXT)
- category (TEXT) - pistols, midtier, rifles, equipment
- side (TEXT) - both, t, ct
- description (TEXT)
- float_value (TEXT)
- stattrak (INTEGER) - 0 or 1
- screenshots (TEXT) - JSON array of image paths
- created_at (DATETIME)
- updated_at (DATETIME)

**changelog**
- id (INTEGER PRIMARY KEY)
- version (TEXT)
- date (DATE)
- added (TEXT) - newline-separated items
- changed (TEXT) - newline-separated items
- fixed (TEXT) - newline-separated items
- removed (TEXT) - newline-separated items
- created_at (DATETIME)

## API Endpoints

### File Upload
- `POST /api/upload` - Upload image (admin only)
  - Form data: image file, uploadType ('article' or 'skin')
  - Returns: { filename, path }

### Loadout Management
- `GET /api/loadout` - Get all loadout items (public)
- `GET /api/admin/loadout` - Get all items (admin)
- `POST /api/admin/loadout` - Create item (admin)
- `PUT /api/admin/loadout/:id` - Update item (admin)
- `DELETE /api/admin/loadout/:id` - Delete item (admin)

### User Management
- `GET /api/admin/users` - Get all users (admin)
- `PUT /api/admin/users/:id` - Update username (admin)
- `DELETE /api/admin/users/:id` - Delete user (admin)
- `POST /api/admin/users/bulk-delete` - Delete multiple users (admin)

### Changelog
- `GET /api/changelog` - Get all entries (public)
- `GET /api/admin/changelog` - Get all entries (admin)
- `POST /api/admin/changelog` - Create entry (admin)
- `PUT /api/admin/changelog/:id` - Update entry (admin)
- `DELETE /api/admin/changelog/:id` - Delete entry (admin)

### Blog Posts
- `GET /api/posts?search=term` - Search posts (public)

## Admin Panel Usage

### Access Admin Panel
1. Login with admin account
2. Navigate to `/admin.html`
3. Four tabs: Blog Posts, Loadout Items, User Management, Changelog

### Upload Images
1. Click or drag files to upload areas
2. Supported formats: JPEG, JPG, PNG, GIF, WebP
3. Max file size: 10MB
4. Files automatically saved to appropriate directory

### Manage Loadout Items
1. Click "Add New Item"
2. Fill in weapon details
3. Select category and side
4. Upload multiple screenshots
5. Save item

### Manage Users
1. Select users with checkboxes
2. Click "Delete Selected" for bulk deletion
3. Or use Edit/Delete buttons individually
4. Username changes must be unique

### Create Changelog
1. Enter version number and date
2. Add items to categories (one per line)
3. Empty categories are allowed
4. Save to publish

## Frontend Features

### Blog Search
- Type in search box to filter articles
- Searches title, description, and content
- 300ms debounce for smooth performance
- Shows result count
- Clears with empty search

## Security Notes

1. All admin routes require authentication
2. Session-based authentication
3. Passwords hashed with bcrypt
4. File upload validation (type and size)
5. XSS protection with HTML escaping
6. Cannot delete own admin account

## Troubleshooting

**Upload fails:**
- Check directory permissions for `/public/articles/img` and `/public/skins/img`
- Verify file size under 10MB
- Ensure image format is supported

**Database errors:**
- Ensure `/src/db/` directory exists
- Check write permissions
- Verify sqlite3 is installed

**Session issues:**
- Set SESSION_SECRET in .env
- Check cookie settings for your environment

## Future Enhancements

- Image compression on upload
- Crop/resize tools in admin panel
- Rich text editor for blog posts
- Markdown support
- Changelog auto-generation from git commits
- Loadout item public pages
- Advanced search filters