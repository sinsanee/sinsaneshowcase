# Blog.html Update Guide

Here are the specific changes you need to make to add search functionality to your blog.html:

## 1. UPDATE THE CONTROLS SECTION

Find the section with "Sort Controls" (around line 250-260) and REPLACE it with:

```html
<!-- Search and Sort Controls -->
<div class="controls-wrapper">
    <div class="search-box">
        <input type="text" id="search-input" placeholder="Search articles by title or content...">
    </div>
    <div class="sort-controls">
        <label for="sort-select">Sort by:</label>
        <select id="sort-select">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="alphabetical">Alphabetical</option>
        </select>
    </div>
</div>

<!-- Results Info -->
<div class="results-info" id="results-info"></div>
```

## 2. ADD CSS FOR SEARCH

Add these CSS rules to your `<style>` section (before the existing .sort-controls):

```css
/* Search and Sort Controls */
.controls-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    gap: 1rem;
    flex-wrap: wrap;
}

.search-box {
    flex: 1;
    max-width: 400px;
}

.search-box input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 2px solid var(--cherry-pink);
    border-radius: 5px;
    font-size: 1rem;
    transition: all 0.3s ease;
}

.search-box input:focus {
    outline: none;
    border-color: var(--dark-pink);
    box-shadow: 0 0 0 3px rgba(255, 183, 197, 0.2);
}

.search-box input::placeholder {
    color: #999;
}

.results-info {
    margin-bottom: 1rem;
    color: #666;
    font-size: 0.95rem;
}

.no-results {
    text-align: center;
    padding: 3rem;
    color: #999;
    font-size: 1.2rem;
}
```

Also ADD this to the mobile responsive section:

```css
@media (max-width: 768px) {
    .controls-wrapper {
        flex-direction: column;
        align-items: stretch;
    }

    .search-box {
        max-width: none;
    }

    .sort-controls {
        width: 100%;
        justify-content: space-between;
    }
}
```

## 3. UPDATE THE JAVASCRIPT

REPLACE your existing JavaScript section with this updated version:

```javascript
<script>
    let allArticles = [];
    let filteredArticles = [];
    let currentSort = 'newest';
    let currentSearch = '';

    // Fetch articles from database
    async function loadArticles() {
        try {
            const response = await fetch('/api/posts');
            const data = await response.json();
            allArticles = data.posts || [];
            
            // Transform database format
            allArticles = allArticles.map(post => ({
                title: post.title,
                date: post.date,
                description: post.description,
                content: post.content,
                thumbnail: post.thumbnail,
                url: `article.html?slug=${post.slug}`
            }));
            
            applyFiltersAndSort();
        } catch (error) {
            console.error('Failed to load articles:', error);
            document.getElementById('articles-container').innerHTML = 
                '<div class="no-results">Failed to load articles. Please try again later.</div>';
        }
    }

    // Function to format date
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    }

    // Function to search articles
    function searchArticles(articles, searchTerm) {
        if (!searchTerm) return articles;
        
        const term = searchTerm.toLowerCase();
        return articles.filter(article => {
            return article.title.toLowerCase().includes(term) ||
                   article.description.toLowerCase().includes(term) ||
                   article.content.toLowerCase().includes(term);
        });
    }

    // Function to sort articles
    function sortArticles(articles, sortType) {
        const sorted = [...articles];

        switch(sortType) {
            case 'newest':
                sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
                break;
            case 'oldest':
                sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
                break;
            case 'alphabetical':
                sorted.sort((a, b) => a.title.localeCompare(b.title));
                break;
        }

        return sorted;
    }

    // Function to apply filters and sort
    function applyFiltersAndSort() {
        // First search
        filteredArticles = searchArticles(allArticles, currentSearch);
        
        // Then sort
        filteredArticles = sortArticles(filteredArticles, currentSort);
        
        // Update results info
        updateResultsInfo();
        
        // Render
        renderArticles();
    }

    // Function to update results info
    function updateResultsInfo() {
        const infoElement = document.getElementById('results-info');
        const total = allArticles.length;
        const showing = filteredArticles.length;
        
        if (currentSearch) {
            infoElement.textContent = `Showing ${showing} of ${total} article${total !== 1 ? 's' : ''} for "${currentSearch}"`;
        } else {
            infoElement.textContent = `Showing ${showing} article${showing !== 1 ? 's' : ''}`;
        }
    }

    // Function to render articles
    function renderArticles() {
        const container = document.getElementById('articles-container');
        container.innerHTML = '';

        if (filteredArticles.length === 0) {
            if (currentSearch) {
                container.innerHTML = `<div class="no-results">No articles found for "${currentSearch}". Try a different search term.</div>`;
            } else {
                container.innerHTML = '<div class="no-results">No articles yet. Stay tuned!</div>';
            }
            return;
        }

        filteredArticles.forEach(article => {
            const articleCard = document.createElement('div');
            articleCard.className = 'article-card';
            articleCard.innerHTML = `
                <div class="article-thumbnail">
                    <img src="${article.thumbnail}" alt="${escapeHtml(article.title)}">
                </div>
                <div class="article-content">
                    <div class="article-info">
                        <h2 class="article-title">${escapeHtml(article.title)}</h2>
                        <p class="article-meta">${formatDate(article.date)}</p>
                        <p class="article-description">${escapeHtml(article.description)}</p>
                    </div>
                    <a href="${article.url}" class="read-more-btn">Read More</a>
                </div>
            `;
            container.appendChild(articleCard);
        });
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Event listener for search input with debounce
    let searchTimeout;
    document.getElementById('search-input').addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearch = e.target.value.trim();
            applyFiltersAndSort();
        }, 300); // Wait 300ms after user stops typing
    });

    // Event listener for sort select
    document.getElementById('sort-select').addEventListener('change', function(e) {
        currentSort = e.target.value;
        applyFiltersAndSort();
    });

    // Initial load
    loadArticles();

    // Add active state to current page link
    document.querySelectorAll('.nav-links a').forEach(link => {
        if (link.getAttribute('href') === 'blog.html') {
            link.style.backgroundColor = 'var(--cherry-pink)';
            link.style.color = 'var(--black)';
        }
    });
</script>
```

That's it! These changes add:
- Search box that filters by title, description, and content
- Results counter showing "X of Y articles"
- Debounced search (waits 300ms after typing stops)
- Works perfectly with existing sort functionality
