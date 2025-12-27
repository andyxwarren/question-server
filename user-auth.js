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
                ? `index.html?redirect=${encodeURIComponent(redirectUrl)}`
                : 'index.html';
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
     * Generate a UUID (uses crypto if available, otherwise fallback)
     * @returns {string}
     */
    generateUUID() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }

        // Fallback UUID generator
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    /**
     * Get year group for a user (calculated from DOB or existing value)
     * @param {Object} user - User object
     * @returns {number} Year group (0 for Reception, 1+ for Year)
     */
    getYearGroup(user) {
        if (user.dateOfBirth) {
            const birthDate = new Date(user.dateOfBirth);
            const today = new Date();
            let schoolStartYear = today.getFullYear();
            if (today.getMonth() < 8) { // Before September
                schoolStartYear--;
            }
            const schoolStart = new Date(schoolStartYear, 8, 1); // September 1
            let age = schoolStart.getFullYear() - birthDate.getFullYear();
            if (schoolStart.getMonth() < birthDate.getMonth() || (schoolStart.getMonth() === birthDate.getMonth() && schoolStart.getDate() < birthDate.getDate())) {
                age--;
            }
            if (age >= 5) {
                return age - 4; // Year 1 at 5, etc.
            } else {
                return 0; // Reception
            }
        } else {
            return user.yearGroup || 1;
        }
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
     * @returns {HTMLElement} Header element with avatar and hamburger menu
     */
    createUserHeader(options = {}) {
        const user = this.getCurrentUser();
        if (!user) return null;

        const defaultMenuItems = [
            {
                id: 'menuInitialisationProgressBtn',
                icon: '📊',
                labelLines: ['Initialisation', 'Progress'],
                href: 'initialise_user.html'
            },
            {
                id: 'menuKeyBtn',
                icon: '🔑',
                labelLines: ['Key'],
                hidden: true
            },
            {
                id: 'menuAboutQsiBtn',
                icon: 'ℹ️',
                labelLines: ['Initialisation', 'Guidance'],
                hidden: true
            },
            {
                id: 'menuLogoutBtn',
                icon: '🚪',
                labelLines: ['Logout'],
                action: 'logout'
            }
        ];

        const menuItems = Array.isArray(options.menuItems) && options.menuItems.length > 0
            ? options.menuItems
            : defaultMenuItems;

        const header = document.createElement('div');
        header.className = 'user-header';
        header.innerHTML = `
            <style>
                .user-header {
                    display: flex;
                    align-items: center;
                    position: relative;
                }
                .user-header-menu-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 10px 4px 4px;
                    border-radius: 20px;
                    background: rgba(0, 0, 0, 0.7);
                    border: 2px solid #0f0;
                    color: #0f0;
                    font-size: 18px;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 0 8px rgba(0, 255, 0, 0.3);
                }
                .user-header-menu-btn:hover {
                    background: rgba(0, 255, 0, 0.2);
                }
                .user-header-avatar {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    font-size: 11px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                .user-header-dropdown {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    margin-top: 8px;
                    background: rgba(0, 0, 0, 0.95);
                    border: 2px solid #0f0;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0, 255, 0, 0.3);
                    min-width: 160px;
                    display: none;
                    flex-direction: column;
                    overflow: hidden;
                    z-index: 1001;
                }
                .user-header-dropdown.open {
                    display: flex;
                }
                .user-header-dropdown-header {
                    padding: 12px;
                    border-bottom: 1px solid rgba(0, 255, 0, 0.3);
                    text-align: center;
                }
                .user-header-dropdown-name {
                    font-weight: 600;
                    color: #0f0;
                    font-size: 12px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                .user-header-dropdown-year {
                    font-size: 10px;
                    color: #0f0;
                    opacity: 0.7;
                    margin-top: 2px;
                }
                .user-header-dropdown-progress {
                    font-size: 11px;
                    color: #0ff;
                    margin-top: 6px;
                    padding-top: 6px;
                    border-top: 1px solid rgba(0, 255, 0, 0.2);
                }
                .user-header-dropdown-btn {
                    padding: 12px 16px;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    font-size: 13px;
                    color: #0f0;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    transition: all 0.2s;
                    text-align: left;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .user-header-dropdown-btn:hover {
                    background: rgba(0, 255, 0, 0.2);
                }
                .user-header-dropdown-btn:not(:last-child) {
                    border-bottom: 1px solid rgba(0, 255, 0, 0.1);
                }
                .user-header-dropdown-info {
                    padding: 12px 16px;
                    font-size: 13px;
                    color: #0f0;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    border-bottom: 1px solid rgba(0, 255, 0, 0.1);
                    background: rgba(0, 255, 0, 0.05);
                }
                .user-header-dropdown-btn .menu-item-icon {
                    width: 26px;
                    display: flex;
                    justify-content: center;
                }
                .user-header-dropdown-btn .menu-item-label {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    flex: 1;
                    text-align: left;
                    line-height: 1.1;
                    gap: 2px;
                }
                .user-header-dropdown-btn .menu-item-label > span {
                    display: block;
                    width: 100%;
                }
            </style>
            <button class="user-header-menu-btn" id="userMenuBtn" title="Menu">
                <span class="user-header-avatar">${this.getInitials(user)}</span>
                <span>☰</span>
            </button>
            <div class="user-header-dropdown" id="userMenuDropdown">
                <div class="user-header-dropdown-header">
                    <div class="user-header-dropdown-name">${user.firstName} ${user.lastName}</div>
                    <div class="user-header-dropdown-year">${this.getYearGroup(user) === 0 ? 'Reception' : 'Year ' + this.getYearGroup(user)}</div>
                    <div class="user-header-dropdown-progress" id="menuQuestionProgress" style="display:none;">
                        📝 <span id="menuQuestionCount">Q 1 of 25</span>
                    </div>
                </div>
                ${menuItems.map(item => {
                    const labelHtml = Array.isArray(item.labelLines)
                        ? item.labelLines.map(line => `<span>${line}</span>`).join('')
                        : `<span>${item.label || ''}</span>`;
                    const styleAttr = item.hidden ? 'display:none;' : '';
                    const idAttr = item.id ? `id="${item.id}"` : '';
                    const hrefAttr = item.href ? `data-href="${item.href}"` : '';
                    const actionAttr = item.action ? `data-action="${item.action}"` : '';
                    return `
                        <button class="user-header-dropdown-btn" ${idAttr} ${hrefAttr} ${actionAttr} style="${styleAttr}">
                            <span class="menu-item-icon">${item.icon || ''}</span>
                            <span class="menu-item-label">${labelHtml}</span>
                        </button>
                    `;
                }).join('')}
            </div>
        `;

        // Add click handler for hamburger menu
        const menuBtn = header.querySelector('#userMenuBtn');
        const dropdown = header.querySelector('#userMenuDropdown');
        
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!header.contains(e.target)) {
                dropdown.classList.remove('open');
            }
        });

        const customHandlers = options.customHandlers || {};
        dropdown.querySelectorAll('.user-header-dropdown-btn').forEach(btn => {
            const href = btn.dataset.href;
            const action = btn.dataset.action;
            const handler = customHandlers[btn.id];

            if (handler) {
                btn.addEventListener('click', handler);
                return;
            }

            if (action === 'logout') {
                btn.addEventListener('click', () => {
                    UserAuth.logout();
                    window.location.href = 'index.html';
                });
            } else if (href) {
                btn.addEventListener('click', () => {
                    window.location.href = href;
                });
            }
        });

        return header;
    }
};

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserAuth;
}
