/**
 * Question Practice App - Main Application
 */

class QuestionApp {
    constructor() {
        this.questions = [];
        this.metadata = null;
        this.currentIndex = 0;
        this.userAnswers = new Map(); // questionId -> {answer: string, isCorrect: boolean}
        this.hasSubmittedCurrent = false;
        this.selectedOption = null; // For multiple choice questions
        this.notificationTimeout = null; // For auto-hiding notifications
        this.mcInputBuffer = ''; // Buffer for multi-digit MC answer input
        this.mcInputTimeout = null; // Timeout for the buffer
        this.activeInput = null; // For on-screen keyboard targeting
        this.adventureLog = []; // Log for CSV export
        this.userId = this.generateUUID(); // Generate a consistent user ID for the session
        this.batchId = this.generateUUID(); // Generate a consistent batch ID for the session
        this.logFileHandle = null; // For the File System Access API
        this.logQueue = []; // A queue for log entries to be written

        this.initializeElements();
        this.setupUI();
        this.autoLoadQuestions();
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
        this.startBtn = document.getElementById('start-btn');

        // Question section
        this.questionSection = document.getElementById('question-section');
        this.progressIndicator = document.getElementById('progress-indicator');
        this.questionMetadata = document.getElementById('question-metadata');
        this.sessionControls = document.getElementById('session-controls');
        this.hintContainer = document.getElementById('hint-container');
        this.questionDisplay = document.getElementById('question-display');
        this.answerArea = document.getElementById('answer-area');
        this.answerInput = document.getElementById('answer-input');
        this.feedbackArea = document.getElementById('feedback-area');
        this.actionBtn = null; // Dynamically assigned

        // On-screen keyboard
        this.keyboard = document.getElementById('on-screen-keyboard');

        // Results section
        this.resultsSection = document.getElementById('results-section');
        this.resultsDisplay = document.getElementById('results-display');
        this.restartBtn = document.getElementById('restart-btn');
        this.enableLoggingBtn = document.getElementById('enable-logging-btn');
    }

    /**
     * Attach event listeners
     */
    setupUI() {
        this.notificationClose.addEventListener('click', () => this.hideNotification());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        this.startBtn.addEventListener('click', () => this.startQuestions());
        this.restartBtn.addEventListener('click', () => this.restart());
        this.enableLoggingBtn.addEventListener('click', () => this.enableLiveLogging());

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
     * Show or hide on-screen keyboard
     */
    toggleKeyboard(show) {
        if (show) {
            this.keyboard.classList.remove('hidden');
        } else {
            this.keyboard.classList.add('hidden');
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

    /**
     * Automatically load questions from questions/questions.json
     */
    async autoLoadQuestions() {
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
            this.questions = data.questions;

            this.showLoading(false);
            this.displayMetadata();
            this.startBtn.classList.remove('hidden');

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
            this.questions = data.questions;

            this.displayMetadata();
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
    startQuestions() {
        this.uploadSection.classList.add('hidden');
        this.questionSection.classList.remove('hidden');
        this.currentIndex = 0;
        this.userAnswers.clear();
        // this.adventureLog = []; // No longer needed for live logging
        this.displayQuestion();
    }

    /**
     * Display the current question
     */
    displayQuestion() {
        const question = this.questions[this.currentIndex];
        if (!question) return;

        // Reset selected option and input buffer
        this.selectedOption = null;
        this.mcInputBuffer = '';
        clearTimeout(this.mcInputTimeout);

        // Live logging is now handled upon answer submission.

        // Update progress and render session controls
        this.progressIndicator.textContent = `Question ${this.currentIndex + 1} of ${this.questions.length}`;
        this.sessionControls.innerHTML = '<button id="end-session-btn" class="btn btn-secondary">Save & End</button>';

        // Display metadata tags
        this.questionMetadata.innerHTML = `
            <span class="tag tag-module">${question.moduleName}</span>
            <span class="tag tag-year">${question.yearGroup}</span>
            <span class="tag tag-level tag-level-${question.level}">${question.levelName}</span>
        `;


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

        // Check if already answered
        const previousAnswer = this.userAnswers.get(question.id);
        if (previousAnswer) {
            if (question.questionType === 'multiple_choice') {
                this.selectedOption = previousAnswer.answer;
                this.highlightSelectedOption(previousAnswer.answer);
            } else {
                this.answerInput.value = previousAnswer.answer;
            }
            this.showFeedback(previousAnswer.isCorrect, question.correctAnswer);
            this.hasSubmittedCurrent = true;
        } else {
            this.feedbackArea.classList.add('hidden');
            this.hasSubmittedCurrent = false;
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
        this.logAdventure(question.id, userAnswer, isCorrect);

        this.showFeedback(isCorrect, question.correctAnswer);
        this.actionBtn.textContent = this.currentIndex === this.questions.length - 1 ? 'Finish' : 'Next →';

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
     * Logs the user's answer to the adventure log.
     */
    logAdventure(questionId, userAnswer, isCorrect) {
        const now = new Date().toISOString();
        const logEntry = {
            serve_id: '',
            user_id: this.userId,
            question_id: questionId,
            time_served: now, // Simplification
            time_submitted: now,
            is_correct: isCorrect,
            user_answer: userAnswer,
            batch_id: this.batchId
        };
        // Add the log entry to a queue instead of writing immediately
        this.logQueue.push(logEntry);
    }

    async processLogQueue() {
        if (!this.logFileHandle || this.logQueue.length === 0) {
            return;
        }

        try {
            const writableStream = await this.logFileHandle.createWritable({ keepExistingData: true });
            const file = await this.logFileHandle.getFile();
            let filePosition = file.size;

            // Start writing from the end of the file
            await writableStream.seek(filePosition);

            for (const logEntry of this.logQueue) {
                const answer = String(logEntry.user_answer).includes(',') ? `"${logEntry.user_answer}"` : logEntry.user_answer;
                const csvRow = (filePosition > 0 ? '\n' : '') + 
                    `${logEntry.serve_id},${logEntry.user_id},${logEntry.question_id},${logEntry.time_served},${logEntry.time_submitted},${logEntry.is_correct},${answer},${logEntry.batch_id}`;
                
                await writableStream.write(csvRow);
                filePosition += new Blob([csvRow]).size; // Rough update of position
            }

            await writableStream.close();
            this.logQueue = []; // Clear the queue after writing

        } catch (error) {
            console.error('Failed to write to log file:', error);
            this.showNotification('Error writing to log file. Logging may be disabled.', 'error');
            this.logFileHandle = null; // Invalidate handle on error
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
     * Enable live logging by getting a file handle from the user.
     */
    async enableLiveLogging() {
        try {
            // Open the file picker
            const [fileHandle] = await window.showOpenFilePicker({
                types: [
                    {
                        description: 'CSV Files',
                        accept: {
                            'text/csv': ['.csv'],
                        },
                    },
                ],
            });

            // Request persistent read/write permission
            const permission = await fileHandle.requestPermission({ mode: 'readwrite' });
            if (permission !== 'granted') {
                this.showNotification('Permission to write to the file was denied.', 'warning');
                return;
            }

            this.logFileHandle = fileHandle;
            this.showNotification('Live logging enabled. Answers will be saved in real-time.', 'success');
            this.enableLoggingBtn.textContent = 'Logging Enabled';
            this.enableLoggingBtn.disabled = true;

        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error enabling live logging:', error);
                this.showNotification('Could not enable live logging.', 'error');
            }
        }
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
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new QuestionApp();
});
