const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure upload directories exist
const uploadDirs = [
    './public/articles/img',
    './public/skins/img'
];

uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadType = req.body.uploadType || 'article';
        const destPath = uploadType === 'article' ? './public/articles/img' : './public/skins/img';
        cb(null, destPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// Database setup
const db = new sqlite3.Database('./src/db/sinsane.sqlite3', (err) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    // Users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            is_admin INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error creating users table:', err);
        } else {
            console.log('Users table ready');
        }
    });

    // Blog posts table
    db.run(`
        CREATE TABLE IF NOT EXISTS blog_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            description TEXT NOT NULL,
            content TEXT NOT NULL,
            thumbnail TEXT,
            date DATE NOT NULL,
            published INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error creating blog_posts table:', err);
        } else {
            console.log('Blog posts table ready');
        }
    });

    // Loadout items table
    db.run(`
        CREATE TABLE IF NOT EXISTS loadout_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            weapon_name TEXT NOT NULL,
            skin_name TEXT NOT NULL,
            category TEXT NOT NULL,
            side TEXT NOT NULL,
            description TEXT,
            float_value TEXT,
            stattrak INTEGER DEFAULT 0,
            screenshots TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error creating loadout_items table:', err);
        } else {
            console.log('Loadout items table ready');
        }
    });

    // Changelog table
    db.run(`
        CREATE TABLE IF NOT EXISTS changelog (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version TEXT NOT NULL,
            date DATE NOT NULL,
            added TEXT,
            changed TEXT,
            fixed TEXT,
            removed TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error creating changelog table:', err);
        } else {
            console.log('Changelog table ready');
        }
    });
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Middleware to check if user is admin
function isAdmin(req, res, next) {
    if (!req.session.userId || !req.session.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

// ==================== AUTH ROUTES ====================

// Register endpoint
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    if (username.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
        db.get('SELECT username FROM users WHERE username = ?', [username], async (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (row) {
                return res.status(400).json({ error: 'Username already exists' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            db.run('INSERT INTO users (username, password) VALUES (?, ?)', 
                [username, hashedPassword], 
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to create user' });
                    }

                    res.status(201).json({ 
                        message: 'User registered successfully',
                        userId: this.lastID
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Login endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        try {
            const match = await bcrypt.compare(password, user.password);

            if (match) {
                req.session.userId = user.id;
                req.session.username = user.username;
                req.session.isAdmin = user.is_admin === 1;

                res.json({ 
                    message: 'Login successful',
                    token: req.sessionID,
                    username: user.username,
                    isAdmin: user.is_admin === 1
                });
            } else {
                res.status(401).json({ error: 'Invalid credentials' });
            }
        } catch (error) {
            res.status(500).json({ error: 'Server error' });
        }
    });
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ message: 'Logged out successfully' });
    });
});

// Check authentication status
app.get('/api/auth/status', (req, res) => {
    if (req.session.userId) {
        res.json({ 
            authenticated: true,
            username: req.session.username,
            isAdmin: req.session.isAdmin || false
        });
    } else {
        res.json({ authenticated: false });
    }
});

// ==================== FILE UPLOAD ROUTES ====================

// Upload image endpoint
app.post('/api/upload', isAdmin, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const uploadType = req.body.uploadType || 'article';
    const folder = uploadType === 'article' ? 'articles/img' : 'skins/img';
    const filePath = `${folder}/${req.file.filename}`;

    res.json({ 
        message: 'File uploaded successfully',
        filename: req.file.filename,
        path: filePath
    });
});

// ==================== BLOG POSTS ROUTES (PUBLIC) ====================

// Get all published blog posts
app.get('/api/posts', (req, res) => {
    const search = req.query.search || '';
    let sql = 'SELECT * FROM blog_posts WHERE published = 1';
    let params = [];

    if (search) {
        sql += ' AND (title LIKE ? OR description LIKE ? OR content LIKE ?)';
        const searchTerm = `%${search}%`;
        params = [searchTerm, searchTerm, searchTerm];
    }

    sql += ' ORDER BY date DESC';

    db.all(sql, params, (err, posts) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ posts });
    });
});

// Get single blog post by slug
app.get('/api/posts/:slug', (req, res) => {
    db.get('SELECT * FROM blog_posts WHERE slug = ? AND published = 1', [req.params.slug], (err, post) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        res.json({ post });
    });
});

// ==================== LOADOUT ROUTES (PUBLIC) ====================

// Get all loadout items
app.get('/api/loadout', (req, res) => {
    db.all('SELECT * FROM loadout_items ORDER BY category, weapon_name', [], (err, items) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        // Parse screenshots JSON
        const parsedItems = items.map(item => ({
            ...item,
            screenshots: item.screenshots ? JSON.parse(item.screenshots) : []
        }));
        
        res.json({ items: parsedItems });
    });
});

// ==================== CHANGELOG ROUTES (PUBLIC) ====================

// Get all changelog entries
app.get('/api/changelog', (req, res) => {
    db.all('SELECT * FROM changelog ORDER BY date DESC', [], (err, entries) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ entries });
    });
});

// ==================== ADMIN ROUTES ====================

// Get all posts (including drafts) - Admin only
app.get('/api/admin/posts', isAdmin, (req, res) => {
    db.all('SELECT * FROM blog_posts ORDER BY date DESC', [], (err, posts) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ posts });
    });
});

// Create new blog post - Admin only
app.post('/api/admin/posts', isAdmin, (req, res) => {
    const { title, slug, description, content, thumbnail, date, published } = req.body;

    if (!title || !slug || !description || !content || !date) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const sql = `INSERT INTO blog_posts (title, slug, description, content, thumbnail, date, published) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [title, slug, description, content, thumbnail, date, published ? 1 : 0], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ error: 'A post with this slug already exists' });
            }
            return res.status(500).json({ error: 'Failed to create post' });
        }

        res.status(201).json({ 
            message: 'Post created successfully',
            postId: this.lastID
        });
    });
});

// Update blog post - Admin only
app.put('/api/admin/posts/:id', isAdmin, (req, res) => {
    const { title, slug, description, content, thumbnail, date, published } = req.body;
    const postId = req.params.id;

    if (!title || !slug || !description || !content || !date) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const sql = `UPDATE blog_posts 
                 SET title = ?, slug = ?, description = ?, content = ?, thumbnail = ?, 
                     date = ?, published = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`;
    
    db.run(sql, [title, slug, description, content, thumbnail, date, published ? 1 : 0, postId], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ error: 'A post with this slug already exists' });
            }
            return res.status(500).json({ error: 'Failed to update post' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        res.json({ message: 'Post updated successfully' });
    });
});

// Delete blog post - Admin only
app.delete('/api/admin/posts/:id', isAdmin, (req, res) => {
    const postId = req.params.id;

    db.run('DELETE FROM blog_posts WHERE id = ?', [postId], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete post' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        res.json({ message: 'Post deleted successfully' });
    });
});

// ==================== ADMIN LOADOUT ROUTES ====================

// Get all loadout items - Admin only
app.get('/api/admin/loadout', isAdmin, (req, res) => {
    db.all('SELECT * FROM loadout_items ORDER BY category, weapon_name', [], (err, items) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        const parsedItems = items.map(item => ({
            ...item,
            screenshots: item.screenshots ? JSON.parse(item.screenshots) : []
        }));
        
        res.json({ items: parsedItems });
    });
});

// Create new loadout item - Admin only
app.post('/api/admin/loadout', isAdmin, (req, res) => {
    const { weapon_name, skin_name, category, side, description, float_value, stattrak, screenshots } = req.body;

    if (!weapon_name || !skin_name || !category || !side) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const screenshotsJson = JSON.stringify(screenshots || []);
    const sql = `INSERT INTO loadout_items (weapon_name, skin_name, category, side, description, float_value, stattrak, screenshots) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [weapon_name, skin_name, category, side, description, float_value, stattrak ? 1 : 0, screenshotsJson], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to create loadout item' });
        }

        res.status(201).json({ 
            message: 'Loadout item created successfully',
            itemId: this.lastID
        });
    });
});

// Update loadout item - Admin only
app.put('/api/admin/loadout/:id', isAdmin, (req, res) => {
    const { weapon_name, skin_name, category, side, description, float_value, stattrak, screenshots } = req.body;
    const itemId = req.params.id;

    if (!weapon_name || !skin_name || !category || !side) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const screenshotsJson = JSON.stringify(screenshots || []);
    const sql = `UPDATE loadout_items 
                 SET weapon_name = ?, skin_name = ?, category = ?, side = ?, description = ?, 
                     float_value = ?, stattrak = ?, screenshots = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`;
    
    db.run(sql, [weapon_name, skin_name, category, side, description, float_value, stattrak ? 1 : 0, screenshotsJson, itemId], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to update loadout item' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Loadout item not found' });
        }

        res.json({ message: 'Loadout item updated successfully' });
    });
});

// Delete loadout item - Admin only
app.delete('/api/admin/loadout/:id', isAdmin, (req, res) => {
    const itemId = req.params.id;

    db.run('DELETE FROM loadout_items WHERE id = ?', [itemId], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete loadout item' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Loadout item not found' });
        }

        res.json({ message: 'Loadout item deleted successfully' });
    });
});

// ==================== ADMIN USER MANAGEMENT ROUTES ====================

// Get all users - Admin only
app.get('/api/admin/users', isAdmin, (req, res) => {
    db.all('SELECT id, username, is_admin, created_at FROM users ORDER BY created_at DESC', [], (err, users) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ users });
    });
});

// Update user - Admin only
app.put('/api/admin/users/:id', isAdmin, (req, res) => {
    const { username } = req.body;
    const userId = req.params.id;

    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    if (username.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    const sql = 'UPDATE users SET username = ? WHERE id = ?';
    
    db.run(sql, [username, userId], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ error: 'Username already exists' });
            }
            return res.status(500).json({ error: 'Failed to update user' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User updated successfully' });
    });
});

// Delete single user - Admin only
app.delete('/api/admin/users/:id', isAdmin, (req, res) => {
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (parseInt(userId) === req.session.userId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete user' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    });
});

// Bulk delete users - Admin only
app.post('/api/admin/users/bulk-delete', isAdmin, (req, res) => {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: 'No users selected' });
    }

    // Prevent admin from deleting themselves
    if (userIds.includes(req.session.userId)) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const placeholders = userIds.map(() => '?').join(',');
    const sql = `DELETE FROM users WHERE id IN (${placeholders})`;

    db.run(sql, userIds, function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete users' });
        }

        res.json({ 
            message: `${this.changes} user(s) deleted successfully`,
            count: this.changes
        });
    });
});

// ==================== ADMIN CHANGELOG ROUTES ====================

// Get all changelog entries - Admin only
app.get('/api/admin/changelog', isAdmin, (req, res) => {
    db.all('SELECT * FROM changelog ORDER BY date DESC', [], (err, entries) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ entries });
    });
});

// Create new changelog entry - Admin only
app.post('/api/admin/changelog', isAdmin, (req, res) => {
    const { version, date, added, changed, fixed, removed } = req.body;

    if (!version || !date) {
        return res.status(400).json({ error: 'Version and date are required' });
    }

    const sql = `INSERT INTO changelog (version, date, added, changed, fixed, removed) 
                 VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [version, date, added, changed, fixed, removed], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to create changelog entry' });
        }

        res.status(201).json({ 
            message: 'Changelog entry created successfully',
            entryId: this.lastID
        });
    });
});

// Update changelog entry - Admin only
app.put('/api/admin/changelog/:id', isAdmin, (req, res) => {
    const { version, date, added, changed, fixed, removed } = req.body;
    const entryId = req.params.id;

    if (!version || !date) {
        return res.status(400).json({ error: 'Version and date are required' });
    }

    const sql = `UPDATE changelog 
                 SET version = ?, date = ?, added = ?, changed = ?, fixed = ?, removed = ?
                 WHERE id = ?`;
    
    db.run(sql, [version, date, added, changed, fixed, removed, entryId], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to update changelog entry' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Changelog entry not found' });
        }

        res.json({ message: 'Changelog entry updated successfully' });
    });
});

// Delete changelog entry - Admin only
app.delete('/api/admin/changelog/:id', isAdmin, (req, res) => {
    const entryId = req.params.id;

    db.run('DELETE FROM changelog WHERE id = ?', [entryId], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete changelog entry' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Changelog entry not found' });
        }

        res.json({ message: 'Changelog entry deleted successfully' });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
