/**
 * User Authentication Module
 * Local storage-based authentication for the Question Practice App
 * Can be replaced with a real authentication system later
 */

const UserAuth = {
    USERS_KEY: 'questionApp_users',
    CURRENT_USER_KEY: 'questionApp_currentUser',

    /**
     * Get all stored users
     * @returns {Array} Array of user objects
     */
    getUsers() {
        const users = localStorage.getItem(this.USERS_KEY);
        return users ? JSON.parse(users) : [];
    },

    /**
     * Save users to storage
     * @param {Array} users - Array of user objects
     */
    saveUsers(users) {
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    },

    /**
     * Get the currently logged in user
     * @returns {Object|null} Current user object or null
     */
    getCurrentUser() {
        const user = localStorage.getItem(this.CURRENT_USER_KEY);
        return user ? JSON.parse(user) : null;
    },

    /**
     * Set the current user
     * @param {Object} user - User object to set as current
     */
    setCurrentUser(user) {
        localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
    },

    /**
     * Clear the current user (logout)
     */
    logout() {
        localStorage.removeItem(this.CURRENT_USER_KEY);
    },

    /**
     * Check if a user is logged in
     * @returns {boolean}
     */
    isLoggedIn() {
        return this.getCurrentUser() !== null;
    },

    /**
     * Require login - redirects to login page if not logged in
     * @param {string} redirectUrl - URL to redirect to after login (optional)
     * @returns {Object|null} Current user if logged in
     */
    requireLogin(redirectUrl = null) {
        const user = this.getCurrentUser();
        if (!user) {
            const loginUrl = redirectUrl 
                ? `login.html?redirect=${encodeURIComponent(redirectUrl)}`
                : 'login.html';
            window.location.href = loginUrl;
            return null;
        }
        return user;
    },

    /**
     * Get user's initials
     * @param {Object} user - User object
     * @returns {string} Two-letter initials
     */
    getInitials(user) {
        if (!user) return '??';
        return (user.firstName.charAt(0) + user.lastName.charAt(0)).toUpperCase();
    },

    /**
     * Get user's full name
     * @param {Object} user - User object
     * @returns {string} Full name
     */
    getFullName(user) {
        if (!user) return 'Guest';
        return `${user.firstName} ${user.lastName}`;
    },

    /**
     * Update user progress for a mission/level
     * @param {string} mission - Mission name
     * @param {number} level - Level number
     * @param {Object} progressData - Progress data to store
     */
    updateProgress(mission, level, progressData) {
        const user = this.getCurrentUser();
        if (!user) return;

        if (!user.progress) user.progress = {};
        if (!user.progress[mission]) user.progress[mission] = {};
        
        user.progress[mission][level] = {
            ...user.progress[mission][level],
            ...progressData,
            lastUpdated: new Date().toISOString()
        };

        // Update current user
        this.setCurrentUser(user);

        // Update in users list
        const users = this.getUsers();
        const index = users.findIndex(u => u.id === user.id);
        if (index !== -1) {
            users[index] = user;
            this.saveUsers(users);
        }
    },

    /**
     * Get user progress for a mission/level
     * @param {string} mission - Mission name
     * @param {number} level - Level number (optional)
     * @returns {Object|null} Progress data
     */
    getProgress(mission, level = null) {
        const user = this.getCurrentUser();
        if (!user || !user.progress || !user.progress[mission]) return null;
        
        if (level !== null) {
            return user.progress[mission][level] || null;
        }
        return user.progress[mission];
    },

    /**
     * Create a user header element for pages
     * @returns {HTMLElement} Header element with user info and logout
     */
    createUserHeader() {
        const user = this.getCurrentUser();
        if (!user) return null;

        const header = document.createElement('div');
        header.className = 'user-header';
        header.innerHTML = `
            <style>
                .user-header {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 12px;
                    background: rgba(0, 0, 0, 0.7);
                    border: 2px solid #0f0;
                    border-radius: 8px;
                    box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
                    min-width: 80px;
                    margin-top: 5vh;
                }
                .user-header-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    font-size: 12px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                .user-header-info {
                    text-align: center;
                    margin-top: 4px;
                }
                .user-header-name {
                    font-weight: 600;
                    color: #0f0;
                    font-size: 10px;
                    font-family: 'Press Start 2P', cursive, monospace;
                    margin-bottom: 6px;
                }
                .user-header-year {
                    font-size: 8px;
                    color: #0f0;
                    opacity: 0.7;
                    font-family: 'Press Start 2P', cursive, monospace;
                }
                .user-header-btn {
                    padding: 4px 8px;
                    background: transparent;
                    border: 1px solid #0f0;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 7px;
                    color: #0f0;
                    font-family: 'Press Start 2P', cursive, monospace;
                    transition: all 0.2s;
                    width: 100%;
                }
                .user-header-btn:hover {
                    background: #0f0;
                    color: #000;
                }
                .user-header-buttons {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    width: 100%;
                    margin-top: 4px;
                }
            </style>
            <div class="user-header-avatar">${this.getInitials(user)}</div>
            <div class="user-header-info">
                <div class="user-header-name">${user.firstName}</div>
                <div class="user-header-year">Y${user.yearGroup}</div>
            </div>
            <div class="user-header-buttons">
                <button class="user-header-btn" onclick="window.location.href='Progress_Dashboard_dynamic_levels.html';">
                    Progress
                </button>
                <button class="user-header-btn" onclick="window.location.href='Pathway_Selector.html';">
                    Change Mission
                </button>
                <button class="user-header-btn" onclick="UserAuth.logout(); window.location.href='login.html';">
                    Logout
                </button>
            </div>
        `;

        return header;
    }
};

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserAuth;
}
