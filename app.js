/**
 * Question Practice App - Main Application
 */

class QuestionApp {
    constructor() {
        this.allQuestions = []; // To store the full, unfiltered list
        this.questions = [];
        this.metadata = null;
        this.currentIndex = 0;
        this.userAnswers = new Map(); // questionId -> {answer: string, isCorrect: boolean}
        this.hasSubmittedCurrent = false;
        this.selectedOption = null; // For multiple choice questions
        this.questionStartTime = null; // Timestamp when current question displayed
        this.notificationTimeout = null; // For auto-hiding notifications
        this.mcInputBuffer = ''; // Buffer for multi-digit MC answer input
        this.mcInputTimeout = null; // Timeout for the buffer
        this.activeInput = null; // For on-screen keyboard targeting
        this.adventureLog = []; // Log for CSV export
        this.urlStartLevel = null; // Level provided via URL (initialise mode)
        const currentUser = UserAuth?.getCurrentUser?.();
        this.currentUser = typeof UserAuth !== 'undefined' ? currentUser : null; // Get logged in user
        this.userId = currentUser ? currentUser.id || currentUser.user_id : this.generateUUID(); // Use user ID if logged in
        console.log('QuestionApp initialized - currentUser:', this.currentUser);
        this.batchId = Math.floor(Date.now() / 1000); // Seconds timestamp (fits 32-bit integer)
        this.logFileHandle = null; // For the File System Access API
        this.logQueue = []; // A queue for log entries to be written
        console.log('QuestionApp constructor called at', new Date().toISOString()); // Debug log for page resets
        this.loggingInitPromise = null;
        this.fileHandleDBPromise = null;
        this.fileHandleDBName = 'QuestionAppLogging';
        this.fileHandleStoreName = 'loggingHandles';
        this.logHandleKey = 'userAdventure';
        this.loggingBannerDismissed = false;
        this.isPromptingForLogFile = false;
        this.isProcessingLogQueue = false;

        // Detect initialise mode
        this.isInitialiseMode = document.location.pathname.includes('initialise');

        // Supabase client for logging
        this.supabaseUrl = 'https://aguoxnxygbeochznszgb.supabase.co'; // Your Supabase URL
        this.supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFndW94bnh5Z2Jlb2Noem5zemdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5Mzk0MDcsImV4cCI6MjA2NjUxNTQwN30.IfY9TbM5Kmvsow88vCHfeIjQfjyWdC3ufhLjTPN8GGQ'; // Your Supabase anon key
        this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseAnonKey);

        // Progression System Properties
        this.schoolLevels = ['1', '2', '3', '4', '5', '6'];
        this.pundexTiers = ['Beginning', 'Developing', 'Meeting', 'Exceeding']; // Data names
        this.pundexDisplayNames = { 'Beginning': 'Ignition', 'Developing': 'Charging', 'Meeting': 'Ready', 'Exceeding': 'Power Up' };
        this.currentMission = null;
        this.currentSchoolLevel = 1;
        this.currentPundex = 'Beginning';
        this.pundexAnswerHistory = [];
        this.progressionStatusEl = document.getElementById('progression-status');
        this.powerMeterEl = document.getElementById('power-meter');
        this.questionMetadata = document.getElementById('question-metadata'); // Re-add this reference

        this.initializeElements();
        this.setupUI();
        this.loggingInitPromise = this.initializeLogging();
        this.autoLoadFromUrl();

    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        // Notification
        this.notification = document.getElementById('notification');
        this.notificationMessage = document.getElementById('notification-message');
        this.notificationClose = document.getElementById('notification-close');

        // Upload section
        this.fileInput = document.getElementById('json-file-input');
        this.uploadSection = document.getElementById('upload-section');
        this.metadataDisplay = document.getElementById('metadata-display');
        this.selectTopicsBtn = document.getElementById('select-topics-btn');
        this.startBtn = document.getElementById('start-btn');

        // Question section
        this.questionSection = document.getElementById('question-section');
        this.progressIndicator = document.getElementById('progress-indicator');
        this.questionMetadata = document.getElementById('question-metadata');
        this.levelIndicator = document.getElementById('level-indicator');
        this.sessionControls = document.getElementById('session-controls');
        this.hintContainer = document.getElementById('hint-container');
        this.questionDisplay = document.getElementById('question-display');
        this.answerArea = document.getElementById('answer-area');
        this.answerInput = document.getElementById('answer-input');
        this.feedbackArea = document.getElementById('feedback-area');
        this.actionBtn = null; // Dynamically assigned

        // On-screen keyboard
        this.keyboard = document.getElementById('on-screen-keyboard');
        this.keyboardToggleBtn = document.getElementById('keyboard-toggle-btn');
        // Default keyboard visibility based on device type
        // Laptop: > 1024px width (keyboard OFF)
        // Tablet: 768-1024px width (keyboard ON, side-by-side layout)
        // Phone: < 768px width (keyboard ON, stacked layout)
        this.isLaptop = window.matchMedia('(min-width: 1025px)').matches;
        this.keyboardVisible = !this.isLaptop; // Hidden on laptop, visible on tablet/phone

        // Topic Modal
        this.topicModal = document.getElementById('topic-modal');
        this.closeModalBtn = document.getElementById('close-modal-btn');
        this.topicListContainer = document.getElementById('topic-list-container');
        this.confirmTopicsBtn = document.getElementById('confirm-topics-btn');

        // Results section
        this.resultsSection = document.getElementById('results-section');
        this.resultsDisplay = document.getElementById('results-display');
        this.restartBtn = document.getElementById('restart-btn');
        this.loggingBanner = document.getElementById('logging-permission-banner');
        this.allowLoggingBtn = document.getElementById('allow-logging-btn');
        this.dismissLoggingBtn = document.getElementById('dismiss-logging-banner');
    }

    /**
     * Attach event listeners
     */
    setupUI() {
        this.notificationClose.addEventListener('click', () => this.hideNotification());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        this.selectTopicsBtn.addEventListener('click', () => this.openTopicModal());
        this.startBtn.addEventListener('click', () => this.startQuestions());
        this.closeModalBtn.addEventListener('click', () => this.closeTopicModal());
        this.confirmTopicsBtn.addEventListener('click', () => this.confirmTopicSelection());
        this.restartBtn.addEventListener('click', () => this.restart());
        this.keyboardToggleBtn.addEventListener('click', () => this.toggleKeyboardVisibility());
        if (this.allowLoggingBtn) {
            this.allowLoggingBtn.addEventListener('click', () => this.handleLoggingPermissionRequest());
        }
        if (this.dismissLoggingBtn) {
            this.dismissLoggingBtn.addEventListener('click', () => this.dismissLoggingBanner());
        }

        // Initialize keyboard state and device-specific classes
        this.initializeDeviceLayout();

        // Use event delegation for dynamically created elements
        this.hintContainer.addEventListener('click', (e) => {
            if (e.target.id === 'hint-btn') {
                const hint = e.target.dataset.hint;
                this.showNotification(hint, 'info', 5000);
            }
        });

        this.sessionControls.addEventListener('click', (e) => {
            if (e.target.id === 'end-session-btn') {
                this.endSession();
            }
        });

        this.answerArea.addEventListener('click', (e) => {
            if (e.target.id === 'action-btn') {
                this.handleActionClick();
            }
            if (e.target.classList.contains('choice-btn')) {
                this.selectOption(e.target);
            }
        });

        // Use event delegation for live input formatting
        this.answerArea.addEventListener('input', (e) => {
            if (e.target.id === 'answer-input') {
                const input = e.target;
                const originalValue = input.value;
                const originalCursorPos = input.selectionStart;

                // Count commas before the cursor in the original value
                const commasBeforeCursor = (originalValue.substring(0, originalCursorPos).match(/,/g) || []).length;

                // Get raw number and format it
                const rawValue = originalValue.replace(/,/g, '');
                if (isNaN(rawValue) || rawValue === '') return;

                const formattedValue = new Intl.NumberFormat('en-US').format(rawValue);

                // If the formatted value is different, update the input
                if (originalValue !== formattedValue) {
                    input.value = formattedValue;

                    // Calculate the new cursor position
                    const newCommasBeforeCursor = (formattedValue.substring(0, originalCursorPos).match(/,/g) || []).length;
                    const newCursorPos = originalCursorPos + (newCommasBeforeCursor - commasBeforeCursor);

                    // Check for edge cases where cursor moves unexpectedly
                    const finalCursorPos = Math.max(0, Math.min(newCursorPos, formattedValue.length));

                    input.setSelectionRange(finalCursorPos, finalCursorPos);
                }
            }
        });

        document.addEventListener('keydown', (e) => {
            if (this.questionSection.classList.contains('hidden')) return;

            const currentQuestion = this.questions[this.currentIndex];

            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleActionClick();
                return; // Stop further processing
            }

            // Handle keyboard input for multiple-choice questions (numbers and symbols)
            if (currentQuestion && currentQuestion.questionType === 'multiple_choice' && !this.hasSubmittedCurrent && /[\d.+\-*\/x]/.test(e.key)) {
                e.preventDefault();
                clearTimeout(this.mcInputTimeout);

                // Map aliases to their standard symbols
                let keyValue = e.key;
                if (keyValue.toLowerCase() === 'x' || keyValue === '*') keyValue = '×';
                if (keyValue === '/') keyValue = '÷';

                const potentialMatch = this.mcInputBuffer + keyValue;
                const choiceValues = Array.from(this.answerArea.querySelectorAll('.choice-btn')).map(btn => btn.dataset.value);

                const exactMatch = choiceValues.find(val => val === potentialMatch);
                const isPrefix = choiceValues.some(val => val.startsWith(potentialMatch));

                if (exactMatch) {
                    // Found a perfect match. Select it.
                    this.selectOption(this.answerArea.querySelector(`[data-value="${exactMatch}"]`));
                    this.mcInputBuffer = potentialMatch; // Keep buffer in case it's also a prefix
                } else {
                    // No exact match, but it could be a prefix of a longer number.
                    this.mcInputBuffer = potentialMatch;
                }

                // If the current buffer is not a prefix of any option, reset it.
                if (!isPrefix) {
                    this.mcInputBuffer = '';
                }

                // Set a timeout to clear the buffer if the user stops typing.
                this.mcInputTimeout = setTimeout(() => {
                    this.mcInputBuffer = '';
                }, 800);
            }
        });

        this.answerArea.addEventListener('focusin', (e) => {
            if (e.target.matches('input[type="text"]')) {
                this.activeInput = e.target;
            }
        });

        this.attachKeyboardListeners();
    }

    /**
     * Attach keyboard button listeners
     */
    attachKeyboardListeners() {
        const keyboardButtons = document.querySelectorAll('.keyboard-btn');
        keyboardButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (this.hasSubmittedCurrent) return; // Disable keyboard after submission

                const value = btn.getAttribute('data-value');
                const action = btn.getAttribute('data-action');

                if (value) {
                    this.handleKeyboardInput(value);
                } else if (action) {
                    this.handleKeyboardAction(action);
                }
            });
        });
    }

    /**
     * Handle keyboard number/decimal input
     */
    handleKeyboardInput(value) {
        if (!this.activeInput) return;

        const currentValue = this.activeInput.value;
        if (value === '.' && currentValue.includes('.')) {
            return;
        }
        this.activeInput.value += value;
    }

    /**
     * Handle keyboard actions (clear, backspace, negative)
     */
    handleKeyboardAction(action) {
        if (!this.activeInput) return;

        let currentValue = this.activeInput.value;

        switch (action) {
            case 'clear':
                this.activeInput.value = '';
                break;

            case 'backspace':
                this.activeInput.value = currentValue.slice(0, -1);
                break;

            case 'negative':
                if (currentValue.startsWith('-')) {
                    this.activeInput.value = currentValue.substring(1);
                } else {
                    this.activeInput.value = '-' + currentValue;
                }
                break;
        }
    }

    /**
     * Update the action button label based on submission state
     */
    updateActionButtonLabel() {
        if (!this.actionBtn) return;
        if (this.hasSubmittedCurrent) {
            this.actionBtn.textContent = this.currentIndex === this.questions.length - 1
                ? 'Finish'
                : 'Next →';
        } else {
            this.actionBtn.textContent = 'Submit Answer';
        }
    }

    /**
     * Show or hide on-screen keyboard (based on question type and user preference)
     */
    toggleKeyboard(show) {
        if (show && this.keyboardVisible) {
            this.keyboard.classList.remove('hidden');
            this.keyboardToggleBtn.classList.add('active');
        } else {
            this.keyboard.classList.add('hidden');
            if (!show) {
                // Question type doesn't need keyboard
                this.keyboardToggleBtn.classList.remove('active');
            }
        }
    }

    /**
     * Initialize device-specific layout
     * Breakpoints:
     * - Laptop: > 1024px (1920x1080) - keyboard OFF, standard layout
     * - Tablet: 768-1024px (1024x768 landscape) - keyboard ON, side-by-side
     * - Phone: < 768px (360x780 portrait) - keyboard ON, stacked
     */
    initializeDeviceLayout() {
        // Detect device type based on width
        const width = window.innerWidth;
        const isTablet = width >= 768 && width <= 1024;
        const isPhone = width < 768;
        
        // Add device class to body for CSS targeting
        document.body.classList.remove('device-laptop', 'device-tablet', 'device-phone');
        if (this.isLaptop) {
            document.body.classList.add('device-laptop');
        } else if (isTablet) {
            document.body.classList.add('device-tablet');
        } else if (isPhone) {
            document.body.classList.add('device-phone');
        }
        
        // Apply user's handedness preference (for tablet keyboard position)
        if (this.currentUser && this.currentUser.handedness === 'left') {
            document.body.classList.add('left-handed');
        } else {
            document.body.classList.remove('left-handed');
        }
        
        // Set initial keyboard visibility
        if (this.keyboardVisible) {
            this.keyboard.classList.remove('hidden');
            this.keyboardToggleBtn.classList.add('active');
        } else {
            this.keyboard.classList.add('hidden');
            this.keyboardToggleBtn.classList.remove('active');
        }
        
        // Listen for resize changes
        window.addEventListener('resize', () => this.handleDeviceChange());
        
        // Listen for pointer/touch changes (for DevTools device switching)
        const pointerQuery = window.matchMedia('(pointer: coarse)');
        pointerQuery.addEventListener('change', () => this.handleDeviceChange(true));
        
        // Listen for width breakpoint changes
        const laptopQuery = window.matchMedia('(min-width: 1025px)');
        laptopQuery.addEventListener('change', () => this.handleDeviceChange(true));
    }

    /**
     * Handle device change (resize, orientation, or DevTools device switch)
     * @param {boolean} resetKeyboard - If true, reset keyboard visibility to device default
     */
    handleDeviceChange(resetKeyboard = false) {
        const wasLaptop = this.isLaptop;
        
        // Update laptop detection
        this.isLaptop = window.matchMedia('(min-width: 1025px)').matches;
        
        // Update device classes based on width
        const width = window.innerWidth;
        const isTablet = width >= 768 && width <= 1024;
        const isPhone = width < 768;
        
        document.body.classList.remove('device-laptop', 'device-tablet', 'device-phone');
        if (this.isLaptop) {
            document.body.classList.add('device-laptop');
        } else if (isTablet) {
            document.body.classList.add('device-tablet');
        } else if (isPhone) {
            document.body.classList.add('device-phone');
        }
        
        // Reset keyboard visibility when device type changes (e.g., DevTools switch)
        if (resetKeyboard || (wasLaptop !== this.isLaptop)) {
            this.keyboardVisible = !this.isLaptop;
            if (this.keyboardVisible) {
                this.keyboard.classList.remove('hidden');
                this.keyboardToggleBtn.classList.add('active');
            } else {
                this.keyboard.classList.add('hidden');
                this.keyboardToggleBtn.classList.remove('active');
            }
        }
    }

    /**
     * Toggle keyboard visibility preference (user toggle)
     */
    toggleKeyboardVisibility() {
        this.keyboardVisible = !this.keyboardVisible;
        
        if (this.keyboardVisible) {
            this.keyboard.classList.remove('hidden');
            this.keyboardToggleBtn.classList.add('active');
        } else {
            this.keyboard.classList.add('hidden');
            this.keyboardToggleBtn.classList.remove('active');
        }
    }

    /**
     * Show notification
     * @param {string} message - The message to display
     * @param {string} type - Type of notification: 'error', 'warning', 'success', 'info'
     * @param {number} duration - Duration in ms (0 = no auto-hide)
     */
    showNotification(message, type = 'info', duration = 4000) {
        // Clear any existing timeout
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }

        // Set message
        this.notificationMessage.textContent = message;

        // Remove all type classes
        this.notification.classList.remove('error', 'warning', 'success', 'info');

        // Add the appropriate type class
        this.notification.classList.add(type);

        // Show the notification
        this.notification.classList.remove('hidden');
        setTimeout(() => {
            this.notification.classList.add('show');
        }, 10);

        // Auto-hide after duration
        if (duration > 0) {
            this.notificationTimeout = setTimeout(() => {
                this.hideNotification();
            }, duration);
        }
    }

    /**
     * Hide notification
     */
    hideNotification() {
        this.notification.classList.remove('show');
        setTimeout(() => {
            this.notification.classList.add('hidden');
        }, 300); // Match CSS transition duration
    }

    async autoLoadFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        console.log('autoLoadFromUrl called with URL params:', Object.fromEntries(urlParams));
        const cdrCode = urlParams.get('cdr');
        const missionName = urlParams.get('mission');
        const levelParam = urlParams.get('level');

        console.log('cdrCode:', cdrCode, 'missionName:', missionName, 'levelParam:', levelParam);

        if (!missionName && !cdrCode) {
            this.uploadSection.classList.remove('hidden');
            this.questionSection.classList.add('hidden');
            console.log('No mission specified in URL, showing file upload.');
            return;
        }

        // Set the starting level if provided in URL
        if (levelParam) {
            const parsedLevel = parseInt(levelParam, 10);
            if (!Number.isNaN(parsedLevel)) {
                this.urlStartLevel = parsedLevel;
                if (this.schoolLevels.includes(String(parsedLevel))) {
                    this.currentSchoolLevel = parsedLevel;
                }
            }
        }

        try {
            // Build filename from CDR code if available, otherwise fall back to mission name
            let filename;
            if (cdrCode) {
                // CDR-based filename: e.g., "N1_Counting.json"
                // Remove non-alphanumeric (except spaces), collapse multiple spaces, then replace spaces with underscores
                const missionPart = missionName ? missionName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, ' ').trim().replace(/\s/g, '_') : '';
                filename = `${cdrCode}_${missionPart}.json`;
            } else {
                // Legacy: Convert mission name to filename format
                filename = missionName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, ' ').trim().replace(/\s/g, '_') + '.json';
            }
            const filePath = `questions/${filename}`;
            console.log('Attempting to fetch:', filePath);
            
            const fileResponse = await fetch(filePath);
            console.log('Fetch response status:', fileResponse.status, 'ok:', fileResponse.ok);
            if (!fileResponse.ok) {
                throw new Error(`Failed to fetch question file: ${filePath}`);
            }
            const data = await fileResponse.json();
            console.log('Fetched data length:', Array.isArray(data) ? data.length : 'object');
            
            // Handle both array format (new CDR-based files) and object format (legacy files)
            const questions = Array.isArray(data) ? data : data.questions;
            
            // Map snake_case fields to camelCase for compatibility
            // original_pundex (1-4) = pundex tier (Ignition/Charging/Ready/PowerUp)
            // year_group (1-6) = school year
            const pundexToLevelName = {
                1: 'Beginning',   // Ignition
                2: 'Developing',  // Charging
                3: 'Meeting',     // Ready
                4: 'Exceeding'    // Power Up
            };
            
            this.allQuestions = questions.map(q => {
                const rawYear = q.yearGroup ?? q.year_group ?? q.year ?? null;
                let yearNumber = null;
                if (typeof rawYear === 'number' && !Number.isNaN(rawYear)) {
                    yearNumber = rawYear;
                } else if (typeof rawYear === 'string') {
                    const match = rawYear.match(/\d+/);
                    if (match) {
                        yearNumber = parseInt(match[0], 10);
                    }
                }
                const yearGroupLabel = yearNumber
                    ? `Year ${Math.min(Math.max(yearNumber, 1), 6)}`
                    : 'Year 1';

                return {
                    id: q.question_id || q.id,
                    questionText: q.question_text || q.questionText,
                    correctAnswer: String(q.correct_answer || q.correctAnswer),
                    answerType: q.answer_type || q.answerType || 'text_input',
                    questionType: q.question_type || q.questionType || 'text_input',
                    alternativeAnswer1: q.alternative_answer_1 || q.alternativeAnswer1,
                    hint: q.hint,
                    yearGroup: yearGroupLabel,
                    levelName: q.levelName || pundexToLevelName[q.original_pundex] || 'Beginning',
                    strand: q.strand,
                    substrand: q.substrand,
                    topicId: q.topic_id || q.topicId
                };
            });
            
            this.currentMission = missionName;
            
            // Get world/realm from first question if available
            if (this.allQuestions.length > 0) {
                this.currentWorld = this.allQuestions[0].strand;
                this.currentRealm = this.allQuestions[0].substrand;
            }
            
            // Load user's saved progress for this mission (overrides URL level param)
            this.loadUserProgress();
            
            this.setQuestionPool();
            await this.startQuestions();
        } catch (error) {
            console.error('Failed to auto-load mission:', error);
            this.showNotification(`Error: Could not load mission "${missionName}".`, 'error');
            this.uploadSection.classList.remove('hidden');
            this.questionSection.classList.add('hidden');
        }
    }

    /**
     * Filter questions to the current school level
     */
    setQuestionPool() {
        if (!this.allQuestions || this.allQuestions.length === 0) {
            console.warn('No questions loaded to filter');
            this.questions = [];
            return;
        }

        // Filter questions by the current school level
        const targetYearGroup = `Year ${this.currentSchoolLevel}`;
        this.questions = this.allQuestions.filter(q => q.yearGroup === targetYearGroup);

        console.log(`Filtered to ${this.questions.length} questions for ${targetYearGroup}`);
    }

    /**
     * Automatically load questions from Questions/questions.json
        try {
            this.showLoading(true);

            const response = await fetch('questions/questions.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Validate structure
            if (!data.metadata || !data.questions || !Array.isArray(data.questions)) {
                throw new Error('Invalid JSON structure');
            }

            this.metadata = data.metadata;
            this.allQuestions = data.questions;

            if (isMissionMode) {
                this.setQuestionPool();
                this.startQuestions();
            } else {
                this.questions = data.questions;
                this.showLoading(false);
                this.displayMetadata();
                this.selectTopicsBtn.classList.remove('hidden');
                this.startBtn.classList.remove('hidden');
            }

            console.log(`Loaded ${this.questions.length} questions successfully`);

        } catch (error) {
            this.showLoading(false);
            // This is an expected failure if questions.json doesn't exist.
            // The UI will show the upload prompt, so we can just return.
            if (error.message.includes('HTTP error')) {
                this.showUploadPrompt();
                return;
            }
            console.warn('Could not auto-load questions:', error.message);
            this.showUploadPrompt();
        }
    }

    /**
     * Show/hide loading indicator
     */
    showLoading(show) {
        const uploadLabel = document.querySelector('.upload-label span');
        if (show) {
            uploadLabel.textContent = '⏳ Loading questions...';
        } else {
            uploadLabel.textContent = '📁 Upload Question JSON File';
        }
    }

    /**
     * Show upload prompt when auto-load fails
     */
    showUploadPrompt() {
        const uploadLabel = document.querySelector('.upload-label span');
        uploadLabel.textContent = '📁 Upload Question JSON File';
        // No longer display a confusing default message.
        // The UI will wait for the user to upload a file.
    }

    /**
     * Handle JSON file upload
     */
    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Validate structure
            if (!data.metadata || !data.questions || !Array.isArray(data.questions)) {
                throw new Error('Invalid JSON structure');
            }

            this.metadata = data.metadata;
            this.allQuestions = data.questions; // Store the full list
            this.questions = data.questions; // By default, all questions are selected

            this.displayMetadata();
            this.selectTopicsBtn.classList.remove('hidden');
            this.startBtn.classList.remove('hidden');

        } catch (error) {
            this.showNotification('Error loading JSON file: ' + error.message, 'error', 5000);
            console.error('JSON parse error:', error);
        }
    }

    /**
     * Display metadata after file upload
     */
    displayMetadata() {
        // Clear any previous content before displaying new metadata
        this.metadataDisplay.innerHTML = '';

        const exportDate = new Date(this.metadata.exportDate).toLocaleDateString();
        this.metadataDisplay.innerHTML = `
            <p><strong>Export Date:</strong> ${exportDate}</p>
            <p><strong>Questions:</strong> ${this.metadata.questionCount}</p>
            <p><strong>Modules:</strong> ${this.metadata.moduleCount}</p>
        `;
        this.metadataDisplay.classList.remove('hidden');
    }

    /**
     * Start the question sequence
     */
    openTopicModal() {
        this.displayTopics();
        this.topicModal.classList.remove('hidden');
    }

    closeTopicModal() {
        this.topicModal.classList.add('hidden');
    }

    displayTopics() {
        const topics = [...new Set(this.allQuestions.map(q => q.moduleName))];
        this.topicListContainer.innerHTML = topics.map(topic => `
            <div class="topic-item">
                <input type="checkbox" id="${topic}" name="topic" value="${topic}" checked>
                <label for="${topic}">${topic}</label>
            </div>
        `).join('');
    }

    confirmTopicSelection() {
        const selectedTopics = Array.from(this.topicListContainer.querySelectorAll('input[name="topic"]:checked'))
            .map(checkbox => checkbox.value);

        if (selectedTopics.length === 0) {
            this.showNotification('Please select at least one topic.', 'warning');
            return;
        }

        this.questions = this.allQuestions.filter(q => selectedTopics.includes(q.moduleName));
        this.metadata.questionCount = this.questions.length; // Update the count
        this.displayMetadata();
        this.closeTopicModal();
    }

    async startQuestions() {
        if (this.questions.length === 0) {
            this.showNotification('No questions selected. Please select topics first.', 'warning');
            return;
        }

        this.uploadSection.classList.add('hidden');
        this.questionSection.classList.remove('hidden');
        
        // Hide fixed user header (now using inline one in question header)
        const fixedHeader = document.getElementById('userHeaderContainer');
        if (fixedHeader) fixedHeader.style.display = 'none';
        
        // Only reset currentIndex if not already set by loadUserProgress
        // (loadUserProgress sets it when resuming partial progress)
        if (this.currentIndex === 0 || this.currentIndex === undefined) {
            this.currentIndex = 0;
        }
        
        // Ensure currentIndex doesn't exceed available questions
        if (this.currentIndex >= this.questions.length) {
            this.currentIndex = 0;
            this.pundexAnswerHistory = [];
        }
        
        this.userAnswers.clear();
        // this.adventureLog = []; // No longer needed for live logging
        this.displayQuestion();
        this.updateProgressionUI();
    }

    /**
     * Display the current question
     */
    displayQuestion() {
        const question = this.questions[this.currentIndex];
        if (!question) return;

        // Mark start time for logging
        this.questionStartTime = Date.now();

        // Reset selected option and input buffer
        this.selectedOption = null;
        this.mcInputBuffer = '';
        clearTimeout(this.mcInputTimeout);

        // Live logging is now handled upon answer submission.

        // Update progress - now shown in hamburger menu
        const questionProgress = `Q ${this.currentIndex + 1} of ${this.questions.length}`;
        this.progressIndicator.textContent = questionProgress;
        
        // Update hamburger menu items in BOTH headers (fixed and inline)
        const menuContainers = [
            document.getElementById('userHeaderContainer'),
            document.getElementById('header-user-menu')
        ];
        
        menuContainers.forEach(container => {
            if (!container) return;
            const menuQuestionProgress = container.querySelector('#menuQuestionProgress');
            const menuQuestionCount = container.querySelector('#menuQuestionCount');
            const menuSaveEndBtn = container.querySelector('#menuSaveEndBtn');
            
            if (menuQuestionProgress && menuQuestionCount) {
                menuQuestionProgress.style.display = 'block';
                menuQuestionCount.textContent = questionProgress;
            }
            if (menuSaveEndBtn) {
                menuSaveEndBtn.style.display = 'flex';
                menuSaveEndBtn.onclick = () => this.endSession();
            }
        });
        
        // Hide original controls (now in menu)
        this.progressIndicator.style.display = 'none';
        this.sessionControls.innerHTML = '';
        this.sessionControls.style.display = 'none';

        // Metadata now shown in level indicator bar
        this.updateProgressionUI();

        // Reset feedback area for the new question
        if (this.feedbackArea) {
            this.feedbackArea.innerHTML = '';
            this.feedbackArea.className = 'feedback hidden';
        }

        // Handle hints
        this.hintContainer.innerHTML = ''; // Clear previous hint button
        let questionText = question.questionText;
        let hint = question.hint;

        // Check for embedded hints like "Hint: ..."
        const hintRegex = /\s*Hint:\s*(.*)/i;
        const hintMatch = questionText.match(hintRegex);

        if (hintMatch) {
            hint = hintMatch[1];
            questionText = questionText.replace(hintRegex, '').trim(); // Clean the question text
        }

        if (hint) {
            this.hintContainer.innerHTML = `<button id="hint-btn" class="btn btn-hint" data-hint="${hint}">💡 Hint</button>`;
        }

        // Render appropriate answer interface
        this.questionDisplay.classList.remove('has-number-line'); // Reset class
        if (question.visualType === 'number_line') {
            this.renderNumberLine(question);
        } else {
            this.questionDisplay.innerHTML = this.formatQuestionText(questionText);
        }

        // Check for the new drag-and-drop ordering type
        if (question.answerType === 'drag_and_drop_order') {
            this.renderDragAndDrop(question);
        } else if (question.questionType === 'multiple_choice') {
            this.renderMultipleChoice(question);
        } else { // It's a text input type
            // If the answer has a comma, treat it as a number sequence for multi-box input
            if (typeof question.correctAnswer === 'string' && question.correctAnswer.includes(',')) {
                this.renderTextInput(question, true); // Force sequence rendering
            } else {
                this.renderTextInput(question, false);
            }
        }

        // Default state for new question
        this.hasSubmittedCurrent = false;
        this.updateActionButtonLabel();

        // Check if already answered
        const previousAnswer = this.userAnswers.get(question.id);
        if (previousAnswer) {
            if (question.questionType === 'multiple_choice') {
                this.selectedOption = previousAnswer.answer;
                this.highlightSelectedOption(previousAnswer.answer);
            } else if (this.answerInput) {
                this.answerInput.value = previousAnswer.answer;
            }
            this.showFeedback(previousAnswer.isCorrect, question.correctAnswer);
            this.hasSubmittedCurrent = true;
            this.updateActionButtonLabel();
        } else {
            if (this.feedbackArea) {
                this.feedbackArea.innerHTML = '';
                this.feedbackArea.className = 'feedback hidden';
            }
            this.updateActionButtonLabel();
            // Reset keyboard display for new question
        }

    }

    /**
     * Render text input interface
     */
    renderTextInput(question, forceSequence = false) {
        let inputHTML = '';
        const labelRegex = /\s*as:\s*(\[[^\]]+\](?:,\s*\[[^\]]+\])*)/;
        const labelMatch = question.questionText.match(labelRegex);
        let labels = [];

        if (labelMatch) {
            labels = labelMatch[1].replace(/[\[\]]/g, '').split(',');
        }

        if (forceSequence || question.answerType === 'number_sequence') {
            const parts = question.correctAnswer.split(',');
            inputHTML += '<div class="sequence-input-container">';
            for (let i = 0; i < parts.length; i++) {
                inputHTML += '<div class="labeled-input">';
                if (labels[i]) {
                    inputHTML += `<label class="input-label">${labels[i].trim()}</label>`;
                }
                inputHTML += `<input type="text" class="answer-input sequence-part" autocomplete="off">`;
                inputHTML += '</div>';
            }
            inputHTML += '</div>';
            this.toggleKeyboard(true);
        } else {
            inputHTML = `<input type="text" id="answer-input" class="answer-input" placeholder="Enter your answer..." autocomplete="off">`;
            this.toggleKeyboard(true);
        }

        this.answerArea.innerHTML = `
            ${inputHTML}
            <button id="action-btn" class="btn btn-primary">Submit Answer</button>
        `;

        // Re-assign element references
        this.answerInput = document.getElementById('answer-input'); // This will be null for sequence
        this.actionBtn = document.getElementById('action-btn');

        // Set focus to the first input field for immediate typing
        const firstInput = this.answerArea.querySelector('input');
        if (firstInput) {
            firstInput.focus();
        }
    }

    /**
     * Render a drag-and-drop ordering interface.
     */
    renderDragAndDrop(question) {
        const numbers = question.correctAnswer.split(',').map(n => n.trim());

        // Shuffle the numbers so they don't appear in the correct order
        for (let i = numbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
        }

        let itemsHTML = '<div id="sortable-list" class="sortable-list">';
        numbers.forEach(num => {
            itemsHTML += `<div class="sortable-item">${this.formatNumber(num)}</div>`;
        });
        itemsHTML += '</div>';

        this.answerArea.innerHTML = `
            ${itemsHTML}
            <button id="action-btn" class="btn btn-primary">Submit Answer</button>
        `;

        this.actionBtn = document.getElementById('action-btn');
        const sortableList = document.getElementById('sortable-list');
        
        // Initialize SortableJS
        Sortable.create(sortableList, {
            animation: 150,
            ghostClass: 'sortable-ghost'
        });

        this.toggleKeyboard(false);
    }

    /**
     * Render multiple choice interface
     */
    renderNumberLine(question) {
        const { numbers } = question.questionData;
        const correctAnswer = parseInt(question.correctAnswer, 10);
        const min = Math.min(...numbers, correctAnswer);
        const max = Math.max(...numbers, correctAnswer);

        let html = '<div class="number-line-container">';
        html += `<div class="question-text-normal">What number is marked on the number line?</div>`;
        html += '<div class="number-line">';

        for (let i = min; i <= max; i++) {
            const isMarked = (i === correctAnswer);
            html += `
                <div class="number-line-segment">
                    <div class="number-line-marker">${isMarked ? '▼' : ''}</div>
                    <div class="number-line-tick"></div>
                    <div class="number-line-label">${isMarked ? '' : i}</div>
                </div>`;
        }

        html += '</div></div>';
        this.questionDisplay.innerHTML = html;
        this.questionDisplay.classList.add('has-number-line');
    }

    renderMultipleChoice(question) {
        const options = question.multipleChoiceOptions || [];

        let optionsHTML = `<div class="multiple-choice-options options-${options.length}">`;
        options.forEach(option => {
            const formattedOption = this.formatNumber(option);
            optionsHTML += `
                <button class="choice-btn" data-value="${option}">
                    ${formattedOption}
                </button>
            `;
        });
        optionsHTML += '</div>';
        optionsHTML += '<button id="action-btn" class="btn btn-primary">Submit Answer</button>';

        this.answerArea.innerHTML = optionsHTML;

        // Re-assign element references
        this.actionBtn = document.getElementById('action-btn');

        this.toggleKeyboard(false);
    }

    /**
     * Handle multiple choice option selection
     */
    selectOption(button) {
        if (this.hasSubmittedCurrent) return;

        // Remove previous selection
        document.querySelectorAll('.choice-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Mark this option as selected
        button.classList.add('selected');
        this.selectedOption = button.getAttribute('data-value');
    }

    /**
     * Highlight the previously selected option
     */
    highlightSelectedOption(value) {
        const buttons = document.querySelectorAll('.choice-btn');
        buttons.forEach(btn => {
            if (btn.getAttribute('data-value') === value) {
                btn.classList.add('selected');
            }
        });
    }

    /**
     * Submit the current answer
     */
    async handleActionClick() {
        if (this.hasSubmittedCurrent) {
            this.nextQuestion();
        } else {
            await this.submitAnswer();
        }
    }

    async submitAnswer() {
        const question = this.questions[this.currentIndex];
        let userAnswer;

        if (question.questionType === 'multiple_choice') {
            userAnswer = this.selectedOption;
            if (!userAnswer) {
                this.showNotification('Please select an answer', 'warning', 3000);
                return;
            }
        } else {
            if (question.answerType === 'drag_and_drop_order') {
                const items = Array.from(this.answerArea.querySelectorAll('.sortable-item'));
                userAnswer = items.map(item => item.textContent.replace(/,/g, '')).join(',');
            } else if (question.answerType === 'number_sequence' || (typeof question.correctAnswer === 'string' && question.correctAnswer.includes(','))) {
                const inputs = Array.from(this.answerArea.querySelectorAll('.sequence-part'));
                userAnswer = inputs.map(input => input.value.trim()).join(',');
                if (inputs.some(input => !input.value.trim())) {
                    this.showNotification('Please fill in all the boxes', 'warning', 3000);
                    return;
                }
            } else {
                userAnswer = this.answerInput.value;
                if (!userAnswer.trim()) {
                    this.showNotification('Please enter an answer', 'warning', 3000);
                    return;
                }
            }
        }

        const isCorrect = AnswerValidator.validate(userAnswer, question.correctAnswer, question.answerType);
        this.userAnswers.set(question.id, { answer: userAnswer, isCorrect });
        this.hasSubmittedCurrent = true;

        // Add the adventure to the log queue
        const timeServed = this.questionStartTime ? new Date(this.questionStartTime).toISOString() : new Date().toISOString();
        const timeSubmitted = new Date().toISOString();
        this.logAdventure(question.id, userAnswer, isCorrect, timeServed, timeSubmitted);

        // Update progression
        this.pundexAnswerHistory.push(isCorrect);
        const progressionResult = this.checkProgression();
        if (progressionResult === 'newQuestion' || progressionResult === 'missionComplete') {
            return;
        }

        // Save partial progress after each question
        this.savePartialProgress();

        this.showFeedback(isCorrect, question.correctAnswer);
        this.updateActionButtonLabel();

        if (question.questionType === 'multiple_choice') {
            document.querySelectorAll('.choice-btn').forEach(btn => { btn.disabled = true; });
        }

    }

    /**
     * Show feedback after answer submission
     */
    showFeedback(isCorrect, correctAnswer) {
        this.feedbackArea.classList.remove('hidden');

        if (isCorrect) {
            this.feedbackArea.innerHTML = `
                <span class="feedback-icon correct">✓</span>
                <span class="feedback-text">Correct!</span>
            `;
            this.feedbackArea.className = 'feedback feedback-correct';
        } else {
            this.feedbackArea.innerHTML = `
                <span class="feedback-icon incorrect">✗</span>
                <span class="feedback-text">Incorrect. The correct answer is: <strong>${correctAnswer}</strong></span>
            `;
            this.feedbackArea.className = 'feedback feedback-incorrect';
        }
    }

    /**
     * Go to next question
     */
    async nextQuestion() {
        if (this.currentIndex < this.questions.length - 1) {
            this.currentIndex++;
            this.hasSubmittedCurrent = false;
            this.displayQuestion();
        } else {
            // End of questions - show results
            await this.showResults();
        }
    }

    /**
     * Format question text to put equations on separate lines.
     * @param {string} text - The original question text.
     * @returns {string} - Formatted HTML string.
     */
    formatQuestionText(text) {
        // First, format all numbers in the text with commas.
        let formattedText = text.replace(/\b\d{4,}\b/g, (num) => this.formatNumber(num));

        // Replace commas that immediately follow a number with a non-breaking space for clarity
        // formattedText = formattedText.replace(/(\d),/g, '$1,&nbsp;'); // Replaced by the boxing logic below

        // Wrap introductory numbers in a styled box
        formattedText = formattedText.replace(/^(In|Given|What is) ([\d,]+),/g, (match, intro, number) => {
            return `${intro} <span class="boxed-number">${number}</span>`;
        });

        const equationRegex = /\d+\s*[+\-x÷/]\s*\d+\s*=\s*[\d?]+/g;
        let equations = formattedText.match(equationRegex);

        // Handle labeled multiple-choice questions
        if (equations && this.questions[this.currentIndex].multipleChoiceOptions?.every(o => o.length === 1 && o.match(/[A-Z]/))) {
            let introText = formattedText.substring(0, formattedText.indexOf(equations[0])).trim();
            // Clean up legacy labels like A), B) from the intro text
            introText = introText.replace(/\s*[A-Z]\)\s*$/, '').trim();
            
            const labeledEquations = equations.map((eq, index) => {
                const label = String.fromCharCode(65 + index); // A, B, C, D
                return `<div class="labeled-equation"><span class="equation-label">${label}</span><span class="equation-text">${eq}</span></div>`;
            }).join('');

            return `${introText}<div class="labeled-equations-container">${labeledEquations}</div>`;
        }

        if (equations && equations.length > 1) {
            const firstMatchIndex = formattedText.indexOf(equations[0]);
            const lastMatch = equations[equations.length - 1];
            const lastMatchIndex = formattedText.lastIndexOf(lastMatch);
            const endOfBlockIndex = lastMatchIndex + lastMatch.length;

            const introText = formattedText.substring(0, firstMatchIndex).trim().replace(/[:|,]$/, '');
            const questionText = formattedText.substring(endOfBlockIndex).trim().replace(/^[.|,]/, '').trim();

            const equationsHTML = `<div class="equations-block">${equations.join('<br>')}</div>`;
            return `${introText}<br>${equationsHTML}${questionText}`;
        }

        const largeNumberRegex = /([\d,]+[.]\s+)/g;
        if (formattedText.match(largeNumberRegex)?.length === 1) {
            return formattedText.replace(largeNumberRegex, '$1<br>');
        }

        // Handle "Order these numbers" questions
        // Remove bracketed labels like [tens],[ones]
        formattedText = formattedText.replace(/\s*Enter your answer as:\s*(\[[^\]]+\](?:,\s*\[[^\]]+\])*)/, '');

        const orderRegex = /Order these numbers from .*?:\s*([\d,\s]+)/;
        const orderMatch = formattedText.match(orderRegex);
        // Only apply this formatting if it's NOT a drag-and-drop question
        if (orderMatch && this.questions[this.currentIndex].answerType !== 'drag_and_drop_order') {
            const instructionText = formattedText.substring(0, orderMatch[0].length - orderMatch[1].length);
            const numbers = orderMatch[1].split(/,\s*/).map(n => this.formatNumber(n));
            const numbersHTML = numbers.map(num => `<span class="number-tag">${num}</span>`).join('');
            return `${instructionText}<div class="number-tags-container">${numbersHTML}</div>`;
        }

        return formattedText;
    }

    /**
     * Formats a number with commas if it's large enough.
     * @param {*} value - The value to format.
     * @returns {string} - The formatted number or original value.
     */
    formatNumber(value) {
        const num = parseFloat(String(value).replace(/,/g, ''));
        if (!isNaN(num) && Number.isFinite(num) && Math.abs(num) >= 1000) {
            return new Intl.NumberFormat('en-US').format(num);
        }
        return value;
    }

    /**
     * Log user adventure entry to Supabase
     */
    async logAdventure(questionId, userAnswer, isCorrect, timeServed, timeSubmitted) {
        try {
            const { data, error } = await this.supabase
                .from('user_adventure')
                .insert([{
                    user_id: this.userId,
                    question_id: parseInt(questionId),
                    time_served: timeServed,
                    time_submitted: timeSubmitted,
                    is_correct: isCorrect,
                    user_answer: userAnswer,
                    batch_id: this.batchId
                }]);

            if (error) {
                console.error('Error logging to Supabase:', error);
                this.showNotification('Error logging progress.', 'error');
            } else {
                console.log('Logged adventure entry to Supabase');
            }
        } catch (err) {
            console.error('Failed to log adventure:', err);
            this.showNotification('Error logging progress.', 'error');
        }
    }

    /**
        if (!this.logFileHandle || this.logQueue.length === 0) return;
        this.isProcessingLogQueue = true;
        queueMicrotask(() => this.processLogQueue());
    }

    async processLogQueue() {
        if (!this.logFileHandle || this.logQueue.length === 0) {
            this.isProcessingLogQueue = false;
            return;
        }

        const entriesToWrite = this.logQueue.splice(0, this.logQueue.length);

        try {
            const file = await this.logFileHandle.getFile();
            const writableStream = await this.logFileHandle.createWritable();
            let filePosition = file.size;

            if (filePosition > 0) {
                await writableStream.seek(filePosition);
            }

            for (const entry of entriesToWrite) {
                const answer = String(entry.user_answer).includes(',') ? `"${entry.user_answer}"` : entry.user_answer;
                const row = `${entry.serve_id},${entry.user_id},${entry.question_id},${entry.time_served},${entry.time_submitted},${entry.is_correct},${answer},${entry.batch_id}`;
                const prefix = filePosition > 0 ? '\n' : '';
                const chunk = prefix + row;
                await writableStream.write(chunk);
                filePosition += new Blob([chunk]).size;
            }

            await writableStream.close();
        } catch (error) {
            console.error('Failed to write to log file:', error, 'Error name:', error.name, 'Error message:', error.message); // Detailed debug log
            this.showNotification('Error writing to log file. Logging may be disabled.', 'error');

            if (error && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) {
                console.warn('Permission revoked during write, clearing handle and showing banner at', new Date().toISOString()); // Debug log
                this.logFileHandle = null;
                await this.clearSavedFileHandle();
                this.showLoggingBanner();
            }
        } finally {
            this.isProcessingLogQueue = false;
            if (this.logQueue.length > 0) {
                this.scheduleLogQueueProcessing();
            }
        }
    }

    /**
     * Converts the adventure log to a CSV and triggers a download.
     */
    downloadAdventureLog() {
        const header = 'serve_id,user_id,question_id,time_served,time_submitted,is_correct,user_answer,batch_id';
        const rows = this.adventureLog.map(log => {
            const answer = String(log.user_answer).includes(',') ? `"${log.user_answer}"` : log.user_answer;
            return `${log.serve_id},${log.user_id},${log.question_id},${log.time_served},${log.time_submitted},${log.is_correct},${answer},${log.batch_id}`;
        });

        const csvContent = header + '\n' + rows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'user_adventure.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Enable live logging by requesting/creating the log file.
     * (Still used by the legacy button if it exists in the UI.)
     */
    async enableLiveLogging() {
        const enabled = await this.promptForLogFile({ showSuccessToast: true });
        if (!enabled) return;

        const enableLoggingBtn = document.getElementById('enable-logging-btn');
        if (enableLoggingBtn) {
            enableLoggingBtn.textContent = 'Logging Enabled';
            enableLoggingBtn.disabled = true;
        }
    }

    /**
     * Attempt to restore the log file handle silently (using IndexedDB).
     */
    async initializeLogging() {
        if (!this.supportsFileLogging()) {
            console.warn('Live logging not supported in this browser context.');
            return false;
        }

        try {
            const savedHandle = await this.getSavedFileHandle();
            if (savedHandle && await this.verifyHandlePermission(savedHandle)) {
                this.logFileHandle = savedHandle;
                console.log('Live logging ready via saved file handle.');
                return true;
            }

            if (savedHandle) {
                // Permission revoked or handle invalid
                await this.clearSavedFileHandle();
            }
        } catch (error) {
            console.warn('Failed to restore live logging handle:', error);
        }

        return false;
    }

    showLoggingBanner() {
        if (!this.loggingBanner || this.isPromptingForLogFile) return;
        this.loggingBanner.classList.remove('hidden');
        this.loggingBannerDismissed = false;
    }

    hideLoggingBanner() {
        if (!this.loggingBanner) return;
        this.loggingBanner.classList.add('hidden');
    }

    dismissLoggingBanner() {
        this.loggingBannerDismissed = true;
        this.hideLoggingBanner();
    }

    async handleLoggingPermissionRequest() {
        if (this.isPromptingForLogFile) return;
        const enabled = await this.promptForLogFile({ showSuccessToast: true });
        if (!enabled) {
            return;
        }
        this.loggingBannerDismissed = true;
        this.hideLoggingBanner();
        this.scheduleLogQueueProcessing();
    }

    /**
     * Ensure logging is ready before a mission starts (prompts if needed).
     */
    async ensureLoggingReady({ showBannerIfNeeded = false } = {}) {
        console.log('ensureLoggingReady called with showBannerIfNeeded:', showBannerIfNeeded, 'at', new Date().toISOString()); // Debug log
        if (this.logFileHandle) {
            console.log('Log file handle already exists, returning true.'); // Debug log
            return true;
        }

        if (!this.loggingInitPromise) {
            this.loggingInitPromise = this.initializeLogging();
        }

        await this.loggingInitPromise;

        if (this.loggingEnabled) {
            console.log('Logging already enabled, skipping banner.'); // Debug log
            return;
        }

        if (showBannerIfNeeded && !this.loggingBannerDismissed) {
            console.log('Showing logging banner.'); // Debug log
            this.showLoggingBanner();
        }
    }

    /**
     * Ask the user to pick/create the CSV log file and persist the handle.
     */
    async promptForLogFile({ showSuccessToast = true } = {}) {
        if (!this.supportsFileLogging()) {
            this.showNotification('Live logging is not supported in this browser.', 'warning');
            return false;
        }

        try {
            this.isPromptingForLogFile = true;
            const pickerOptions = {
                types: [{
                    description: 'CSV Files',
                    accept: { 'text/csv': ['.csv'] }
                }],
                multiple: false
            };

            let fileHandle = null;
            if (window.showOpenFilePicker) {
                const [handle] = await window.showOpenFilePicker(pickerOptions);
                fileHandle = handle;
            } else if (window.showSaveFilePicker) {
                fileHandle = await window.showSaveFilePicker({
                    ...pickerOptions,
                    suggestedName: 'user_adventure.csv'
                });
            } else {
                throw new Error('File picker APIs are not available.');
            }

            if (!fileHandle) {
                return false;
            }

            const hasPermission = await this.verifyHandlePermission(fileHandle);
            if (!hasPermission) {
                this.showNotification('Permission to write to the file was denied.', 'warning');
                return false;
            }

            this.logFileHandle = fileHandle;
            await this.saveFileHandle(fileHandle);

            if (showSuccessToast) {
                this.showNotification('Live logging enabled. Answers will be saved in real-time.', 'success');
            }
            this.hideLoggingBanner();
            return true;

        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Could not enable live logging:', error);
                this.showNotification('Could not enable live logging.', 'error');
            }
            return false;
        } finally {
            this.isPromptingForLogFile = false;
        }
    }

    supportsFileLogging() {
        return typeof window !== 'undefined' &&
            window.isSecureContext &&
            (window.showOpenFilePicker || window.showSaveFilePicker) &&
            'indexedDB' in window;
    }

    async openFileHandleDB() {
        if (this.fileHandleDBPromise) {
            return this.fileHandleDBPromise;
        }

        if (!('indexedDB' in window)) {
            return null;
        }

        const dbName = this.fileHandleDBName || 'QuestionAppLogging';
        this.fileHandleDBPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 1);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.fileHandleStoreName)) {
                    db.createObjectStore(this.fileHandleStoreName);
                }
            };
            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });

        return this.fileHandleDBPromise;
    }

    async getSavedFileHandle() {
        try {
            const db = await this.openFileHandleDB();
            if (!db) return null;

            return await new Promise((resolve, reject) => {
                const tx = db.transaction(this.fileHandleStoreName, 'readonly');
                const store = tx.objectStore(this.fileHandleStoreName);
                const request = store.get(this.logHandleKey);
                request.onsuccess = (event) => resolve(event.target.result || null);
                request.onerror = (event) => reject(event.target.error);
            });
        } catch (error) {
            console.warn('Unable to read saved log file handle:', error);
            return null;
        }
    }

    async saveFileHandle(fileHandle) {
        try {
            const db = await this.openFileHandleDB();
            if (!db) return;

            await new Promise((resolve, reject) => {
                const tx = db.transaction(this.fileHandleStoreName, 'readwrite');
                tx.oncomplete = () => resolve();
                tx.onerror = (event) => reject(event.target.error);
                tx.objectStore(this.fileHandleStoreName).put(fileHandle, this.logHandleKey);
            });
        } catch (error) {
            console.warn('Unable to persist log file handle:', error);
        }
    }

    async clearSavedFileHandle() {
        try {
            const db = await this.openFileHandleDB();
            if (!db) return;

            await new Promise((resolve, reject) => {
                const tx = db.transaction(this.fileHandleStoreName, 'readwrite');
                tx.oncomplete = () => resolve();
                tx.onerror = (event) => reject(event.target.error);
                tx.objectStore(this.fileHandleStoreName).delete(this.logHandleKey);
            });
        } catch (error) {
            console.warn('Unable to clear saved log file handle:', error);
        }
    }

    async verifyHandlePermission(fileHandle) {
        if (!fileHandle?.queryPermission) {
            return false;
        }

        let permission = await fileHandle.queryPermission({ mode: 'readwrite' });
        if (permission === 'granted') {
            return true;
        }

        if (permission === 'prompt' && fileHandle.requestPermission) {
            permission = await fileHandle.requestPermission({ mode: 'readwrite' });
            return permission === 'granted';
        }

        return false;
    }

    /**
     * Go to previous question
     */
    previousQuestion() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.hasSubmittedCurrent = false;
            this.displayQuestion();
        }
    }

    /**
     * Show results summary
     */
    updateProgressionUI() {
        const totalInHistory = this.pundexAnswerHistory.length;
        const correctInHistory = this.pundexAnswerHistory.filter(c => c).length;
        const correctInLast10 = this.pundexAnswerHistory.slice(-10).filter(c => c).length;

        // Build 10-box progress bar with question numbers
        // The window shifts when moving to a NEW question beyond 10, not when answering
        // So we base the window on currentIndex (next question to answer), not totalInHistory
        const nextQuestionNum = this.currentIndex + 1; // 1-indexed question number user is on/going to
        const windowStart = Math.max(0, nextQuestionNum - 10); // Start of the 10-question window
        const startDisplayNum = windowStart + 1; // 1-indexed display number
        
        let boxesHTML = '<div class="progress-boxes">';
        for (let i = 0; i < 10; i++) {
            const historyIndex = windowStart + i; // Index into pundexAnswerHistory
            let innerClass = 'progress-box-inner';
            if (historyIndex < totalInHistory) {
                // This question has been answered
                innerClass += this.pundexAnswerHistory[historyIndex] ? ' correct' : ' incorrect';
            }
            const questionNum = startDisplayNum + i;
            boxesHTML += `<div class="progress-box">
                <div class="${innerClass}"></div>
                <span class="progress-box-number">${questionNum}</span>
            </div>`;
        }
        boxesHTML += '</div>';

        let countersHTML = '';
        if (nextQuestionNum <= 10) {
            // Stage 1: Single counter for the first 10 questions
            countersHTML = `<div class="progress-counters"><span>Score: <strong>${correctInHistory}/${totalInHistory}</strong></span></div>`;
        } else {
            // Stage 2: Two counters after moving to question 11+
            countersHTML = `
                <div class="progress-counters">
                    <span class="progress-overall">Overall: <strong>${correctInHistory}/${totalInHistory}</strong></span>
                    <span class="progress-rolling-score">Rolling Score: <strong>${correctInLast10}/10</strong></span>
                </div>
            `;
        }

        this.progressionStatusEl.innerHTML = boxesHTML + countersHTML;

        // Update Level Indicator above power meter (includes World > Realm > Mission > Level)
        const worldRealm = this.currentWorld && this.currentRealm && this.currentWorld !== this.currentRealm 
            ? `${this.currentWorld} > ${this.currentRealm}` 
            : (this.currentWorld || this.currentRealm || '');
        const pathParts = [worldRealm, this.currentMission, `Level ${this.currentSchoolLevel}`].filter(p => p);
        const fullPath = pathParts.join(' > ');
        // Short version for mobile: just mission + level
        const shortPath = `${this.currentMission || 'Mission'} L${this.currentSchoolLevel}`;
        this.levelIndicator.innerHTML = `
            <span class="level-full">${fullPath}</span>
            <span class="level-short">${shortPath}</span>
        `;

        // Rebuild Power Meter HTML
        const currentPundexIndex = this.pundexTiers.indexOf(this.currentPundex);
        const colors = ['red', 'amber', 'green', 'purple'];
        const shortNames = ['I', 'C', 'R', 'PU']; // Abbreviated for mobile
        
        const powerMeterHTML = this.pundexTiers.map((tier, index) => {
            const displayName = this.pundexDisplayNames[tier] || tier;
            const shortName = shortNames[index];
            let stateClass = '';
            if (index < currentPundexIndex) {
                stateClass = 'on'; // Mastered
            } else if (index === currentPundexIndex) {
                stateClass = 'flashing'; // Current
            }
            // In initialise mode, mark Ignition and Charging as assumed
            if (this.isInitialiseMode && index < currentPundexIndex && (index === 0 || index === 1)) {
                stateClass += ' assumed';
            }
            return `<div class="power-light ${colors[index]} ${stateClass}">
                <span class="pundex-full">${displayName}</span>
                <span class="pundex-short">${shortName}</span>
            </div>`;
        }).join('');
        this.powerMeterEl.innerHTML = powerMeterHTML;
    }

    checkProgression() {
        this.updateProgressionUI(); // Update UI before checking

        const totalAnswered = this.pundexAnswerHistory.length;
        const totalCorrect = this.pundexAnswerHistory.filter(c => c).length;
        
        let shouldLevelUp = false;
        const last10 = this.pundexAnswerHistory.slice(-10);
        const correctInLast10 = last10.filter(c => c).length;
        const recentStreak = (() => {
            let streak = 0;
            for (let i = this.pundexAnswerHistory.length - 1; i >= 0; i--) {
                if (this.pundexAnswerHistory[i]) {
                    streak++;
                } else {
                    break;
                }
            }
            return streak;
        })();
        const hasFiveCorrectStreak = recentStreak >= 5;
        
        if (this.isInitialiseMode && hasFiveCorrectStreak) {
            shouldLevelUp = true;
        } else if (totalAnswered <= 10) {
            // First 10 questions: level up as soon as they get 7 correct
            if (totalCorrect >= 7) {
                shouldLevelUp = true;
            }
        } else {
            // After 10 questions: rolling window - need 7 out of last 10
            if (correctInLast10 >= 7) {
                shouldLevelUp = true;
            }
        }

        if (shouldLevelUp) {
            const currentPundexIndex = this.pundexTiers.indexOf(this.currentPundex);
            
            // Save the completed pundex tier to user progress
            this.saveProgress(this.currentMission, this.currentSchoolLevel, this.currentPundex, true);

            if (currentPundexIndex < this.pundexTiers.length - 1) {
                // Level up Pundex
                this.currentPundex = this.pundexTiers[currentPundexIndex + 1];
                const nextPundexName = this.pundexDisplayNames[this.currentPundex] || this.currentPundex;
                this.showPowerUpAnimation(currentPundexIndex, currentPundexIndex + 1);
            } else {
                // Level up - all pundex tiers complete for this level
                const currentSchoolLevelIndex = this.schoolLevels.indexOf(String(this.currentSchoolLevel));
                if (currentSchoolLevelIndex < this.schoolLevels.length - 1) {
                    const oldLevel = this.currentSchoolLevel;
                    const nextLevel = parseInt(this.schoolLevels[currentSchoolLevelIndex + 1]);
                    
                    if (this.isInitialiseMode) {
                        this.showInitialiseLevelCompleteOverlay(oldLevel, nextLevel);
                        return;
                    }

                    this.currentSchoolLevel = nextLevel;
                    this.currentPundex = this.pundexTiers[0]; // Reset to Ignition
                    this.showLevelUpAnimation(oldLevel, this.currentSchoolLevel);
                } else {
                    // Mission Complete
                    this.showMissionCompleteAnimation();
                    return;
                }
            }

            this.pundexAnswerHistory = []; // Reset for the new level
            this.userAnswers.clear(); // CRITICAL: Reset stored answers for the new level
            this.setQuestionPool();
            this.currentIndex = 0; // Start from the first question of the new pool
            this.displayQuestion(); // Display the new question
        } else if (this.isInitialiseMode) {
            let shouldPowerDown = false;

            if (totalAnswered < 10) {
                const remainingInFirstTen = 10 - totalAnswered;
                const maxPossibleScore = totalCorrect + remainingInFirstTen;
                if (maxPossibleScore <= 4) {
                    shouldPowerDown = true;
                }
            } else if (totalAnswered === 10) {
                if (totalCorrect <= 4) {
                    shouldPowerDown = true;
                }
            } else {
                if (correctInLast10 <= 4) {
                    shouldPowerDown = true;
                }
            }

            if (shouldPowerDown) {
                const poweredDown = this.handlePowerDownToCharging();
                if (poweredDown) {
                    this.updateProgressionUI();
                    return 'newQuestion';
                }
            }
        }
        this.updateProgressionUI();
        return 'continue';
    }

    handlePowerDownToCharging() {
        const currentIndex = this.pundexTiers.indexOf(this.currentPundex);

        // Already at the lowest tier – can't power down further
        if (currentIndex <= 0) {
            return false;
        }

        const previousTier = this.pundexTiers[currentIndex - 1];
        const previousTierName = this.pundexDisplayNames[previousTier] || previousTier;
        this.currentPundex = previousTier;
        this.pundexAnswerHistory = [];
        this.userAnswers.clear();
        if (this.isInitialiseMode && this.currentMission) {
            // Record that the higher tier is no longer complete (ensures PDI reflects drop)
            this.markPundexNeedsWork(this.currentMission, this.currentSchoolLevel, this.pundexTiers[currentIndex], true);
            // Reinforce that the new tier requires practice
            this.markPundexNeedsWork(this.currentMission, this.currentSchoolLevel, previousTier, true);
        }
        this.showNotification(`Power down! Dropping to ${previousTierName} level.`, 'warning');
        this.setQuestionPool();
        this.currentIndex = 0;
        this.displayQuestion();
        return true;
    }

    setQuestionPool() {
        // Filter questions by year group (school level)
        let yearQuestions = this.allQuestions.filter(q => 
            q.yearGroup === `Year ${this.currentSchoolLevel}`
        );

        // If no questions for this level, find the first available level
        if (yearQuestions.length === 0) {
            for (let level = 1; level <= 6; level++) {
                const levelQuestions = this.allQuestions.filter(q => q.yearGroup === `Year ${level}`);
                if (levelQuestions.length > 0) {
                    this.currentSchoolLevel = level;
                    yearQuestions = levelQuestions;
                    console.log(`No questions for requested level, switched to Level ${level}`);
                    break;
                }
            }
        }

        // If questions have levelName data, filter by pundex tier
        // Otherwise, use all questions for this year and shuffle them
        const hasLevelData = yearQuestions.some(q => q.levelName && q.levelName !== 'Beginning');
        
        if (hasLevelData) {
            this.questions = yearQuestions.filter(q => q.levelName === this.currentPundex);
        } else {
            // No pundex tier data - use all year questions, shuffled
            this.questions = this.shuffleArray([...yearQuestions]);
        }

        if (this.questions.length === 0) {
            this.showNotification(`No questions found for Level ${this.currentSchoolLevel}, ${this.pundexDisplayNames[this.currentPundex] || this.currentPundex}.`, 'warning');
        }
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * Show Power Up animation when advancing pundex tier
     */
    showPowerUpAnimation(completedIndex, nextIndex) {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'power-up-overlay';
        overlay.innerHTML = `
            <div class="power-up-content">
                <div class="power-up-text">POWER UP!</div>
                <div class="power-up-meter">
                    ${this.pundexTiers.map((tier, index) => {
                        const displayName = this.pundexDisplayNames[tier] || tier;
                        const colors = ['red', 'amber', 'green', 'purple'];
                        let stateClass = '';
                        if (index < completedIndex) {
                            stateClass = 'on';
                        } else if (index === completedIndex) {
                            stateClass = 'filling'; // About to fill
                        } else if (index === nextIndex) {
                            stateClass = 'next-glow'; // Will start glowing
                        }
                        return `<div class="power-up-light ${colors[index]} ${stateClass}" data-index="${index}">${displayName}</div>`;
                    }).join('')}
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Animate: fill the completed one, then glow the next
        setTimeout(() => {
            const lights = overlay.querySelectorAll('.power-up-light');
            // Fill the completed pundex
            lights[completedIndex].classList.remove('filling');
            lights[completedIndex].classList.add('on');
        }, 300);

        setTimeout(() => {
            const lights = overlay.querySelectorAll('.power-up-light');
            // Start glowing the next pundex
            lights[nextIndex].classList.remove('next-glow');
            lights[nextIndex].classList.add('flashing');
        }, 800);

        // Remove overlay after animation
        setTimeout(() => {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                overlay.remove();
                this.updateProgressionUI(); // Update the actual UI
            }, 500);
        }, 2000);
    }

    /**
     * Show Level Up animation when advancing to next level
     */
    showLevelUpAnimation(oldLevel, newLevel) {
        const overlay = document.createElement('div');
        overlay.className = 'level-up-overlay';
        overlay.innerHTML = `
            <div class="level-up-content">
                <div class="level-up-stars">⭐ ⭐ ⭐</div>
                <div class="level-up-text">LEVEL UP!</div>
                <div class="level-up-numbers">
                    <span class="old-level">${oldLevel}</span>
                    <span class="level-arrow">→</span>
                    <span class="new-level">${newLevel}</span>
                </div>
                <div class="level-up-message">Amazing work! Keep going!</div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Animate the level numbers
        setTimeout(() => {
            overlay.querySelector('.old-level').classList.add('shrink');
            overlay.querySelector('.new-level').classList.add('grow');
        }, 300);

        // Remove overlay after animation
        setTimeout(() => {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                overlay.remove();
                this.updateProgressionUI();
            }, 500);
        }, 2500);
    }

    /**
     * Show Mission Complete animation
     */
    showMissionCompleteAnimation() {
        const overlay = document.createElement('div');
        overlay.className = 'mission-complete-overlay';
        const levelLabel = this.currentSchoolLevel ? `Level ${this.currentSchoolLevel}` : 'this level';
        const nextLevelIndex = this.schoolLevels.indexOf(String(this.currentSchoolLevel)) + 1;
        const nextLevelNumber = nextLevelIndex >= 0 && nextLevelIndex < this.schoolLevels.length
            ? this.schoolLevels[nextLevelIndex]
            : null;
        const nextLevelLabel = nextLevelNumber ? `Level ${nextLevelNumber}` : 'the next stage';
        const missionName = this.currentMission || 'this mission';

        const initialiseMessage = `
            <div class="mission-complete-message">
                Well done for completing ${missionName} at ${levelLabel}.
                Please ensure you complete all the missions at ${levelLabel} to gain ${nextLevelLabel}.
            </div>
        `;

        const defaultMessage = `
            <div class="mission-complete-message">You've mastered ${missionName}!</div>
        `;

        overlay.innerHTML = `
            <div class="mission-complete-content">
                <div class="mission-complete-stars">🏆</div>
                <div class="mission-complete-text">MISSION COMPLETE!</div>
                ${this.isInitialiseMode ? initialiseMessage : defaultMessage}
                <button class="mission-complete-btn" onclick="this.parentElement.parentElement.remove(); window.location.href='Pathway_Selector.html';">Choose Next Mission</button>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    /**
     * Show initialise-specific overlay when a level is completed
     */
    showInitialiseLevelCompleteOverlay(currentLevel, nextLevel) {
        const missionName = this.currentMission || 'this mission';
        const levelLabel = currentLevel ? `Level ${currentLevel}` : 'this level';
        const nextLevelLabel = nextLevel ? `Level ${nextLevel}` : 'the next stage';
        const headingText = `MISSION COMPLETE AT ${levelLabel.toUpperCase()}`;

        const overlayPayload = {
            missionName,
            levelLabel,
            nextLevelLabel,
            headingText
        };

        try {
            sessionStorage.setItem('initialiseCompleteOverlay', JSON.stringify(overlayPayload));
        } catch (err) {
            console.warn('Unable to persist initialise overlay payload', err);
        }

        window.location.href = 'progress_dashboard_initialise.html';
    }

    /**
     * Save user progress for a mission/level/pundex
     * @param {boolean} completed - Whether the pundex is fully completed (power-up achieved)
     */
    saveProgress(mission, level, pundex, completed) {
        console.log('saveProgress called:', { mission, level, pundex, completed, currentUser: this.currentUser, UserAuthDefined: typeof UserAuth !== 'undefined' });
        if (!this.currentUser || typeof UserAuth === 'undefined') {
            console.log('No user logged in, progress not saved');
            return;
        }

        // Get current progress for this mission/level
        const existingProgress = UserAuth.getProgress(mission, level) || {
            pundexCompleted: {}
        };

        // Get existing pundex data or create new
        const existingPundexData = existingProgress.pundexCompleted[pundex] || {};

        // Calculate rolling score (last 10 answers, or all if < 10)
        const totalAnswered = this.pundexAnswerHistory.length;
        const last10 = this.pundexAnswerHistory.slice(-10);
        const rollingScore = last10.filter(a => a).length;
        
        // Update pundex progress
        existingProgress.pundexCompleted[pundex] = {
            ...existingPundexData,
            completed: completed || existingPundexData.completed || false,
            questionsAnswered: totalAnswered,
            correctAnswers: this.pundexAnswerHistory.filter(a => a).length,
            rollingScore: rollingScore,
            lastUpdated: new Date().toISOString()
        };

        // If completed, add completion timestamp
        if (completed) {
            existingProgress.pundexCompleted[pundex].completedAt = new Date().toISOString();
        }

        // Save back to user
        UserAuth.updateProgress(mission, level, existingProgress);
        console.log(`Progress saved: ${mission} Level ${level} - ${pundex} (${this.pundexAnswerHistory.length} questions, completed: ${completed})`);
    }

    /**
     * Ensure a pundex tier is recorded as needing work (removes assumed-complete state)
     */
    markPundexNeedsWork(mission, level, pundex, resetStats = false) {
        if (!this.currentUser || typeof UserAuth === 'undefined') {
            return;
        }
        const existingProgress = UserAuth.getProgress(mission, level) || { pundexCompleted: {} };
        const existingPundexData = existingProgress.pundexCompleted[pundex] || {};

        existingProgress.pundexCompleted[pundex] = {
            ...existingPundexData,
            completed: false,
            questionsAnswered: resetStats ? 0 : (existingPundexData.questionsAnswered || 0),
            correctAnswers: resetStats ? 0 : (existingPundexData.correctAnswers || 0),
            rollingScore: resetStats ? 0 : (existingPundexData.rollingScore ?? existingPundexData.correctAnswers ?? 0),
            lastUpdated: new Date().toISOString()
        };

        UserAuth.updateProgress(mission, level, existingProgress);
        console.log(`Marked ${mission} Level ${level} - ${pundex} as needing work (assumed removed).`);
    }

    /**
     * Save partial progress after each question answer
     */
    savePartialProgress() {
        if (!this.currentUser || !this.currentMission) return;
        this.saveProgress(this.currentMission, this.currentSchoolLevel, this.currentPundex, false);
    }

    /**
     * Load user progress for current mission and set starting point
     */
    loadUserProgress() {
        if (!this.currentUser || !this.currentMission || typeof UserAuth === 'undefined') {
            return;
        }

        // Find the user's current position in this mission
        const startLevelIndex = (() => {
            if (this.isInitialiseMode && this.urlStartLevel) {
                const idx = this.schoolLevels.indexOf(String(this.urlStartLevel));
                return idx >= 0 ? idx : 0;
            }
            return 0;
        })();

        for (let levelIdx = startLevelIndex; levelIdx < this.schoolLevels.length; levelIdx++) {
            const level = parseInt(this.schoolLevels[levelIdx]);
            const levelProgress = UserAuth.getProgress(this.currentMission, level);

            for (let pundexIdx = 0; pundexIdx < this.pundexTiers.length; pundexIdx++) {
                const pundex = this.pundexTiers[pundexIdx];
                const pundexProgress = levelProgress?.pundexCompleted?.[pundex];
                const isCompleted = pundexProgress?.completed;

                const hasRecordedProgress = Boolean(levelProgress?.pundexCompleted?.[pundex]);
                const skipAssumedPundex = (
                    this.isInitialiseMode &&
                    this.urlStartLevel &&
                    level === this.urlStartLevel &&
                    pundexIdx < 2 && // Skip Ignition & Charging
                    !hasRecordedProgress
                );

                if (skipAssumedPundex) {
                    continue;
                }

                if (!isCompleted) {
                    // This is where the user should start
                    this.currentSchoolLevel = level;
                    this.currentPundex = pundex;
                    
                    // Restore partial progress within this pundex
                    if (pundexProgress?.questionsAnswered > 0) {
                        // Rebuild answer history based on saved progress
                        const questionsAnswered = pundexProgress.questionsAnswered;
                        const correctAnswers = pundexProgress.correctAnswers || 0;
                        
                        // Reconstruct pundexAnswerHistory (we know totals but not exact order)
                        // Put correct answers first, then incorrect
                        this.pundexAnswerHistory = [];
                        for (let i = 0; i < correctAnswers; i++) {
                            this.pundexAnswerHistory.push(true);
                        }
                        for (let i = 0; i < questionsAnswered - correctAnswers; i++) {
                            this.pundexAnswerHistory.push(false);
                        }
                        
                        // Set current index to resume from where they left off
                        this.currentIndex = questionsAnswered;
                        
                        console.log(`Loaded progress: Level ${level}, ${pundex} - resuming at question ${questionsAnswered + 1} (${correctAnswers}/${questionsAnswered} correct)`);
                    } else {
                        console.log(`Loaded progress: Starting fresh at Level ${level}, ${pundex}`);
                    }
                    return;
                }
            }
        }

        // If we reach here, either user has completed everything we searched or there's no saved progress yet
        if (this.isInitialiseMode && this.urlStartLevel) {
            this.currentSchoolLevel = this.urlStartLevel;
            this.currentPundex = this.pundexTiers[2]; // Meeting / Ready
            this.pundexAnswerHistory = [];
            this.currentIndex = 0;
            console.log(`Initialise mode fallback: starting at Level ${this.urlStartLevel} (Ready pundex)`);
            return;
        }

        console.log('User has completed all levels for this mission');
    }

    async endSession() {
        await this.processLogQueue();
        await this.showResults();
    }

    async showResults() {
        // Process the log queue at the very end of the session
        await this.processLogQueue();

        this.questionSection.classList.add('hidden');
        this.resultsSection.classList.remove('hidden');

        const correctAnswers = Array.from(this.userAnswers.values()).filter(a => a.isCorrect).length;
        const totalQuestions = this.questions.length;
        const percentage = totalQuestions > 0 ? ((correctAnswers / totalQuestions) * 100).toFixed(1) : 0;

        this.resultsDisplay.innerHTML = `
            <div class="score-display">
                <div class="score-number">${percentage}%</div>
                <div class="score-fraction">${correctAnswers} / ${totalQuestions}</div>
            </div>
            <div class="score-details">
                <p class="score-item"><span class="score-label">Correct:</span> <span class="score-value correct-text">${correctAnswers}</span></p>
                <p class="score-item"><span class="score-label">Incorrect:</span> <span class="score-value incorrect-text">${totalQuestions - correctAnswers}</span></p>
            </div>
            ${percentage >= 70 ?
                '<p class="result-message success">Great job! Well done!</p>' :
                '<p class="result-message">Keep practicing to improve your score!</p>'}
        `;
    }

    /**
     * Restart the app
     */
    restart() {
        this.resultsSection.classList.add('hidden');
        this.uploadSection.classList.remove('hidden');
        this.fileInput.value = '';
        this.currentIndex = 0;
        this.userAnswers.clear();
        this.hasSubmittedCurrent = false;

        // Auto-load questions again
        this.autoLoadQuestions();
    }

    /**
     * Generate and download the user adventure data as a CSV file.
     */
    downloadCSV() {
        const headers = ['serve_id', 'user_id', 'question_id', 'time_served', 'time_submitted', 'is_correct', 'user_answer', 'batch_id'];
        const csvRows = [headers.join(',')];

        this.adventureLog.forEach(entry => {
            const values = headers.map(header => {
                const value = entry[header];
                if (value === null) return '';
                // Escape commas and quotes in the user's answer
                const stringValue = String(value);
                if (header === 'user_answer' && /[,"]/.test(stringValue)) {
                    return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            });
            csvRows.push(values.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'user_adventure.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Generate a simple UUID for the session.
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    async enableAutoLogging() {
        try {
            // Check if we have a saved file handle
            const savedHandle = await this.getSavedFileHandle();
            
            if (savedHandle) {
                this.logFileHandle = savedHandle;
                console.log('Using saved log file handle');
                return;
            }
            
            // Create new file if no saved handle
            this.logFileHandle = await window.showSaveFilePicker({
                types: [{ description: 'CSV Files', accept: { 'text/csv': ['.csv'] } }],
                suggestedName: 'user_adventure.csv'
            });
            
            // Save handle to IndexedDB
            await this.saveFileHandle(this.logFileHandle);
            
        } catch (error) {
            console.error('Auto-logging failed:', error);
        }
    }

    async getSavedFileHandle() {
        // TO DO: implement getting saved file handle from IndexedDB
        return null;
    }

    async saveFileHandle(fileHandle) {
        // TO DO: implement saving file handle to IndexedDB
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new QuestionApp();
});
